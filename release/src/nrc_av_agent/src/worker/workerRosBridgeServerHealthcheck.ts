import { Ros, Topic } from 'roslib';
import {
  ROSBridgeHealthcheckData,
  ROS_BRIDGE_SOCKET,
  ROS_BRIDGE_WORKER_HEALTHCHECK
} from '../shared/constants';
import * as constants from '../shared/constants';
import { getRosBridgeConnection } from '../shared/workerUtils';

let socketUrl = ROS_BRIDGE_SOCKET.SOCKET_URL;
let socketPort = ROS_BRIDGE_SOCKET.SOCKET_PORT;
let lastMessageSent = Date.now();

const healthCheckLoop = async (rosBridgeConnection: Ros) => {
  try {
    if (!rosBridgeConnection.isConnected) {
      rosBridgeConnection.removeAllListeners();
      rosBridgeConnection.on('error', () => null);
      await getRosBridgeConnection(
        rosBridgeConnection,
        ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_CONNECT_RETRY
      );
    }
    if (Date.now() - lastMessageSent >= ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_MESSAGE_TIMEOUT) {
      throw new Error();
    }
  } catch {
    const errorObject = {
      status: `No message after ${ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_MESSAGE_TIMEOUT} ms`,
      type: 'error'
    };
    process.parentPort.postMessage(errorObject);
  }
};

// Init message
process.parentPort.once('message', (e) => {
  const healthCheckData: ROSBridgeHealthcheckData = e.data;
  ({ socketPort, socketUrl } = healthCheckData);
  const rosBridgeConnection = new Ros({
    url: `${socketUrl}:${socketPort}`
  });
  rosBridgeConnection.on('error', () => null);
  lastMessageSent = Date.now();
  const topic = new Topic({
    ros: rosBridgeConnection,
    name: constants.EnumRosBridgeTopic.ROS_BRIDGE_HEALTH,
    messageType: 'std_msgs/String'
  });
  topic.advertise();
  topic.subscribe(() => {
    lastMessageSent = Date.now();
  });
  setInterval(() => {
    const message: constants.StdStringTopicMessage = {
      data: 'heartbeat'
    };
    topic.publish(message);
  }, ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_PUBLISH_INTERVAL);
  setInterval(async () => {
    await healthCheckLoop(rosBridgeConnection);
  }, ROS_BRIDGE_WORKER_HEALTHCHECK.ROS_BRIDGE_CHECK_INTERVAL);
});
