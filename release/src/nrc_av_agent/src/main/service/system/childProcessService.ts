import { exec, spawn } from 'node:child_process';
import util from 'util';
import log from 'electron-log';
import { inject, injectable } from 'inversify';
import { IHostConfig } from '../../../shared/configurationTypes';
import { IResponse } from '../../../shared/constants';
import { APP_CONFIG, COMMUNICATION, ROS, ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { delayInMs } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type { IChildProcess, IConfiguration, IPath } from '../../inversify/interfaces';

@injectable()
export default class ChildProcessService implements IChildProcess {
  constructor(
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.Path) private pathSvc: IPath
  ) {}

  @logMethod('[ChildProcessService][execAndForget]')
  execAndForget(command: string): void {
    log.debug(`[ChildProcessService][execAndForget] ${command}`);
    exec(command, (error) => {
      log.warn(`[ChildProcessService][execAndForget] error: ${error}`);
    });
  }

  @logMethod('[ChildProcessService][executeAndIgnoreOutput]')
  executeAndIgnoreOutput(command: string): void {
    log.debug(`[ChildProcessService][executeAndIgnoreOutput] Executing command: ${command}`);
    exec(`${command} > /dev/null 2>&1`, (error) => {
      if (error) {
        log.warn(`[ChildProcessService][executeAndIgnoreOutput] error: ${error}`);
      }
    });
  }

  @logMethod('[ChildProcessService][executeAndValid]')
  executeAndValid(
    command: string,
    waitingTime: number,
    replyOnChannel: (response: IResponse) => void
  ): number {
    log.debug(`[ChildProcessService][executeAndValid] Executing command: ${command}`);
    const args: readonly string[] | undefined = [];
    const options = { shell: true, detached: true, env: { ...process.env } };

    const child = spawn(command, args, options);

    let stdoutData = '';
    let stdoutError = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
      log.debug(`[ChildProcessService][executeAndValid] stdout: ${stdoutData}`);
    });

    child.stderr.on('data', (data) => {
      stdoutError += data.toString();
      log.debug(`[ChildProcessService][executeAndValid] stderr: ${stdoutError}`);
    });

    child.on('error', (err) => {
      console.error('Error occurred while executing the command:', err);
    });

    child.on('close', () => {
      // eslint-disable-next-line no-control-regex
      const ansiEscapeRegex = /\x1b\[\d+m/g;
      const cleanedError = stdoutError.replace(ansiEscapeRegex, '');

      if (stdoutData === '' && cleanedError === '') {
        replyOnChannel({
          status: 'success',
          data: 'success',
          pid: child.pid
        });
      } else {
        replyOnChannel({
          status: 'error',
          message: cleanedError
        });
      }
    });

    setTimeout(() => {
      if (stdoutData === '' && stdoutError === '') {
        replyOnChannel({
          status: 'success',
          data: 'success',
          pid: child.pid
        });
      }
      child.kill('SIGINT');
    }, waitingTime);
    if (child.pid !== undefined) {
      return child.pid;
    }
    return 0;
  }

  @logMethod('[ChildProcessService][execAndWait]', log.debug)
  async execAndWait(command: string): Promise<string> {
    try {
      const execPromise = util.promisify(exec);
      log.debug(`[ChildProcessService][execAndWait] ${command}`);
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        log.warn(`[ChildProcessService][execAndWait] stderr: ${stderr}`);
        return stderr;
      }
      log.debug(`[ChildProcessService][execAndWait] stdout: ${stdout}`);
      return stdout;
    } catch (e) {
      log.warn(`[ChildProcessService][execAndWait] error: ${e}`);
    }
    return '';
  }

  @logMethod('[LogicService][buildCommand]')
  buildCommand(command: string, path = ''): string {
    const setupPath = this.pathSvc.join(
      this.configSvc.getConfig<IHostConfig>(APP_CONFIG.CONNECTION, 'rosWorkspace') || '',
      'devel/setup.sh'
    );
    const execPath = this.pathSvc.join(path, command);
    const res = `. ${setupPath} && ${execPath}`;
    return res;
  }

  @logMethod('[LogicService][waitForResultAndReturn]')
  async waitForResultAndReturn(
    replyOnChannel: (response: IResponse) => void,
    nodeName: string
  ): Promise<string> {
    let res = '';
    let timeout = false;
    const timeoutId = setTimeout(() => {
      timeout = true;
    }, COMMUNICATION.TIME_OUT);
    do {
      // eslint-disable-next-line no-await-in-loop
      res = await this.execAndWait(this.buildCommand(`${ROS_COMMAND.PING_NODE} ${nodeName}`, ''));
      // eslint-disable-next-line no-await-in-loop
      await delayInMs(200);
    } while (
      (res.includes(`cannot ping [${nodeName}]: unknown node`) && !timeout) ||
      (res === '' && !timeout)
    );

    clearTimeout(timeoutId);
    if (timeout) {
      if (res === '') {
        replyOnChannel({
          status: 'error',
          message: ROS.ROS_CORE_NOT_START
        });
      } else {
        replyOnChannel({
          status: 'error',
          message: ROS.ROS_NODES_NOT_START
        });
      }
    } else {
      return ROS.SUCCESS;
    }
    return '';
  }
}
