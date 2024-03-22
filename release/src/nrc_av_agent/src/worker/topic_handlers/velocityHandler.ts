import { Ros } from 'roslib';
import { VelocityData } from './interfaces';
import ROSHandler from './rosHandler';

export default class VelocityHandler extends ROSHandler<VelocityData> {
  constructor(name: string, rosConnection: Ros) {
    super(name, rosConnection);
    this.data = { velocity: 0 };
  }

  protected handleMessage(message: VelocityData) {
    this.data = { velocity: message.VehicleSpeed_kmh ?? 0 };
  }
}
