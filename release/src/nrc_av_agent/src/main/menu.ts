import Electron, { app, Menu } from 'electron';

const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [
  /* FILE MENU */
  {
    label: 'File',
    submenu: [
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
