import log, { LogMessage } from 'electron-log';
import { inject, injectable } from 'inversify';
import { ILogConfig } from '../../../shared/configurationTypes';
import { APP_CONFIG } from '../../constants';
import TYPES from '../../inversify/types';
import type { IConfiguration, ILog } from '../../inversify/interfaces';

@injectable()
export default class LogService implements ILog {
  constructor(@inject(TYPES.Configuration) private configSvc: IConfiguration) {}

  init(): void {
    const logConf = this.configSvc.getConfigs<ILogConfig>(APP_CONFIG.LOG);
    if (logConf?.enable !== 'on') {
      log.transports.console.level = false;
      log.transports.file.level = false;
      return;
    }

    if (logConf.mode === 'file') {
      this.initFileMode(logConf);
    } else if (logConf.mode === 'console') {
      this.initConsoleMode(logConf);
    }
  }

  private initFileMode(configVal: ILogConfig) {
    log.transports.console.level = false;

    if (['error', 'warn', 'info', 'verbose', 'debug', 'silly'].includes(configVal.logLevel)) {
      log.transports.file.level = configVal.logLevel as log.LevelOption;
    } else {
      log.transports.file.level = 'info';
    }

    log.transports.file.format = '[{iso}][{level}]> {text}';
    log.transports.file.fileName = `log_[${new Date().toISOString().replaceAll(':', '_')}].log`;
  }

  private initConsoleMode(configVal: ILogConfig) {
    log.transports.file.level = false;

    if (['error', 'warn', 'info', 'verbose', 'debug', 'silly'].includes(configVal.logLevel)) {
      log.transports.console.level = configVal.logLevel as log.LevelOption;
    } else {
      log.transports.console.level = 'info';
    }

    log.transports.console.format = (message: LogMessage, transformedData?: any[]) => {
      let data = transformedData;
      if (!data) {
        data = [''];
      }
      return [
        `%c[${message.date.toISOString()}][${message.level}] >%c`,
        `color:${this.levelToStyle(message.level)}`,
        'color:unset'
      ].concat(data);
    };
    log.transports.console.useStyles = true;
  }

  private levelToStyle(level: string) {
    switch (level) {
      case 'error':
        return 'red';
      case 'warn':
        return 'yellow';
      case 'info':
        return 'cyan';
      default:
        return 'unset';
    }
  }
}
