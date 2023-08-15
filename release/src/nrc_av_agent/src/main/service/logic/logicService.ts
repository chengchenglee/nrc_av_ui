import log from 'electron-log';
import { inject, injectable } from 'inversify';
import {
  IResponse,
  EnumVehicleStatusState,
  EnumVehicleConnectionState
} from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';
import { APP_CONFIG, COMMUNICATION, SOCKET } from '../../constants';
import TYPES from '../../inversify/types';
import { logMethod } from '../log/logDecorator';
import type { IHostConfig, IVehicleInfoConfig } from '../../../shared/configurationTypes';
import type {
  IBrowserWindowService,
  ICommunication,
  IConfiguration,
  ILogic,
  IInterfaceFileService,
  IRosService,
  IChildProcess,
  IStatusInterfaceRosBridgeService,
  IStatusCommands
} from '../../inversify/interfaces';

enum SocketEventEnum {
  REGISTRATION_REQUEST = 'nissan/vehicle/registration-request',
  VEHICLE_REGISTRATION = 'nissan/vehicle/registration',
  REGISTRATION_RESPONSE = 'nissan/vehicle/registration-response',
  VEHICLE_ACTIVATION = 'nissan/vehicle/activation',
  VEHICLE_STATUS = 'nissan/vehicle/status',
  VEHICLE_MACHINES_STATUS = 'nissan/vehicle/machines/status',
  VEHICLE_UPDATION = 'nissan/vehicle/updation',

  RUN_COMMANDS = 'nissan/interface/exec/command',
  RUN_ALL_INTERFACE_COMMANDS = 'nissan/interface/exec-all/command',
  STOP_COMMANDS = 'nissan/interface/stop/command',
  CHANGE_MAP = 'nissan/interface/changemap',

  RUN_INTERFACE = 'nissan/interface/run',
  STOP_INTERFACE = 'nissan/interface/stop'
}

@injectable()
export default class LogicService implements ILogic {
  constructor(
    @inject(TYPES.Communication) private commSvc: ICommunication,
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.BrowserWindowService) private browserWindowService: IBrowserWindowService,
    @inject(TYPES.InterfaceFileService) private interfaceFileSvc: IInterfaceFileService,
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.StatusInterfaceRosBridgeService)
    private statusInterfaceRosBridgeSvc: IStatusInterfaceRosBridgeService,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands
  ) {
    this.statusInterfaceRosBridgeSvc.initStatusInterface();
    this.commandsStatusSvc.initStatusChecking();
  }

  @logMethod('[LogicService][init]')
  init(): void {
    try {
      const certKey = this.configSvc.getConfig<IVehicleInfoConfig>(APP_CONFIG.VEHICLE, 'certKey');
      const name = this.configSvc.getConfig<IVehicleInfoConfig>(APP_CONFIG.VEHICLE, 'name');
      const model = this.configSvc.getConfig<IVehicleInfoConfig>(APP_CONFIG.VEHICLE, 'model');
      log.info('[LogicService][init] certKey: ', certKey);

      const serverUrl = `${this.configSvc.getConfig<IHostConfig>(APP_CONFIG.CONNECTION, 'host')}/${
        SOCKET.NAME_SPACE
      }`;
      log.info('[LogicService][init] connect to: ', serverUrl);
      this.commSvc
        .connect(serverUrl, {
          extraHeaders: {
            certkey: certKey,
            name,
            model
          }
        })
        .catch((err) => {
          log.error('[LogicService][init] connect socket failed: ', err);
        });

      log.info('[LogicService][init] register event listeners ');
      this.commSvc.addEventHandler(
        SocketEventEnum.REGISTRATION_REQUEST,
        this.registerVehicle.bind(this)
      );

      this.commSvc.addEventHandler(
        SocketEventEnum.REGISTRATION_RESPONSE,
        (data, replyOnChannel) => {
          replyOnChannel({
            status: 'success',
            data: data.certKey
          });
        }
      );
      this.commSvc.addEventHandler(
        SocketEventEnum.VEHICLE_ACTIVATION,
        this.handleActivation.bind(this)
      );

      this.commSvc.addEventHandler(SocketEventEnum.VEHICLE_STATUS, this.handleStatus.bind(this));

      this.commSvc.addEventHandler(
        SocketEventEnum.RUN_COMMANDS,
        this.rosSvc.runCommands.bind(this.rosSvc)
      );
      this.commSvc.addEventHandler(
        SocketEventEnum.RUN_ALL_INTERFACE_COMMANDS,
        this.rosSvc.runAllCommands.bind(this.rosSvc)
      );
      this.commSvc.addEventHandler(
        SocketEventEnum.STOP_COMMANDS,
        this.rosSvc.stopCommands.bind(this.rosSvc)
      );
      this.commSvc.addEventHandler(
        SocketEventEnum.RUN_INTERFACE,
        this.interfaceFileSvc.runInterface.bind(this.interfaceFileSvc)
      );
      this.commSvc.addEventHandler(
        SocketEventEnum.CHANGE_MAP,
        this.rosSvc.changeMap.bind(this.rosSvc)
      );
      this.commSvc.addEventHandler(
        SocketEventEnum.STOP_INTERFACE,
        this.interfaceFileSvc.stopInterface.bind(this.interfaceFileSvc)
      );
      this.commSvc.addEventHandler('disconnect', this.onDisconnect.bind(this));
      this.commSvc.addEventHandler('connect', this.onConnect.bind(this));
    } catch (err) {
      log.error(`[LogicService][init] ${err}`);
    }
  }

  @logMethod('[LogicService][reInit]')
  reInit(): void {
    this.commSvc.disconnect();
    this.init();
    this.browserWindowService.reload();
  }

  @logMethod('[LogicService][cleanup]')
  cleanup(): void {
    try {
      this.childProcessSvc.execAndForget('pkill -f ros');
      this.commSvc.disconnect();
    } catch (err) {
      log.error(`[LogicService][cleanup] ${err}`);
    }
  }

  @logMethod('[LogicService][onDisconnect]')
  private onDisconnect(reason: string) {
    this.browserWindowService.sendToRenderer(ipcMsg.M2R.VEHICLE_CONNECTION_STATUS, {
      vehicleConnectionStatus: EnumVehicleConnectionState.OFFLINE,
      vehicleOfflineReason: reason
    });
    log.info(`[LogicService][onDisconnect] ${reason}`);
  }

  @logMethod('[LogicService][onConnect]')
  private onConnect() {
    this.browserWindowService.sendToRenderer(ipcMsg.M2R.VEHICLE_CONNECTION_STATUS, {
      vehicleConnectionStatus: EnumVehicleConnectionState.ONLINE
    });
    log.info('[LogicService][onConnect] Connected to server');
  }

  @logMethod('[LogicService][registerVehicle]')
  private registerVehicle(_: unknown, replyOnChannel: (response: IResponse) => void) {
    try {
      const vehicleInfo = this.configSvc.getConfigs<IVehicleInfoConfig>(APP_CONFIG.VEHICLE);
      log.debug(`[LogicService][registerVehicle] vehicleInfo: ${JSON.stringify(vehicleInfo)}`);
      this.commSvc.send(SocketEventEnum.VEHICLE_REGISTRATION, vehicleInfo);
      replyOnChannel({
        status: 'success',
        data: vehicleInfo
      });
      log.info('[LogicService][registerVehicle] success');
    } catch (err) {
      log.error(`[LogicService][registerVehicle] ${err}`);
    }
  }

  @logMethod('[LogicService][updateVehicle]')
  async updateVehicle(): Promise<any> {
    try {
      const vehicleInfo = this.configSvc.getConfigs<IVehicleInfoConfig>(APP_CONFIG.VEHICLE);
      log.debug(`[LogicService][updateVehicle] vehicleInfo: ${JSON.stringify(vehicleInfo)}`);
      const response = await this.commSvc.send(SocketEventEnum.VEHICLE_UPDATION, vehicleInfo);
      log.info('[LogicService][updateVehicle] success');
      return response;
    } catch (err) {
      log.error(`[LogicService][updateVehicle] ${err}`);
    }
    return undefined;
  }

  @logMethod('[LogicService][getStatusVehicle]')
  getStatusVehicle() {
    try {
      this.commSvc.sendNoAck(SocketEventEnum.VEHICLE_STATUS);
      log.info('[LogicService][getStatusVehicle] success');
    } catch (err) {
      log.error(`[LogicService][getStatusVehicle] ${err}`);
    }
  }

  @logMethod('[LogicService][handleActivation]')
  private handleActivation(
    data: IVehicleInfoConfig,
    replyOnChannel: (response: IResponse) => void
  ) {
    try {
      const idReceived = data.certKey;
      const idSaved = this.configSvc.getConfig<IVehicleInfoConfig>(APP_CONFIG.VEHICLE, 'certKey');
      log.debug(`[LogicService][handleActivation] serverCertkey: ${idReceived}`);
      log.debug(`[LogicService][handleActivation] agentCertkey: ${idSaved}`);
      if (idReceived === idSaved) {
        replyOnChannel({
          status: 'success',
          data: idSaved
        });
        log.info('[LogicService][handleActivation] activated: ', idSaved);
      } else {
        replyOnChannel({
          status: 'error',
          message: COMMUNICATION.CERTKEY_NOT_FOUND
        });
        log.warn('[LogicService][handleActivation] ', COMMUNICATION.CERTKEY_NOT_FOUND);
      }
    } catch (err) {
      log.error(`[LogicService][handleActivation] ${err}`);
    }
  }

  @logMethod('[LogicService][handleStatus]', log.debug)
  private handleStatus(
    data: EnumVehicleStatusState,
    replyOnChannel: (response: IResponse) => void
  ) {
    this.browserWindowService.sendToRenderer(ipcMsg.M2R.VEHICLE_STATUS, data);
    replyOnChannel({
      status: 'success',
      data
    });
  }
}
