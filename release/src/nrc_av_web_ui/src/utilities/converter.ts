/* eslint-disable max-depth */
import { ExecutionStatus } from '../constants/executionStatus';
import {
  AddDestinationDTO,
  AddEditInterfaceDTO,
  AddInterfaceAlgorithmDTO,
  AddInterfaceCommandsDTO,
  AddInterfaceMachinesDTO,
  AddInterfaceMultiDestinationDTO,
  AddInterfaceSensorsDTO,
  AddInterfaceSubsystemsDTO,
  ImportInterfaceDTO,
  InterfaceDetailDTO
} from '../dtos/interface';
import { Status } from '../types/types';

export const convertExecutionStatus = (executionStatus: ExecutionStatus | undefined): Status => {
  switch (executionStatus) {
    case ExecutionStatus.RUNNING:
      return 'online';
    case ExecutionStatus.STOPPED:
      return 'offline';
    case ExecutionStatus.NOT_STARTED:
      return 'idle';
    default:
      return 'none';
  }
};

export interface YAMLInterface {
  [key: string]: any;
}

const convertNomWarnErrRateForArray = (originalArray: any) => {
  const newArray = [...originalArray];
  newArray.forEach((obj) => {
    if (obj.NomWarnErrRate) {
      const rates = obj.NomWarnErrRate.split(', ');
      const [normalRate, warnRate, errRate] = rates;
      obj.name = obj.HealthName;
      obj.topicName = obj.HealthTopic;
      obj.topicType = obj.HealthTopicType;
      obj.normalRate = normalRate;
      obj.warnRate = warnRate;
      obj.errRate = errRate;
      delete obj.NomWarnErrRate;
      delete obj.HealthName;
      delete obj.HealthTopic;
      delete obj.HealthTopicType;
    }
  });
  return newArray;
};

export const parseYAMLInterface = (
  data: YAMLInterface | null | undefined | any,
  content?: any
): ImportInterfaceDTO => {
  const subSystems: AddInterfaceSubsystemsDTO[] = [];
  for (const key in data?.Subsystem) {
    if (Object.hasOwn(data.Subsystem, key)) {
      const item = data.Subsystem[key];
      const commands = item?.Commands?.map((commandItem: any) => ({
        command: commandItem.Command,
        name: commandItem.Name,
        // nodes: commandItem.Nodes?.map((node: { Name: string }) => ({ name: node.Name })) || [],
        nodes: commandItem.Node ? [{ name: commandItem.Node }] : [],
        launchTime: commandItem.LaunchTime
      }));
      if (item.Type === 'Sensor' || item.Type === 'Algorithm') {
        const commonProps = {
          name: key,
          description: item?.Description,
          topics:
            item?.HealthTopics !== null
              ? convertNomWarnErrRateForArray(item?.HealthTopics)
              : item?.HealthTopics,
          diagLed: item?.Diagnostic?.LED,
          timeout: item?.Diagnostic?.Timeout,
          diagRetry: item?.Diagnostic?.Retry,
          depends: item?.Depends !== null ? item.Depends.split(',') : item?.Depends,
          diagnostic: item?.Diagnostic?.File,
          type: item?.Type,
          commands
        };
        subSystems.push(commonProps);
      }
    }
  }

  return {
    name: data?.Configuration?.Name,
    machines: [],
    content,
    subSystems,
    interfaceDestinations: [],
    multiDestinations: []
  };
};

export const addEditInterfaceDataAdaptor = (
  data?: InterfaceDetailDTO
): AddEditInterfaceDTO | undefined => {
  if (!data) {
    return undefined;
  }
  return {
    name: data.name,
    algorithms: data.algorithms.map<AddInterfaceAlgorithmDTO>((item) => ({
      id: item.id,
      name: item.name,
      errRate: item.errRate,
      warnRate: item.warnRate,
      topicName: item.topicName,
      topicType: item.topicType
    })),
    sensors: data.sensors.map<AddInterfaceSensorsDTO>((item) => ({
      id: item.id,
      name: item.name,
      errRate: item.errRate,
      warnRate: item.warnRate,
      topicName: item.topicName,
      topicType: item.topicType
    })),
    commands: data.commands.map<AddInterfaceCommandsDTO>((item) => ({
      id: item.id,
      name: item.name,
      command: item.command,
      nodes: item.nodes,
      inclByDef: item.inclByDef,
      autoRecord: item.autoRecord,
      autoStart: item.autoStart
    })),
    machines: data.machines.map<AddInterfaceMachinesDTO>((item) => ({
      name: item.name,
      addr: item.addr
    })),
    interfaceDestinations: data.interfaceDestinations.map<AddDestinationDTO>((item) => ({
      name: item.name,
      posX: item.destination.posX,
      posY: item.destination.posY,
      posTh: item.destination.posTh
    })),
    multiDestinations: data.multiDestinations.map<AddInterfaceMultiDestinationDTO>((item) => ({
      name: item.name,
      destinations: item.destinations.map((destination) => ({
        posX: destination.posX,
        posY: destination.posY,
        posTh: destination.posTh
      }))
    }))
  };
};
