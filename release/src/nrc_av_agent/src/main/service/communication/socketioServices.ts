/* eslint-disable @typescript-eslint/no-explicit-any */
import { injectable } from 'inversify';
import { io, Socket } from 'socket.io-client';
import { COMMUNICATION } from '../../constants';
import { ICommunication } from '../../inversify/interfaces';
import 'reflect-metadata';

@injectable()
export default class SocketIOService implements ICommunication {
  private socket: Socket | null = null;

  connect(address: string, options?: any): Promise<boolean> {
    this.socket = io(address, options);
    return new Promise((resolve) => {
      this.socket?.on('connect', () => {
        resolve(true);
      });
      this.socket?.on('connect_error', () => {
        resolve(false);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  async send(eventName: string, ...eventParams: any[]): Promise<any> {
    try {
      return await this.socket
        ?.timeout(COMMUNICATION.TIME_OUT)
        .emitWithAck(eventName, ...eventParams);
    } catch (err) {
      console.error(err);
    }
    return undefined;
  }

  addEventHandler(eventName: string, eventHandler: (...args: any[]) => void): void {
    if (eventName === '') {
      return;
    }

    this.socket?.on(eventName, eventHandler);
  }
}
