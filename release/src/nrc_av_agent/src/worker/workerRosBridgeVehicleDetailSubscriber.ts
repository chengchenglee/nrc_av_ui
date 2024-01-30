import { Ros, Topic } from 'roslib';
import * as constants from '../shared/constants';
import { getRosBridgeConnection } from '../shared/workerUtils';

const rosBridgeConnection = new Ros({
  url: `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
});

let latitude = 0;
let longitude = 0;
let velocity = 0;
let rosNodes: string[] = [];
let rosTopics: string[] = [];

const subscribeToTopic = (
  rosConnection: Ros,
  topic: constants.VehicleDetailTopic,
  topicTypeName: string
) => {
  const topicRos = new Topic({
    ros: rosConnection,
    name: topic.topicName,
    messageType: topicTypeName
  });
  topicRos.subscribe((message) => {
    switch (topic.topicType) {
      case constants.EnumVehicleDetailTopic.GPS: {
        const res = message as constants.IRosBridgeMessageGPS;
        latitude = res.Latitude ?? 0;
        longitude = res.Longitude ?? 0;
        break;
      }
      case constants.EnumVehicleDetailTopic.SPEED: {
        const res = message as constants.IRosBridgeMessageSpeed;
        velocity = res.velocity ?? 0;
        break;
      }
      default:
        break;
    }
  });
};

const getRosNodes = (rosConnection: Ros): Promise<string[]> =>
  new Promise((resolve) => {
    rosConnection.getNodes(
      (nodes) => {
        rosNodes = nodes;
        resolve(nodes);
      },
      () => {
        resolve([]);
      }
    );
  });

const getRosTopics = (rosConnection: Ros): Promise<string[]> =>
  new Promise((resolve) => {
    rosConnection.getTopics(
      (result) => {
        rosTopics = result.topics;
        resolve(result.topics);
      },
      () => {
        resolve([]);
      }
    );
  });

const getTopicTypeAndSubscribe = (rosConnection: Ros, topic: constants.VehicleDetailTopic) => {
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

const subscribeToAllTopics = (rosConnection: Ros, topicList: constants.VehicleDetailTopic[]) => {
  topicList.forEach((item) => {
    getTopicTypeAndSubscribe(rosConnection, item);
  });
};

// getRosBridgeConnection();
process.parentPort.once('message', async (e) => {
  const topicListArr = e.data.topicList as constants.VehicleDetailTopic[];
  const rosConnection = await getRosBridgeConnection(rosBridgeConnection);
  await getRosNodes(rosConnection);
  await getRosTopics(rosConnection);
  subscribeToAllTopics(rosConnection, topicListArr);
  setInterval(() => {
    getRosTopics(rosConnection);
    getRosNodes(rosConnection);
    process.parentPort.postMessage({ velocity, latitude, longitude, rosNodes, rosTopics });
  }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_PASSIVE_INTERVAL);
});
