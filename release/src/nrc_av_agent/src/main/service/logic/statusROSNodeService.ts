import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { injectable } from 'inversify';
import { ROSNodeStatus, ROSNode, ROSNodeStatusType, IResponse } from '../../../shared/constants';
import { getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type { IStatusROSNode } from '../../inversify/interfaces';

@injectable()
export default class StatusROSNodeService implements IStatusROSNode {
  private sharedStore;

  private statusWorker!: UtilityProcess;

  constructor() {
    this.sharedStore = createSharedStore<ROSNodeStatus[]>([]);
  }

  @logMethod('[StatusROSNodeService][initStatusChecking]')
  initStatusChecking(rosNodes: ROSNode[]): void {
    const rosNodesStatus: ROSNodeStatus[] = rosNodes.map((node) => ({
      ...node,
      status: ROSNodeStatusType.UNKNOWN
    }));
    this.updateStatusState(rosNodesStatus);
    this.statusLoop();
  }

  @logMethod('[StatusROSNodeService][startNodes]', log.debug)
  startNodes(rosNodes: ROSNode[]): void {
    this.updateStatusState(
      rosNodes.map((node) => ({ ...node, status: ROSNodeStatusType.RUNNING }))
    );
  }

  @logMethod('[StatusROSNodeService][reportStatus]')
  reportStatus(rosNodes: ROSNode[], replyOnChannel: (response: IResponse) => void): void {
    replyOnChannel({
      status: 'success',
      data: this.sharedStore
        .getState()
        .filter((node) =>
          rosNodes.find(
            (rosNode) => rosNode.name === node.name && rosNode.packageName === node.packageName
          )
        )
    });
  }

  @logMethod('[StatusROSNodeService][statusLoop]', log.debug)
  private statusLoop() {
    if (!this.statusWorker) {
      this.statusWorker = utilityProcess.fork(
        getWorkerPath('workerROSNodeHealthcheck.js'),
        undefined,
        { serviceName: 'nrc_av_agent-status', stdio: 'pipe' }
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
          setTimeout(this.statusLoop.bind(this), 200);
        }
      });
      this.statusWorker.once('exit', (code: number) => {
        log.debug(`[worker-rosnode-status] Process exited with code ${code}`);
        setTimeout(this.statusLoop.bind(this), 200);
      });
    }

    this.statusWorker.postMessage(this.sharedStore.getState());
  }

  @logMethod('[StatusROSNodeService][updateStatusState]', log.debug)
  private updateStatusState(rosNodesStatus: ROSNodeStatus[]): ROSNodeStatus[] {
    if (!rosNodesStatus || !rosNodesStatus.length) {
      return this.sharedStore.getState();
    }

    this.sharedStore.setState((currentRosNodeArr) => {
      rosNodesStatus.forEach((rosNodeStatus) => {
        const nodeItem = currentRosNodeArr.find(
          (node) =>
            node.name === rosNodeStatus.name && node.packageName === rosNodeStatus.packageName
        );

        if (nodeItem) {
          nodeItem.status = rosNodeStatus.status;
        } else {
          currentRosNodeArr.push(rosNodeStatus);
        }
      });
    });
    return this.sharedStore.getState();
  }
}
