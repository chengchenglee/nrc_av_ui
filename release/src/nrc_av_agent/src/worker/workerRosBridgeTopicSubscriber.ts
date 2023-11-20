import bigInt from 'big-integer';
import { Ros, Topic } from 'roslib';
import * as constants from '../shared/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const now = require('nano-time');

const rosBridgeConnection = new Ros({
  url: `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
});

const topicMap: Map<string, constants.AlgorithmsTopic | constants.SensorsTopic> = new Map();

const delayInMs = (time: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

const rosBridgeConnect = async (): Promise<void> => {
  try {
    rosBridgeConnection.connect(
      `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
    );
  } catch {
    await delayInMs(constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_CONNECT_BUFFER_TIME);
    rosBridgeConnect();
  }
};

const getRosBridgeConnection = async (): Promise<Ros> => {
  if (!rosBridgeConnection.isConnected) {
    await rosBridgeConnect();
  }
  return rosBridgeConnection;
};

const calRate = (lastGlobalStamp: number, avgDowntimeInit: number) => {
  const downtimeGlobal =
    Number.parseFloat((bigInt(now.microseconds()).toJSNumber() / 1e6).toFixed(6)) - lastGlobalStamp;
  const downtime = Math.max(avgDowntimeInit, downtimeGlobal);
  let rate: number;
  if (downtime > 0) {
    rate = 1 / downtime;
  } else {
    rate = 0;
  }

  return rate;
};

const processTopicMapState = (topic: constants.SensorsStatus | constants.AlgorithmsStatus) => {
  const selectedTopic = topicMap.get(topic.uuid);
  if (selectedTopic && selectedTopic !== undefined) {
    const rate = calRate(selectedTopic.lastGlobalStamp, selectedTopic.avgDowntimeInit);
    let updatedStatus = constants.RosTopicStatusType.BAD;
    if (rate > selectedTopic.warnRate) {
      updatedStatus = constants.RosTopicStatusType.GOOD;
    } else if (rate > selectedTopic.errRate) {
      updatedStatus = constants.RosTopicStatusType.TERRIBLE;
    }
    selectedTopic.healthCheckRate = Math.round((rate + Number.EPSILON) * 100) / 100;

    selectedTopic.msgCount += 1;
    if (selectedTopic.msgCount >= 1000) {
      selectedTopic.msgCount = 0;
    }
    if (selectedTopic.status !== updatedStatus) {
      selectedTopic.status = updatedStatus;
      topicMap.set(topic.uuid, selectedTopic);
      process.parentPort.postMessage(Array.from(topicMap.values()));
    }
  }
};

const processAllTopicMapState = (
  topicList: constants.SensorsStatus[] | constants.AlgorithmsStatus[]
) => {
  topicList.forEach((topic) => {
    const selectedTopic = topicMap.get(topic.uuid);
    if (selectedTopic && selectedTopic !== undefined) {
      const rate = calRate(selectedTopic.lastGlobalStamp, selectedTopic.avgDowntimeInit);
      let updatedStatus = constants.RosTopicStatusType.BAD;
      if (rate > selectedTopic.warnRate) {
        updatedStatus = constants.RosTopicStatusType.GOOD;
      } else if (rate > selectedTopic.errRate) {
        updatedStatus = constants.RosTopicStatusType.TERRIBLE;
      }
      selectedTopic.healthCheckRate = Math.round((rate + Number.EPSILON) * 100) / 100;
      if (selectedTopic.status !== updatedStatus) {
        selectedTopic.status = updatedStatus;
        topicMap.set(topic.uuid, selectedTopic);
      }
    }
  });
};

const processTopicData = (
  topic: constants.SensorsStatus | constants.AlgorithmsStatus,
  message: constants.IRosBridgeMessage
) => {
  const topicObj = topicMap.get(topic.uuid);
  if (topicObj && topicObj !== undefined) {
    let stamps = 0;
    if (message?.header?.stamp) {
      stamps =
        Math.round(
          (message.header.stamp.secs + message.header.stamp.nsecs * 1e-9 + Number.EPSILON) * 1e6
        ) / 1e6;
    }
    if (stamps < 1) {
      stamps = Number.parseFloat((bigInt(now.microseconds()).toJSNumber() / 1e6).toFixed(6));
    }

    const downtime = Math.min(5.0, Math.max(0.0, stamps - topicObj.lastMsgStamp));
    const avgDowntime =
      Math.round((0.99 * topicObj.avgDowntimeInit + 0.01 * downtime + Number.EPSILON) * 1e6) / 1e6;

    topicObj.avgDowntimeInit = avgDowntime;
    topicObj.lastMsgStamp = stamps;
    topicObj.lastGlobalStamp = Number.parseFloat(
      (bigInt(now.microseconds()).toJSNumber() / 1e6).toFixed(6)
    );
    topicMap.set(topic.uuid, topicObj);
    processTopicMapState(topic);
  }
};

const subscribeToTopic = (
  rosConnection: Ros,
  topic: constants.SensorsStatus | constants.AlgorithmsStatus,
  topicTypeName: string
) => {
  const topicRos = new Topic({
    ros: rosConnection,
    name: topic.topicName,
    messageType: topicTypeName
  });
  topicRos.subscribe((message) => {
    const res = message as constants.IRosBridgeMessage;
    processTopicData(topic, res);
  });
};

const getTopicTypeAndSubscribe = (
  rosConnection: Ros,
  topic: constants.SensorsStatus | constants.AlgorithmsStatus
) => {
  rosConnection.getTopicType(topic.topicName, (type) => {
    if (type) {
      subscribeToTopic(rosConnection, topic, type);
    } else {
      // Most likely topic haven't finished initializing yet, we will poll for it!
      const topicPolling = setInterval(() => {
        rosConnection.getTopicType(topic.topicName, (typePolling) => {
          if (typePolling) {
            clearInterval(topicPolling);
            subscribeToTopic(rosConnection, topic, typePolling);
          }
        });
      }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_POLL_INTERVAL);
    }
  });
};

const subscribeToAllTopics = (
  rosConnection: Ros,
  topicList: constants.SensorsStatus[] | constants.AlgorithmsStatus[]
) => {
  topicList.forEach((item) => {
    topicMap.set(item.uuid, {
      ...item,
      avgDowntimeInit: 0,
      lastGlobalStamp: 0,
      lastMsgStamp: 0
    });
    getTopicTypeAndSubscribe(rosConnection, item);
  });
};

getRosBridgeConnection();
process.parentPort.once('message', async (e) => {
  const topicListArr = e.data.topicList as constants.SensorsStatus[] | constants.AlgorithmsStatus[];
  subscribeToAllTopics(await getRosBridgeConnection(), topicListArr);
  setInterval(() => {
    processAllTopicMapState(Array.from(topicMap.values()));
    process.parentPort.postMessage(Array.from(topicMap.values()));
  }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_PASSIVE_INTERVAL);
});
