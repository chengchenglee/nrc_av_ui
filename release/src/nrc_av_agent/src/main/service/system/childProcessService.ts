import { exec } from 'node:child_process';
import util from 'util';
import { injectable } from 'inversify';
import { IChildProcess } from '../../inversify/interfaces';

@injectable()
export default class ChildProcessService implements IChildProcess {
  execAndForget(command: string): void {
    exec(command, (error, stdout, stderr) => {
      console.error(`error: ${error}, stdout: ${stdout}, stderr: ${stderr}`);
    });
  }

  async execAndWait(command: string): Promise<string> {
    try {
      const execPromise = util.promisify(exec);
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        return stderr;
      }
      return stdout;
    } catch (e) {
      // do nothing
      console.error(e);
    }
    return '';
  }
}
