import {
  PathOrFileDescriptor,
  ObjectEncodingOptions,
  PathLike,
  Mode,
  MakeDirectoryOptions,
  NoParamCallback,
  WriteFileOptions
} from 'fs';
/* eslint-disable max-len */
import { App, BrowserWindow, MessagePortMain } from 'electron';
import { Ros, Topic } from 'roslib';
import { ConfigType } from '../../shared/configurationTypes';
import {
  IResponse,
  Interface,
  InterfaceStatus,
  AgentMap,
  EnumStatusRunAllCommands,
  CommandsStatus,
  Command,
  SubSystemType,
  TopicType,
  IRunAllResponse,
  SubSystem,
  EnumRosBridgeTopic,
  EnumRosBridgeCommunicationPort,
  InterfaceStatusDto,
  SubSystemDto,
  IRosBridgeTopicWorkerMessage,
  RecordingStatus
} from '../../shared/constants';

// ------------- NodeJS built-in ------------- //
export interface IFileSystem {
  readFileSync(
    path: PathOrFileDescriptor,
    options?:
      | (ObjectEncodingOptions & {
          flag?: string | undefined;
        })
      // eslint-disable-next-line no-undef
      | BufferEncoding
      | null
  ): string | Buffer;
  writeFile(
    file: PathOrFileDescriptor,
    // eslint-disable-next-line no-undef
    data: string | NodeJS.ArrayBufferView,
    options: WriteFileOptions,
    callback: NoParamCallback
  ): void;
  existsSync(path: PathLike): boolean;

  /**
   * Synchronously copies `src` to `dest`. By default, `dest` is overwritten if it
   * already exists. Returns `undefined`. Node.js makes no guarantees about the
   * atomicity of the copy operation. If an error occurs after the destination file
   * has been opened for writing, Node.js will attempt to remove the destination.
   *
   * `mode` is an optional integer that specifies the behavior
   * of the copy operation. It is possible to create a mask consisting of the bitwise
   * OR of two or more values (e.g.`fs.constants.COPYFILE_EXCL | fs.constants.COPYFILE_FICLONE`).
   *
   * * `fs.constants.COPYFILE_EXCL`: The copy operation will fail if `dest` already
   * exists.
   * * `fs.constants.COPYFILE_FICLONE`: The copy operation will attempt to create a
   * copy-on-write reflink. If the platform does not support copy-on-write, then a
   * fallback copy mechanism is used.
   * * `fs.constants.COPYFILE_FICLONE_FORCE`: The copy operation will attempt to
   * create a copy-on-write reflink. If the platform does not support
   * copy-on-write, then the operation will fail.
   *
   * ```js
   * import { copyFileSync, constants } from 'fs';
   *
   * // destination.txt will be created or overwritten by default.
   * copyFileSync('source.txt', 'destination.txt');
   * console.log('source.txt was copied to destination.txt');
   *
   * // By using COPYFILE_EXCL, the operation will fail if destination.txt exists.
   * copyFileSync('source.txt', 'destination.txt', constants.COPYFILE_EXCL);
   * ```
   * @since v8.5.0
   * @param src source filename to copy
   * @param dest destination filename of the copy operation
   * @param [mode=0] modifiers for copy operation.
   */
  copyFileSync(src: PathLike, dest: PathLike, mode?: number): void;

  /**
   * Synchronous mkdir(2) - create a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options Either the file mode, or an object optionally specifying the file mode and whether parent folders
   * should be created. If a string is passed, it is parsed as an octal integer. If not specified, defaults to `0o777`.
   */
  mkdirSync(
    path: PathLike,
    options?:
      | Mode
      | (MakeDirectoryOptions & {
          recursive?: false | undefined;
        })
      | null
  ): void;
}
export interface IPath {
  /**
   * Join all arguments together and normalize the resulting path.
   *
   * @param paths paths to join.
   * @throws {TypeError} if any of the path segments is not a string.
   */
  join(...paths: string[]): string;

  /**
   * The right-most parameter is considered {to}. Other parameters are considered an array of {from}.
   *
   * Starting from leftmost {from} parameter, resolves {to} to an absolute path.
   *
   * If {to} isn't already absolute, {from} arguments are prepended in right to left order,
   * until an absolute path is found. If after using all {from} paths still no absolute path is found,
   * the current working directory is used as well. The resulting path is normalized,
   * and trailing slashes are removed unless the path gets resolved to the root directory.
   *
   * @param paths string paths to join.
   * @throws {TypeError} if any of the arguments is not a string.
   */
  resolve(...paths: string[]): string;
}

export interface IChildProcess {
  execAndForget(command: string): void;
  executeAndIgnoreOutput(command: string): void;
  executeAndValid(
    command: string,
    waitingTime: number,
    replyOnChannel: (response: IResponse) => void,
    withBash?: boolean,
    returnOutput?: boolean
  ): number | undefined;
  execAndWait(command: string, ignoreError?: boolean): Promise<string>;
  buildCommand(command: string, path: string): string;
  waitForResultAndReturn(
    replyOnChannel: (response: IResponse) => void,
    nodeName: string
  ): Promise<string>;
  killCommandPid(commandPid: number): Promise<void>;
}
// ------------------------------------------- //

// ----------- ElectronJS built-in ----------- //
export interface IElectronWrapper {
  /**
   * A path to a special directory or file associated with `name`. On failure, an
   * `Error` is thrown.
   *
   * If `app.getPath('logs')` is called without called `app.setAppLogsPath()` being
   * called first, a default log directory will be created equivalent to calling
   * `app.setAppLogsPath()` without a `path` parameter.
   */
  getPath(
    name:
      | 'home'
      | 'appData'
      | 'userData'
      | 'sessionData'
      | 'temp'
      | 'exe'
      | 'module'
      | 'desktop'
      | 'documents'
      | 'downloads'
      | 'music'
      | 'pictures'
      | 'videos'
      | 'recent'
      | 'logs'
      | 'crashDumps'
  ): string;
  getResourcesPath(): string;
  getAgentVersion(): string;
  getApp(): App;
  quit(): void;
}

export interface IAutoUpdater {
  initUpdater(): void;
}
// ------------------------------------------- //

export interface ICommunication {
  connect(address: string, options?: any): Promise<boolean>;
  disconnect(): void;
  send(eventName: string, ...eventParams: any[]): Promise<any>;
  sendNoAck(eventName: string, ...eventParams: any[]): any;
  getConnectionStatus(): boolean | undefined;
  addEventHandler(eventName: string, eventHandler: (...args: any) => void): void;
}

export interface IConfiguration {
  initConfigs(): void;
  pathPrintEnvFolder(): string;
  loadConfigs(configName: string): boolean;
  createConfig<T extends ConfigType>(configName: string, value: T): void;
  getConfigs<T extends ConfigType>(configName: string): T | undefined;
  getConfig<T extends ConfigType, K extends keyof T>(
    configName: string,
    propName: K
  ): T[K] | undefined;
}

export interface IWebStorage {
  getFeedUrl(): string;
}

export interface ILogic {
  init(): void;
  reInit(): void;
  cleanup(): void;
  getStatusVehicle(): void;
  updateVehicle(): any;
}

export interface IStatusInterfaceRosBridgeService {
  initStatusInterface(): void;
  setStatusInterface(fileNames: Interface): Promise<void>;
  clearCache(): Promise<void>;
  interfaceRunning(): InterfaceStatus;
  getRosNodesCache(): string[];
  getRosTopicsCache(): string[];
  getRosNodes(rosConnection: Ros): Promise<string[]>;
  getRosTopics(rosConnection: Ros): Promise<string[]>;
  getTopicById(topicId: number): TopicType | undefined;
  getAllTopics(topicType?: SubSystemType): TopicType[];
  initTopicPublish(rosConnection: Ros): void;
  getPublishTopic(topicName: EnumRosBridgeTopic): Topic | undefined;
  publishMessage(topicName: EnumRosBridgeTopic, message: any): void;
  getMessagePort(channelName: EnumRosBridgeCommunicationPort): MessagePortMain | undefined;
  sendAllTopicWorker(message: IRosBridgeTopicWorkerMessage): void;
}

export interface IRosBridgeServerService {
  rosBridgeInit(maxInitAttempt?: number): Promise<void>;
  rosBridgeReInit(
    createNewHealthcheck?: boolean,
    forceReInit?: boolean,
    maxInitAttempt?: number
  ): Promise<void>;
  rosBridgeHealthcheck(forced?: boolean): void;
}

export interface IRosBridgeConnectionService {
  getRosBridgeConnection(maxConnectionAttempt?: number): Promise<Ros>;
}
export interface IStatusCommands {
  initStatusChecking(): void;
  setState(command: string, pid: number, name: string, id: number): void;
  reportStatus(_: unknown, replyOnChannel: (response: IResponse) => void): void;
  resetState(): void;
  getState(): CommandsStatus[];
  killCommand(commandId: number): Promise<void>;
  // killAll(): Promise<void>;
}

export interface ILog {
  init(): void;
}

export interface IInterfaceFileService {
  runInterface(data: Interface, replyOnChannel: (response: IResponse) => void): void;
  stopInterface(data: string, replyOnChannel: (response: IResponse) => void): void;
  getInterfacePath(): string;
}

export interface IBrowserWindowService {
  init(browserWindow: BrowserWindow): void;
  sendToRenderer(channel: string, data: any): void;
  reload(): void;
  getBrowserWindow(): BrowserWindow;
}

export interface IRosService {
  runCommands(command: Command, replyOnChannel: (response: IResponse) => void): void;
  runAllCommands(commands: Command[], replyOnChannel: (response: IResponse) => void): void;
  stopCommands(command: Command, replyOnChannel: (response: IResponse) => void): void;
  changeMap(mapName: AgentMap, replyOnChannel: (response: IResponse) => void): void;
  setStatusRunAllCommands(newStatus: EnumStatusRunAllCommands): void;
  getStatusRunAllCommands(): EnumStatusRunAllCommands;
  runCommandsForAll(command: Command, waitingTime?: number): Promise<IResponse & IRunAllResponse>;
  getNodesFromCommand(command: Command): Promise<string[]>;
  getCurrentMapName(): string;
  setMapName(mapName: string): void;
}

export interface ISubSystem {
  runAllSubSystem(subSystems: SubSystem[], replyOnChannel: (response: IResponse) => void): void;
  runSubSystem(
    subSystemName: string,
    replyOnChannel: (response: IResponse) => void,
    ignoreNodes?: boolean,
    resetTriesCounter?: boolean,
    flagIsProcessing?: boolean
  ): void;
  stopSubSystem(
    subSystemName: string,
    replyOnChannel: (response: IResponse) => void,
    ignoreNodes?: boolean,
    resetTriesCounter?: boolean,
    flagIsProcessing?: boolean
  ): void;
  setSubSystem(subSystems: SubSystem[], replyOnChannel: (response: IResponse) => void): void;
  getSubSystem(): SubSystem[];
  // mapSubSystem(interfaceData: InterfaceStatusDto): Promise<SubSystemDto[]>;
  mapSubSystem(interfaceData: InterfaceStatusDto): SubSystemDto[];
  initStatusChecking(): void;
  clearCache(): void;
}

export interface IRedButton {
  setInt16(value: number): void;
  getStatus(): RecordingStatus;
}
