import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Sensor } from '../core';
import { SensorDTO } from '../interface/dto/sensor.dto';

@Injectable()
export class SensorService {
  constructor(private readonly dataSource: DataSource) {}

  updateSensors(currentSensors: Sensor[], newSensors: SensorDTO[]): Sensor[] {
    const updatedSensors: Sensor[] = [];
    newSensors.forEach((newSensor) => {
      const currentSensor = currentSensors.find(
        (currentSensor) => currentSensor.id === newSensor.id
      );
      if (currentSensor) {
        currentSensor.name = newSensor.name;
        currentSensor.topicName = newSensor.topicName;
        currentSensor.topicType = newSensor.topicType;
        currentSensor.warnRate = newSensor.warnRate;
        currentSensor.errRate = newSensor.errRate;
        updatedSensors.push(currentSensor);
        currentSensors.splice(currentSensors.indexOf(currentSensor), 1);
      } else {
        updatedSensors.push(
          new Sensor(
            newSensor.name,
            newSensor.errRate,
            newSensor.warnRate,
            newSensor.topicName,
            newSensor.topicType
          )
        );
      }
    });
    currentSensors.forEach((currentSensor) => {
      currentSensor.isDeleted = true;
    });
    return updatedSensors.concat(currentSensors);
  }

  getSensors(interfaceId: number): Promise<Sensor[]> {
    return this.dataSource.getRepository(Sensor).find({
      where: {
        interface: {
          id: interfaceId
        },
        isDeleted: false
      }
    });
  }
}
