import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
// eslint-disable-next-line import/no-extraneous-dependencies
import { promise } from 'ping';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Ros, Topic } from 'roslib';
import * as constants from '../../../shared/constants';
import * as mainConstants from '../../constants';
import TYPES from '../../inversify/types';
import { logMethod } from '../log/logDecorator';
import type {
  IChildProcess,
  ICommunication,
  IRosBridgeConnectionService,
  IRosService,
  IStatusCommands,
  IStatusInterfaceRosBridgeService
} from '../../inversify/interfaces';

const GET_INTERFACE_DETAIL_STATUS = 'nissan/vehicle/interface/detail/status';
@injectable()
export default class StatusInterfaceRosBridgeService implements IStatusInterfaceRosBridgeService {
  private sharedStore;

  private topicMap: Map<string, constants.AlgorithmsTopic | constants.SensorsTopic>;

  private topicList: Topic[];

  // eslint-disable-next-line no-undef
  private topicPollingList: NodeJS.Timer[];

  constructor(
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.Communication) private commSvc: ICommunication,
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands,
    @inject(TYPES.RosBridgeConnectionService)
    private rosBridgeConnectionService: IRosBridgeConnectionService
  ) {
    this.topicMap = new Map();
    this.topicList = [];
    this.topicPollingList = [];
    const initialValue: constants.InterfaceStatus = {
      interfaceName: '',
      machines: [],
      sensors: [],
      algorithms: [],
      statusRunAll: constants.EnumStatusRunAllCommands.DEACTIVE,
      statusCommands: [],
      anyStatusUpdate: true
    };
    this.sharedStore = createSharedStore<constants.InterfaceStatus>(initialValue);
    this.sharedStore.subscribe((state) => {
      if (state.anyStatusUpdate && this.commSvc.getConnectionStatus()) {
        this.sharedStore.setState((newState) => {
          // eslint-disable-next-line no-param-reassign
          newState.anyStatusUpdate = false;
          this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, newState);
        });
      }
    });
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

  @logMethod('[StatusInterfaceRosBridgeService][setStatusInterface]', log.debug)
  async setStatusInterface(dataInterface: constants.Interface): Promise<void> {
    const status = await this.updateInterfaceStatus(dataInterface);
    status.status = constants.InterfaceFileStatusType.RUNNING;
    const result = this.updateStatusState(status);
    const rosConnection = await this.rosBridgeConnectionService.getRosBridgeConnection();
    this.subscribeToAllTopics(rosConnection, result);
    this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, result);
    return Promise.resolve();
  }

  @logMethod('[StatusInterfaceRosBridgeService][getTopicTypeAndSubscribe]', log.debug)
  private getTopicTypeAndSubscribe(rosConnection: Ros, topicName: string) {
    rosConnection.getTopicType(topicName, (type) => {
      if (type) {
        this.subscribeToTopic(rosConnection, topicName, type);
      } else {
        // Most likely topic haven't finished initializing yet, we will poll for it!
        log.warn(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][getTopicTypeAndSubscribe]: Topic ${topicName} haven't finished initializing yet ! Polling the topic on ${mainConstants.ROS_BRIDGE.ROS_BRIDGE_TOPIC_POLL_TIME} ms interval`
        );
        const topicPolling = setInterval(() => {
          rosConnection.getTopicType(topicName, (typePolling) => {
            if (typePolling) {
              clearInterval(topicPolling);
              log.info(
                // eslint-disable-next-line max-len
                `[StatusInterfaceRosBridgeService][getTopicTypeAndSubscribe]: Topic ${topicName} initialized !`
              );
              this.subscribeToTopic(rosConnection, topicName, typePolling);
            }
          });
        }, mainConstants.ROS_BRIDGE.ROS_BRIDGE_TOPIC_POLL_TIME);
        this.topicPollingList.push(topicPolling);
      }
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][subscribeToAllTopics]', log.debug)
  private subscribeToAllTopics(rosConnection: Ros, dataInterfaceStatus: constants.InterfaceStatus) {
    this.unSubscribeToAllTopics();
    dataInterfaceStatus.algorithms.forEach((item) => {
      this.topicMap.set(item.topicName, {
        ...item,
        avgDowntimeInit: 0,
        lastGlobalStamp: 0,
        lastMsgStamp: 0
      });
      this.getTopicTypeAndSubscribe(rosConnection, item.topicName);
    });
    dataInterfaceStatus.sensors.forEach((item) => {
      this.topicMap.set(item.topicName, {
        ...item,
        avgDowntimeInit: 0,
        lastGlobalStamp: 0,
        lastMsgStamp: 0
      });
      this.getTopicTypeAndSubscribe(rosConnection, item.topicName);
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][subscribeToTopic]', log.debug)
  private subscribeToTopic(rosConnection: Ros, topicName: string, topicTypeName: string) {
    const topic = new Topic({
      ros: rosConnection,
      name: topicName,
      messageType: topicTypeName
    });
    topic.subscribe((message) => {
      const res = message as mainConstants.IRosBridgeMessage;
      this.processTopicData(topicName, res);
    });
    log.info(
      // eslint-disable-next-line max-len
      `[StatusInterfaceRosBridgeService][subscribeToTopic]: Subscribed to topic: ${topicName}, topic type: ${topicTypeName}`
    );
    this.topicList.push(topic);
  }

  @logMethod('[StatusInterfaceRosBridgeService][processTopicData]', log.debug)
  private processTopicData(topicName: string, message: mainConstants.IRosBridgeMessage) {
    const topicObj = this.topicMap.get(topicName);
    if (topicObj && topicObj !== undefined) {
      const stampsString = message.header.stamp.secs;
      let stamps = Date.now() / 1000;
      if (stampsString !== null) {
        stamps = stampsString;
      }
      if (stamps < 1) {
        stamps = Date.now() / 1000;
      }
      const downtime = Math.min(5.0, Math.max(0.0, stamps - topicObj.lastMsgStamp));
      const avgDowntime = 0.99 * topicObj.avgDowntimeInit + 0.01 * downtime;
      topicObj.avgDowntimeInit = avgDowntime;

      topicObj.lastMsgStamp = stamps;
      topicObj.lastGlobalStamp = Date.now() / 1000;
      this.topicMap.set(topicName, topicObj);
    }
    this.processTopicMapState(message);
  }

  @logMethod('[StatusInterfaceRosBridgeService][processNonTopicMapState]', log.debug)
  private async processNonTopicMapState() {
    const emptyMessage: mainConstants.IRosBridgeMessage = {
      header: {
        stamp: {
          secs: 0
        }
      },
      pose: {
        position: {
          x: 0,
          y: 0,
          z: 0
        },
        orientation: {
          x: 0,
          y: 0,
          z: 0,
          w: 0
        }
      },
      twist: {
        linear: {
          x: 0,
          y: 0,
          z: 0
        },
        angular: {
          x: 0,
          y: 0,
          z: 0
        }
      }
    };
    this.processTopicMapState(emptyMessage);
    this.sharedStore.getState();
    const machinesStatus = await Promise.all(
      this.sharedStore.getState().machines.map((machine) => this.checkMachineStatus(machine))
    );
    const interfaceStatus = await this.checkInterfaceStatus();
    const rosStatusRunAll = this.rosSvc.getStatusRunAllCommands();
    const commandsStatus = this.commandsStatusSvc.getState();
    this.sharedStore.setState((state) => {
      const currentMachines = state.machines;
      // This is so passive ping would send regardless of status
      // eslint-disable-next-line no-param-reassign
      state.anyStatusUpdate = true;
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
  }

  @logMethod('[StatusInterfaceRosBridgeService][processTopicMapState]', log.debug)
  private processTopicMapState(message: mainConstants.IRosBridgeMessage) {
    this.sharedStore.setState((state) => {
      state.sensors.forEach((sensor) => {
        const sensorTopic = this.topicMap.get(sensor.topicName);
        if (sensorTopic && sensorTopic !== undefined) {
          const color = this.calRate(
            sensorTopic.lastGlobalStamp,
            sensorTopic.avgDowntimeInit,
            message,
            sensor.name
          );
          let updatedStatus = constants.RosTopicStatusType.BAD;
          if (color > sensorTopic.warnRate) {
            updatedStatus = constants.RosTopicStatusType.GOOD;
          } else if (color > sensorTopic.errRate) {
            updatedStatus = constants.RosTopicStatusType.TERRIBLE;
          }
          if (sensor.status !== updatedStatus) {
            // eslint-disable-next-line no-param-reassign
            state.anyStatusUpdate = true;
            // eslint-disable-next-line no-param-reassign
            sensor.status = updatedStatus;
          }
        }
      });
      state.algorithms.forEach((algorithm) => {
        const algorithmTopic = this.topicMap.get(algorithm.topicName);
        if (algorithmTopic && algorithmTopic !== undefined) {
          const color = this.calRate(
            algorithmTopic.lastGlobalStamp,
            algorithmTopic.avgDowntimeInit,
            message,
            algorithm.name
          );
          let updatedStatus = constants.RosTopicStatusType.BAD;
          if (color > algorithmTopic.warnRate) {
            updatedStatus = constants.RosTopicStatusType.GOOD;
          } else if (color > algorithmTopic.errRate) {
            updatedStatus = constants.RosTopicStatusType.TERRIBLE;
          }
          if (algorithm.status !== updatedStatus) {
            // eslint-disable-next-line no-param-reassign
            state.anyStatusUpdate = true;
            // eslint-disable-next-line no-param-reassign
            algorithm.status = updatedStatus;
          }
        }
      });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][calRate]', log.debug)
  private calRate(
    lastGlobalStamp: number,
    avgDowntimeInit: number,
    message: mainConstants.IRosBridgeMessage,
    name: string
  ) {
    const data = Array.from({ length: 5 }, () => [0]);
    if (name === 'GPS') {
      const v = Math.sqrt(message.twist.linear.x ** 2 + message.twist.linear.y ** 2);
      if (v > 2) {
        const dx = data[0][0] - message.pose.position.x;
        const dy = data[1][0] - message.pose.position.y;
        const dPose = Math.sqrt(dx ** 2 + dy ** 2);
        if (dPose > 1.0) {
          data[0][0] = message.pose.position.x;
          data[1][0] = message.pose.position.y;
          // eslint-disable-next-line operator-assignment
          data[2][0] = data[2][0] + dPose;
          data[3][0] = v;
        }
      } else {
        data[0][0] = message.pose.position.x;
        data[1][0] = message.pose.position.y;
        data[2][0] = 0;
        data[3][0] = v;
      }
    }
    const downtimeGlobal = Date.now() / 1000 - lastGlobalStamp;
    const downtime = Math.max(avgDowntimeInit, downtimeGlobal);
    let rate: number;
    if (downtime > 0) {
      rate = 1 / downtime;
    } else {
      rate = 0;
    }
    return rate;
  }

  @logMethod('[StatusInterfaceRosBridgeService][unSubscribeToAllTopics]', log.debug)
  private unSubscribeToAllTopics() {
    this.topicList.forEach((topic) => {
      topic.unsubscribe();
    });
    this.topicList = [];
    this.topicMap = new Map();
  }

  @logMethod('[StatusInterfaceRosBridgeService][clearCache]', log.debug)
  clearCache(): Promise<void> {
    return new Promise((resolve) => {
      this.topicPollingList.forEach((topicPoll) => {
        clearInterval(topicPoll);
      });
      this.topicPollingList = [];
      this.unSubscribeToAllTopics();
      this.sharedStore.setState((state) => {
        // eslint-disable-next-line no-param-reassign
        state.interfaceName = '';
        // eslint-disable-next-line no-param-reassign
        state.machines = [];
        // eslint-disable-next-line no-param-reassign
        state.sensors = [];
        // eslint-disable-next-line no-param-reassign
        state.algorithms = [];
        // eslint-disable-next-line no-param-reassign
        state.status = constants.InterfaceFileStatusType.STOPPED;
        // eslint-disable-next-line no-param-reassign
        state.statusRunAll = constants.EnumStatusRunAllCommands.DEACTIVE;
        // eslint-disable-next-line no-param-reassign
        state.anyStatusUpdate = true;
        resolve();
      });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosNodes]', log.debug)
  getRosNodes(rosConnection: Ros): Promise<string[]> {
    return new Promise((resolve, reject) => {
      rosConnection.getNodes(
        (nodes) => {
          resolve(nodes);
        },
        (err) => {
          log.error(`[StatusInterfaceRosBridgeService][getRosNodes] ${err}`);
          reject(new Error(err));
        }
      );
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][interfaceRunning]', log.debug)
  interfaceRunning(): constants.InterfaceStatus {
    return this.sharedStore.getState();
  }

  @logMethod('[StatusInterfaceRosBridgeService][updateInterfaceStatus]', log.debug)
  async updateInterfaceStatus(
    dataInterface: constants.Interface
  ): Promise<constants.InterfaceStatus> {
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
      statusCommands: this.commandsStatusSvc.getState(),
      anyStatusUpdate: true
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
      status: constants.RosTopicStatusType.BAD
    };
  }

  @logMethod('[StatusInterfaceRosBridgeService][checkAlgorithmStatus]', log.debug)
  private checkAlgorithmStatus(algorithm: constants.Algorithm): constants.AlgorithmsStatus {
    return {
      ...algorithm,
      status: constants.RosTopicStatusType.BAD
    };
  }

  @logMethod('[StatusInterfaceRosBridgeService][updateStatusState]', log.debug)
  private updateStatusState(interfaceStatus: constants.InterfaceStatus): constants.InterfaceStatus {
    if (
      !interfaceStatus ||
      !interfaceStatus.machines.length ||
      !interfaceStatus.sensors.length ||
      !interfaceStatus.algorithms.length
    ) {
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
      interfaceStatus.sensors.forEach((sensorStatus) => {
        const foundsensorStatus = currentInterfaceStatus.sensors.find(
          (sensor) => sensor.name === sensorStatus.name
        );

        if (foundsensorStatus) {
          foundsensorStatus.status = sensorStatus.status;
        } else {
          currentInterfaceStatus.sensors.push(sensorStatus);
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
      interfaceStatus.algorithms.forEach((algorithmStatus) => {
        const foundalgorithmStatus = currentInterfaceStatus.algorithms.find(
          (algorithm) => algorithm.name === algorithmStatus.name
        );

        if (foundalgorithmStatus) {
          foundalgorithmStatus.status = algorithmStatus.status;
        } else {
          currentInterfaceStatus.algorithms.push(algorithmStatus);
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
