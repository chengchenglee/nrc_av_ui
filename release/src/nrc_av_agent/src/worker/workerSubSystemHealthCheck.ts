import {
  ISubSystemWorkerMessage,
  ISubSystemWorkerReturn,
  RosTopicStatusType
} from '../shared/constants';

const diagLedMap: Map<RosTopicStatusType, number> = new Map([
  [RosTopicStatusType.BAD, 0],
  [RosTopicStatusType.TERRIBLE, 1],
  [RosTopicStatusType.GOOD, 2]
]);

const processMessage = (data: ISubSystemWorkerMessage): ISubSystemWorkerReturn => {
  const returnMessage: ISubSystemWorkerReturn = {
    diagnosticSubSystem: [],
    diagLedStatus: []
  };
  let maxLed = 0;
  // console.log(data);
  if (data.subSystems !== undefined) {
    data.subSystems.forEach((subSystem) => {
      if (subSystem.diagLed && subSystem.diagLed > maxLed) {
        maxLed = subSystem.diagLed;
      }
      subSystem.topics.forEach((topic) => {
        const subSystemTopic = data.topicMap.get(topic.id);
        if (
          data.startedSubSystem.get(subSystem.name) &&
          subSystemTopic?.status === RosTopicStatusType.BAD
        ) {
          const exists = returnMessage.diagnosticSubSystem.some(
            (system) => system.name === subSystem.name
          );
          if (!exists) {
            returnMessage.diagnosticSubSystem.push(subSystem);
          }
        }
        // There is topic map state => RosBridge is functional
        if (data.topicMap.size > 0 && subSystem.diagLed && subSystemTopic) {
          const status = diagLedMap.get(subSystemTopic.status);
          if (
            status !== undefined &&
            (status < returnMessage.diagLedStatus[subSystem.diagLed] ||
              returnMessage.diagLedStatus[subSystem.diagLed] === undefined)
          ) {
            returnMessage.diagLedStatus[subSystem.diagLed] = status;
          }
        }
      });
    });
    if (maxLed === 0) {
      maxLed = data.subSystems.length;
    }
    // Index will start from 1 instead of 0
    if (returnMessage.diagLedStatus.length > 0) {
      returnMessage.diagLedStatus.shift();
    }
    if (maxLed > returnMessage.diagLedStatus.length) {
      returnMessage.diagLedStatus = returnMessage.diagLedStatus.concat(
        new Array(maxLed - returnMessage.diagLedStatus.length).fill(0)
      );
    }
  }

  return returnMessage;
};

process.parentPort.on('message', (e) => {
  const message: ISubSystemWorkerMessage = e.data;
  const returnMessage = processMessage(message);
  process.parentPort.postMessage(returnMessage);
});
