import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
  error(message: string, trace = '') {
    super.error(message, trace);
  }

  warn(message: string, context = '') {
    super.warn(message, context);
  }

  log(message: string, context = '') {
    super.log(message, context);
  }
}
