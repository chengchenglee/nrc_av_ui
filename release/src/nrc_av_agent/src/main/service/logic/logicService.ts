import { MessageChannelMain, UtilityProcess, utilityProcess } from 'electron';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
import { APP_CONFIG, COMMUNICATION, ROS, ROS_COMMAND, SOCKET } from '../../constants';
import TYPES from '../../inversify/types';
import { getAVPath, getWorkerPath } from '../../utils';
import { IVehicleInfoProps } from '../configuration/types';
import type {
  IChildProcess,
  ICommunication,
  IConfiguration,
  ILogic,
  IPath
} from '../../inversify/interfaces';

interface ROSNode {
  packageName: string;
  name: string;
}
enum ROSNodeStatusType {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}
interface ROSNodeStatus extends ROSNode {
  status: ROSNodeStatusType;
}

interface ROSNodeArr {
  nodeArr: ROSNode[];
}

@injectable()
export default class LogicService implements ILogic {
  private previousRes: string;

  private rosNodeArr;

  private workerRosNodeHealthcheck!: UtilityProcess;

  constructor(
    @inject(TYPES.Communication) private commSvc: ICommunication,
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.Path) private pathSvc: IPath
  ) {
    // Adding Set to the initial State create error
    const initialRosNodeArr: ROSNodeStatus[] = [];
    this.initStateROSNodes().then((nodes) => {
      initialRosNodeArr.push(...nodes);
    });
    this.previousRes = '';
    this.rosNodeArr = createSharedStore(initialRosNodeArr);
    this.workerHealthCheckLoop();
  }

  init(): void {
   const idSaved = this.configSvc.getConfig(APP_CONFIG.VEHICLE, 'certKey');
    this.commSvc
      .connect(`${this.configSvc.getConfig(APP_CONFIG.CONNECTION, 'host')}/${SOCKET.NAME_SPACE}`, {query: `certKey=${idSaved}`})
      .then(() => {
        this.registerVehicle();
      })
      .catch(console.error);

    this.commSvc.addEventHandler('registrationResponse', (data, callback) => {
      callback(data.certKey);
    });

    this.commSvc.addEventHandler('vehicleActivation', (data: IVehicleInfoProps, callback) => {
      const idReceived = data.certKey;
      const idSaved = this.configSvc.getConfig(APP_CONFIG.VEHICLE, 'certKey');
      if (idReceived === idSaved) {
        callback(idSaved);
      }
      callback('CertKey Not Found');
    });

    this.commSvc.addEventHandler('nissan/ros/master', this.runRosMaster.bind(this));
    this.commSvc.addEventHandler('nissan/ros/node', this.runRosNode.bind(this));
    this.commSvc.addEventHandler('nissan/ros/nodes', this.resultsROSNodes.bind(this));
    this.commSvc.addEventHandler('nissan/ros/nodes-status', this.pingRosNode.bind(this));
    this.commSvc.addEventHandler('connect', this.registerVehicle.bind(this));
  }

  cleanup(): void {
    this.commSvc.disconnect();
  }

  private workerHealthCheckLoop() {
    // Make sure the 'exit' event only triggered when the worker is dead not killed.
    if (this.workerRosNodeHealthcheck) {
      this.workerRosNodeHealthcheck.removeAllListeners();
      this.workerRosNodeHealthcheck.kill();
    }
    const { port1 } = new MessageChannelMain();
    this.workerRosNodeHealthcheck = utilityProcess.fork(
      getWorkerPath('workerROSNodeHealthcheck.js')
    );
    this.workerRosNodeHealthcheck.once('message', (res) => {
      // Not an error
      if (!res.type) {
        const nodeStatusArr: ROSNodeStatus[] = res;
        this.updateRosNodeStatusState(nodeStatusArr);
      }
      this.workerHealthCheckLoop();
    });
    this.workerRosNodeHealthcheck.postMessage(this.rosNodeArr.getState(), [port1]);
    this.workerRosNodeHealthcheck.once('exit', () => {
      this.workerHealthCheckLoop();
    });
  }

  private updateRosNodeStatusState(rosNodeStatusArr: ROSNodeStatus[]): ROSNodeStatus[] {
    if (!rosNodeStatusArr || !rosNodeStatusArr.length) return this.rosNodeArr.getState();
    this.rosNodeArr.setState((currentRosNodeArr) => {
      rosNodeStatusArr.forEach((rosNodeStatus) => {
        const nodeItem = currentRosNodeArr.find(
          (node) =>
            node.name === rosNodeStatus.name && node.packageName === rosNodeStatus.packageName
        );

        if (nodeItem) {
          nodeItem.status = rosNodeStatus.status;
        } else {
          currentRosNodeArr.push(rosNodeStatus);
        }
      });
    });
    return this.rosNodeArr.getState();
  }

  private registerVehicle() {
    const vehicleInfo: IVehicleInfoProps | undefined = this.configSvc.getConfigs(
      APP_CONFIG.VEHICLE
    );
    this.commSvc.send('join', vehicleInfo);
  }

  private buildCommand(command: string, path = '') {
    const setupPath = this.pathSvc.join(
      this.configSvc.getConfig(APP_CONFIG.CONNECTION, 'rosWorkspace') || '',
      'devel/setup.sh'
    );
    const execPath = this.pathSvc.join(path, command);
    const res = `. ${setupPath} && ${execPath}`;
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runRosMaster(_: any, callback: any) {
    const command = this.buildCommand('kelly_interface.py', `python ${getAVPath()}`);
    this.childProcessSvc.execAndForget(command);
    const results = await this.waitForResultAndReturn(callback, '/rosout');
    callback(results);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runRosNode(data: ROSNodeArr, callback: any) {
    const rosNodesNotExist = await this.checkROSNodesExist(data);
    if (rosNodesNotExist.length !== 0) {
      let resultsNodeNotExist = '';
      rosNodesNotExist.forEach((node) => {
        resultsNodeNotExist += `${node.name}, `;
      });
      callback({ error: `${resultsNodeNotExist.slice(0, -2)} ${ROS.NOT_EXIST}` });
    }

    let nodeName = '';
    data.nodeArr.forEach((node) => {
      nodeName = `${node.packageName}__${node.name}`;
      this.childProcessSvc.execAndForget(
        this.buildCommand(`rosrun ${node.packageName} ${node.name} __name:=${nodeName}`)
      );
    });
    this.updateRosNodeStatusState(
      data.nodeArr.map((node) => ({ ...node, status: ROSNodeStatusType.RUNNING }))
    );
    const results = await this.waitForResultAndReturn(callback, nodeName);
    if (results === ROS.SUCCESS) {
      callback(`${nodeName} ${ROS.SUCCESS}`);
    }
  }

  private async waitForResultAndReturn(callback: any, nodeName: string) {
    let res = '';
    let timeout = false;
    const timeoutId = setTimeout(() => {
      timeout = true;
    }, COMMUNICATION.RUN_ROS_TIME_OUT);
    do {
      // eslint-disable-next-line no-await-in-loop
      res = await this.childProcessSvc.execAndWait(`${ROS_COMMAND.PING_NODE} ${nodeName}`);
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 200));
    } while (
      (res.includes(`cannot ping [${nodeName}]: unknown node`) && !timeout) ||
      (res === '' && !timeout)
    );

    clearTimeout(timeoutId);
    if (timeout) {
      if (res === '') {
        callback({ error: ROS.ROS_CORE_NOT_START });
      } else callback({ error: ROS.ROS_NODES_NOT_START });
    } else {
      return ROS.SUCCESS;
    }
    return '';
  }

  private async listROSNodes(): Promise<ROSNode[]> {
    const workspace = this.configSvc.getConfig(APP_CONFIG.CONNECTION, 'rosWorkspace') || '';
    const rosPackage = await this.listRosPackageInWs(workspace);
    const rosNode = await this.listRosNodeInPackage(rosPackage);
    const currentRosNodeArray = this.rosNodeArr.getState();
    const extraRosNode: ROSNodeStatus[] = rosNode
      .filter(
        (listNode: ROSNode) =>
          !currentRosNodeArray.find(
            (currentNode) =>
              listNode.name === currentNode.name && listNode.packageName === currentNode.packageName
          )
      )
      .map((node: ROSNode) => ({ ...node, status: ROSNodeStatusType.NOT_STARTED }));
    this.updateRosNodeStatusState(extraRosNode);
    return rosNode;
  }

  private async initStateROSNodes(): Promise<ROSNodeStatus[]> {
    const workspace = this.configSvc.getConfig(APP_CONFIG.CONNECTION, 'rosWorkspace') || '';
    const rosPackage = await this.listRosPackageInWs(workspace);
    const rosNode = await this.listRosNodeInPackage(rosPackage);
    const rosNodeStatus: ROSNodeStatus[] = rosNode.map((node) => ({
      ...node,
      status: ROSNodeStatusType.NOT_STARTED
    }));
    return rosNodeStatus;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resultsROSNodes(_: any, callback: any) {
    const rosNodes = await this.listROSNodes();
    callback(rosNodes);
  }

  private async checkROSNodesExist(nodes: ROSNodeArr) {
    const rosNodes = await this.listROSNodes();
    const existingNodes = rosNodes.map((node) => ({
      packageName: node.packageName,
      name: node.name
    }));

    const filteredNodes = nodes.nodeArr.filter(
      (node) => !existingNodes.some((existingNode) => existingNode.name === node.name)
    );
    return filteredNodes;
  }

  private async listRosPackageInWs(workspace: string) {
    const command = this.buildCommand(`${ROS_COMMAND.GET_LIST_ROS_PACK} ${workspace}`);
    const listROSPackage = await this.childProcessSvc.execAndWait(command);
    const rosPackageName = listROSPackage.split('\n');
    const listROSPackageName: string[] = rosPackageName.map((str: string): string => {
      const segments: string[] = str.split('/');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const packageName: string = segments.length > 0 ? segments.pop()!.trim().split(' ')[0] : '';
      return packageName;
    });
    listROSPackageName.pop();
    return listROSPackageName;
  }

  private async listRosNodeInPackage(listPackage: string[]) {
    const listROSNode: ROSNode[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const packageROS of listPackage) {
      const execListNode = this.buildCommand(`ros-list-pack.sh ${packageROS}`, getAVPath());
      // eslint-disable-next-line no-await-in-loop
      const rosNodeName = await this.childProcessSvc.execAndWait(execListNode);

      if (rosNodeName !== '') {
        const names = rosNodeName.trim().split('\n');
        // eslint-disable-next-line no-restricted-syntax
        for (const name of names) {
          const rosNode: ROSNode = {
            packageName: packageROS,
            name
          };
          listROSNode.push(rosNode);
        }
      }
    }
    return listROSNode;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pingRosNode(listROSNode: ROSNode[], callback: any) {
    callback(
      this.rosNodeArr
        .getState()
        .filter((node) =>
          listROSNode.find(
            (rosNode) => rosNode.name === node.name && rosNode.packageName === node.packageName
          )
        )
    );
  }
}
