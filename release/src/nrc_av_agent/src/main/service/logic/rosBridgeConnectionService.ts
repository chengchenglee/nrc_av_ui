import log from 'electron-log';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Listener } from 'eventemitter2';
import { inject, injectable } from 'inversify';
import { Ros } from 'roslib';
import * as constants from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';
import { ROS_BRIDGE } from '../../constants';
import TYPES from '../../inversify/types';
import { delayInMs } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IBrowserWindowService,
  IRosBridgeConnectionService
} from '../../inversify/interfaces';

@injectable()
export default class RosBridgeConnectionService implements IRosBridgeConnectionService {
  private rosBridgeConnection: Ros;

  constructor(
    @inject(TYPES.BrowserWindowService) private browserWindowService: IBrowserWindowService
  ) {
    this.rosBridgeConnection = new Ros({
      url: `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
    });
  }

  @logMethod('[RosBridgeConnectionService][getRosBridgeConnection]', log.debug)
  async getRosBridgeConnection(
    maxConnectionAttempt = ROS_BRIDGE.ROS_BRIDGE_CONNECTION_RETRY
  ): Promise<Ros> {
    if (!this.rosBridgeConnection.isConnected) {
      await this.rosBridgeConnect(maxConnectionAttempt);
    }
    return this.rosBridgeConnection;
  }

  @logMethod('[RosBridgeConnectionService][rosBridgeConnect]', log.debug)
  private async rosBridgeConnect(
    maxConnectionAttempt = ROS_BRIDGE.ROS_BRIDGE_CONNECTION_RETRY,
    connectionAttempt = 1
  ): Promise<void> {
    await this.rosBridgeConnectTries(connectionAttempt).catch(async (err) => {
      if (connectionAttempt >= maxConnectionAttempt) {
        log.error(`[RosBridgeConnectionService][rosBridgeConnect] ${err.toString()}`);
        throw err;
      } else {
        this.browserWindowService.sendToRenderer(
          ipcMsg.M2R.VEHICLE_STATUS,
          constants.EnumVehicleStatusState.ROS_CONNECTION_INIT
        );
        const nextConnectionAttempt = connectionAttempt + 1;
        // Delay before making new connection
        log.info(
          // eslint-disable-next-line max-len
          `[RosBridgeConnectionService][rosBridgeConnect] Waiting to connect attempt: ${nextConnectionAttempt} after ${ROS_BRIDGE.ROS_BRIDGE_CONNECTION_BUFFER_TIME} ms`
        );
        await delayInMs(ROS_BRIDGE.ROS_BRIDGE_CONNECTION_BUFFER_TIME);
        log.info(
          // eslint-disable-next-line max-len
          `[RosBridgeConnectionService][rosBridgeConnect] Connection attempt: ${nextConnectionAttempt}`
        );
        await this.rosBridgeConnect(maxConnectionAttempt, nextConnectionAttempt);
      }
    });
  }

  @logMethod('[RosBridgeConnectionService][rosBridgeConnectTries]', log.debug)
  private rosBridgeConnectTries(connectionAttempt: number): Promise<void> {
    return new Promise((resolve, rejects) => {
      // eslint-disable-next-line no-undef
      let timeoutId: NodeJS.Timeout;
      const errorListener = this.rosBridgeConnection.once(
        'error',
        (err) => {
          clearTimeout(timeoutId);
          log.error(
            // eslint-disable-next-line max-len
            `[RosBridgeConnectionService][rosBridgeConnectTries] Connection to Ros-Bridge error: ${err.toString()} = ${connectionAttempt}`
          );
          rejects(new Error(err.toString()));
        },
        { objectify: true }
      ) as Listener;
      timeoutId = setTimeout(() => {
        log.error(
          // eslint-disable-next-line max-len
          `[RosBridgeConnectionService][rosBridgeConnectTries] Connection to Ros-Bridge timeout after: ${ROS_BRIDGE.ROS_BRIDGE_CONNECTION_TIMEOUT}, connection attempt = ${connectionAttempt}`
        );
        errorListener.off();
        rejects(
          new Error(
            // eslint-disable-next-line max-len
            `Connection timeout after: ${ROS_BRIDGE.ROS_BRIDGE_CONNECTION_TIMEOUT}, connection attempt = ${connectionAttempt}`
          )
        );
      }, ROS_BRIDGE.ROS_BRIDGE_CONNECTION_TIMEOUT);
      this.rosBridgeConnection.connect(
        `${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}`
      );
      if (this.rosBridgeConnection.isConnected) {
        clearTimeout(timeoutId);
        log.info(
          // eslint-disable-next-line max-len
          `[RosBridgeConnectionService][rosBridgeConnectTries] Connected to Ros-Bridge at ${constants.ROS_BRIDGE_SOCKET.SOCKET_URL}:${constants.ROS_BRIDGE_SOCKET.SOCKET_PORT}, connection attempt = ${connectionAttempt}`
        );
        errorListener.off();
        resolve();
      }
    });
  }
}
