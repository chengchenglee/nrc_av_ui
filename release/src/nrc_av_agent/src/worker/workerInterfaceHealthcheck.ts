/* eslint-disable no-console */
import { ChildProcess, exec, spawn } from 'child_process';
import {
  AlgorithmsStatus,
  InterfaceFileStatusType,
  InterfaceStatus,
  MachineStatusType,
  MachinesStatus,
  RosTopicStatusType,
  SensorsStatus
} from '../shared/constants';

const interfaceStatusUpdated: InterfaceStatus = {
  interfaceName: '',
  machines: [],
  sensors: [],
  algorithms: [],
  status: InterfaceFileStatusType.STOPPED
};

let listenTopic: ChildProcess | undefined;
const processIds = new Map<string, number>();
const childProcessList: ChildProcess[] = [];

let init = 0;
let lastMsgStamp = 0;
let avgDtInit = 0;
let lastGlobalStamp = 0;

function execute(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(stderr);
      }
      return resolve(stdout);
    });
  });
}

function update(stamp: number) {
  if (stamp < 1) {
    // eslint-disable-next-line no-param-reassign
    stamp = Date.now() / 1000;
  }

  if (init === 0) {
    init = 1;
  }
  if (init === 1) {
    const dt = Math.min(5.0, Math.max(0.0, stamp - lastMsgStamp));
    const avgDt = 0.99 * avgDtInit + 0.01 * dt;
    avgDtInit = avgDt;
  }

  lastMsgStamp = stamp;
  lastGlobalStamp = Date.now() / 1000;
}

function calRate() {
  const dtGlobal = Date.now() / 1000 - lastGlobalStamp;
  const dt = Math.max(avgDtInit, dtGlobal);
  let rate: number;
  if (dt > 0) {
    rate = 1 / dt;
  } else {
    rate = 0;
  }
  return rate;
}

function updateListenTopicStatus(topicStatus: SensorsStatus | AlgorithmsStatus) {
  const sensor = interfaceStatusUpdated.sensors.find((s) => s.topicName === topicStatus.topicName);
  const algorithm = interfaceStatusUpdated.algorithms.find(
    (s) => s.topicName === topicStatus.topicName
  );
  if (sensor) {
    sensor.status = topicStatus.status;
  }

  if (algorithm) {
    algorithm.status = topicStatus.status;
  }
}

function processData(
  data: Buffer,
  sensorsStatus: SensorsStatus | AlgorithmsStatus,
  modifiedStatus: SensorsStatus | AlgorithmsStatus
) {
  const dataString = data.toString();
  const stampsString = dataString.match(/secs: (\d+)/);
  let stamps = Date.now() / 1000;
  if (stampsString !== null) {
    stamps = parseInt(stampsString[1], 10);
  }
  update(stamps);
  const color = calRate();
  if (color > sensorsStatus.warnRate) {
    // eslint-disable-next-line no-param-reassign
    modifiedStatus.status = RosTopicStatusType.GOOD;
  } else if (color > sensorsStatus.errRate) {
    // eslint-disable-next-line no-param-reassign
    modifiedStatus.status = RosTopicStatusType.TERRIBLE;
  }
  updateListenTopicStatus(modifiedStatus);
}

async function assignMachinesStatus(machinesStatus: MachinesStatus): Promise<MachinesStatus> {
  const modifiedStatus: MachinesStatus = machinesStatus;
  try {
    const results = await execute(`ping -c 1 ${machinesStatus.addr}`);
    const ping = results.length > 0 ? 1 : 0;
    if (ping === 1) {
      modifiedStatus.status = MachineStatusType.PASS;
    } else {
      modifiedStatus.status = MachineStatusType.FAIL;
    }
  } catch (err) {
    if (modifiedStatus.status === MachineStatusType.PASS) {
      modifiedStatus.status = MachineStatusType.FAIL;
    }
  }
  return modifiedStatus;
}

function assignSensorsStatus(setupPath: string, sensorsStatus: SensorsStatus): void {
  const modifiedStatus: SensorsStatus = sensorsStatus;

  const existingProcessId = processIds.get(sensorsStatus.topicName);

  if (existingProcessId !== undefined) {
    try {
      process.kill(existingProcessId, 0);
      const processForTopic = childProcessList.find((process) => process.pid === existingProcessId);
      processForTopic?.stdout?.removeAllListeners('data');
      modifiedStatus.status = RosTopicStatusType.BAD;
      processForTopic?.stdout?.on('data', (data) => {
        if (data) {
          processData(data, sensorsStatus, modifiedStatus);
        }
      });
    } catch (e) {
      processIds.delete(sensorsStatus.topicName);
    }
  } else {
    listenTopic = spawn(`. ${setupPath} && rostopic`, ['echo', sensorsStatus.topicName], {
      shell: true
    });
    modifiedStatus.status = RosTopicStatusType.BAD;
    listenTopic?.stdout?.on('data', (data) => {
      if (data) {
        processData(data, sensorsStatus, modifiedStatus);
      }
    });

    listenTopic.on('exit', (code: number) => {
      if (code === 0) {
        modifiedStatus.status = RosTopicStatusType.BAD;
        updateListenTopicStatus(modifiedStatus);
      }
      processIds.delete(sensorsStatus.topicName);
    });

    if (listenTopic.pid !== undefined) {
      processIds.set(sensorsStatus.topicName, listenTopic.pid);
      childProcessList.push(listenTopic);
    }
  }
}

function assignAlgorithmsStatus(setupPath: string, algorithmsStatus: AlgorithmsStatus): void {
  const modifiedStatus: AlgorithmsStatus = algorithmsStatus;

  const existingProcessId = processIds.get(algorithmsStatus.topicName);

  if (existingProcessId !== undefined) {
    try {
      process.kill(existingProcessId, 0);
      const processForTopic = childProcessList.find((process) => process.pid === existingProcessId);
      processForTopic?.stdout?.removeAllListeners('data');
      modifiedStatus.status = RosTopicStatusType.BAD;
      processForTopic?.stdout?.on('data', (data) => {
        if (data) {
          processData(data, algorithmsStatus, modifiedStatus);
        }
      });
    } catch (e) {
      processIds.delete(algorithmsStatus.topicName);
    }
  } else {
    listenTopic = spawn(`. ${setupPath} && rostopic`, ['echo', algorithmsStatus.topicName], {
      shell: true
    });
    modifiedStatus.status = RosTopicStatusType.BAD;
    listenTopic?.stdout?.on('data', (data) => {
      if (data) {
        processData(data, algorithmsStatus, modifiedStatus);
      }
    });

    listenTopic.on('exit', (code: number) => {
      if (code === 0) {
        modifiedStatus.status = RosTopicStatusType.BAD;
        updateListenTopicStatus(modifiedStatus);
      }
      processIds.delete(algorithmsStatus.topicName);
    });

    if (listenTopic.pid !== undefined) {
      processIds.set(algorithmsStatus.topicName, listenTopic.pid);
      childProcessList.push(listenTopic);
    }
  }
}

async function assignInterfaceFileStatus(
  fileStatus: InterfaceStatus,
  pathAV: string
): Promise<InterfaceFileStatusType> {
  const modifiedStatus: InterfaceStatus = fileStatus;
  try {
    if (modifiedStatus.interfaceName === '') {
      return InterfaceFileStatusType.STOPPED;
    }
    const results = await execute(`pgrep --full ${pathAV}/ros_core.py`);
    if (results !== '') {
      modifiedStatus.status = InterfaceFileStatusType.RUNNING;
    } else {
      modifiedStatus.status = InterfaceFileStatusType.STOPPED;
    }
  } catch (err) {
    if (modifiedStatus.status === InterfaceFileStatusType.RUNNING) {
      modifiedStatus.status = InterfaceFileStatusType.STOPPED;
    }
  }
  if (modifiedStatus.status !== undefined) {
    return modifiedStatus.status;
  }
  return InterfaceFileStatusType.STOPPED;
}

process.parentPort.on('message', async (e) => {
  try {
    const interfaceStatus: InterfaceStatus = e.data.sharedState;
    interfaceStatus.sensors.map((sensorStatus) =>
      assignSensorsStatus(e.data.setupPath, sensorStatus)
    );

    interfaceStatus.algorithms.map((algorithmStatus) =>
      assignAlgorithmsStatus(e.data.setupPath, algorithmStatus)
    );

    interfaceStatusUpdated.interfaceName = interfaceStatus.interfaceName;
    interfaceStatusUpdated.machines = await Promise.all(
      interfaceStatus.machines.map((machineStatus) => assignMachinesStatus(machineStatus))
    );
    interfaceStatusUpdated.sensors = interfaceStatus.sensors;
    interfaceStatusUpdated.algorithms = interfaceStatus.algorithms;
    interfaceStatusUpdated.status = await assignInterfaceFileStatus(
      interfaceStatus,
      e.data.interfacePath
    );
    process.parentPort.postMessage(interfaceStatusUpdated);
  } catch (error) {
    console.error(`[worker-interface-status] ${error}`);
    const errorObject = { status: 'All connections failed!', type: 'error' };
    process.parentPort.postMessage(errorObject);
  }
});
