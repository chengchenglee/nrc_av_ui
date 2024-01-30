import { Ros } from 'roslib';
import * as constants from './constants';

const delayInMs = (time: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

const rosBridgeConnect = async (
  rosBridgeConnection: Ros,
  maxConnectAttempt?: number,
  tries = 1
): Promise<Ros> => {
  try {
    rosBridgeConnection.connect(
      `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
    );
  } catch {
    const connectAttempt = tries + 1;
    if (maxConnectAttempt && tries > maxConnectAttempt) {
      return Promise.reject();
    }
    await delayInMs(constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_CONNECT_BUFFER_TIME);
    // eslint-disable-next-line no-param-reassign
    rosBridgeConnection = await rosBridgeConnect(
      rosBridgeConnection,
      maxConnectAttempt,
      connectAttempt
    );
  }
  return rosBridgeConnection;
};

const getRosBridgeConnection = async (
  rosBridgeConnection: Ros,
  maxConnectAttempt?: number
): Promise<Ros> => {
  if (!rosBridgeConnection.isConnected) {
    // eslint-disable-next-line no-param-reassign
    rosBridgeConnection = await rosBridgeConnect(rosBridgeConnection, maxConnectAttempt);
  }
  return rosBridgeConnection;
};

export { getRosBridgeConnection, delayInMs };
