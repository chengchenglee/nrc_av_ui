import { Container } from 'inversify';
import SocketIOService from '../service/communication/socketioServices';
import ConfigurationService from '../service/configuration/configurationService ';
import ElectronStoreService from '../service/electronStoreService';
import LogicService from '../service/logic/logicService';
import AzureService from '../service/storage/azureService';
import ChildProcessService from '../service/system/childProcessService';
import ElectronWrapperService from '../service/system/electronWrapperService';
import FileSystemService from '../service/system/fileSystemService';
import PathService from '../service/system/pathService';
import UpdaterService from '../service/updater/updaterService';
import {
  IAutoUpdater,
  IChildProcess,
  ICommunication,
  IConfiguration,
  IElectronStore,
  IElectronWrapper,
  IFileSystem,
  ILogic,
  IPath,
  IWebStorage
} from './interfaces';
import TYPES from './types';

const diContainer = new Container({ defaultScope: 'Singleton' });

diContainer.bind<IFileSystem>(TYPES.FileSystem).to(FileSystemService);
diContainer.bind<IPath>(TYPES.Path).to(PathService);
diContainer.bind<IChildProcess>(TYPES.ChildProcess).to(ChildProcessService);

diContainer.bind<IElectronWrapper>(TYPES.ElectronWrapper).to(ElectronWrapperService);
diContainer.bind<IElectronStore>(TYPES.ElectronStore).to(ElectronStoreService);

diContainer.bind<ICommunication>(TYPES.Communication).to(SocketIOService);
diContainer.bind<IConfiguration>(TYPES.Configuration).to(ConfigurationService);

diContainer.bind<IWebStorage>(TYPES.WebStorage).to(AzureService);

diContainer.bind<IAutoUpdater>(TYPES.AutoUpdater).to(UpdaterService);

diContainer.bind<ILogic>(TYPES.Logic).to(LogicService);

export default diContainer;
