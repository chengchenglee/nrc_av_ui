import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import {
  IHostConfig,
  IUpdatedVehicleConfig,
  IVehicleInfoConfig
} from '../../../shared/configurationTypes';
import ipcMsg from '../../../shared/ipcMsg';
import { APP_CONFIG } from '../../constants';
import { ICommunication, IConfiguration, ILogic } from '../../inversify/interfaces';
import diContainer from '../../inversify/inversify.config';
import TYPES from '../../inversify/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const getMac = require('getmac').default;

ipcMain.handle(ipcMsg.RMR.VEHICLE_INFO, () =>
  diContainer
    .get<IConfiguration>(TYPES.Configuration)
    .getConfigs<IVehicleInfoConfig>(APP_CONFIG.VEHICLE)
);

ipcMain.handle(ipcMsg.RMR.CONNECTION_INFO, () =>
  diContainer
    .get<IConfiguration>(TYPES.Configuration)
    .getConfigs<IHostConfig>(APP_CONFIG.CONNECTION)
);

ipcMain.handle(ipcMsg.RMR.VEHICLE_STATUS_REQUEST, () => {
  diContainer.get<ILogic>(TYPES.Logic).getStatusVehicle();
});

ipcMain.handle(ipcMsg.RMR.VEHICLE_CONNECTION_STATUS_REQUEST, () =>
  diContainer.get<ICommunication>(TYPES.Communication).getConnectionStatus()
);

ipcMain.on(ipcMsg.R2M.REGISTER_INFO, (event, vehicleInfo, connectionInfo) => {
  const configSvc = diContainer.get<IConfiguration>(TYPES.Configuration);

  configSvc.createConfig<IVehicleInfoConfig>(APP_CONFIG.VEHICLE, {
    ...vehicleInfo,
    certKey: vehicleInfo.certKey || uuidv4(),
    macAddress: vehicleInfo.macAddress || getMac()
  });

  configSvc.createConfig<IHostConfig>(APP_CONFIG.CONNECTION, connectionInfo);

  diContainer.get<ILogic>(TYPES.Logic).init();

  event.reply(
    ipcMsg.M2R.REGISTER_INFO_REPLY,
    configSvc.getConfigs<IVehicleInfoConfig>(APP_CONFIG.VEHICLE)
  );
  event.reply(
    ipcMsg.M2R.CONNECTION_INFO_REPLY,
    configSvc.getConfigs<IHostConfig>(APP_CONFIG.CONNECTION)
  );
});

ipcMain.on(ipcMsg.R2M.UPDATE_VEHICLE, (event, vehicleInfo, connectionInfo) => {
  const configSvc = diContainer.get<IConfiguration>(TYPES.Configuration);
  configSvc.createConfig<IVehicleInfoConfig>(APP_CONFIG.VEHICLE, {
    ...vehicleInfo,
    certKey: vehicleInfo.certKey,
    macAddress: vehicleInfo.macAddress
  });

  configSvc.createConfig<IHostConfig>(APP_CONFIG.CONNECTION, connectionInfo);
  diContainer.get<ILogic>(TYPES.Logic).updateVehicle();

  diContainer.get<ILogic>(TYPES.Logic).reInit();
  const vehicleInfoConfig = configSvc.getConfigs<IVehicleInfoConfig>(APP_CONFIG.VEHICLE);
  const vehicleHostConfig = configSvc.getConfigs<IHostConfig>(APP_CONFIG.CONNECTION);
  if (vehicleInfoConfig && vehicleHostConfig) {
    const updatedVehicleConfig: IUpdatedVehicleConfig = {
      vehicleConfig: vehicleInfoConfig,
      hostConfig: vehicleHostConfig
    };
    event.reply(ipcMsg.M2R.UPDATE_VEHICLE_REPLY, updatedVehicleConfig);
  } else {
    event.reply(ipcMsg.M2R.UPDATE_VEHICLE_REPLY, null);
  }
});
