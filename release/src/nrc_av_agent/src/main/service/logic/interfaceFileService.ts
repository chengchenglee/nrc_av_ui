import log from 'electron-log';
import { inject, injectable } from 'inversify';
import { IHostConfig } from '../../../shared/configurationTypes';
import * as constants from '../../../shared/constants';
import { APP_CONFIG, INTERFACE_FILE, ROS, ROS_BRIDGE, ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { getAVPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IChildProcess,
  IConfiguration,
  IInterfaceFileService,
  IRosService,
  IStatusInterfaceFile,
  IStatusInterfaceRosBridgeService,
  IStatusInterfaceService
} from '../../inversify/interfaces';

@injectable()
export default class InterfaceFileService implements IInterfaceFileService {
  constructor(
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.StatusInterfaceFile) private interfaceFileStatusSvc: IStatusInterfaceFile,
    @inject(TYPES.StatusInterfaceService) private statusInterfaceSvc: IStatusInterfaceService,
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusInterfaceRosBridgeService)
    private statusInterfaceRosBridgeSvc: IStatusInterfaceRosBridgeService
  ) {}

  @logMethod('[InterfaceFileService][runInterface]')
  async runInterface(
    dataInterface: constants.Interface,
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    try {
      log.debug(
        '[InterfaceFileService][runInterface] fileName: ',
        dataInterface.agentInterface.mapName
      );
      const checkRosCore = await this.childProcessSvc.execAndWait(
        `ps aux | grep  ${getAVPath()}/ros_core`
      );
      const interfaceRunning = this.statusInterfaceSvc.interfaceRunning();
      const pingRosCore = await this.childProcessSvc.execAndWait(
        this.childProcessSvc.buildCommand(`${ROS_COMMAND.PING_NODE} rosout`, '')
      );
      if (
        interfaceRunning.status === constants.InterfaceFileStatusType.RUNNING &&
        pingRosCore.length > 0 &&
        checkRosCore.includes(`python ${getAVPath()}/ros_core.py`)
      ) {
        replyOnChannel({
          status: 'error',
          message: `${interfaceRunning.interfaceName} ${INTERFACE_FILE.IS_RUNNING}`
        });
        return;
      }
      try {
        throw new Error();
        const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodes();
        this.statusInterfaceRosBridgeSvc.clearCache();
        const nodesName = nodes.map((a) => a.replace('/', ''));
        const filteredNodes = nodesName.filter(
          (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
        );
        this.childProcessSvc.execAndForget(
          this.childProcessSvc.buildCommand(`rosnode kill ${filteredNodes.join(' ')}`, '')
        );
        this.stopRosCoreProcesses();
        this.statusInterfaceSvc.clearCache();
        this.runRosCoreProcesses();
        const results = await this.childProcessSvc.waitForResultAndReturn(
          replyOnChannel,
          '/rosout'
        );
        log.debug(`[InterfaceFileService][runInterface] results: ${results}`);
        if (results === ROS.SUCCESS) {
          // this.setParams(dataInterface.agentInterface.name, dataInterface.mapName);
          replyOnChannel({ status: 'success', data: ROS.SUCCESS });
        }
        // Kill all process echo topic before run new interface
        this.killProcessEchoTopic();
        this.interfaceFileStatusSvc.startInterfaceFiles(dataInterface.agentInterface.name);
        this.statusInterfaceSvc.setStatusInterface(dataInterface.agentInterface);
        await this.statusInterfaceRosBridgeSvc.setStatusInterface(dataInterface.agentInterface);
      } catch (err) {
        this.stopRosCoreProcesses();
        this.stopAllNodes();
        // await this.statusInterfaceRosBridgeSvc.initStatusChecking();
        // await this.statusInterfaceRosBridgeSvc.rosBridgeConnect();
        this.statusInterfaceRosBridgeSvc.clearCache();
        log.error(`[InterfaceFileService][runInterface] ${err}`);
        this.statusInterfaceSvc.clearCache();
        this.runRosCoreProcesses();
        const results = await this.childProcessSvc.waitForResultAndReturn(
          replyOnChannel,
          '/rosout'
        );
        log.debug(`[InterfaceFileService][runInterface] results: ${results}`);
        if (results === ROS.SUCCESS) {
          replyOnChannel({ status: 'success', data: ROS.SUCCESS });
          this.setParams(dataInterface.agentInterface.name, dataInterface.mapName);
        }
        // Kill all process echo topic before run new interface
        this.killProcessEchoTopic();
        this.interfaceFileStatusSvc.startInterfaceFiles(dataInterface.agentInterface.name);
        this.statusInterfaceSvc.setStatusInterface(dataInterface.agentInterface);
        // await this.statusInterfaceRosBridgeSvc.setStatusInterface(dataInterface.agentInterface);
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
      const interfaceRunning = await this.statusInterfaceSvc.interfaceRunning();
      this.statusInterfaceRosBridgeSvc.clearCache();
      if (interfaceRunning.interfaceName === interfaceName) {
        log.info(
          '[InterfaceFileService][stopInterface] interface is running, start killing interface...'
        );
        try {
          throw new Error();
          const nodes = await this.statusInterfaceRosBridgeSvc.getRosNodes();
          const nodesName = nodes.map((a) => a.replace('/', ''));
          const filteredNodes = nodesName.filter(
            (item) => !ROS_BRIDGE.ROS_NODES_ARR.includes(item) && !item.includes('listener')
          );
          this.childProcessSvc.execAndForget(
            this.childProcessSvc.buildCommand(`rosnode kill ${filteredNodes.join(' ')}`, '')
          );
          this.stopRosCoreProcesses();
        } catch (err) {
          this.stopRosCoreProcesses();
          this.stopAllNodes();
          // await this.statusInterfaceRosBridgeSvc.initStatusChecking();
          log.error(`[InterfaceFileService][stopInterface] ${err}`);
        }
        replyOnChannel({
          status: 'success',
          data: `${interfaceName} ${INTERFACE_FILE.STOP_SUCESSFULLY}`
        });
        this.deleteParams();
        this.rosSvc.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.DEACTIVE);
        this.statusInterfaceSvc.clearCache();
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

  private runRosCoreProcesses(): void {
    this.childProcessSvc.executeAndIgnoreOutput(
      this.childProcessSvc.buildCommand('ros_core.py', `python ${getAVPath()}`)
    );
  }

  private stopRosCoreProcesses(): void {
    this.childProcessSvc.execAndForget(
      this.childProcessSvc.buildCommand('kill $(pgrep -f ros_core)', '')
    );
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
