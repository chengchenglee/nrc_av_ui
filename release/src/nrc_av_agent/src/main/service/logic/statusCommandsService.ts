import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
import kill from 'tree-kill';
import { CommandsStatusType, CommandsStatus, IResponse } from '../../../shared/constants';
import TYPES from '../../inversify/types';
import { getWorkerPath, isProcessRunning } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type { IChildProcess, IStatusCommands } from '../../inversify/interfaces';

@injectable()
export default class StatusCommandsService implements IStatusCommands {
  private sharedStore;

  private statusWorker!: UtilityProcess;

  constructor(@inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess) {
    this.sharedStore = createSharedStore<CommandsStatus[]>([]);
  }

  getState(): CommandsStatus[] {
    return this.sharedStore.getState();
  }

  @logMethod('[StatusCommandsService][initStatusChecking]', log.debug)
  initStatusChecking(): void {
    this.statusLoop();
  }

  @logMethod('[StatusCommandsService][startInterfaceFiles]')
  setState(command: string, pid: number, name: string, id: number): void {
    this.updateStatusState([
      {
        command,
        pid,
        id,
        name,
        status: CommandsStatusType.RUNNING
      }
    ]);
  }

  resetState(): void {
    const reset: (draft: CommandsStatus[]) => void = (draft) => {
      draft.splice(0, draft.length);
    };
    this.sharedStore.setState(reset);
  }

  // @logMethod('[StatusCommandsService][killAll]', log.debug)
  // killAll(): Promise<void> {
  //   // TODO support killAll and called by InterfaceFileSvc
  //   this.sharedStore.getState().map((command) => {
  //     this.killCommand(command.id);
  //   });
  // }

  @logMethod('[StatusCommandsService][killCommand]', log.debug)
  async killCommand(commandId: number): Promise<void> {
    try {
      const commandResult = this.sharedStore.getState().find((command) => command.id === commandId);
      // console.log(commandResult);
      if (
        commandResult &&
        commandResult.pid &&
        commandResult.status === CommandsStatusType.RUNNING
      ) {
        const isRunning = await isProcessRunning(commandResult.pid);
        if (isRunning) {
          kill(commandResult.pid);
        } else {
          // TODO do we need to handle this?
        }
      }
    } catch (err) {
      log.error(`[StatusCommandsService][killCommand] ${err}`);
    }
  }

  @logMethod('[StatusCommandsService][reportStatus]', log.debug)
  reportStatus(_: unknown, replyOnChannel: (response: IResponse) => void): void {
    replyOnChannel({
      status: 'success',
      data: this.sharedStore.getState()
    });
  }

  @logMethod('[StatusCommandsService][statusLoop]', log.debug)
  private statusLoop() {
    if (!this.statusWorker) {
      this.statusWorker = utilityProcess.fork(
        getWorkerPath('workerCommandsStatusHealthcheck.js'),
        undefined,
        { serviceName: 'nrc_av_agent--commands-status', stdio: 'pipe' }
      );
      this.statusWorker.stdout?.on('data', (data) => {
        log.debug(`${data.toString()}`);
      });
      this.statusWorker.stderr?.on('data', (data) => {
        log.error(`${data.toString()}`);
      });
      this.statusWorker.on('message', (res) => {
        // Not an error
        if (!res.type) {
          this.updateStatusState(res);
          setTimeout(this.statusLoop.bind(this), 2000);
        }
      });
      this.statusWorker.once('exit', (code: number) => {
        log.debug(`[worker-interface-status] Process exited with code ${code}`);
        setTimeout(this.statusLoop.bind(this), 200);
      });
    }

    this.statusWorker.postMessage({
      sharedState: this.sharedStore.getState()
    });
  }

  @logMethod('[StatusCommandsService][updateStatusState]', log.debug)
  private updateStatusState(filesStatus: CommandsStatus[]): CommandsStatus[] {
    if (!filesStatus || !filesStatus.length) {
      return this.sharedStore.getState();
    }

    this.sharedStore.setState((currentCommandsStatus) => {
      filesStatus.forEach((commandStatus) => {
        const foundCommandsStatus = currentCommandsStatus.find(
          (node) => node.command === commandStatus.command
        );

        if (foundCommandsStatus) {
          foundCommandsStatus.pid = commandStatus.pid;
          foundCommandsStatus.status = commandStatus.status;
        } else {
          currentCommandsStatus.push(commandStatus);
        }
      });
    });
    return this.sharedStore.getState();
  }
}
