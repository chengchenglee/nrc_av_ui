/* eslint-disable no-console */
import { exec } from 'child_process';
import { ROSNodeStatus, ROSNodeStatusType } from '../shared/constants';

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

async function assignNodeStatus(rosNode: ROSNodeStatus): Promise<ROSNodeStatus> {
  const statusRosNode: ROSNodeStatus = rosNode;
  const rosNodeName = rosNode.packageName
    ? `${rosNode.packageName}__${rosNode.name}`
    : `${rosNode.name}`;

  try {
    await execute(`rosnode ping ${rosNodeName} -c 1`);
    statusRosNode.status = ROSNodeStatusType.RUNNING;
  } catch (err) {
    if (statusRosNode.status === ROSNodeStatusType.UNKNOWN) {
      statusRosNode.status = ROSNodeStatusType.NOT_STARTED;
    } else if (statusRosNode.status === ROSNodeStatusType.RUNNING) {
      statusRosNode.status = ROSNodeStatusType.STOPPED;
    }
  }
  return statusRosNode;
}

process.parentPort.on('message', (e) => {
  const rosNodes: ROSNodeStatus[] = e.data;
  const promises: Promise<ROSNodeStatus>[] = [];
  // console.log(`[worker-rosnode-status] check status of: ${JSON.stringify(rosNodes)}`);
  rosNodes
    .filter(
      (node) =>
        node.status === ROSNodeStatusType.UNKNOWN || node.status === ROSNodeStatusType.RUNNING
    )
    .forEach((node) => {
      promises.push(assignNodeStatus(node));
    });
  Promise.all(promises)
    .then((result) => {
      process.parentPort.postMessage(result);
    })
    .catch((err) => {
      console.error(`[worker-rosnode-status] ${err}`);
      const errorObject = { status: 'All connections failed!', type: 'error' };
      process.parentPort.postMessage(errorObject);
    });
});
