import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { inject, injectable } from 'inversify';
import schedule from 'node-schedule';
import TYPES from '../../inversify/types';
import type { IAutoUpdater, IWebStorage } from '../../inversify/interfaces';

@injectable()
export default class UpdaterService implements IAutoUpdater {
  private webstorageService: IWebStorage;

  private isUpdating: boolean;

  constructor(@inject(TYPES.WebStorage) webstorageService: IWebStorage) {
    this.webstorageService = webstorageService;
    this.isUpdating = false;
    autoUpdater.logger = log;
    log.transports.file.level = 'info';
    log.debug('App is starting...');

    if (process.env.NODE_ENV === 'development') {
      autoUpdater.forceDevUpdateConfig = true;
    }
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoRunAppAfterInstall = true;
  }

  initUpdater(): void {
    const cronTime = import.meta.env.VITE_AUTO_UPDATE_INTERVAL || '* * * * *';
    schedule.scheduleJob(cronTime, () => {
      if (this.isUpdating) {
        return;
      }
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: this.webstorageService.getFeedUrl()
      });
      autoUpdater.checkForUpdatesAndNotify();
    });
    process.on('SIGINT', () => {
      schedule.gracefulShutdown().then(() => process.exit(0));
    });

    this.initEventHandler();
  }

  private initEventHandler() {
    autoUpdater.on('checking-for-update', () => {
      this.isUpdating = true;
      log.debug('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      this.isUpdating = true;
      log.debug('Update available.', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.isUpdating = false;
      log.debug('Update not available.', info);
    });

    autoUpdater.on('error', (err) => {
      this.isUpdating = false;
      log.debug(`Error in auto-updater. ${err}`);
    });

    autoUpdater.on('download-progress', (speed) => {
      this.isUpdating = true;
      let logMessage = `Downloading speed: ${speed.bytesPerSecond}`;
      logMessage = `${logMessage} - Downloaded ${speed.percent}%`;
      logMessage = `${logMessage} (${speed.transferred}/${speed.total})`;
      log.debug(logMessage);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.isUpdating = false;
      log.debug('Update downloaded', info);
      autoUpdater.quitAndInstall(true, true);
    });
  }
}
