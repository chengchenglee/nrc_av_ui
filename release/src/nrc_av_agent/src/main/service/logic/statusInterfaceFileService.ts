import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
import {
  EnumStatusRunAllCommands,
  IResponse,
  InterfaceFileStatus,
  InterfaceFileStatusType
} from '../../../shared/constants';
import TYPES from '../../inversify/types';
import { getAVPath, getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type { IRosService, IStatusInterfaceFile } from '../../inversify/interfaces';

@injectable()
export default class StatusInterfaceFileService implements IStatusInterfaceFile {
  private sharedStore;

  private statusWorker!: UtilityProcess;

  constructor(@inject(TYPES.RosService) private rosSvc: IRosService) {
    this.sharedStore = createSharedStore<InterfaceFileStatus[]>([]);
  }

  @logMethod('[StatusInterfaceFileService][initStatusChecking]', log.debug)
  initStatusChecking(): void {
    this.statusLoop(getAVPath());
  }

  @logMethod('[StatusInterfaceFileService][startInterfaceFiles]')
  startInterfaceFiles(fileName: string): void {
    this.updateStatusState([
      {
        fileName,
        status: InterfaceFileStatusType.RUNNING,
        statusRunAll: EnumStatusRunAllCommands.DEACTIVE
      }
    ]);
  }

  @logMethod('[StatusInterfaceFileService][reportStatus]', log.debug)
  reportStatus(_: unknown, replyOnChannel: (response: IResponse) => void): void {
    replyOnChannel({
      status: 'success',
      data: this.sharedStore.getState()
    });
  }

  @logMethod('[StatusInterfaceFileService][statusLoop]', log.debug)
  private statusLoop(interfacePath: string) {
    if (!this.statusWorker) {
      this.statusWorker = utilityProcess.fork(
        getWorkerPath('workerInterfaceFileHealthcheck.js'),
        undefined,
        { serviceName: 'nrc_av_agent--interface-status', stdio: 'pipe' }
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
          setTimeout(this.statusLoop.bind(this, getAVPath()), 200);
        }
      });
      this.statusWorker.once('exit', (code: number) => {
        log.debug(`[worker-interface-status] Process exited with code ${code}`);
        setTimeout(this.statusLoop.bind(this, getAVPath()), 200);
      });
    }

    this.statusWorker.postMessage({
      sharedState: this.sharedStore.getState(),
      interfacePath
    });
  }

  @logMethod('[StatusInterfaceFileService][updateStatusState]', log.debug)
  private updateStatusState(filesStatus: InterfaceFileStatus[]): InterfaceFileStatus[] {
    if (!filesStatus || !filesStatus.length) {
      return this.sharedStore.getState();
    }

    this.sharedStore.setState((currentFilesStatus) => {
      filesStatus.forEach((fileStatus) => {
        const foundFileStatus = currentFilesStatus.find(
          (node) => node.fileName === fileStatus.fileName
        );

        if (foundFileStatus) {
          foundFileStatus.statusRunAll = this.rosSvc.getStatusRunAllCommands();
          foundFileStatus.status = fileStatus.status;
        } else {
          currentFilesStatus.push(fileStatus);
        }
      });
    });
    return this.sharedStore.getState();
  }
}
