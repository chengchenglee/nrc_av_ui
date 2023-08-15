import log from 'electron-log';
import { inject, injectable } from 'inversify';
import { IHostConfig } from '../../../shared/configurationTypes';
import * as constants from '../../../shared/constants';
import { APP_CONFIG, INTERFACE_FILE, ROS, ROS_BRIDGE, ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { logMethod } from '../log/logDecorator';
import type {
  IChildProcess,
  IConfiguration,
  IInterfaceFileService,
  IRosBridgeConnectionService,
  IRosBridgeServerService,
  IRosService,
  IStatusInterfaceRosBridgeService,
  IStatusCommands
} from '../../inversify/interfaces';

@injectable()
export default class InterfaceFileService implements IInterfaceFileService {
  constructor(
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusInterfaceRosBridgeService)
    private statusInterfaceRosBridgeSvc: IStatusInterfaceRosBridgeService,
    @inject(TYPES.RosBridgeServerService) private rosBridgeServerService: IRosBridgeServerService,
    @inject(TYPES.RosBridgeConnectionService)
    private rosBridgeConnectionService: IRosBridgeConnectionService,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands
  ) {}

  @logMethod('[InterfaceFileService][runInterface]')
  async runInterface(
    dataInterface: constants.Interface,
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    try {
      log.debug('[InterfaceFileService][runInterface] fileName: ', dataInterface.name);

      const interfaceRunning = this.statusInterfaceRosBridgeSvc.interfaceRunning();
      const pingRosCore = await this.childProcessSvc.execAndWait(
        this.childProcessSvc.buildCommand(`${ROS_COMMAND.PING_NODE} rosout`, '')
      );
      if (
        interfaceRunning.status === constants.InterfaceFileStatusType.RUNNING &&
        interfaceRunning.interfaceName !== '' &&
        pingRosCore.length > 0
      ) {
        replyOnChannel({
          status: 'error',
          message: `${interfaceRunning.interfaceName} ${INTERFACE_FILE.IS_RUNNING}`
        });
        return;
      }
      this.rosSvc.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.DEACTIVE);
      try {
        const rosConnection = await this.rosBridgeConnectionService.getRosBridgeConnection(5);
        const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodes(rosConnection);
        await this.statusInterfaceRosBridgeSvc.clearCache();
        const nodesName = nodes.map((a) => a.replace('/', ''));
        const filteredNodes = nodesName.filter(
          (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
        );
        this.childProcessSvc.execAndForget(
          this.childProcessSvc.buildCommand(`rosnode kill ${filteredNodes.join(' ')}`, '')
        );
        const results = await this.childProcessSvc.waitForResultAndReturn(
          replyOnChannel,
          '/rosout'
        );
        log.debug(`[InterfaceFileService][runInterface] results: ${results}`);
        if (results === ROS.SUCCESS) {
          this.setParams(dataInterface.name, dataInterface.mapName);
          replyOnChannel({ status: 'success', data: ROS.SUCCESS });
        }
        // Kill all process echo topic before run new interface
        this.killProcessEchoTopic();
        await this.statusInterfaceRosBridgeSvc.setStatusInterface(dataInterface);
      } catch (err) {
        this.stopAllNodes();
        await this.rosBridgeServerService.rosBridgeReInit(true, true);
        await this.rosBridgeConnectionService.getRosBridgeConnection();
        await this.statusInterfaceRosBridgeSvc.clearCache();
        log.error(`[InterfaceFileService][runInterface] ${err}`);
        const results = await this.childProcessSvc.waitForResultAndReturn(
          replyOnChannel,
          '/rosout'
        );
        log.debug(`[InterfaceFileService][runInterface] results: ${results}`);
        if (results === ROS.SUCCESS) {
          replyOnChannel({ status: 'success', data: ROS.SUCCESS });
          this.setParams(dataInterface.name, dataInterface.mapName);
        }
        // Kill all process echo topic before run new interface
        this.killProcessEchoTopic();
        await this.statusInterfaceRosBridgeSvc.setStatusInterface(dataInterface);
      }
    } catch (err) {
      log.error(`[InterfaceFileService][runInterface] error: ${err}`);
    }
  }

  @logMethod('[InterfaceFileService][stopInterface]')
  async stopInterface(
    interfaceName: string,
    replyOnChannel: (response: constants.IResponse) => void
  ): Promise<void> {
    try {
      log.debug('[InterfaceFileService][stopInterface] fileName: ', interfaceName);
      const interfaceRunning = await this.statusInterfaceRosBridgeSvc.interfaceRunning();
      if (interfaceRunning.interfaceName === interfaceName) {
        log.info(
          '[InterfaceFileService][stopInterface] interface is running, start killing interface...'
        );
        try {
          const rosConnection = await this.rosBridgeConnectionService.getRosBridgeConnection(5);
          const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodes(rosConnection);
          const nodesName = nodes.map((a) => a.replace('/', ''));
          const filteredNodes = nodesName.filter(
            (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
          );
          this.childProcessSvc.execAndForget(
            this.childProcessSvc.buildCommand(`rosnode kill ${filteredNodes.join(' ')}`, '')
          );
        } catch (err) {
          this.stopAllNodes();
          await this.rosBridgeServerService.rosBridgeReInit(true, true);
          await this.rosBridgeConnectionService.getRosBridgeConnection();
          log.error(`[InterfaceFileService][stopInterface] ${err}`);
        } finally {
          await this.statusInterfaceRosBridgeSvc.clearCache();
          this.deleteParams();
          this.commandsStatusSvc.resetState();
          this.rosSvc.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.DEACTIVE);
        }
        replyOnChannel({
          status: 'success',
          data: `${interfaceName} ${INTERFACE_FILE.STOP_SUCESSFULLY}`
        });
        log.info('[InterfaceFileService][stopInterface] interface is killed!');
        return;
      }
      replyOnChannel({
        status: 'error',
        message: `${interfaceName} ${INTERFACE_FILE.IS_NOT_RUNNING}`
      });
    } catch (err) {
      log.error(`[InterfaceFileService][stopInterface] ${err}`);
    }
  }

  @logMethod('[InterfaceFileService][getInterfacePath]')
  getInterfacePath() {
    const rosWS = this.configSvc.getConfig<IHostConfig>(APP_CONFIG.CONNECTION, 'rosWorkspace');
    const interfacePath = `${rosWS}/src/nrc_av_ui/av_interface`;
    return interfacePath;
  }

  private stopAllNodes(): void {
    this.childProcessSvc.execAndForget(this.childProcessSvc.buildCommand('rosnode kill -a', ''));
  }

  private killProcessEchoTopic(): void {
    this.childProcessSvc.execAndForget('kill $(pgrep -f echo)');
  }

  private deleteParams() {
    const cmdDelAgentName = 'rosparam delete /agent_name';
    const delAgentName = this.childProcessSvc.buildCommand(cmdDelAgentName, '');
    this.childProcessSvc.execAndForget(delAgentName);
    const cmdDelMap = 'rosparam delete /map_name';
    const delMapName = this.childProcessSvc.buildCommand(cmdDelMap, '');
    this.childProcessSvc.execAndForget(delMapName);
  }

  private setParams(agentName: string, mapName: string) {
    const commandAgentName = `rosparam set /agent_name "${agentName}"`;
    const setParams = this.childProcessSvc.buildCommand(commandAgentName, '');
    this.childProcessSvc.execAndForget(setParams);
    const commandDiving = 'rosrun nrc_av_ui paramsForDriving.sh';
    const paramsForDriving = this.childProcessSvc.buildCommand(commandDiving, '');
    this.childProcessSvc.execAndForget(paramsForDriving);
    const commandParamMap = `rosrun nrc_av_ui paramsForMap.sh ${mapName}`;
    const paramsForMap = this.childProcessSvc.buildCommand(commandParamMap, '');
    this.childProcessSvc.execAndForget(paramsForMap);
  }
}
