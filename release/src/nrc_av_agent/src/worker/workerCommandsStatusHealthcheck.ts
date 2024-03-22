/* eslint-disable no-console */
import { isProcessRunning } from '../main/utils';
import { CommandsStatus, CommandsStatusType } from '../shared/constants';

// function execute(command: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         return reject(error);
//       }
//       if (stderr) {
//         return reject(stderr);
//       }
//       return resolve(stdout);
//     });
//   });
// }

async function assignCommandsStatus(commandsStatus: CommandsStatus): Promise<CommandsStatus> {
  const modifiedStatus: CommandsStatus = commandsStatus;
  try {
    // TODO does not work
    // console.log(`ps -p ${commandsStatus.pid}`);
    // const checkPid = await execute(`ps -p ${commandsStatus.pid}`);
    // console.log(checkPid);
    // if (checkPid) {
    //   modifiedStatus.status = CommandsStatusType.RUNNING;
    // } else {
    //   modifiedStatus.status = CommandsStatusType.STOPPED;
    // }
    if (commandsStatus?.pid !== undefined) {
      const running = await isProcessRunning(commandsStatus.pid);
      if (running) {
        modifiedStatus.status = CommandsStatusType.RUNNING;
      } else {
        modifiedStatus.status = CommandsStatusType.STOPPED;
      }
    } else {
      console.log('pID is undefined');
    }
  } catch (err) {
    console.log(err);
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
