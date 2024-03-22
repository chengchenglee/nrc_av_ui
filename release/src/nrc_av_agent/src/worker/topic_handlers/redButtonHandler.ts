/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ros, Message } from 'roslib';
import ROSHandler from './rosHandler';

export default class RedButtonHandler extends ROSHandler<Message> {
  constructor(name: string, rosConnection: Ros) {
    super(name, rosConnection);
    this.data = { value: 0 };
  }

  protected handleMessage(message: Message) {
    // eslint-disable-next-line no-extra-parens
    const intData = (message as any)?.data;
    this.data = { redButton: intData ?? 0 };
    // console.log(this.data);
  }
}
