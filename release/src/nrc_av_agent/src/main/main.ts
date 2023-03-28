import { app, BrowserWindow, Menu, shell } from 'electron';
import { APP_CONFIG } from './constants';
import { /* IAutoUpdater, */ IConfiguration, ILogic } from './inversify/interfaces';
import diContainer from './inversify/inversify.config';
import TYPES from './inversify/types';
import menu from './menu';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import './service/communication/ipcService';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    icon: getAssetsPath('icon.ico'),
    width: 900,
    height: 600,
    webPreferences: {
      devTools: isDebug,
      preload: getPreloadPath('preload.js')
    }
  });

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
  const vehicleSuccess = diContainer
    .get<IConfiguration>(TYPES.Configuration)
    .loadConfigs(APP_CONFIG.VEHICLE);
  const connectionSuccess = diContainer
    .get<IConfiguration>(TYPES.Configuration)
    .loadConfigs(APP_CONFIG.CONNECTION);
  if (vehicleSuccess && connectionSuccess) {
    diContainer.get<ILogic>(TYPES.Logic).init();
  }
};

app.whenReady().then(() => {
  createWindow();
  loadConfigs();

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
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
