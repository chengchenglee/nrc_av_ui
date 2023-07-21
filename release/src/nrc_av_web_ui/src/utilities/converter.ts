import { ExecutionStatus } from '../constants/executionStatus';
import {
  AddDestinationDTO,
  AddEditInterfaceDTO,
  AddInterfaceAlgorithmDTO,
  AddInterfaceCommandsDTO,
  AddInterfaceMachinesDTO,
  AddInterfaceMultiDestinationDTO,
  AddInterfaceSensorsDTO,
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

export const addEditInterfaceDataAdaptor = (
  data?: InterfaceDetailDTO
): AddEditInterfaceDTO | undefined => {
  if (!data) {
    return undefined;
  }
  return {
    name: data.name,
    algorithms: data.algorithms.map<AddInterfaceAlgorithmDTO>((item) => ({
      name: item.name,
      errRate: item.errRate,
      warnRate: item.warnRate,
      topicName: item.topicName,
      topicType: item.topicType
    })),
    commands: data.commands.map<AddInterfaceCommandsDTO>((item) => ({
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
    sensors: data.sensors.map<AddInterfaceSensorsDTO>((item) => ({
      name: item.name,
      errRate: item.errRate,
      warnRate: item.warnRate,
      topicName: item.topicName,
      topicType: item.topicType
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
