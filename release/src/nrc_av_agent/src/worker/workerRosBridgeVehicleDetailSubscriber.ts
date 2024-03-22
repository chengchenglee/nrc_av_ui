import { Ros } from 'roslib';
import * as constants from '../shared/constants';
import { getRosBridgeConnection } from '../shared/workerUtils';
import GPSHandler from './topic_handlers/gpsHandler';
import RedButtonHandler from './topic_handlers/redButtonHandler';
import VelocityHandler from './topic_handlers/velocityHandler';

// let latitude = 0;
// let longitude = 0;
// let velocity = 0;
let rosNodes: string[] = [];
let rosTopics: string[] = [];

// const subscribeToTopic = (
//   rosConnection: Ros,
//   topic: constants.VehicleDetailTopic,
//   topicTypeName: string
// ) => {
//   const topicRos = new Topic({
//     ros: rosConnection,
//     name: topic.topicName,
//     messageType: topicTypeName
//   });
//   topicRos.subscribe((message) => {
//     switch (topic.topicType) {
//       case constants.EnumVehicleDetailTopic.GPS: {
//         const res = message as constants.IRosBridgeMessageGPS;
//         latitude = res.Latitude ?? 0;
//         longitude = res.Longitude ?? 0;
//         break;
//       }
//       case constants.EnumVehicleDetailTopic.SPEED: {
//         const res = message as constants.IRosBridgeMessageSpeed;
//         velocity = res.velocity ?? 0;
//         break;
//       }
//       default:
//         break;
//     }
//   });
// };

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

// const getTopicTypeAndSubscribe = (rosConnection: Ros, topic: constants.VehicleDetailTopic) => {
//   rosConnection.getTopicType(topic.topicName, (type) => {
//     if (type) {
//       subscribeToTopic(rosConnection, topic, type);
//     } else {
//       // Most likely topic haven't finished initializing yet, we will poll for it!
//       const topicPolling = setInterval(() => {
//         rosConnection.getTopicType(topic.topicName, (typePolling) => {
//           if (typePolling) {
//             clearInterval(topicPolling);
//             subscribeToTopic(rosConnection, topic, typePolling);
//           }
//         });
//       }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_POLL_INTERVAL);
//     }
//   });
// };

// const subscribeToAllTopics = (rosConnection: Ros, topicList: constants.VehicleDetailTopic[]) => {
//   topicList.forEach((item) => {
//     getTopicTypeAndSubscribe(rosConnection, item);
//   });
// };

// getRosBridgeConnection();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
process.parentPort.once('message', async (e) => {
  // const topicListArr = e.data.topicList as constants.VehicleDetailTopic[];
  const rosBridgeConnection = new Ros({
    url: `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
  });
  const rosConnection = await getRosBridgeConnection(rosBridgeConnection);
  await getRosNodes(rosConnection);
  await getRosTopics(rosConnection);

  const handlers = [
    new GPSHandler('/gps_state/gps_state_oxts', rosConnection),
    new VelocityHandler('/CAN_V_reader', rosConnection),
    new RedButtonHandler('/driver_marker_button', rosConnection)
    // Add more handlers if needed
  ];

  // Subscribe to topics for each handler
  handlers.forEach((handler) => handler.subscribe());

  // Initialize an empty map to store data
  let dataMap: Record<string, any> = {};

  // subscribeToAllTopics(rosConnection, topicListArr);
  setInterval(() => {
    getRosTopics(rosConnection);
    getRosNodes(rosConnection);

    // Collect data from each handler and append to the map
    handlers.forEach((handler) => {
      const data = handler.getData();
      dataMap = { ...dataMap, ...data }; // Merge data into dataMap
    });
    process.parentPort.postMessage({ ...dataMap, rosNodes, rosTopics });
  }, constants.ROS_BRIDGE_WORKER_TOPIC.ROS_TOPIC_PASSIVE_INTERVAL);
});
