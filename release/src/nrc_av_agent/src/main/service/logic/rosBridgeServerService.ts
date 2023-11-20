import { exec, spawn } from 'child_process';
import util from 'util';
import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { inject, injectable } from 'inversify';
import * as constants from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';
import { ROS_BRIDGE, ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { delayInMs, getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IBrowserWindowService,
  IChildProcess,
  IRosBridgeServerService,
  IRosService,
  IStatusInterfaceRosBridgeService
} from '../../inversify/interfaces';

@injectable()
export default class RosBridgeServerService implements IRosBridgeServerService {
  private healthCheckWorker!: UtilityProcess;

  private isRosBridgeReIniting: boolean;

  private lastMessageSent: { type: string | undefined; status: string } | undefined;

  constructor(
    @inject(TYPES.BrowserWindowService) private browserWindowService: IBrowserWindowService,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusInterfaceRosBridgeService)
    private statusInterfaceRosBridgeSvc: IStatusInterfaceRosBridgeService
  ) {
    this.isRosBridgeReIniting = false;
  }

  @logMethod('[RosBridgeServerService][rosBridgeInit]', log.info)
  async rosBridgeInit(
    maxInitAttempt = ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_RETRY,
    tries = 1
  ): Promise<void> {
    try {
      await this.rosBridgeInitTries();
      await this.pingRosBridge();
      log.info('[RosBridgeServerService][rosBridgeInit] Ros-Bridge init completed!');

      return;
    } catch (err) {
      log.error(`[RosBridgeServerService][rosBridgeInit] ${err}, attempt: ${tries}`);
      if (tries >= maxInitAttempt) {
        throw err;
      } else {
        const nextInitAttempt = tries + 1;
        // Delay before initializing
        log.info(
          // eslint-disable-next-line max-len
          `[RosBridgeServerService][rosBridgeInit] Waiting to init attempt: ${nextInitAttempt} after ${ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_BUFFER_TIME} ms`
        );
        await delayInMs(ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_BUFFER_TIME);
        log.info(
          // eslint-disable-next-line max-len
          `[RosBridgeServerService][rosBridgeInit] Initializing attempt: ${nextInitAttempt}`
        );
        await this.rosBridgeInit(maxInitAttempt, nextInitAttempt);
      }
    }
  }

  @logMethod('[RosBridgeServerService][rosBridgeReInit]', log.info)
  async rosBridgeReInit(
    createNewHealthcheck = false,
    forceReInit = false,
    maxInitAttempt = ROS_BRIDGE.ROS_BRIDGE_SERVER_INIT_RETRY
  ): Promise<void> {
    if (!this.isRosBridgeReIniting || forceReInit) {
      this.isRosBridgeReIniting = true;
      log.info('[RosBridgeServerService][rosBridgeInit] Re-initing Ros-Bridge server...');
      this.childProcessSvc.execAndForget(this.childProcessSvc.buildCommand('rosnode kill -a', ''));
      this.rosSvc.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.DEACTIVE);
      await this.rosBridgeInit(maxInitAttempt);
      this.isRosBridgeReIniting = false;
      log.info(
        // eslint-disable-next-line max-len
        '[RosBridgeServerService][rosBridgeReInit] Ros-Bridge server re-init completed!'
      );
      await this.statusInterfaceRosBridgeSvc.clearCache();
    }
    if (createNewHealthcheck) {
      log.info(
        '[RosBridgeServerService][rosBridgeInit] Re-initing Ros-Bridge healthcheck worker...'
      );
      this.rosBridgeHealthcheck(true);
      log.info(
        // eslint-disable-next-line max-len
        '[RosBridgeServerService][rosBridgeReInit] Ros-Bridge healthcheck worker re-init completed!'
      );
    }
    this.browserWindowService.sendToRenderer(
      ipcMsg.M2R.VEHICLE_STATUS,
      constants.EnumVehicleStatusState.FETCHING
    );
  }

  @logMethod('[RosBridgeServerService][pingRosBridge]', log.debug)
  private async pingRosBridge(
    maxPingAttempt = ROS_BRIDGE.ROS_BRIDGE_SERVER_PING_RETRY,
    tries = 1
  ): Promise<void> {
    try {
      const pingTimeout = setTimeout(() => {
        log.error(
          // eslint-disable-next-line max-len
          `[RosBridgeServerService][pingRosBridge] Ping tinmeout after ${ROS_BRIDGE.ROS_BRIDGE_SERVER_PING_TIMEOUT} ms!`
        );
        throw new Error(`Ping tinmeout after ${ROS_BRIDGE.ROS_BRIDGE_SERVER_PING_TIMEOUT} ms!`);
      }, ROS_BRIDGE.ROS_BRIDGE_SERVER_PING_TIMEOUT);
      const pingResult = await this.childProcessSvc.execAndWait(
        `nc -vz ${constants.ROS_BRIDGE_SOCKET.SOCKET_URL.replace('ws://', '')} ${
          constants.ROS_BRIDGE_SOCKET.SOCKET_PORT
        }`
      );
      clearTimeout(pingTimeout);
      if (!pingResult) {
        throw new Error(`Ping unsuccessful after ${tries} attempts!`);
      }
      log.info(
        // eslint-disable-next-line max-len
        `[RosBridgeServerService][pingRosBridge] Ping successful after ${tries} attempts!`
      );
      return;
    } catch (err) {
      if (tries >= maxPingAttempt) {
        throw err;
      }
      const nextPingAttempt = tries + 1;
      log.info(
        // eslint-disable-next-line max-len
        `[RosBridgeServerService][pingRosBridge] Waiting to ping attempt: ${nextPingAttempt} after ${ROS_BRIDGE.ROS_BRIDGE_SERVER_PING_BUFFER_TIME} ms`
      );
      await delayInMs(ROS_BRIDGE.ROS_BRIDGE_SERVER_PING_BUFFER_TIME);
      await this.pingRosBridge(maxPingAttempt, nextPingAttempt);
    }
  }

  @logMethod('[RosBridgeServerService][rosBridgeHealthcheck]', log.debug)
  rosBridgeHealthcheck(forced = false) {
    if (forced) {
      this.checkAndKillWorker();
    }

    if (!this.healthCheckWorker?.pid) {
      this.forkWorker();
    }

    log.debug(
      // eslint-disable-next-line max-len
      `[RosBridgeServerService][rosBridgeHealthcheck] Current worker's pid: ${this.healthCheckWorker.pid}`
    );
  }

  @logMethod('[RosBridgeServerService][forkWorker]', log.debug)
  private forkWorker() {
    log.debug('[RosBridgeServerService][forkWorker] Creating new worker...');

    this.healthCheckWorker = utilityProcess.fork(
      getWorkerPath('workerRosBridgeServerHealthcheck.js'),
      undefined,
      { serviceName: 'nrc_av_agent--ros-bridge-server-status', stdio: 'pipe' }
    );

    this.healthCheckWorker.once('spawn', this.onceWorkerSpawn.bind(this));

    this.healthCheckWorker.stdout?.on('data', this.onWorkerReceivedStdout.bind(this));

    this.healthCheckWorker.stderr?.once('data', this.onceWorkerReceivedError.bind(this));

    this.healthCheckWorker.on('message', this.onWorkerReceivedMsg.bind(this));

    this.healthCheckWorker.once('exit', this.onceWorkerExit.bind(this));
  }

  @logMethod('[RosBridgeServerService][checkAndKillWorker]', log.debug)
  private checkAndKillWorker() {
    if (!this.healthCheckWorker?.pid) {
      return;
    }
    log.warn(
      // eslint-disable-next-line max-len
      `[RosBridgeServerService][checkAndKillWorker] Killing worker with pid: ${this.healthCheckWorker.pid}`
    );
    this.healthCheckWorker.removeAllListeners();
    this.childProcessSvc.execAndWait(`kill ${this.healthCheckWorker.pid}`);
  }

  @logMethod('[RosBridgeServerService][onceWorkerSpawn]', log.debug)
  private onceWorkerSpawn() {
    if (!this.healthCheckWorker) {
      return;
    }

    log.debug(
      // eslint-disable-next-line max-len
      `[RosBridgeServerService][onceWorkerSpawn] Created new worker with pid: ${this.healthCheckWorker.pid}`
    );
    const healthCheckData: constants.ROSBridgeHealthcheckData = {
      socketUrl: constants.ROS_BRIDGE_SOCKET.SOCKET_URL,
      socketPort: constants.ROS_BRIDGE_SOCKET.SOCKET_PORT
    };
    this.healthCheckWorker.postMessage(healthCheckData);
  }

  @logMethod('[RosBridgeServerService][onWorkerReceivedStdout]', log.debug)
  private onWorkerReceivedStdout(data: any) {
    log.debug(`[RosBridgeServerService][onWorkerReceivedStdout] ${data.toString()}`);
  }

  @logMethod('[RosBridgeServerService][onceWorkerReceivedError]', log.debug)
  private onceWorkerReceivedError(data: any) {
    log.error(`[RosBridgeServerService][onceWorkerReceivedError] ${data.toString()}`);
    if (!this.isRosBridgeReIniting) {
      log.warn(
        '[RosBridgeServerService][onceWorkerReceivedError] Worker pid ' +
          `${this.healthCheckWorker.pid} detected Ros-Bridge is unresponsive!`
      );
    }
    this.rosBridgeReInit(true);
  }

  @logMethod('[RosBridgeServerService][onWorkerReceivedMsg]', log.debug)
  private onWorkerReceivedMsg(message: { type: string | undefined; status: string }) {
    // Not an error
    if (!message.type) {
      if (JSON.stringify(message) !== JSON.stringify(this.lastMessageSent)) {
        this.lastMessageSent = message;
      }
    } else {
      if (!this.isRosBridgeReIniting) {
        log.warn(
          '[RosBridgeServerService][onWorkerReceivedMsg] Worker pid ' +
            `${this.healthCheckWorker.pid} detected Ros-Bridge is unresponsive!`
        );
      }
      this.rosBridgeReInit();
    }
  }

  @logMethod('[RosBridgeServerService][onceWorkerExit]', log.debug)
  private onceWorkerExit(code: number) {
    log.warn(
      '[RosBridgeServerService][forkWorker] Worker pid ' +
        `${this.healthCheckWorker.pid} exited with code ${code}`
    );

    this.rosBridgeHealthcheck(true);
  }

  @logMethod('[RosBridgeServerService][rosBridgeInitTries]', log.debug)
  private rosBridgeInitTries(): Promise<void> {
    const rosBridgePing = this.childProcessSvc.execAndWait(
      this.childProcessSvc.buildCommand(`${ROS_COMMAND.PING_NODE} /rosbridge_websocket`, '')
    );
    return new Promise((resolve, rejects) => {
      let timeout = false;
      const timeoutId = setTimeout(() => {
        timeout = true;
        this.startRosBridgeServer()
          .then(() => {
            log.info(
              // eslint-disable-next-line max-len
              `[RosBridgeServerService][rosBridgeInitTries] Ros-Bridge server started at ${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
            );
            resolve();
          })
          .catch((err) => {
            log.error(`[RosBridgeServerService][rosBridgeInitTries] ${err}`);
            rejects(err);
          });
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
                    `[RosBridgeServerService][rosBridgeInitTries]: Ros-Bridge already running at ${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
                  );
                  resolve();
                }
              })
              .catch((err) => {
                clearTimeout(timeoutId);
                log.error(`[RosBridgeServerService][rosBridgeInitTries] ${err}`);
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
                `[RosBridgeServerService][rosBridgeInitTries] Ros-Bridge server started at ${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
              );
              resolve();
            })
            .catch((err) => {
              log.error(`[RosBridgeServerService][rosBridgeInitTries] ${err}`);
              rejects(err);
            });
        });
    });
  }

  @logMethod('[RosBridgeServerService][isRosBridgeStartedOnPort]', log.debug)
  private async isRosBridgeStartedOnPort(): Promise<boolean> {
    const bridgePid = await this.childProcessSvc.execAndWait('pgrep -f rosbridge_websocket');
    const rosNodeList = await this.childProcessSvc.execAndWait(
      this.childProcessSvc.buildCommand('rosnode list', '')
    );
    const execPromise = util.promisify(exec);
    return new Promise((resolve, rejects) => {
      execPromise(`lsof -i :${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`)
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
              '[RosBridgeServerService][isRosBridgeStartedOnPort] Ros-Bridge server port is available'
            );
            resolve(false);
          }
          if (bridgePid.split('\n').includes(tcpListenPort)) {
            if (rosNodeList.includes('/rosbridge_websocket')) {
              resolve(true);
            } else {
              log.info(
                // eslint-disable-next-line max-len
                `[RosBridgeServerService][isRosBridgeStartedOnPort] Clearing old Ros-Bridge server port: ${tcpListenPort}`
              );
              this.childProcessSvc.execAndForget(
                `fuser -k -TERM -n tcp ${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
              );
              resolve(false);
            }
          } else {
            log.error(
              // eslint-disable-next-line max-len
              `[RosBridgeServerService][isRosBridgeStartedOnPort] Port occupied by another process that is not Ros-Bridge server: ${tcpListenPort}`
            );
            rejects(
              new Error(
                // eslint-disable-next-line max-len
                `Port occupied by another process that is not Ros-Bridge server, Pid: ${tcpListenPort}, port: ${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
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
              '[RosBridgeServerService][isRosBridgeStartedOnPort] Ros-Bridge server port is available'
            );
            resolve(false);
          } else rejects(new Error('Cant get machine port process id'));
        });
    });
  }

  @logMethod('[RosBridgeServerService][startRosBridgeServer]', log.debug)
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
                `roslaunch rosbridge_server rosbridge_websocket.launch port:=${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`,
                ''
              ),
              {
                shell: true,
                detached: true,
                env: { ...process.env }
              }
            );
            child.once('spawn', () => {
              log.debug(
                // eslint-disable-next-line max-len
                `[RosBridgeServerService][startRosBridgeServer] Ros-Bridge server init at ${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
              );
              child.removeAllListeners();
              resolve();
            });
            child.once('error', (err) => {
              log.error(`[RosBridgeServerService][startRosBridgeServer] ${err}`);
              rejects(err);
            });
          }
        })
        .catch((err) => {
          log.error(`[RosBridgeServerService][startRosBridgeServer] ${err}`);
          rejects(err);
        });
    });
  }
}
