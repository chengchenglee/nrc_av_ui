import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { app } from 'electron';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
  REDUX_DEVTOOLS
} from 'electron-devtools-installer';

const isDebug = process.env.ELECTRON_ENV === 'debug';

function getAssetsPath(fileName: string) {
  if (process.env.NODE_ENV === 'production' && app.isPackaged === true) {
    return path.resolve(process.resourcesPath, 'assets', fileName);
  }
  if (process.env.NODE_ENV === 'production' && app.isPackaged === false) {
    return path.resolve(__dirname, '../../../assets', fileName);
  }
  return path.resolve(__dirname, '../../../assets', fileName);
}

function getHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const url = `http://localhost:${import.meta.env.VITE_PORT}`;
    return url;
  }
  return `file://${path.resolve(__dirname, `../renderer/${htmlFileName}`)}`;
}

function getPreloadPath(Name: string) {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(__dirname, '../../dist/preload', Name);
  }
  return path.resolve(__dirname, '../preload', Name);
}

function getWorkerPath(Name: string) {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve(__dirname, '../../dist/worker', Name);
  }
  return path.resolve(__dirname, '../worker', Name);
}

function installExtensions() {
  const extensions = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];
  extensions.forEach((Name) => {
    installExtension(Name) // eslint-disable-next-line no-console
      .then((name) => console.log(`${name} Extension Added`))
      // eslint-disable-next-line no-console
      .catch((err) => console.log('An error occurred: ', err));
  });
}

function delayInMs(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

function* chunkArray<T>(array: Array<T>, n: number) {
  for (let i = 0; i < array.length; i += n) yield array.slice(i, i + n);
}

function isProcessRunning(pid: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      process.kill(pid, 0);
      resolve(true);
    } catch (err: any) {
      if (err.code === 'EPERM') {
        resolve(true); // Process exists but we don't have permission to signal it
      } else if (err.code === 'ESRCH') {
        resolve(false); // Process does not exist
      } else {
        reject(err); // Other errors
      }
    }
  });
}

interface ExecutionResult {
  pid: number;
  stdout: string;
}

function executeAliasCommand(command: string): Promise<ExecutionResult> {
  return new Promise<ExecutionResult>((resolve, reject) => {
    const childProcess: ChildProcessWithoutNullStreams = spawn('bash', ['-i', '-c', command], {
      stdio: 'pipe'
    });

    let stdout = '';
    let pid = 0;

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.on('close', () => {
      resolve({ pid, stdout });
    });

    childProcess.on('error', (error) => {
      reject(error);
    });

    pid = childProcess.pid!;
  });
}

async function isAliasCommand(command: string): Promise<boolean> {
  try {
    // Check if the command starts with "rosrun" or "roslaunch"
    if (command.startsWith('rosrun') || command.startsWith('roslaunch')) {
      return false; // If it starts with these, it's not an alias
    }

    // Execute the command
    const { stdout } = await executeAliasCommand(`type ${command}`);

    // Check if the output contains 'is aliased to'
    const isAliased = stdout.includes('is aliased to');
    // eslint-disable-next-line no-console
    console.log(`${command} is alias: ${isAliased}`);
    return isAliased;
  } catch (error) {
    console.error('Error checking if command is an alias:', error);
    return false; // If an error occurred, assume it's not an alias
  }
}

export {
  isDebug,
  getAssetsPath,
  getHtmlPath,
  getPreloadPath,
  installExtensions,
  getWorkerPath,
  delayInMs,
  chunkArray,
  isProcessRunning,
  isAliasCommand,
  executeAliasCommand
};

export type { ExecutionResult };
