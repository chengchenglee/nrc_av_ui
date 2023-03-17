import { exec } from 'child_process';

enum ROSNodeStatus {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED'
}
interface ROSNode {
  packageName: string;
  name: string;
  status: ROSNodeStatus;
}

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

async function assignNodeStatus(rosNode: ROSNode): Promise<ROSNode> {
  const statusRosNode: ROSNode = rosNode;
  const rosNodeName = `${rosNode.packageName}__${rosNode.name}`;
  try {
    await execute(`rosnode ping ${rosNodeName} -c 1`);
    statusRosNode.status = ROSNodeStatus.RUNNING;
  } catch (err) {
    statusRosNode.status = ROSNodeStatus.STOPPED;
  }
  return statusRosNode;
}

process.parentPort.on('message', (e) => {
  const rosNode: ROSNode[] = e.data;
  const promise: Promise<ROSNode>[] = [];
  rosNode
    .filter(
      (node) => node.status === ROSNodeStatus.RUNNING || node.status === ROSNodeStatus.STOPPED
    )
    .forEach((node) => {
      promise.push(assignNodeStatus(node));
    });
  Promise.all(promise)
    .then((result) => {
      process.parentPort.postMessage(result);
    })
    .catch((err) => {
      console.error(err);
      const errorObject = { status: 'All connections failed!', type: 'error' };
      process.parentPort.postMessage(errorObject);
    });
});
export {};
