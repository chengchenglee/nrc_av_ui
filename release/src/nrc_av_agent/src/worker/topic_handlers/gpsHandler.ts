import { Ros } from 'roslib';
import { GPSData } from './interfaces';
import ROSHandler from './rosHandler';

export default class GPSHandler extends ROSHandler<GPSData> {
  constructor(name: string, rosConnection: Ros) {
    super(name, rosConnection);
    this.data = { latitude: 0, longitude: 0 };
  }

  protected handleMessage(message: GPSData) {
    this.data = { latitude: message.Latitude ?? 0, longitude: message.Longitude ?? 0 };
    // console.log(this.data);
  }
}
