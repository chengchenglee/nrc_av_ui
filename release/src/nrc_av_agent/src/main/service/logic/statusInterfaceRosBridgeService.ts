import { MessageChannelMain, MessagePortMain, UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
// eslint-disable-next-line import/no-extraneous-dependencies
import { promise } from 'ping';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Message, Ros, Topic } from 'roslib';
import { v4 as uuidv4 } from 'uuid';
import * as constants from '../../../shared/constants';
import * as mainConstants from '../../constants';
import TYPES from '../../inversify/types';
import { chunkArray, getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IChildProcess,
  ICommunication,
  IRosBridgeConnectionService,
  IRosService,
  IStatusCommands,
  IStatusInterfaceRosBridgeService
} from '../../inversify/interfaces';

@injectable()
export default class StatusInterfaceRosBridgeService implements IStatusInterfaceRosBridgeService {
  private sharedStore;

  private extraVehicleDetailState;

  private sensorsTopic: Map<string, constants.SensorsStatus[]>;

  private algorithmsTopic: Map<string, constants.AlgorithmsStatus[]>;

  private topicWorker: UtilityProcess[];

  private topicVehicleDetailWorker!: UtilityProcess;

  private topicPublishList: Map<constants.EnumRosBridgeTopic, Topic>;

  private rosBridgeTopicTypeList: Map<constants.EnumRosBridgeTopic, string>;

  private rosBridgeTopicPublishLock: Map<constants.EnumRosBridgeTopic, boolean>;

  private communicationChannel: Map<constants.EnumRosBridgeCommunicationPort, MessagePortMain>;

  private stateUpdatedChannel: MessageChannelMain;

  private rosNodes: string[];

  private rosTopics: string[];

  constructor(
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.Communication) private commSvc: ICommunication,
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands,
    @inject(TYPES.RosBridgeConnectionService)
    private rosBridgeConnectionService: IRosBridgeConnectionService
  ) {
    this.sensorsTopic = new Map();
    this.algorithmsTopic = new Map();
    this.topicWorker = [];
    const initialValue: constants.InterfaceStatus = {
      interfaceName: '',
      machines: [],
      statusRunAll: constants.EnumStatusRunAllCommands.DEACTIVE,
      statusCommands: []
    };
    this.sharedStore = createSharedStore<constants.InterfaceStatus>(initialValue);
    this.extraVehicleDetailState = createSharedStore<constants.ExtraVehicleDetail>({
      latitude: 0,
      longitude: 0,
      velocity: 0
    });
    this.rosNodes = [];
    this.rosTopics = [];
    this.sharedStore.subscribe((state) => {
      if (this.commSvc.getConnectionStatus()) {
        this.sendInterfaceStatusToChannel(state);
      }
    });
    this.topicPublishList = new Map();
    this.rosBridgeTopicTypeList = new Map([
      [constants.EnumRosBridgeTopic.LED_DIAGNOSTIC, 'std_msgs/Int16MultiArray']
    ]);
    this.rosBridgeTopicPublishLock = new Map([
      [constants.EnumRosBridgeTopic.LED_DIAGNOSTIC, false]
    ]);
    this.communicationChannel = new Map();
    this.stateUpdatedChannel = new MessageChannelMain();
    this.stateUpdatedChannel.port2.start();
    this.communicationChannel.set(
      constants.EnumRosBridgeCommunicationPort.INTERFACE_STATE,
      this.stateUpdatedChannel.port2
    );
  }

  @logMethod('[StatusInterfaceRosBridgeService][initStatusInterface]', log.debug)
  initStatusInterface() {
    // This ping will check for machine and interface state since Ros-Bridge can't check those.
    // This will also check if any topic died since state only get process message
    // recieved from topic
    try {
      this.statusCheckLoop();
    } catch (error) {
      log.error(`[StatusInterfaceRosBridgeService][initStatusInterface] ${error}`);
    }
  }

  getMessagePort(
    channelName: constants.EnumRosBridgeCommunicationPort
  ): MessagePortMain | undefined {
    return this.communicationChannel.get(channelName);
  }

  @logMethod('[StatusInterfaceRosBridgeService][statusCheckLoop]', log.debug)
  private statusCheckLoop() {
    this.processNonTopicMapState()
      .catch((error) => {
        log.error(`[StatusInterfaceRosBridgeService][statusCheckLoop] ${error}`);
      })
      .finally(() => {
        setTimeout(
          this.statusCheckLoop.bind(this),
          mainConstants.ROS_BRIDGE.ROS_BRIDGE_PASSIVE_PING_INTERVAL
        );
      });
  }

  @logMethod('[StatusInterfaceRosBridgeService][forkWorker]', log.debug)
  private forkWorker(
    topic: constants.TopicType[],
    topicType: constants.EnumTopicType,
    topicChunkUuid: string
  ) {
    const topicSubscriber = utilityProcess.fork(
      getWorkerPath('workerRosBridgeTopicSubscriber.js'),
      undefined,
      { serviceName: 'nrc_av_agent--topic-subscriber', stdio: 'pipe', env: { ...process.env } }
    );
    this.topicWorker.push(topicSubscriber);
    topicSubscriber.stdout?.on('data', (data) => {
      log.debug(`${data.toString()}`);
    });
    topicSubscriber.stderr?.on('data', (data) => {
      log.error(`${data.toString()}`);
    });
    topicSubscriber.on('message', (data: constants.TopicType[]) => {
      this.setTopicWorkerContent(topicChunkUuid, data, topicType);
      this.sendInterfaceStatusToChannel(this.sharedStore.getState());
    });
    topicSubscriber.once('exit', (code: number) => {
      topicSubscriber.removeAllListeners();
      this.childProcessSvc.execAndForget(`kill ${topicSubscriber.pid}`);
      log.error(`[nrc_av_agent--topic-subscriber] Process exited with code ${code}`);
      setTimeout(this.forkWorker.bind(this), 200);
    });
    topicSubscriber.once('spawn', () => {
      const message: constants.IRosBridgeTopicWorkerMessageInit = {
        type: constants.EnumRosBridgeTopicWorkerMessage.INIT,
        topicList: topic
      };
      topicSubscriber.postMessage(message);
    });
  }

  public sendAllTopicWorker(message: constants.IRosBridgeTopicWorkerMessage) {
    this.topicWorker.forEach((worker) => {
      worker.postMessage(message);
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][forkVehicleInformationWorker]', log.debug)
  private forkVehicleDetailWorker() {
    if (!this.topicVehicleDetailWorker?.pid) {
      this.topicVehicleDetailWorker = utilityProcess.fork(
        getWorkerPath('workerRosBridgeVehicleDetailSubscriber.js'),
        undefined,
        {
          serviceName: 'nrc_av_agent--vehicle-detail-subscriber',
          stdio: 'pipe',
          env: { ...process.env }
        }
      );
    }
    this.topicVehicleDetailWorker.stdout?.on('data', (data) => {
      log.debug(`${data.toString()}`);
    });
    this.topicVehicleDetailWorker.stderr?.on('data', (data) => {
      log.error(`${data.toString()}`);
    });
    this.topicVehicleDetailWorker.on('message', (data: constants.WorkerVehicleDetailReturn) => {
      this.rosTopics = data.rosTopics;
      this.rosNodes = data.rosNodes;
      this.extraVehicleDetailState.setState(() => data);
    });
    this.topicVehicleDetailWorker.once('exit', (code: number) => {
      this.topicVehicleDetailWorker.removeAllListeners();
      this.childProcessSvc.execAndForget(`kill ${this.topicVehicleDetailWorker.pid}`);
      log.error(`[nrc_av_agent--vehicle-detail-subscriber] Process exited with code ${code}`);
      setTimeout(this.forkVehicleDetailWorker.bind(this), 200);
    });
    this.topicVehicleDetailWorker.once('spawn', () => {
      const topicList: constants.VehicleDetailTopic[] = [
        { topicName: '/gps_state', topicType: constants.EnumVehicleDetailTopic.GPS },
        { topicName: '/Controller_state', topicType: constants.EnumVehicleDetailTopic.SPEED }
      ];
      this.topicVehicleDetailWorker.postMessage({ topicList });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][setTopicWorkerContent]', log.debug)
  private setTopicWorkerContent(
    chunkUuid: string,
    topicWorkerContent: constants.TopicType[],
    topicType: constants.EnumTopicType
  ) {
    switch (topicType) {
      case constants.EnumTopicType.ALGORITHM: {
        this.algorithmsTopic.set(chunkUuid, topicWorkerContent);
        break;
      }
      case constants.EnumTopicType.SENSOR: {
        this.sensorsTopic.set(chunkUuid, topicWorkerContent);
        break;
      }
      default: {
        break;
      }
    }
  }

  @logMethod('[StatusInterfaceRosBridgeService][combineTopicWorkerContent]', log.debug)
  private combineTopicWorkerContent(topicWorkerMap: Map<string, constants.TopicType[]>) {
    const combinedTopicList: constants.TopicType[] = [];
    topicWorkerMap.forEach((topic) => {
      combinedTopicList.push(...topic);
    });
    return combinedTopicList;
  }

  @logMethod('[StatusInterfaceRosBridgeService][setStatusInterface]', log.debug)
  async setStatusInterface(dataInterface: constants.Interface): Promise<void> {
    const status = await this.updateInterfaceStatus(dataInterface);
    status.status = constants.InterfaceFileStatusType.RUNNING;
    this.chunkTopicAndFork(status);
    this.forkVehicleDetailWorker();
    const result = this.updateStatusState(status);
    this.sendInterfaceStatusToChannel(result);
    return Promise.resolve();
  }

  getTopicById(topicId: number): constants.TopicType | undefined {
    return [
      ...this.combineTopicWorkerContent(this.algorithmsTopic),
      ...this.combineTopicWorkerContent(this.sensorsTopic)
    ].find((topic) => topic.id === topicId);
  }

  getAllTopics(topicType?: constants.SubSystemType): constants.TopicType[] {
    switch (topicType) {
      case constants.SubSystemType.ALGORITHM: {
        return this.combineTopicWorkerContent(this.algorithmsTopic);
      }
      case constants.SubSystemType.SENSOR: {
        return this.combineTopicWorkerContent(this.sensorsTopic);
      }
      default: {
        return [
          ...this.combineTopicWorkerContent(this.algorithmsTopic),
          ...this.combineTopicWorkerContent(this.sensorsTopic)
        ];
      }
    }
  }

  @logMethod('[StatusInterfaceRosBridgeService][chunkTopicAndFork]', log.debug)
  private chunkTopicAndFork(status: constants.TopicStatus) {
    const sensorsArr = chunkArray(
      status.sensors,
      constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_CHUNK_SIZE
    );
    let sensorIter;
    // eslint-disable-next-line no-cond-assign
    while (!(sensorIter = sensorsArr.next()).done) {
      const uuid = uuidv4();
      this.sensorsTopic.set(uuid, sensorIter.value);
      this.forkWorker(sensorIter.value, constants.EnumTopicType.SENSOR, uuid);
    }
    const algorithmsArr = chunkArray(
      status.algorithms,
      constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_CHUNK_SIZE
    );
    let algorithmsIter;
    // eslint-disable-next-line no-cond-assign
    while (!(algorithmsIter = algorithmsArr.next()).done) {
      const uuid = uuidv4();
      this.algorithmsTopic.set(uuid, algorithmsIter.value);
      this.forkWorker(algorithmsIter.value, constants.EnumTopicType.ALGORITHM, uuid);
    }
  }

  @logMethod('[StatusInterfaceRosBridgeService][sendInterfaceStatusToServer]', log.debug)
  private sendInterfaceStatusToChannel(nonTopicState: constants.InterfaceStatus) {
    const topicSensors = this.combineTopicWorkerContent(this.sensorsTopic);
    const topicAlgorithms = this.combineTopicWorkerContent(this.algorithmsTopic);
    const topicExtra = this.extraVehicleDetailState.getState();
    const data: constants.InterfaceStatusDto = {
      ...nonTopicState,
      sensors: topicSensors,
      algorithms: topicAlgorithms,
      extraVehicleInformation: topicExtra
    };
    // this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, data);
    this.stateUpdatedChannel.port1.postMessage(data);
  }

  @logMethod('[StatusInterfaceRosBridgeService][processNonTopicMapState]', log.debug)
  private async processNonTopicMapState() {
    this.sharedStore.getState();
    const machinesStatus = await Promise.all(
      this.sharedStore.getState().machines.map((machine) => this.checkMachineStatus(machine))
    );
    const interfaceStatus = await this.checkInterfaceStatus();
    const rosStatusRunAll = this.rosSvc.getStatusRunAllCommands();
    const commandsStatus = this.commandsStatusSvc.getState();
    this.sharedStore.setState((state) => {
      const currentMachines = state.machines;
      // eslint-disable-next-line no-param-reassign
      state.machines = currentMachines.map((machine) => {
        const matchedMachine = machinesStatus.find(
          (evalMachine) => evalMachine.name === machine.name
        );
        if (matchedMachine) {
          return { ...matchedMachine };
        }
        return machine;
      });
      // eslint-disable-next-line no-param-reassign
      state.status = interfaceStatus;
      // eslint-disable-next-line no-param-reassign
      state.statusRunAll = rosStatusRunAll;
      // eslint-disable-next-line no-param-reassign
      state.statusCommands = commandsStatus;
    });
    // log.info(this.sharedStore.getState());
    // log.info(
    // eslint-disable-next-line max-len
    //   await this.childProcessSvc.execAndWait(this.childProcessSvc.buildCommand('rosnode list', ''))
    // );
  }

  @logMethod('[StatusInterfaceRosBridgeService][killAllTopicWorker]', log.debug)
  private killAllTopicWorker() {
    this.topicWorker.forEach((worker) => {
      if (worker.pid) {
        worker.removeAllListeners();
        this.childProcessSvc.execAndForget(`kill ${worker.pid}`);
      }
    });
    this.topicVehicleDetailWorker?.removeAllListeners();
    this.childProcessSvc.execAndForget(`kill ${this.topicVehicleDetailWorker?.pid}`);
  }

  @logMethod('[StatusInterfaceRosBridgeService][clearCache]', log.debug)
  clearCache(): Promise<void> {
    return new Promise((resolve) => {
      this.algorithmsTopic.clear();
      this.sensorsTopic.clear();
      this.topicPublishList.clear();
      this.killAllTopicWorker();
      this.topicWorker = [];
      this.sharedStore.setState((state) => {
        // eslint-disable-next-line no-param-reassign
        state.interfaceName = '';
        // eslint-disable-next-line no-param-reassign
        state.machines = [];
        // eslint-disable-next-line no-param-reassign
        state.status = constants.InterfaceFileStatusType.STOPPED;
        // eslint-disable-next-line no-param-reassign
        state.statusRunAll = constants.EnumStatusRunAllCommands.DEACTIVE;
        resolve();
      });
      this.extraVehicleDetailState.setState((state) => {
        // eslint-disable-next-line no-param-reassign
        state.latitude = 0;
        // eslint-disable-next-line no-param-reassign
        state.longitude = 0;
        // eslint-disable-next-line no-param-reassign
        state.velocity = 0;
      });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosTopicsCache]', log.debug)
  getRosTopicsCache(): string[] {
    return this.rosTopics;
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosNodesCache]', log.debug)
  getRosNodesCache(): string[] {
    return this.rosNodes;
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosNodes]', log.debug)
  getRosNodes(rosConnection: Ros): Promise<string[]> {
    return new Promise((resolve) => {
      rosConnection.getNodes(
        (nodes) => {
          resolve(nodes);
        },
        (err) => {
          log.error(`[StatusInterfaceRosBridgeService][getRosNodes] ${err}`);
          resolve(this.getRosNodesCache());
        }
      );
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosTopics]', log.debug)
  getRosTopics(rosConnection: Ros): Promise<string[]> {
    return new Promise((resolve) => {
      rosConnection.getTopics(
        (result) => {
          resolve(result.topics);
        },
        (err) => {
          log.error(`[StatusInterfaceRosBridgeService][getRosTopics] ${err}`);
          resolve(this.getRosTopicsCache());
        }
      );
    });
  }

  // @TODO For future implementation rosBridgeTopicList will be a parameter
  @logMethod('[StatusInterfaceRosBridgeService][initTopicPublish]', log.debug)
  initTopicPublish(rosConnection: Ros) {
    this.rosBridgeTopicTypeList.forEach((messageType, topicName) => {
      log.info(
        // eslint-disable-next-line max-len
        `[StatusInterfaceRosBridgeService][initTopicPublish] Init topic ${topicName} with type ${messageType}`
      );
      const topic = new Topic({
        ros: rosConnection,
        name: topicName,
        messageType: messageType || 'std_msgs/String',
        reconnect_on_close: true
      });
      topic.advertise();
      this.topicPublishList.set(topicName, topic);
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][getPublishTopic]', log.debug)
  getPublishTopic(topicName: constants.EnumRosBridgeTopic) {
    return this.topicPublishList.get(topicName);
  }

  @logMethod('[StatusInterfaceRosBridgeService][publishMessage]', log.debug)
  publishMessage(topicName: constants.EnumRosBridgeTopic, message: any) {
    const topic = this.getPublishTopic(topicName);
    const mes: Message = message;
    if (this.rosBridgeTopicPublishLock.get(topicName)) {
      return;
    }
    if (topic) {
      topic.advertise();
      topic.publish(mes);
      topic.unadvertise();
    } else {
      log.warn(
        // eslint-disable-next-line max-len
        `[StatusInterfaceRosBridgeService][publishMessage] Fail to published to ${topicName} message: ${message.toString()}`
      );
      this.rosBridgeTopicPublishLock.set(topicName, true);
      this.rosBridgeConnectionService
        .getRosBridgeConnection()
        .then((ros) => {
          const topicType = this.rosBridgeTopicTypeList.get(topicName);
          const newTopic = new Topic({
            ros,
            name: topicName,
            messageType: topicType || 'std_msgs/String',
            reconnect_on_close: true
          });
          newTopic.advertise();
          log.info(
            // eslint-disable-next-line max-len
            `[StatusInterfaceRosBridgeService][publishMessage] Re-init topic ${topicName} with type ${
              topicType || 'std_msgs/String'
            }`
          );
          newTopic.publish(mes);
          this.topicPublishList.set(topicName, newTopic);
        })
        .finally(() => this.rosBridgeTopicPublishLock.set(topicName, false));
    }
  }

  @logMethod('[StatusInterfaceRosBridgeService][interfaceRunning]', log.debug)
  interfaceRunning(): constants.InterfaceStatus {
    return this.sharedStore.getState();
  }

  @logMethod('[StatusInterfaceRosBridgeService][updateInterfaceStatus]', log.debug)
  async updateInterfaceStatus(
    dataInterface: constants.Interface
  ): Promise<constants.InterfaceStatus & constants.TopicStatus> {
    const machinesStatus = await Promise.all(
      dataInterface.machines.map((machine) => this.checkMachineStatus(machine))
    );

    const sensorsStatus = await Promise.all(
      dataInterface.sensors.map((sensor) => this.checkSensorStatus(sensor))
    );

    const algorithmsStatus = await Promise.all(
      dataInterface.algorithms.map((algorithm) => this.checkAlgorithmStatus(algorithm))
    );
    const interfaceStatus = await this.checkInterfaceStatus();
    return {
      interfaceName: dataInterface.name,
      machines: machinesStatus,
      sensors: sensorsStatus,
      algorithms: algorithmsStatus,
      status: interfaceStatus,
      statusRunAll: this.rosSvc.getStatusRunAllCommands(),
      statusCommands: this.commandsStatusSvc.getState()
    };
  }

  @logMethod('[StatusInterfaceRosBridgeService][checkPing]', log.debug)
  private async checkPing(machineAddr: string) {
    try {
      const respond = await promise.probe(machineAddr);
      if (respond.alive) {
        return true;
      }
      return false;
    } catch (_err) {
      return false;
    }
  }

  @logMethod('[StatusInterfaceRosBridgeService][checkMachineStatus]', log.debug)
  private async checkMachineStatus(machine: constants.Machine): Promise<constants.MachinesStatus> {
    const ping = await this.checkPing(machine.addr);
    const status =
      ping === true ? constants.MachineStatusType.PASS : constants.MachineStatusType.FAIL;
    return {
      ...machine,
      status
    };
  }

  private async checkInterfaceStatus(): Promise<constants.InterfaceFileStatusType | undefined> {
    const modifiedStatus = this.sharedStore.getState();
    try {
      if (
        modifiedStatus.interfaceName === '' ||
        modifiedStatus.status === constants.InterfaceFileStatusType.STOPPED
      ) {
        return constants.InterfaceFileStatusType.STOPPED;
      }
      const results = await this.childProcessSvc.execAndWait(
        this.childProcessSvc.buildCommand(
          `${mainConstants.ROS_COMMAND.PING_NODE} rosbridge_websocket`,
          ''
        )
      );
      if (results === '' || results.includes('ERROR') || results.includes('cannot ping')) {
        return constants.InterfaceFileStatusType.STOPPED;
      }
    } catch (err) {
      if (modifiedStatus.status === constants.InterfaceFileStatusType.RUNNING) {
        return constants.InterfaceFileStatusType.STOPPED;
      }
    }
    if (modifiedStatus.status !== undefined) {
      return this.sharedStore.getState().status;
    }
    return constants.InterfaceFileStatusType.STOPPED;
  }

  @logMethod('[StatusInterfaceRosBridgeService][checkSensorStatus]', log.debug)
  private checkSensorStatus(sensor: constants.Sensor): constants.SensorsStatus {
    return {
      ...sensor,
      status: constants.RosTopicStatusType.BAD,
      uuid: uuidv4(),
      msgCount: 0
    };
  }

  @logMethod('[StatusInterfaceRosBridgeService][checkAlgorithmStatus]', log.debug)
  private checkAlgorithmStatus(algorithm: constants.Algorithm): constants.AlgorithmsStatus {
    return {
      ...algorithm,
      status: constants.RosTopicStatusType.BAD,
      uuid: uuidv4(),
      msgCount: 0
    };
  }

  @logMethod('[StatusInterfaceRosBridgeService][updateStatusState]', log.debug)
  private updateStatusState(interfaceStatus: constants.InterfaceStatus): constants.InterfaceStatus {
    if (!interfaceStatus) {
      return this.sharedStore.getState();
    }

    this.sharedStore.setState((data) => {
      // eslint-disable-next-line no-param-reassign
      data.interfaceName = interfaceStatus.interfaceName;
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      interfaceStatus.machines.forEach((machineStatus) => {
        const foundMachineStatus = currentInterfaceStatus.machines.find(
          (machine) => machine.name === machineStatus.name
        );

        if (foundMachineStatus) {
          foundMachineStatus.status = machineStatus.status;
        } else {
          currentInterfaceStatus.machines.push(machineStatus);
        }
      });
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      interfaceStatus.statusCommands.forEach((sensorStatus) => {
        const foundsensorStatus = currentInterfaceStatus.statusCommands.find(
          (sensor) => sensor.command === sensorStatus.command
        );

        if (foundsensorStatus) {
          foundsensorStatus.status = sensorStatus.status;
        } else {
          currentInterfaceStatus.statusCommands.push(sensorStatus);
        }
      });
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      // eslint-disable-next-line no-param-reassign
      currentInterfaceStatus.status = interfaceStatus.status;
    });

    return this.sharedStore.getState();
  }
}
