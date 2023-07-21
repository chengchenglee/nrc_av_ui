import { Draft } from '@reduxjs/toolkit';
import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
import { IHostConfig } from '../../../shared/configurationTypes';
import * as constants from '../../../shared/constants';
import { APP_CONFIG } from '../../constants';
import TYPES from '../../inversify/types';
import { getAVPath, getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IChildProcess,
  ICommunication,
  IConfiguration,
  IPath,
  IStatusInterfaceService
} from '../../inversify/interfaces';

const GET_INTERFACE_DETAIL_STATUS = 'nissan/vehicle/interface/detail/status';
@injectable()
export default class StatusInterfaceService implements IStatusInterfaceService {
  private sharedStore;

  private statusWorker!: UtilityProcess;

  constructor(
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.Communication) private commSvc: ICommunication,
    @inject(TYPES.Configuration) private configSvc: IConfiguration,
    @inject(TYPES.Path) private pathSvc: IPath
  ) {
    const initialValue: constants.InterfaceStatus = {
      interfaceName: '',
      machines: [],
      sensors: [],
      algorithms: []
    };
    this.sharedStore = createSharedStore<constants.InterfaceStatus>(initialValue);
  }

  private async checkPing(machineAddr: string) {
    const command = `ping -c 1 ${machineAddr}`;
    const results = await this.childProcessSvc.execAndWait(command);
    const ping = results.length > 0 ? 1 : 0;
    return ping;
  }

  async checkMachineStatus(machine: constants.Machine): Promise<constants.MachinesStatus> {
    const ping = await this.checkPing(machine.addr);
    const status = ping === 1 ? constants.MachineStatusType.PASS : constants.MachineStatusType.FAIL;
    return {
      ...machine,
      status
    };
  }

  checkSensorStatus(sensor: constants.Sensor): constants.SensorsStatus {
    return {
      ...sensor,
      status: constants.RosTopicStatusType.BAD
    };
  }

  checkAlgorithmStatus(algorithm: constants.Algorithm): constants.AlgorithmsStatus {
    return {
      ...algorithm,
      status: constants.RosTopicStatusType.BAD
    };
  }

  async updateInterfaceStatus(
    dataInterface: constants.Interface
  ): Promise<constants.InterfaceStatus> {
    const machinesStatus = await Promise.all(
      dataInterface.machines.map((machine) => this.checkMachineStatus(machine))
    );

    const sensorsStatus = await Promise.all(
      dataInterface.sensors.map((sensor) => this.checkSensorStatus(sensor))
    );

    const algorithmsStatus = await Promise.all(
      dataInterface.algorithms.map((algorithm) => this.checkAlgorithmStatus(algorithm))
    );

    return {
      interfaceName: dataInterface.name,
      machines: machinesStatus,
      sensors: sensorsStatus,
      algorithms: algorithmsStatus,
      status: constants.InterfaceFileStatusType.RUNNING
    };
  }

  clearCache(): void {
    const resetState = (draft: Draft<constants.InterfaceStatus>) => {
      // eslint-disable-next-line no-param-reassign
      draft.interfaceName = '';
      // eslint-disable-next-line no-param-reassign
      draft.machines = [];
      // eslint-disable-next-line no-param-reassign
      draft.sensors = [];
      // eslint-disable-next-line no-param-reassign
      draft.algorithms = [];
      // eslint-disable-next-line no-param-reassign
      draft.status = constants.InterfaceFileStatusType.STOPPED;
    };
    this.sharedStore.setState(resetState);
  }

  interfaceRunning(): constants.InterfaceStatus {
    return this.sharedStore.getState();
  }

  async setStatusInterface(dataInterface: constants.Interface): Promise<void> {
    const status = await this.updateInterfaceStatus(dataInterface);
    const result = this.updateStatusState(status);
    this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, result);
  }

  @logMethod('[StatusInterfaceService][initStatusChecking]')
  initStatusChecking(): void {
    const setupPath = this.pathSvc.join(
      this.configSvc.getConfig<IHostConfig>(APP_CONFIG.CONNECTION, 'rosWorkspace') || '',
      'devel/setup.sh'
    );
    this.statusLoop(setupPath, getAVPath());
  }

  @logMethod('[StatusInterfaceService][statusLoop]', log.debug)
  private statusLoop(setupPath: string, interfacePath: string) {
    if (!this.statusWorker) {
      this.statusWorker = utilityProcess.fork(
        getWorkerPath('workerInterfaceHealthcheck.js'),
        undefined,
        { serviceName: 'nrc_av_agent--interface-status', stdio: 'pipe' }
      );
      this.statusWorker.stdout?.on('data', (data) => {
        log.debug(`${data.toString()}`);
      });
      this.statusWorker.stderr?.on('data', (data) => {
        log.error(`${data.toString()}`);
      });
      let lastSentData: any = null;
      this.statusWorker.on('message', (res) => {
        // Not an error
        if (!res.type) {
          if (JSON.stringify(res) !== JSON.stringify(lastSentData)) {
            lastSentData = res;
            const statusInterface = this.updateStatusState(res);
            this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, statusInterface);
            setTimeout(this.statusLoop.bind(this, setupPath, interfacePath), 200);
          } else {
            setTimeout(this.statusLoop.bind(this, setupPath, interfacePath), 5000);
            const statusInterface = this.updateStatusState(res);
            this.commSvc.sendNoAck(GET_INTERFACE_DETAIL_STATUS, statusInterface);
          }
        }
      });
      this.statusWorker.once('exit', (code: number) => {
        log.debug(`[worker-interface-status] Process exited with code ${code}`);
        setTimeout(this.statusLoop.bind(this, setupPath, interfacePath), 200);
      });
    }

    this.statusWorker.postMessage({
      sharedState: this.sharedStore.getState(),
      setupPath,
      interfacePath
    });
  }

  @logMethod('[StatusInterfaceService][updateStatusState]', log.debug)
  private updateStatusState(interfaceStatus: constants.InterfaceStatus): constants.InterfaceStatus {
    if (
      !interfaceStatus ||
      !interfaceStatus.machines.length ||
      !interfaceStatus.sensors.length ||
      !interfaceStatus.algorithms.length
    ) {
      return this.sharedStore.getState();
    }

    this.sharedStore.setState((data) => {
      // eslint-disable-next-line no-param-reassign
      data.interfaceName = interfaceStatus.interfaceName;
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      interfaceStatus.machines.forEach((machineStatus) => {
        const foundMachineStatus = currentInterfaceStatus.machines.find(
          (machine) => machine.name === machineStatus.name
        );

        if (foundMachineStatus) {
          foundMachineStatus.status = machineStatus.status;
        } else {
          currentInterfaceStatus.machines.push(machineStatus);
        }
      });
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      interfaceStatus.sensors.forEach((sensorStatus) => {
        const foundsensorStatus = currentInterfaceStatus.sensors.find(
          (sensor) => sensor.name === sensorStatus.name
        );

        if (foundsensorStatus) {
          foundsensorStatus.status = sensorStatus.status;
        } else {
          currentInterfaceStatus.sensors.push(sensorStatus);
        }
      });
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      interfaceStatus.algorithms.forEach((algorithmStatus) => {
        const foundalgorithmStatus = currentInterfaceStatus.algorithms.find(
          (algorithm) => algorithm.name === algorithmStatus.name
        );

        if (foundalgorithmStatus) {
          foundalgorithmStatus.status = algorithmStatus.status;
        } else {
          currentInterfaceStatus.algorithms.push(algorithmStatus);
        }
      });
    });

    this.sharedStore.setState((currentInterfaceStatus) => {
      // eslint-disable-next-line no-param-reassign
      currentInterfaceStatus.status = interfaceStatus.status;
    });

    return this.sharedStore.getState();
  }
}
