import Electron, { app, Menu } from 'electron';
import ipcMsg from '../shared/ipcMsg';
import { IBrowserWindowService } from './inversify/interfaces';
import diContainer from './inversify/inversify.config';
import TYPES from './inversify/types';

const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
  /* FILE MENU */
  {
    label: 'File',
    submenu: [
      {
        label: 'Edit configuration',
        click: () => {
          const browserWindowService = diContainer.get<IBrowserWindowService>(
            TYPES.BrowserWindowService
          );

          browserWindowService.sendToRenderer(ipcMsg.M2R.NAVIGATE, '/edit');
        }
      },
      {
        label: 'Exit',
        click: () => {
          app.exit();
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
export default menu;
