/* eslint-disable @typescript-eslint/no-explicit-any */
import log from 'electron-log';
import { injectable } from 'inversify';
import { io, Socket } from 'socket.io-client';
import { COMMUNICATION } from '../../constants';
import { logMethod } from '../log/logDecorator';
import type { ICommunication } from '../../inversify/interfaces';
import 'reflect-metadata';

@injectable()
export default class SocketIOService implements ICommunication {
  private socket: Socket | null = null;

  @logMethod('[SocketIOService][connect]')
  connect(address: string, options?: any): Promise<boolean> {
    log.info(`[SocketIOService][connect] connect to: ${address}`);
    this.socket = io(address, options);
    return new Promise((resolve) => {
      this.socket?.on('connect', () => {
        log.info('[SocketIOService][connect] connected');
        resolve(true);
      });
      this.socket?.on('connect_error', (err) => {
        log.error(`[SocketIOService][connect_error] ${err}`);
        resolve(false);
      });
    });
  }

  @logMethod('[SocketIOService][disconnect]')
  disconnect(): void {
    this.socket?.disconnect();
  }

  @logMethod('[SocketIOService][send]', log.debug)
  async send(eventName: string, ...eventParams: any[]): Promise<any> {
    try {
      return await this.socket
        ?.timeout(COMMUNICATION.TIME_OUT)
        .emitWithAck(eventName, ...eventParams);
    } catch (err) {
      log.error(`[SocketIOService][send] ${eventName}--${err}`);
    }
    return undefined;
  }

  @logMethod('[SocketIOService][sendNoAck]', log.debug)
  sendNoAck(eventName: string, ...eventParams: any[]): any {
    try {
      return this.socket?.emit(eventName, ...eventParams);
    } catch (err) {
      log.error(`[SocketIOService][sendNoAck] ${eventName}--${err}`);
    }
    return undefined;
  }

  @logMethod('[SocketIOService][addEventHandler]')
  addEventHandler(eventName: string, eventHandler: (...args: any[]) => void): void {
    if (eventName === '') {
      return;
    }

    this.socket?.on(eventName, eventHandler);
  }

  getConnectionStatus(): boolean | undefined {
    return this.socket?.connected;
  }
}
