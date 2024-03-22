/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import log from 'electron-log';

export const logMethod =
  (prefix: string, logFunc = log.info) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    // eslint-disable-next-line no-param-reassign, func-names
    descriptor.value = function (...args: any[]) {
      logFunc(`${prefix} --> IN -->`);
      let result;
      try {
        result = originalMethod.apply(this, args);
      } catch (err) {
        log.error(`${prefix} ${err}`);
        throw err;
      } finally {
        logFunc(`${prefix} <-- OUT <--`);
      }
      return result;
    };
  };

export default { logMethod };
