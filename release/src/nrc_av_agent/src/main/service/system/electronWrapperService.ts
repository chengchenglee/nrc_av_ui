import { App, app } from 'electron';
import { injectable } from 'inversify';
import { IElectronWrapper } from '../../inversify/interfaces';

@injectable()
export default class ElectronWrapperService implements IElectronWrapper {
  getPath(
    name:
      | 'home'
      | 'appData'
      | 'userData'
      | 'sessionData'
      | 'temp'
      | 'exe'
      | 'module'
      | 'desktop'
      | 'documents'
      | 'downloads'
      | 'music'
      | 'pictures'
      | 'videos'
      | 'recent'
      | 'logs'
      | 'crashDumps'
  ): string {
    return app.getPath(name);
  }

  getResourcesPath(): string {
    return process.resourcesPath;
  }

  getApp(): App {
    return app;
  }
}
