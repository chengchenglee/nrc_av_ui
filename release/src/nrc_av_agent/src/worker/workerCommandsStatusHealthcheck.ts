/* eslint-disable no-console */
import { exec } from 'child_process';
import { CommandsStatus, CommandsStatusType } from '../shared/constants';

function execute(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(stderr);
      }
      return resolve(stdout);
    });
  });
}

async function assignCommandsStatus(commandsStatus: CommandsStatus): Promise<CommandsStatus> {
  const modifiedStatus: CommandsStatus = commandsStatus;
  try {
    const checkPid = await execute(`ps -p ${commandsStatus.pid}`);
    if (checkPid) {
      modifiedStatus.status = CommandsStatusType.RUNNING;
    } else {
      modifiedStatus.status = CommandsStatusType.STOPPED;
    }
  } catch (err) {
    if (modifiedStatus.status === CommandsStatusType.RUNNING) {
      modifiedStatus.status = CommandsStatusType.STOPPED;
    }
  }
  return modifiedStatus;
}

process.parentPort.on('message', (e) => {
  const commandsStatus: CommandsStatus[] = e.data.sharedState;
  const promises: Promise<CommandsStatus>[] = [];
  commandsStatus
    .filter((commandStatus) => commandStatus.status === CommandsStatusType.RUNNING)
    .forEach((commandStatus) => {
      promises.push(assignCommandsStatus(commandStatus));
    });
  Promise.all(promises)
    .then((result) => {
      process.parentPort.postMessage(result);
    })
    .catch((err) => {
      console.error(`[worker-commands-status] ${err}`);
      const errorObject = { status: 'All connections failed!', type: 'error' };
      process.parentPort.postMessage(errorObject);
    });
});
