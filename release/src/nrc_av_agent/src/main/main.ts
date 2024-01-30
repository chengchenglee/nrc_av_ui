import { app, BrowserWindow, dialog, Menu, shell } from 'electron';
import log from 'electron-log';
import { ILogConfig } from '../shared/configurationTypes';
import { EnumVehicleStatusState } from '../shared/constants';
import ipcMsg from '../shared/ipcMsg';
import { APP_CONFIG } from './constants';
import {
  /* IAutoUpdater, */ IConfiguration,
  ILog,
  ILogic,
  IBrowserWindowService,
  IRosBridgeConnectionService,
  IRosBridgeServerService
} from './inversify/interfaces';
import diContainer from './inversify/inversify.config';
import TYPES from './inversify/types';
import menu from './menu';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import './service/communication/ipcService';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    icon: getAssetsPath('icon.png'),
    width: 900,
    height: 750,
    webPreferences: {
      devTools: isDebug,
      preload: getPreloadPath('preload.js')
    }
  });
  const browserWindowService = diContainer.get<IBrowserWindowService>(TYPES.BrowserWindowService);
  browserWindowService.init(mainWindow);

  if (!app.requestSingleInstanceLock()) {
    // If another instance of the app is already running, quit this instance
    app.quit();
  } else if (mainWindow) {
    app.on('second-instance', () => {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    });
  }

  mainWindow.loadURL(getHtmlPath('index.html'));

  /* MENU BUILDER */
  Menu.setApplicationMenu(menu);

  /* DEBUG DEVTOOLS */
  if (isDebug) {
    mainWindow.webContents.openDevTools();
    installExtensions();
  }

  /* URLs OPEN IN DEFAULT BROWSER */
  mainWindow.webContents.setWindowOpenHandler((data) => {
    shell.openExternal(data.url);
    return { action: 'deny' };
  });
};

const loadConfigs = () => {
  const configSvc = diContainer.get<IConfiguration>(TYPES.Configuration);

  // config log
  const logExist = configSvc.loadConfigs(APP_CONFIG.LOG);
  if (!logExist) {
    configSvc.createConfig<ILogConfig>(APP_CONFIG.LOG, {
      enable: 'off',
      logLevel: 'info',
      mode: 'file'
    });
  }

  diContainer.get<ILog>(TYPES.Log).init();
  log.info('Application starting...');
  // eslint-disable-next-line no-console
  console.log('Application starting...');

  // config agent
  const vehicleSuccess = configSvc.loadConfigs(APP_CONFIG.VEHICLE);
  const connectionSuccess = configSvc.loadConfigs(APP_CONFIG.CONNECTION);
  return vehicleSuccess && connectionSuccess;
};

app.whenReady().then(() => {
  const configStatus = loadConfigs();
  createWindow();
  diContainer
    .get<IBrowserWindowService>(TYPES.BrowserWindowService)
    .getBrowserWindow()
    .once('ready-to-show', async () => {
      await diContainer
        .get<IRosBridgeServerService>(TYPES.RosBridgeServerService)
        .rosBridgeInit()
        .catch((err) => {
          const messageBoxOptions = {
            type: 'error',
            message: err.toString()
          };
          dialog.showMessageBoxSync(messageBoxOptions);
        });
      diContainer.get<IRosBridgeServerService>(TYPES.RosBridgeServerService).rosBridgeHealthcheck();
      await diContainer
        .get<IRosBridgeConnectionService>(TYPES.RosBridgeConnectionService)
        .getRosBridgeConnection()
        .catch((err) => {
          log.error(`Unable to connect to Ros-Bridge: ${err.toString()}`);
        });
      diContainer
        .get<IBrowserWindowService>(TYPES.BrowserWindowService)
        .sendToRenderer(ipcMsg.M2R.VEHICLE_STATUS, EnumVehicleStatusState.FETCHING);
      if (configStatus) diContainer.get<ILogic>(TYPES.Logic).init();
    });
  // temporary disable feature auto-update
  /* AUTO UPDATER INVOKE */
  // diContainer.get<IAutoUpdater>(TYPES.AutoUpdater).initUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('quit', () => {
    diContainer.get<ILogic>(TYPES.Logic).cleanup();
    log.info('Application exiting...');
    // eslint-disable-next-line no-console
    console.log('Application exiting...');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
