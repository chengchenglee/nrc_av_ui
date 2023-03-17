import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketEnum } from '../core';

@WebSocketGateway({
  namespace: 'nissan'
})
export class VehicleGateway {
  @WebSocketServer()
  server: Server;

  async emitToRoom(event: string, room: string, data: any) {
    return await new Promise((resolve, reject) => {
      this.server
        .timeout(SocketEnum.TIME_OUT)
        .to(room)
        .emit(event, data, (err, responses) => {
          if (err) {
            reject(err.message);
          } else {
            resolve(responses);
          }
        });
    });
  }
}
