import { exec } from 'child_process';
import {
  ROSBridgeHealthcheckData,
  ROS_BRIDGE_SOCKET,
  ROS_BRIDGE_WORKER_HEALTHCHECK
} from '../shared/constants';

let socketUrl = ROS_BRIDGE_SOCKET.SOCKET_URL;
let socketPort = ROS_BRIDGE_SOCKET.SOCKET_PORT;

// Ping command return stderr sometime for some reason ??
const executePingCommand = (command: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        if (stderr.includes('Connection refused')) {
          return reject(stderr);
        }
        return resolve(stderr);
      }
      return resolve(stdout);
    });
  });

const delayInMs = (time: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

const pingRosBridge = (
  maxPingAttempt = ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_PING_RETRY,
  tries = 1
): Promise<void> =>
  new Promise((resolve) => {
    const pingTimeout = setTimeout(() => {
      const errorObject = {
        status: `Ping timeout after ${ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_PING_TIMEOUT} ms`,
        type: 'error'
      };
      process.parentPort.postMessage(errorObject);
      resolve();
    }, ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_PING_TIMEOUT);
    executePingCommand(`nc -vz ${socketUrl.replace('ws://', '')} ${socketPort}`)
      .then(() => {
        clearTimeout(pingTimeout);
        resolve();
      })
      .catch(async () => {
        clearTimeout(pingTimeout);
        if (tries >= maxPingAttempt) {
          const errorObject = {
            status: `Ping failed after ${maxPingAttempt} tries`,
            type: 'error'
          };
          process.parentPort.postMessage(errorObject);
          resolve();
        }
        const nextPingAttempt = tries + 1;
        await delayInMs(ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_PING_BUFFER_TIME);
        await pingRosBridge(maxPingAttempt, nextPingAttempt);
      });
  });

const healthCheckLoop = () => {
  pingRosBridge()
    .then(() => {
      const replyObject = { status: 'Ping successful!' };
      process.parentPort.postMessage(replyObject);
    })
    .catch(() => {
      // If by some miracle there an error here then we are fucked
      const errorObject = { status: 'Unknown error', type: 'error' };
      process.parentPort.postMessage(errorObject);
      // Kill this worker if this ever happens
      process.exit();
    });
};

// Init message
process.parentPort.once('message', (e) => {
  const healthCheckData: ROSBridgeHealthcheckData = e.data;
  ({ socketPort, socketUrl } = healthCheckData);
  setInterval(healthCheckLoop, ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_PING_INTERVAL);
});
