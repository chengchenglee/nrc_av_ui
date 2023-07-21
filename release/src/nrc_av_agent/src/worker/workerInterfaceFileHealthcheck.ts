/* eslint-disable no-console */
import { exec } from 'child_process';
import { InterfaceFileStatus, InterfaceFileStatusType } from '../shared/constants';

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

async function assignInterfaceFileStatus(
  fileStatus: InterfaceFileStatus,
  pathAV: string
): Promise<InterfaceFileStatus> {
  const modifiedStatus: InterfaceFileStatus = fileStatus;
  try {
    const results = await execute(`ps aux | grep ${pathAV}/ros_core.py`);
    const checkRosCore = `python ${pathAV}/ros_core.py`;
    if (results.includes(checkRosCore)) {
      modifiedStatus.status = InterfaceFileStatusType.RUNNING;
    } else {
      modifiedStatus.status = InterfaceFileStatusType.STOPPED;
    }
  } catch (err) {
    if (modifiedStatus.status === InterfaceFileStatusType.RUNNING) {
      modifiedStatus.status = InterfaceFileStatusType.STOPPED;
    }
  }
  return modifiedStatus;
}

process.parentPort.on('message', (e) => {
  const filesStatus: InterfaceFileStatus[] = e.data.sharedState;
  const promises: Promise<InterfaceFileStatus>[] = [];
  console.log(`[worker-interface-status] check status of: ${JSON.stringify(filesStatus)}`);
  filesStatus
    .filter((fileStatus) => fileStatus.status === InterfaceFileStatusType.RUNNING)
    .forEach((fileStatus) => {
      promises.push(assignInterfaceFileStatus(fileStatus, e.data.interfacePath));
    });
  Promise.all(promises)
    .then((result) => {
      process.parentPort.postMessage(result);
    })
    .catch((err) => {
      console.error(`[worker-interface-status] ${err}`);
      const errorObject = { status: 'All connections failed!', type: 'error' };
      process.parentPort.postMessage(errorObject);
    });
});
