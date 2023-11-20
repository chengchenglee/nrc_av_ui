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
  data.subSystems.forEach((subSystem) => {
    subSystem.topics.forEach((topic) => {
      const subSystemTopic = data.topicMap.get(topic.id);
      if (
        data.startedSubSystem.get(subSystem.name) &&
        subSystemTopic?.status === RosTopicStatusType.BAD &&
        subSystem.diagnostic
      ) {
        returnMessage.diagnosticSubSystem.push(subSystem);
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
  // Index will start from 1 instead of 0
  if (returnMessage.diagLedStatus.length > 0) {
    returnMessage.diagLedStatus.shift();
  }
  return returnMessage;
};

process.parentPort.on('message', (e) => {
  const message: ISubSystemWorkerMessage = e.data;
  const returnMessage = processMessage(message);
  process.parentPort.postMessage(returnMessage);
});
