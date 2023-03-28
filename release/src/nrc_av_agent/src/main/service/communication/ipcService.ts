import { ipcMain } from 'electron';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import ipcMsg from '../../../shared/ipcMsg';
import { APP_CONFIG } from '../../constants';
import { IConfiguration, ILogic } from '../../inversify/interfaces';
import diContainer from '../../inversify/inversify.config';
import TYPES from '../../inversify/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const getMac = require('getmac').default;

ipcMain.handle(ipcMsg.RMR.VEHICLE_INFO, () =>
  diContainer.get<IConfiguration>(TYPES.Configuration).getConfigs(APP_CONFIG.VEHICLE)
);

ipcMain.on(ipcMsg.R2M.REGISTER_INFO, (event, dVehicleInfo, dConnectionInfo) => {
  const vehicleInfo = { ...dVehicleInfo };
  if (!vehicleInfo.certKey) {
    vehicleInfo.certKey = uuidv4();
  }
  if (!vehicleInfo.macAddress) {
    vehicleInfo.macAddress = getMac();
  }
  if (!vehicleInfo.licenseNumber) {
    vehicleInfo.licenseNumber = '';
  }
  diContainer
    .get<IConfiguration>(TYPES.Configuration)
    .updateConfig(APP_CONFIG.VEHICLE, vehicleInfo);
  diContainer
    .get<IConfiguration>(TYPES.Configuration)
    .updateConfig(APP_CONFIG.CONNECTION, dConnectionInfo);
  diContainer.get<ILogic>(TYPES.Logic).init();

  event.reply(ipcMsg.M2R.REGISTER_INFO_REPLY, vehicleInfo);
});

/** ELECTRON STORE EXAMPLE
 *  NOTE: LOCAL STORAGE FOR YOUR APPLICATION
 */
const store = new Store();
ipcMain.on('set', (_event, key, val) => {
  // eslint-disable-next-line no-console
  console.log(`Electron Store Example: key: ${key}, value: ${val}`);
  store.set(key, val);
});
ipcMain.on('get', (event, val) => {
  // eslint-disable-next-line no-param-reassign
  event.returnValue = store.get(val);
});
