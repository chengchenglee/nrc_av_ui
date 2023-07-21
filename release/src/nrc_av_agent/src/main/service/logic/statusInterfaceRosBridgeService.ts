import { exec, spawn } from 'child_process';
import util from 'util';
import { Draft } from '@reduxjs/toolkit';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
// eslint-disable-next-line import/no-extraneous-dependencies
import { promise } from 'ping';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Ros, Topic } from 'roslib';
import * as constants from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';
import { IRosBridgeMessage, ROS_BRIDGE, ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { delayInMs, getAVPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IBrowserWindowService,
  IChildProcess,
  ICommunication,
  IStatusInterfaceRosBridgeService
} from '../../inversify/interfaces';

const GET_INTERFACE_DETAIL_STATUS = 'nissan/vehicle/interface/detail/status';
@injectable()
export default class StatusInterfaceRosBridgeService implements IStatusInterfaceRosBridgeService {
  private rosBridgeConnection: Ros;

  private sharedStore;

  private topicMap: Map<string, constants.AlgorithmsTopic | constants.SensorsTopic>;

  private topicList: Topic[];

  // eslint-disable-next-line no-undef
  private topicPollingList: NodeJS.Timer[];

  // This ping will check for machine and interface state since Ros-Bridge can't check those.
  // This will also check if any topic died since state only get process message recieved from topic
  // eslint-disable-next-line no-undef
  private passivePing!: NodeJS.Timer;

  constructor(
    @inject(TYPES.BrowserWindowService) private browserWindowService: IBrowserWindowService,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.Communication) private commSvc: ICommunication
  ) {
    this.topicMap = new Map();
    this.topicList = [];
    this.topicPollingList = [];
    const initialValue: constants.InterfaceStatus = {
      interfaceName: '',
      machines: [],
      sensors: [],
      algorithms: []
    };
    this.sharedStore = createSharedStore<constants.InterfaceStatus>(initialValue);
    this.rosBridgeConnection = new Ros({
      url: `${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}`
    });
    this.sharedStore.subscribe((state) => {
      this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, state);
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][initStatusChecking]', log.debug)
  async initStatusChecking(tries = 1): Promise<void> {
    try {
      await this.rosBridgeInit();
      log.info('[StatusInterfaceRosBridgeService][initStatusChecking] Ros-Bridge init completed!');
      return;
    } catch (err) {
      log.error(`[StatusInterfaceRosBridgeService][initStatusChecking] ${err}, attempt: ${tries}`);
      if (tries >= ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_RETRY) {
        throw err;
      } else {
        const nextInitAttempt = tries + 1;
        // Delay before initializing
        log.info(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][initStatusChecking] Waiting to init attempt: ${nextInitAttempt} after ${ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_BUFFER_TIME} ms`
        );
        await delayInMs(ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_BUFFER_TIME);
        log.info(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][initStatusChecking] Initializing attempt: ${nextInitAttempt}`
        );
        await this.initStatusChecking(nextInitAttempt);
      }
    }
  }

  @logMethod('[StatusInterfaceRosBridgeService][rosBridgeInit]', log.debug)
  private rosBridgeInit(): Promise<void> {
    this.childProcessSvc.execAndForget(this.childProcessSvc.buildCommand('roscore', ''));
    const rosBridgePing = this.childProcessSvc.execAndWait(
      this.childProcessSvc.buildCommand(`${ROS_COMMAND.PING_NODE} /rosbridge_websocket`, '')
    );
    return new Promise((resolve, rejects) => {
      let timeout = false;
      const timeoutId = setTimeout(async () => {
        timeout = true;
        await this.startRosBridgeServer().catch((err) => {
          log.error(`[StatusInterfaceRosBridgeService][rosBridgeInit] ${err}`);
          rejects(new Error(err));
        });
        log.info(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][rosBridgeInit] Ros-Bridge server started at ${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}`
        );
        resolve();
      }, ROS_BRIDGE.ROS_BRIDGE_SERVER_TIMEOUT);
      rosBridgePing
        .then((result) => {
          this.browserWindowService.sendToRenderer(
            ipcMsg.M2R.VEHICLE_STATUS,
            constants.EnumVehicleStatusState.ROS_BRIDGE_INIT
          );
          if (result.includes('ERROR')) throw Error(result);
          if (!result.includes('cannot ping [/rosbridge_websocket]: unknown node') && !timeout) {
            this.isRosBridgeStartedOnPort()
              .then((started) => {
                if (started) {
                  clearTimeout(timeoutId);
                  log.info(
                    // eslint-disable-next-line max-len
                    `[StatusInterfaceRosBridgeService][rosBridgeInit]: Ros-Bridge already running at ${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}`
                  );
                  resolve();
                }
              })
              .catch((err) => {
                clearTimeout(timeoutId);
                log.error(`[StatusInterfaceRosBridgeService][rosBridgeInit] ${err}`);
                rejects(err);
              });
          }
        })
        .catch(() => {
          clearTimeout(timeoutId);
          this.startRosBridgeServer()
            .then(() => {
              log.info(
                // eslint-disable-next-line max-len
                `[StatusInterfaceRosBridgeService][rosBridgeInit] Ros-Bridge server started at ${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}`
              );
              resolve();
            })
            .catch((err) => {
              log.error(`[StatusInterfaceRosBridgeService][rosBridgeInit] ${err}`);
              rejects(err);
            });
        });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][isRosBridgeStartedOnPort]', log.debug)
  private async isRosBridgeStartedOnPort(): Promise<boolean> {
    const bridgePid = await this.childProcessSvc.execAndWait('pgrep -f rosbridge_websocket');
    const rosNodeList = await this.childProcessSvc.execAndWait(
      this.childProcessSvc.buildCommand('rosnode list', '')
    );
    const execPromise = util.promisify(exec);
    return new Promise((resolve, rejects) => {
      execPromise(`lsof -i :${ROS_BRIDGE.SOCKET_PORT}`)
        .then(({ stdout }) => {
          const items = stdout.split('\n').slice(1);
          const pidIndex = 1;
          let tcpListenPort = '';
          // There can only be tcp listen connection on 1 port
          items.forEach((item) => {
            const values = item.trim().split(/\s+/);
            const pid = parseInt(values[pidIndex], 10);
            // Only get Listen and TCP, UDP doesn't matter in this case
            if (values.length > 1 && values[9].includes('LISTEN') && values[7].includes('TCP')) {
              tcpListenPort = pid.toString();
            }
          });
          if (!tcpListenPort) {
            log.info(
              // eslint-disable-next-line max-len
              '[StatusInterfaceRosBridgeService][isRosBridgeStartedOnPort] Ros-Bridge server port is available'
            );
            resolve(false);
          }
          if (bridgePid.split('\n').includes(tcpListenPort)) {
            if (rosNodeList.includes('/rosbridge_websocket')) {
              resolve(true);
            } else {
              log.info(
                // eslint-disable-next-line max-len
                `[StatusInterfaceRosBridgeService][isRosBridgeStartedOnPort] Clearing old Ros-Bridge server port: ${tcpListenPort}`
              );
              this.childProcessSvc.execAndForget(`fuser -k -TERM -n tcp ${ROS_BRIDGE.SOCKET_PORT}`);
              resolve(false);
            }
          } else {
            log.error(
              // eslint-disable-next-line max-len
              `[StatusInterfaceRosBridgeService][isRosBridgeStartedOnPort] Port occupied by another process that is not Ros-Bridge server: ${tcpListenPort}`
            );
            rejects(
              new Error(
                // eslint-disable-next-line max-len
                `Port occupied by another process that is not Ros-Bridge server, Pid: ${tcpListenPort}, port: ${ROS_BRIDGE.SOCKET_PORT}`
              )
            );
          }
        })
        .catch((err) => {
          if (!err.stderr || !err.stdout) {
            // Most likely cause of this error is there isn't
            // anything pub or sub to this specific port
            log.info(
              // eslint-disable-next-line max-len
              '[StatusInterfaceRosBridgeService][isRosBridgeStartedOnPort] Ros-Bridge server port is available'
            );
            resolve(false);
          } else rejects(new Error('Cant get machine port process id'));
        });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][startRosBridgeServer]', log.debug)
  private startRosBridgeServer(): Promise<void> {
    return new Promise((resolve, rejects) => {
      this.isRosBridgeStartedOnPort()
        .then((started) => {
          if (started) {
            resolve();
          } else {
            const child = spawn(
              this.childProcessSvc.buildCommand(
                // eslint-disable-next-line max-len
                `roslaunch rosbridge_server rosbridge_websocket.launch port:=${ROS_BRIDGE.SOCKET_PORT}`,
                ''
              ),
              {
                shell: true
              }
            );
            child.once('spawn', () => {
              log.info(
                // eslint-disable-next-line max-len
                `[StatusInterfaceRosBridgeService][startRosBridgeServer] Ros-Bridge server init at ${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}`
              );
              resolve();
            });
            child.once('error', (err) => {
              log.error(`[StatusInterfaceRosBridgeService][startRosBridgeServer] ${err}`);
              rejects(err);
            });
          }
        })
        .catch((err) => {
          log.error(`[StatusInterfaceRosBridgeService][startRosBridgeServer] ${err}`);
          rejects(err);
        });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][rosBridgeConnect]', log.debug)
  async rosBridgeConnect(connectionAttempt = 1): Promise<void> {
    await this.rosBridgeConnectTries(connectionAttempt).catch(async (err) => {
      if (connectionAttempt >= ROS_BRIDGE.ROS_BRIDGE_CONNECTION_RETRY) {
        log.error(`[StatusInterfaceRosBridgeService][rosBridgeConnect] ${err.toString()}`);
        throw err;
      } else {
        this.browserWindowService.sendToRenderer(
          ipcMsg.M2R.VEHICLE_STATUS,
          constants.EnumVehicleStatusState.ROS_CONNECTION_INIT
        );
        const nextConnectionAttempt = connectionAttempt + 1;
        // Delay before making new connection
        log.info(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][rosBridgeConnect] Waiting to connect attempt: ${nextConnectionAttempt} after ${ROS_BRIDGE.ROS_BRIDGE_CONNECTION_BUFFER_TIME} ms`
        );
        await delayInMs(ROS_BRIDGE.ROS_BRIDGE_CONNECTION_BUFFER_TIME);
        log.info(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][rosBridgeConnect] Connection attempt: ${nextConnectionAttempt}`
        );
        await this.rosBridgeConnect(nextConnectionAttempt);
      }
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][rosBridgeConnectTries]', log.debug)
  private rosBridgeConnectTries(connectionAttempt: number): Promise<void> {
    return new Promise((resolve, rejects) => {
      const timeoutId = setTimeout(() => {
        log.error(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][rosBridgeConnectTries] Connection to Ros-Bridge timeout after: ${ROS_BRIDGE.ROS_BRIDGE_CONNECTION_TIMEOUT}, connection attempt = ${connectionAttempt}`
        );
        this.rosBridgeConnection.removeAllListeners();
        rejects(
          new Error(
            // eslint-disable-next-line max-len
            `Connection timeout after: ${ROS_BRIDGE.ROS_BRIDGE_CONNECTION_TIMEOUT}, connection attempt = ${connectionAttempt}`
          )
        );
      }, ROS_BRIDGE.ROS_BRIDGE_CONNECTION_TIMEOUT);

      this.rosBridgeConnection.removeAllListeners();
      this.rosBridgeConnection.once('error', (err) => {
        clearTimeout(timeoutId);
        log.error(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][rosBridgeConnectTries] Connection to Ros-Bridge error: ${err.toString()} = ${connectionAttempt}`
        );
        rejects(new Error(err.toString()));
      });
      this.rosBridgeConnection.connect(`${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}`);
      if (this.rosBridgeConnection.isConnected) {
        this.rosBridgeConnection.removeAllListeners();
        clearTimeout(timeoutId);
        log.info(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][rosBridgeConnectTries] Connected to Ros-Bridge at ${ROS_BRIDGE.SOCKET_URL}:${ROS_BRIDGE.SOCKET_PORT}, connection attempt = ${connectionAttempt}`
        );
        resolve();
      }
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][setStatusInterface]', log.debug)
  async setStatusInterface(dataInterface: constants.Interface): Promise<void> {
    const status = await this.updateInterfaceStatus(dataInterface);
    const result = this.updateStatusState(status);
    if (!this.getRosBridgeConnection().isConnected) await this.rosBridgeConnect();
    this.subscribeToAllTopics(result);
    this.passivePing = setInterval(async () => {
      await this.processNonTopicMapState();
    }, ROS_BRIDGE.ROS_BRIDGE_PASSIVE_PING_INTERVAL);
    this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, result);
    return Promise.resolve();
  }

  @logMethod('[StatusInterfaceRosBridgeService][getTopicTypeAndSubscribe]', log.debug)
  private getTopicTypeAndSubscribe(topicName: string) {
    this.rosBridgeConnection.getTopicType(topicName, (type) => {
      if (type) {
        this.subscribeToTopic(topicName, type);
      } else {
        // Most likely topic haven't finished initializing yet, we will poll for it!
        log.warn(
          // eslint-disable-next-line max-len
          `[StatusInterfaceRosBridgeService][getTopicTypeAndSubscribe]: Topic ${topicName} haven't finished initializing yet ! Polling the topic on ${ROS_BRIDGE.ROS_BRIDGE_TOPIC_POLL_TIME} ms interval`
        );
        const topicPolling = setInterval(() => {
          this.rosBridgeConnection.getTopicType(topicName, (typePolling) => {
            if (typePolling) {
              clearInterval(topicPolling);
              log.info(
                // eslint-disable-next-line max-len
                `[StatusInterfaceRosBridgeService][getTopicTypeAndSubscribe]: Topic ${topicName} initialized !`
              );
              this.subscribeToTopic(topicName, typePolling);
            }
          });
        }, ROS_BRIDGE.ROS_BRIDGE_TOPIC_POLL_TIME);
        this.topicPollingList.push(topicPolling);
      }
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][subscribeToAllTopics]', log.debug)
  private subscribeToAllTopics(dataInterfaceStatus: constants.InterfaceStatus) {
    if (!this.rosBridgeConnection.isConnected) {
      this.rosBridgeConnect();
    }
    this.unSubscribeToAllTopics();
    dataInterfaceStatus.algorithms.forEach((item) => {
      this.topicMap.set(item.topicName, {
        ...item,
        avgDowntimeInit: 0,
        lastGlobalStamp: 0,
        lastMsgStamp: 0
      });
      this.getTopicTypeAndSubscribe(item.topicName);
    });
    dataInterfaceStatus.sensors.forEach((item) => {
      this.topicMap.set(item.topicName, {
        ...item,
        avgDowntimeInit: 0,
        lastGlobalStamp: 0,
        lastMsgStamp: 0
      });
      this.getTopicTypeAndSubscribe(item.topicName);
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][subscribeToTopic]', log.debug)
  private subscribeToTopic(topicName: string, topicTypeName: string) {
    const topic = new Topic({
      ros: this.rosBridgeConnection,
      name: topicName,
      messageType: topicTypeName,
      reconnect_on_close: true
    });
    topic.subscribe((message) => {
      const res = message as IRosBridgeMessage;
      this.processTopicData(topicName, res.header.stamp.secs);
    });
    log.info(
      // eslint-disable-next-line max-len
      `[StatusInterfaceRosBridgeService][subscribeToTopic]: Subscribed to topic: ${topicName}, topic type: ${topicTypeName}`
    );
    this.topicList.push(topic);
  }

  @logMethod('[StatusInterfaceRosBridgeService][processTopicData]', log.debug)
  private processTopicData(topicName: string, sec: number) {
    const topicObj = this.topicMap.get(topicName);
    if (topicObj && topicObj !== undefined) {
      const stampsString = sec;
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
    this.processTopicMapState();
  }

  @logMethod('[StatusInterfaceRosBridgeService][processNonTopicMapState]', log.debug)
  private async processNonTopicMapState() {
    this.sharedStore.getState();
    const machinesStatus = await Promise.all(
      this.sharedStore.getState().machines.map((machine) => this.checkMachineStatus(machine))
    );
    const interfaceStatus = await this.checkInterfaceStatus();
    this.sharedStore.setState((state) => {
      // eslint-disable-next-line no-param-reassign
      state.machines = machinesStatus;
      // eslint-disable-next-line no-param-reassign
      state.status = interfaceStatus;
    });
    this.processTopicMapState();
  }

  @logMethod('[StatusInterfaceRosBridgeService][processTopicMapState]', log.debug)
  private processTopicMapState() {
    this.sharedStore.setState((state) => {
      state.sensors.forEach((sensor) => {
        const sensorTopic = this.topicMap.get(sensor.topicName);
        if (sensorTopic && sensorTopic !== undefined) {
          const color = this.calRate(sensorTopic.lastGlobalStamp, sensorTopic.avgDowntimeInit);
          let updatedStatus = constants.RosTopicStatusType.BAD;
          if (color > sensorTopic.warnRate) {
            updatedStatus = constants.RosTopicStatusType.GOOD;
          } else if (color > sensorTopic.errRate) {
            updatedStatus = constants.RosTopicStatusType.TERRIBLE;
          }
          // eslint-disable-next-line no-param-reassign
          sensor.status = updatedStatus;
        }
      });
      state.algorithms.forEach((algorithm) => {
        const algorithmTopic = this.topicMap.get(algorithm.topicName);
        if (algorithmTopic && algorithmTopic !== undefined) {
          const color = this.calRate(
            algorithmTopic.lastGlobalStamp,
            algorithmTopic.avgDowntimeInit
          );
          let updatedStatus = constants.RosTopicStatusType.BAD;
          if (color > algorithmTopic.warnRate) {
            updatedStatus = constants.RosTopicStatusType.GOOD;
          } else if (color > algorithmTopic.errRate) {
            updatedStatus = constants.RosTopicStatusType.TERRIBLE;
          }
          // eslint-disable-next-line no-param-reassign
          algorithm.status = updatedStatus;
        }
      });
    });
  }

  @logMethod('[StatusInterfaceRosBridgeService][calRate]', log.debug)
  private calRate(lastGlobalStamp: number, avgDowntimeInit: number) {
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
  clearCache(): void {
    if (this.passivePing) {
      clearInterval(this.passivePing);
    }
    this.topicPollingList.forEach((topicPoll) => {
      clearInterval(topicPoll);
    });
    this.topicPollingList = [];
    this.unSubscribeToAllTopics();
    const resetState = (draft: Draft<constants.InterfaceStatus>) => {
      // eslint-disable-next-line no-param-reassign
      draft.interfaceName = '';
      // eslint-disable-next-line no-param-reassign
      draft.machines = [];
      // eslint-disable-next-line no-param-reassign
      draft.sensors = [];
      // eslint-disable-next-line no-param-reassign
      draft.algorithms = [];
      // eslint-disable-next-line no-param-reassign
      draft.status = constants.InterfaceFileStatusType.STOPPED;
    };
    this.sharedStore.setState(resetState);
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosBridgeConnection]', log.debug)
  getRosBridgeConnection(): Ros {
    return this.rosBridgeConnection;
  }

  @logMethod('[StatusInterfaceRosBridgeService][getRosNodes]', log.debug)
  getRosNodes(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // @TODO Should most likely both check if Ros-Bridge is alive and if we can connect to it
      if (!this.rosBridgeConnection.isConnected) {
        this.rosBridgeConnectTries(1).catch((err) => {
          log.error(`[StatusInterfaceRosBridgeService][getRosNodes] ${err}`);
          reject(new Error(err));
        });
      }
      this.rosBridgeConnection.getNodes(
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
      status: interfaceStatus
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

  private async checkInterfaceStatus(): Promise<constants.InterfaceFileStatusType> {
    const modifiedStatus = this.sharedStore.getState();
    try {
      if (modifiedStatus.interfaceName === '') {
        return constants.InterfaceFileStatusType.STOPPED;
      }
      const results = await this.childProcessSvc.execAndWait(
        `pgrep --full ${getAVPath()}/ros_core.py`
      );
      if (results !== '') {
        modifiedStatus.status = constants.InterfaceFileStatusType.RUNNING;
      } else {
        modifiedStatus.status = constants.InterfaceFileStatusType.STOPPED;
      }
    } catch (err) {
      if (modifiedStatus.status === constants.InterfaceFileStatusType.RUNNING) {
        modifiedStatus.status = constants.InterfaceFileStatusType.STOPPED;
      }
    }
    if (modifiedStatus.status !== undefined) {
      return modifiedStatus.status;
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
