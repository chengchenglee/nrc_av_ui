import log from 'electron-log';
import { inject, injectable } from 'inversify';
import { IHostConfig } from '../../../shared/configurationTypes';
import * as constants from '../../../shared/constants';
import { APP_CONFIG, ROS, ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { getAVPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IChildProcess,
  IConfiguration,
  IRosService,
  IStatusROSNode
} from '../../inversify/interfaces';

let statusRunAllCommands = constants.EnumStatusRunAllCommands.DEACTIVE;
@injectable()
export default class RosService implements IRosService {
  constructor(
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.StatusROSNode) private rosStatusSvc: IStatusROSNode
  ) {}

  @logMethod('[RosService][runRosMaster]')
  async runRosMaster(_: unknown, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      const command = this.childProcessSvc.buildCommand('ros_core.py', `python ${getAVPath()}`);
      this.childProcessSvc.executeAndIgnoreOutput(command);
      const results = await this.childProcessSvc.waitForResultAndReturn(replyOnChannel, '/rosout');
      replyOnChannel({
        status: 'success',
        data: results
      });
      this.rosStatusSvc.startNodes([
        {
          name: 'rosout',
          packageName: undefined
        }
      ]);
      log.info('[RosService][runRosMaster] success: ', results);
    } catch (err) {
      log.error(`[RosService][runRosMaster] ${err}`);
    }
  }

  @logMethod('[RosService][runRosNode]')
  async runRosNode(
    data: constants.ROSNodeArr,
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    try {
      log.info(`[RosService][runRosNode] node for running: ${JSON.stringify(data)}`);
      const rosNodesNotExist = await this.checkROSNodesExist(data);
      if (rosNodesNotExist.length !== 0) {
        let resultsNodeNotExist = '';
        rosNodesNotExist.forEach((node) => {
          resultsNodeNotExist += `${node.name}, `;
        });
        replyOnChannel({
          status: 'error',
          message: `${resultsNodeNotExist.slice(0, -2)} ${ROS.NOT_EXIST}`
        });

        log.debug(`[RosService][runRosNode] nodes not exist: ${JSON.stringify(rosNodesNotExist)}`);
      }

      let nodeName = '';
      data.nodeArr.forEach((node) => {
        nodeName = `${node.packageName}__${node.name}`;
        log.debug(`[RosService][runRosNode] nodeName: ${nodeName}`);
        this.childProcessSvc.execAndForget(
          this.childProcessSvc.buildCommand(
            `rosrun ${node.packageName} ${node.name} __name:=${nodeName}`,
            ''
          )
        );
      });

      const results = await this.childProcessSvc.waitForResultAndReturn(replyOnChannel, nodeName);
      log.info(`[RosService][runRosNode] results: ${results}`);
      if (results === ROS.SUCCESS) {
        replyOnChannel({
          status: 'success',
          data: `${nodeName} ${ROS.SUCCESS}`
        });
      }
      this.rosStatusSvc.startNodes(data.nodeArr);
    } catch (err) {
      log.error(`[RosService][runRosNode] ${err}`);
    }
  }

  @logMethod('[RosService][resultsROSNodes]')
  async resultsROSNodes(_: unknown, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      log.info('[RosService][resultsROSNodes] start');
      const rosNodes = await this.listROSNodes();
      log.debug(`[RosService][resultsROSNodes] rosNodes: ${JSON.stringify(rosNodes)}`);
      replyOnChannel({
        status: 'success',
        data: rosNodes
      });
      log.info('[RosService][resultsROSNodes] done');
    } catch (err) {
      log.error(`[RosService][resultsROSNodes] ${err}`);
    }
  }

  @logMethod('[RosService][checkROSNodesExist]')
  private async checkROSNodesExist(nodes: constants.ROSNodeArr) {
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

  @logMethod('[RosService][listROSNodes]')
  async listROSNodes(): Promise<constants.ROSNode[]> {
    const workspace =
      this.configSvc.getConfig<IHostConfig>(APP_CONFIG.CONNECTION, 'rosWorkspace') || '';
    const rosPackage = await this.listRosPackageInWs(workspace);
    const rosNode = await this.listRosNodeInPackage(rosPackage);
    return rosNode;
  }

  @logMethod('[RosService][listRosPackageInWs]')
  private async listRosPackageInWs(workspace: string) {
    const command = this.childProcessSvc.buildCommand(
      `${ROS_COMMAND.GET_LIST_ROS_PACK} ${workspace}`,
      ''
    );
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

  @logMethod('[RosService][listRosNodeInPackage]')
  private async listRosNodeInPackage(listPackage: string[]) {
    const listROSNode: constants.ROSNode[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const packageName of listPackage) {
      const execListNode = this.childProcessSvc.buildCommand(
        `ros-list-pack.sh ${packageName}`,
        getAVPath()
      );
      // eslint-disable-next-line no-await-in-loop
      const rosNodeName = await this.childProcessSvc.execAndWait(execListNode);

      if (rosNodeName !== '') {
        const names = rosNodeName.trim().split('\n');
        // eslint-disable-next-line no-restricted-syntax
        for (const name of names) {
          const rosNode: constants.ROSNode = {
            packageName,
            name
          };
          listROSNode.push(rosNode);
        }
      }
    }
    return listROSNode;
  }

  @logMethod('[RosService][runCommands]')
  runCommands(command: string, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      log.info('[RosService][runCommands] start');
      const buildCmd = this.childProcessSvc.buildCommand(command, '');
      this.childProcessSvc.executeAndValid(buildCmd, replyOnChannel);
      log.info('[RosService][runCommands] done');
    } catch (err) {
      log.error(`[RosService]runCommands] ${err}`);
      replyOnChannel({
        status: 'error',
        message: ROS_COMMAND.RUN_COMMAND_FAIL
      });
    }
  }

  @logMethod('[RosService][runCommandsForAll]')
  runCommandsForAll(command: string): Promise<constants.IResponse> {
    return new Promise<constants.IResponse>((resolve, reject) => {
      try {
        log.info('[RosService][runCommandsForAll] start');
        const buildCmd = this.childProcessSvc.buildCommand(command, '');
        this.childProcessSvc.executeAndValid(buildCmd, (response: constants.IResponse) => {
          if (response.status === 'error') {
            reject(response);
          } else {
            resolve(response);
          }
        });
        log.info('[RosService][runCommandsForAll] done');
      } catch (err) {
        const errorResponse: constants.IResponse = {
          status: 'error',
          message: ROS_COMMAND.RUN_COMMAND_FAIL
        };
        log.error(`[RosService][runCommandsForAll] ${err}`);
        reject(errorResponse);
      }
    });
  }

  setStatusRunAllCommands(newStatus: constants.EnumStatusRunAllCommands) {
    statusRunAllCommands = newStatus;
  }

  getStatusRunAllCommands(): constants.EnumStatusRunAllCommands {
    return statusRunAllCommands;
  }

  @logMethod('[RosService][runAllCommands]')
  runAllCommands(
    commands: constants.InterfaceCommand[],
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    const promises: Promise<constants.IResponse>[] = commands.map((command) =>
      this.runCommandsForAll(command.command)
    );

    this.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.ACTIVE);

    Promise.allSettled(promises)
      .then((results: PromiseSettledResult<constants.IResponse>[]) => {
        const errorResponses: constants.IErrorCommand[] = [];
        const successResponses: constants.IResponse[] = [];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successResponses.push(result.value);
          } else if (result.status === 'rejected') {
            const error = result.reason;
            const existingError = errorResponses.find((err) => err.error === error.message);
            if (!existingError) {
              if (error.message) {
                errorResponses.push({
                  idCommand: commands[index].id,
                  error: error.message
                });
              }
            }
          }
        });
        if (errorResponses.length > 0) {
          replyOnChannel({
            status: 'error',
            message: errorResponses
          });
        } else {
          replyOnChannel({
            status: 'success',
            data: ROS_COMMAND.RUN_COMMAND_SUCCESS
          });
        }
      })
      .catch((err) => {
        log.error(`[RosService][runAllCommands] ${err}`);
        replyOnChannel({
          status: 'error',
          message: ROS_COMMAND.RUN_ALL_COMMANDS_FAIL
        });
      });
  }

  @logMethod('[RosService][stopCommands]')
  async stopCommands(command: string, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      log.info('[RosService][stopCommands] start');
      const cmdsGetNodeInFile = `${command} --nodes`;
      const buildCmd = this.childProcessSvc.buildCommand(cmdsGetNodeInFile, '');
      const nodesInFile = await this.childProcessSvc.execAndWait(buildCmd);
      const nodes = nodesInFile.split('\n').slice(0, -1);
      // eslint-disable-next-line no-restricted-syntax
      for (const node of nodes) {
        const commandKill = this.childProcessSvc.buildCommand(`rosnode kill ${node}`, '');
        this.childProcessSvc.execAndForget(commandKill);
      }
      replyOnChannel({
        status: 'success',
        data: ROS_COMMAND.STOP_COMMAND_SUCCESS
      });
      log.info('[RosService][stopCommands] done');
    } catch (err) {
      log.error(`[RosService][stopCommands] ${err}`);
      replyOnChannel({
        status: 'error',
        message: ROS_COMMAND.STOP_COMMAND_FAIL
      });
    }
  }

  @logMethod('[RosService][changeMap]')
  changeMap(map: constants.AgentMap, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      log.info('[RosService][changeMap] start');
      const StatusRunAllCommands = this.getStatusRunAllCommands();
      if (StatusRunAllCommands === constants.EnumStatusRunAllCommands.ACTIVE) {
        replyOnChannel({
          status: 'error',
          message: ROS_COMMAND.RUN_ALL_COMMMANDS_IS_RUNNING
        });
        return;
      }
      const command = `rosrun nrc_av_ui paramsForMap.sh ${map.mapName}`;
      const paramsForMap = this.childProcessSvc.buildCommand(command, '');
      this.childProcessSvc.execAndForget(paramsForMap);
      replyOnChannel({
        status: 'success',
        data: ROS_COMMAND.CHANGE_MAP_SUCCESSFULLY
      });
      log.info('[RosService]changeMap] done');
    } catch (err) {
      log.error(`[RosService]changeMap] ${err}`);
      replyOnChannel({
        status: 'error',
        message: ROS_COMMAND.CHANGE_MAP_FAILED
      });
    }
  }
}
