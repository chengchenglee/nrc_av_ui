import log from 'electron-log';
import { inject, injectable } from 'inversify';
import * as constants from '../../../shared/constants';
import { ROS_COMMAND } from '../../constants';
import TYPES from '../../inversify/types';
import { logMethod } from '../log/logDecorator';
import type { IChildProcess, IRosService, IStatusCommands } from '../../inversify/interfaces';

let statusRunAllCommands = constants.EnumStatusRunAllCommands.DEACTIVE;
@injectable()
export default class RosService implements IRosService {
  constructor(
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands
  ) {}

  @logMethod('[RosService][runCommands]')
  runCommands(command: constants.Command, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      log.info('[RosService][runCommands] start');
      const buildCmd = this.childProcessSvc.buildCommand(command.command, '');
      const pid = this.childProcessSvc.executeAndValid(buildCmd, 3000, replyOnChannel);
      if (pid !== undefined) {
        this.commandsStatusSvc.setState(command.command, pid, command.name, command.id);
      }

      log.info('[RosService][runCommands] done');
    } catch (err) {
      log.error(`[RosService]runCommands] ${err}`);
      replyOnChannel({
        status: 'error',
        message: ROS_COMMAND.RUN_COMMAND_FAIL
      });
    }
  }

  runCommandsForAll(
    command: constants.Command,
    waitingTime?: number
  ): Promise<constants.IResponse & constants.IRunAllResponse> {
    return new Promise<constants.IResponse & constants.IRunAllResponse>((resolve, reject) => {
      try {
        log.info('[RosService][runCommandsForAll] start');
        const buildCmd = this.childProcessSvc.buildCommand(command.command, '');
        this.childProcessSvc.executeAndValid(
          buildCmd,
          waitingTime || 10000,
          (response: constants.IResponse) => {
            if (response.status === 'error') {
              const errorResponse: constants.IResponse & constants.IRunAllResponse = {
                status: 'error',
                message: response.message,
                commandId: command.id,
                pid: -1
              };
              reject(errorResponse);
            } else {
              const responseWithPID: constants.IResponse & constants.IRunAllResponse = {
                ...response,
                pid: response.pid,
                commandId: command.id
              };
              this.commandsStatusSvc.setState(
                command.command,
                response.pid,
                command.name,
                command.id
              );
              resolve(responseWithPID);
            }
          }
        );
        log.info('[RosService][runCommandsForAll] done');
      } catch (err) {
        const errorResponse: constants.IResponse & constants.IRunAllResponse = {
          status: 'error',
          message: ROS_COMMAND.RUN_COMMAND_FAIL,
          commandId: command.id,
          pid: -1
        };
        log.error(`[RosService][runCommandsForAll] ${err}`);
        reject(errorResponse);
      }
    });
  }

  setStatusRunAllCommands(newStatus: constants.EnumStatusRunAllCommands) {
    statusRunAllCommands = newStatus;
  }

  getStatusRunAllCommands(): constants.EnumStatusRunAllCommands {
    return statusRunAllCommands;
  }

  @logMethod('[RosService][runAllCommands]')
  runAllCommands(
    commands: constants.Command[],
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    const commandNotRunning: constants.Command[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const command of commands) {
      const listCommandStatus = this.commandsStatusSvc.getState();
      if (
        listCommandStatus.find((cmd) => cmd.id === command.id)?.status !==
        constants.CommandsStatusType.RUNNING
      ) {
        commandNotRunning.push(command);
      }
    }

    this.setStatusRunAllCommands(constants.EnumStatusRunAllCommands.ACTIVE);

    const promises: Promise<constants.IResponse & constants.IRunAllResponse>[] =
      commandNotRunning.map((command) => this.runCommandsForAll(command));

    Promise.allSettled(promises)
      .then((results: PromiseSettledResult<constants.IResponse & constants.IRunAllResponse>[]) => {
        const errorResponses: constants.IErrorCommand[] = [];
        const successResponses: constants.IResponse[] = [];
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successResponses.push(result.value);
          } else if (result.status === 'rejected') {
            const error = result.reason;
            const existingError = errorResponses.find((err) => err.error === error.message);
            if (!existingError) {
              if (error.message) {
                errorResponses.push({
                  idCommand: error.commandId || commands[index].id,
                  error: error.message
                });
              }
            }
          }
        });
        if (errorResponses.length > 0) {
          replyOnChannel({
            status: 'error',
            message: errorResponses
          });
        } else {
          replyOnChannel({
            status: 'success',
            data: ROS_COMMAND.RUN_COMMAND_SUCCESS
          });
        }
      })
      .catch((err) => {
        log.error(`[RosService][runAllCommands] ${err}`);
        replyOnChannel({
          status: 'error',
          message: ROS_COMMAND.RUN_ALL_COMMANDS_FAIL
        });
      });
  }

  @logMethod('[RosService][stopCommands]')
  async stopCommands(
    command: constants.Command,
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    try {
      log.info('[RosService][stopCommands] start');
      const cmdsGetNodeInFile = `${command.command} --nodes`;
      const buildCmd = this.childProcessSvc.buildCommand(cmdsGetNodeInFile, '');
      const nodesInFile = await this.childProcessSvc.execAndWait(buildCmd);
      const nodes = nodesInFile.split('\n').slice(0, -1);
      // eslint-disable-next-line no-restricted-syntax
      for (const node of nodes) {
        const commandKill = this.childProcessSvc.buildCommand(`rosnode kill ${node}`, '');
        this.childProcessSvc.execAndForget(commandKill);
      }
      replyOnChannel({
        status: 'success',
        data: ROS_COMMAND.STOP_COMMAND_SUCCESS
      });
      log.info('[RosService][stopCommands] done');
    } catch (err) {
      log.error(`[RosService][stopCommands] ${err}`);
      replyOnChannel({
        status: 'error',
        message: ROS_COMMAND.STOP_COMMAND_FAIL
      });
    }
  }

  async getNodesFromCommand(command: constants.Command) {
    try {
      if (!command.command.includes('roslaunch')) {
        return [];
      }
      const cmdsGetNodeInFile = `${command.command} --nodes`;
      const buildCmd = this.childProcessSvc.buildCommand(cmdsGetNodeInFile, '');
      const nodesInFile = await this.childProcessSvc.execAndWait(buildCmd, true);
      const nodes = nodesInFile.split('\n').slice(0, -1);
      const cleanedNodes = nodes.flatMap((node) => {
        if (node.startsWith('/')) {
          return node.slice(1);
        }
        return [];
      });
      return cleanedNodes;
    } catch {
      return [];
    }
  }

  @logMethod('[RosService][changeMap]')
  changeMap(map: constants.AgentMap, replyOnChannel: (response: constants.IResponse) => void) {
    try {
      log.info('[RosService][changeMap] start');
      const StatusRunAllCommands = this.getStatusRunAllCommands();
      if (StatusRunAllCommands === constants.EnumStatusRunAllCommands.ACTIVE) {
        replyOnChannel({
          status: 'error',
          message: ROS_COMMAND.RUN_ALL_COMMMANDS_IS_RUNNING
        });
        return;
      }
      const command = `rosrun nrc_av_ui paramsForMap.sh ${map.mapName}`;
      const paramsForMap = this.childProcessSvc.buildCommand(command, '');
      this.childProcessSvc.execAndForget(paramsForMap);
      replyOnChannel({
        status: 'success',
        data: ROS_COMMAND.CHANGE_MAP_SUCCESSFULLY
      });
      log.info('[RosService]changeMap] done');
    } catch (err) {
      log.error(`[RosService]changeMap] ${err}`);
      replyOnChannel({
        status: 'error',
        message: ROS_COMMAND.CHANGE_MAP_FAILED
      });
    }
  }
}
