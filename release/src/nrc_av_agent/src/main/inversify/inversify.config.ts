import { Container } from 'inversify';
import SocketIOService from '../service/communication/socketioServices';
import ConfigurationService from '../service/configuration/configurationService ';
import LogService from '../service/log/logService';
import InterfaceFileService from '../service/logic/interfaceFileService';
import LogicService from '../service/logic/logicService';
import RosService from '../service/logic/rosService';
import StatusInterfaceFileService from '../service/logic/statusInterfaceFileService';
import StatusInterfaceRosBridgeService from '../service/logic/statusInterfaceRosBridgeService';
import StatusInterfaceService from '../service/logic/statusInterfaceService';
import StatusROSNodeService from '../service/logic/statusROSNodeService';
import AzureService from '../service/storage/azureService';
import BrowserWindowService from '../service/system/browserWindowService';
import ChildProcessService from '../service/system/childProcessService';
import ElectronWrapperService from '../service/system/electronWrapperService';
import FileSystemService from '../service/system/fileSystemService';
import PathService from '../service/system/pathService';
import UpdaterService from '../service/updater/updaterService';
import {
  IAutoUpdater,
  IBrowserWindowService,
  IChildProcess,
  ICommunication,
  IConfiguration,
  IElectronWrapper,
  IFileSystem,
  ILog,
  ILogic,
  IPath,
  IStatusROSNode,
  IStatusInterfaceFile,
  IWebStorage,
  IInterfaceFileService,
  IRosService,
  IStatusInterfaceService,
  IStatusInterfaceRosBridgeService
} from './interfaces';
import TYPES from './types';

const diContainer = new Container({ defaultScope: 'Singleton' });
diContainer.bind<IBrowserWindowService>(TYPES.BrowserWindowService).to(BrowserWindowService);
diContainer.bind<IFileSystem>(TYPES.FileSystem).to(FileSystemService);
diContainer.bind<IPath>(TYPES.Path).to(PathService);
diContainer.bind<IChildProcess>(TYPES.ChildProcess).to(ChildProcessService);

diContainer.bind<IElectronWrapper>(TYPES.ElectronWrapper).to(ElectronWrapperService);

diContainer.bind<IConfiguration>(TYPES.Configuration).to(ConfigurationService);
diContainer.bind<ILog>(TYPES.Log).to(LogService);
diContainer.bind<ICommunication>(TYPES.Communication).to(SocketIOService);

diContainer.bind<IWebStorage>(TYPES.WebStorage).to(AzureService);

diContainer.bind<IAutoUpdater>(TYPES.AutoUpdater).to(UpdaterService);

diContainer.bind<IStatusROSNode>(TYPES.StatusROSNode).to(StatusROSNodeService);
diContainer.bind<IStatusInterfaceFile>(TYPES.StatusInterfaceFile).to(StatusInterfaceFileService);
diContainer.bind<ILogic>(TYPES.Logic).to(LogicService);
diContainer.bind<IStatusInterfaceService>(TYPES.StatusInterfaceService).to(StatusInterfaceService);
diContainer
  .bind<IStatusInterfaceRosBridgeService>(TYPES.StatusInterfaceRosBridgeService)
  .to(StatusInterfaceRosBridgeService);
diContainer.bind<IInterfaceFileService>(TYPES.InterfaceFileService).to(InterfaceFileService);
diContainer.bind<IRosService>(TYPES.RosService).to(RosService);

export default diContainer;
