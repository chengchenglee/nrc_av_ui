/* eslint-disable max-classes-per-file */
import { Ros, Topic } from 'roslib';
import * as constants from '../shared/constants';
import { getRosBridgeConnection } from '../shared/workerUtils';

class FixedSizeQueue<T> {
  private queue: T[] = [];

  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  enqueue(item: T): void {
    this.queue.push(item);

    if (this.queue.length > this.maxSize) {
      this.queue.shift(); // Remove the oldest element if the queue exceeds the maximum size
    }
  }

  getQueue(): T[] {
    return this.queue;
  }
}

class QueueMap extends Map<string, FixedSizeQueue<number>> {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }

  private createQueue(key: string): void {
    // Ensure that a queue with the specified key doesn't already exist
    if (!this.has(key)) {
      // Create a new FixedSizeQueue with a maximum size of 50000
      this.set(key, new FixedSizeQueue<number>(50000));
    }
  }

  enqueueValue(key: string, value: number): void {
    // Ensure that a queue with the specified key exists
    if (this.has(key)) {
      // Enqueue the value into the corresponding FixedSizeQueue
      this.get(key)?.enqueue(value);
    } else {
      // If the queue doesn't exist, create it and then enqueue the value
      this.createQueue(key);
      this.get(key)?.enqueue(value);
    }
  }

  getQueue(key: string): number[] | undefined {
    // Return the current state of the queue with the specified key
    return this.get(key)?.getQueue();
  }
}

const rosBridgeConnection = new Ros({
  url: `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
});

const topicMap: Map<string, constants.AlgorithmsTopic | constants.SensorsTopic> = new Map();
const rosTopicMap: Map<string, Topic> = new Map();
const topicMapTime = new QueueMap();
const topicIgnore = new Set();

const calRate = (topic: constants.AlgorithmsTopic | constants.SensorsTopic) => {
  let rate = 0;
  const timeQueue = topicMapTime.getQueue(topic.uuid);
  if (!timeQueue || topicIgnore.has(topic.uuid)) {
    return rate;
  }
  if (topic.lastPrintedMsgStamp === topic.lastMsgStamp) {
    // This will remove the time queue when the topic is determined dead
    // Resulted in restarting a sub system will ramp up the rate
    // Rate will eventually sync up with rostopic hz however
    // rostopic hz will be slower to catch up
    const floatSecs: number = Date.now() / 1000;
    const secs: number = Math.floor(floatSecs);
    const nsecs: number = Math.floor((floatSecs - secs) * 1e9);
    const currentTimeCal = Math.round((secs + nsecs * 1e-9 + Number.EPSILON) * 1e6) / 1e6;
    if (
      currentTimeCal - topic.lastMsgStamp >=
      constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_STOP_TIME / 1000
    ) {
      return rate;
    }
  }
  const sum = timeQueue.reduce((partialSum, a) => partialSum + a, 0);
  const mean = sum / timeQueue.length;
  rate = 1.0 / mean;
  if (rate <= 0) {
    return 0;
  }
  return rate;
};

const processAllTopicMapState = (
  topicList: constants.SensorsStatus[] | constants.AlgorithmsStatus[]
) => {
  topicList.forEach((topic) => {
    const selectedTopic = topicMap.get(topic.uuid);
    if (selectedTopic && selectedTopic !== undefined) {
      const rate = calRate(selectedTopic);
      let updatedStatus = constants.RosTopicStatusType.BAD;
      if (rate > selectedTopic.warnRate) {
        updatedStatus = constants.RosTopicStatusType.GOOD;
      } else if (rate > selectedTopic.errRate) {
        updatedStatus = constants.RosTopicStatusType.TERRIBLE;
      }
      selectedTopic.lastPrintedMsgStamp = selectedTopic.lastMsgStamp;
      selectedTopic.healthCheckRate = Math.round((rate + Number.EPSILON) * 100) / 100;
      selectedTopic.status = updatedStatus;
      topicMap.set(topic.uuid, selectedTopic);
    }
  });
};

const processTopicData = (topic: constants.SensorsStatus | constants.AlgorithmsStatus) => {
  const topicObj = topicMap.get(topic.uuid);
  if (topicObj && topicObj !== undefined) {
    const floatSecs: number = Date.now() / 1000;
    const secs: number = Math.floor(floatSecs);
    const nsecs: number = Math.floor((floatSecs - secs) * 1e9);

    const currentTimeCal = Math.round((secs + nsecs * 1e-9 + Number.EPSILON) * 1e6) / 1e6;
    if (topicObj.lastGlobalStamp < 0 || topicObj.lastGlobalStamp > currentTimeCal) {
      topicObj.lastMsgStamp = currentTimeCal;
      topicObj.lastGlobalStamp = currentTimeCal;
    } else {
      const time = currentTimeCal - topicObj.lastMsgStamp;
      topicMapTime.enqueueValue(topicObj.uuid, time);
      topicObj.lastMsgStamp = currentTimeCal;
    }
    topicObj.msgCount += 1;
    if (topicObj.msgCount >= 1000 || topicIgnore.has(topic.uuid)) {
      topicObj.msgCount = 0;
    }
    topicMap.set(topic.uuid, topicObj);
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
    messageType: topicTypeName,
    compression: 'cbor-raw',
    queue_length: 0,
    queue_size: 0
  });
  rosTopicMap.get(topic.uuid)?.unsubscribe();
  rosTopicMap.set(topic.uuid, topicRos);
  topicRos.subscribe(() => {
    processTopicData(topic);
  });
};

const unsubscribeTopic = (topicUuid: string) => {
  rosTopicMap.get(topicUuid)?.unsubscribe();
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

const initAllTopics = (topicList: constants.SensorsStatus[] | constants.AlgorithmsStatus[]) => {
  topicMapTime.clear();
  topicList.forEach((item) => {
    topicMap.set(item.uuid, {
      ...item,
      lastPrintedMsgStamp: 0,
      lastGlobalStamp: -1,
      lastMsgStamp: 0
    });
    topicIgnore.add(item.uuid);
  });
};

const resetTopicStateFromIdList = (id: number[], addToIgnore: boolean, rosConnection: Ros) => {
  const idSet = new Set(id);
  topicMap.forEach((topic) => {
    const topicReset = topicMap.get(topic.uuid);
    if (idSet.has(topic.id) && topicReset) {
      topicReset.lastPrintedMsgStamp = 0;
      topicReset.lastGlobalStamp = -1;
      topicReset.lastMsgStamp = 0;
      topicMap.set(topic.uuid, topicReset);
      topicMapTime.delete(topic.uuid);
      if (addToIgnore) {
        topicIgnore.add(topic.uuid);
        unsubscribeTopic(topic.uuid);
      } else {
        topicIgnore.delete(topic.uuid);
        topicMap.set(topic.uuid, {
          ...topicReset
        });
        getTopicTypeAndSubscribe(rosConnection, topicReset);
      }
    }
  });
};

// getRosBridgeConnection();
process.parentPort.on('message', async (e) => {
  const message = e.data as constants.IRosBridgeTopicWorkerMessage;
  // eslint-disable-next-line default-case
  switch (message.type) {
    case constants.EnumRosBridgeTopicWorkerMessage.INIT: {
      const initMessage = e.data as constants.IRosBridgeTopicWorkerMessageInit;
      const topicListArr = initMessage.topicList as
        | constants.SensorsStatus[]
        | constants.AlgorithmsStatus[];
      initAllTopics(topicListArr);
      setInterval(() => {
        processAllTopicMapState(Array.from(topicMap.values()));
        process.parentPort.postMessage(Array.from(topicMap.values()));
        // }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_PASSIVE_INTERVAL);
      }, 5000);
      break;
    }
    case constants.EnumRosBridgeTopicWorkerMessage.START: {
      const startMessage = e.data as constants.IRosBridgeTopicWorkerMessageStart;
      resetTopicStateFromIdList(
        startMessage.topidIdList,
        false,
        await getRosBridgeConnection(rosBridgeConnection)
      );
      break;
    }
    case constants.EnumRosBridgeTopicWorkerMessage.STOP: {
      const stopMessage = e.data as constants.IRosBridgeTopicWorkerMessageStop;
      resetTopicStateFromIdList(
        stopMessage.topidIdList,
        true,
        await getRosBridgeConnection(rosBridgeConnection)
      );
      break;
    }
  }
});
