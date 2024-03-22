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
  IStatusCommands,
  ISubSystem
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
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands,
    @inject(TYPES.SubSystemService)
    private subSystemSvc: ISubSystem
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
        const nodesName = nodes.map((a) => a.replace('/', ''));
        const filteredNodes = nodesName.filter(
          (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
        );
        filteredNodes.forEach((node) => {
          this.childProcessSvc.execAndForget(
            this.childProcessSvc.buildCommand(`rosnode kill ${node}`, '')
          );
        });
        const results = await this.childProcessSvc.waitForResultAndReturn(
          replyOnChannel,
          '/rosout'
        );
        log.debug(`[InterfaceFileService][runInterface] results: ${results}`);
        if (results === ROS.SUCCESS) {
          this.setParams(dataInterface.name, dataInterface.mapName);
          replyOnChannel({ status: 'success', data: ROS.SUCCESS });
        }
      } catch (err) {
        log.error(`[InterfaceFileService][runInterface] ${err}`);
        const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodesCache();
        const nodesName = nodes.map((a) => a.replace('/', ''));
        const filteredNodes = nodesName.filter(
          (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
        );
        filteredNodes.forEach((node) => {
          this.childProcessSvc.execAndForget(
            this.childProcessSvc.buildCommand(`rosnode kill ${node}`, '')
          );
        });
        await this.rosBridgeServerService.rosBridgeReInit(true, true);
        await this.rosBridgeConnectionService.getRosBridgeConnection();
        const results = await this.childProcessSvc.waitForResultAndReturn(
          replyOnChannel,
          '/rosout'
        );
        log.debug(`[InterfaceFileService][runInterface] results: ${results}`);
        if (results === ROS.SUCCESS) {
          replyOnChannel({ status: 'success', data: ROS.SUCCESS });
          this.setParams(dataInterface.name, dataInterface.mapName);
        }
      }
    } catch (err) {
      log.error(`[InterfaceFileService][runInterface] error: ${err}`);
    } finally {
      await this.statusInterfaceRosBridgeSvc.clearCache();
      this.subSystemSvc.clearCache();
      const rosConnection = await this.rosBridgeConnectionService.getRosBridgeConnection();
      await this.statusInterfaceRosBridgeSvc.setStatusInterface(dataInterface);
      await this.statusInterfaceRosBridgeSvc.initTopicPublish(rosConnection);
    }
  }

  @logMethod('[InterfaceFileService][stopInterface]')
  async stopInterface(
    _data: string,
    replyOnChannel: (response: constants.IResponse) => void
  ): Promise<void> {
    try {
      const interfaceRunning = await this.statusInterfaceRosBridgeSvc.interfaceRunning();
      log.debug('[InterfaceFileService][stopInterface] fileName: ', interfaceRunning.interfaceName);

      log.info(
        '[InterfaceFileService][stopInterface] interface is running, start killing interface...'
      );
      try {
        // TODO it should go through running subsytems to kill one by one,
        // and each subsystem has its own stop function
        const rosConnection = await this.rosBridgeConnectionService.getRosBridgeConnection();
        const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodes(rosConnection);
        const nodesName = nodes.map((a) => a.replace('/', ''));
        const filteredNodes = nodesName.filter(
          (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
        );
        filteredNodes.forEach((node) => {
          this.childProcessSvc.execAndForget(
            this.childProcessSvc.buildCommand(`rosnode kill ${node}`, '')
          );
        });
        // eslint-disable-next-line no-restricted-syntax
        for (const subsystem of this.subSystemSvc.getSubSystem()) {
          this.subSystemSvc.stopSubSystem(subsystem.name, () => null);
        }
      } catch (err) {
        log.error(`[InterfaceFileService][stopInterface] ${err}`);
        const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodesCache();
        const nodesName = nodes.map((a) => a.replace('/', ''));
        const filteredNodes = nodesName.filter(
          (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
        );
        filteredNodes.forEach((node) => {
          this.childProcessSvc.execAndForget(
            this.childProcessSvc.buildCommand(`rosnode kill ${node}`, '')
          );
        });
        // await this.rosBridgeServerService.rosBridgeReInit(true, true);
        // await this.rosBridgeConnectionService.getRosBridgeConnection();
      } finally {
        await this.statusInterfaceRosBridgeSvc.clearCache();
        this.subSystemSvc.clearCache();
        this.deleteParams();
        this.commandsStatusSvc.resetState();
        this.rosSvc.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.DEACTIVE);
      }
      replyOnChannel({
        status: 'success',
        data: `${interfaceRunning.interfaceName} ${INTERFACE_FILE.STOP_SUCESSFULLY}`
      });
      log.info('[InterfaceFileService][stopInterface] interface is killed!');
    } catch (err) {
      log.error(`[InterfaceFileService][stopInterface] ${err}`);
    }
  }

  @logMethod('[InterfaceFileService][getInterfacePath]')
  getInterfacePath() {
    const rosWS = this.configSvc.getConfig<IHostConfig, 'rosWorkspace'>(
      APP_CONFIG.CONNECTION,
      'rosWorkspace'
    );
    const interfacePath = `${rosWS}/src/nrc_av_ui/av_interface`;
    return interfacePath;
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
    this.rosSvc.setMapName(mapName);
  }
}
