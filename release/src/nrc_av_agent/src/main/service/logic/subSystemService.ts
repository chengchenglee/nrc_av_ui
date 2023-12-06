import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
import * as constants from '../../../shared/constants';
import { DIAGNOSTIC, ROS_COMMAND, SUB_SYSTEM } from '../../constants';
import TYPES from '../../inversify/types';
import { delayInMs, getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import type {
  IRosService,
  IStatusInterfaceRosBridgeService,
  ISubSystem,
  IChildProcess,
  IStatusCommands,
  IRosBridgeConnectionService
} from '../../inversify/interfaces';

@injectable()
export default class SubSystemService implements ISubSystem {
  private sharedStore;

  private statusWorker!: UtilityProcess;

  private isDiagnosticTimeout: boolean;

  private subSystemDiagnosticTries: Map<string, number>;

  private runningNodeSet: Set<string>;

  private runningTopicSet: Set<string>;

  constructor(
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusInterfaceRosBridgeService)
    private statusInterfaceRosBridgeSvc: IStatusInterfaceRosBridgeService,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.RosBridgeConnectionService)
    private rosBridgeConnectionService: IRosBridgeConnectionService
  ) {
    const initialValue: constants.SubSystemServiceState = {
      sortedSubSystems: [],
      subSystemsMap: new Map(),
      startedSubSystemsMap: new Map()
    };
    this.runningNodeSet = new Set();
    this.runningTopicSet = new Set();
    this.subSystemDiagnosticTries = new Map();
    this.sharedStore = createSharedStore<constants.SubSystemServiceState>(initialValue);
    this.isDiagnosticTimeout = false;
    this.sendWorkerMessage = this.sendWorkerMessage.bind(this);
  }

  @logMethod('[SubSystemService][initStatusChecking]', log.debug)
  initStatusChecking(): void {
    const { sendWorkerMessage } = this;
    this.forkWorker();
    setInterval(() => {
      sendWorkerMessage(
        new Map(this.commandsStatusSvc.getState().map((command) => [command.id, command])),
        new Map(this.statusInterfaceRosBridgeSvc.getAllTopics().map((topic) => [topic.id, topic]))
      );
    }, DIAGNOSTIC.DIAGNOSTIC_PASSIVE_INTERVAL);
    const interfaceStateChannel = this.statusInterfaceRosBridgeSvc.getMessagePort(
      constants.EnumRosBridgeCommunicationPort.INTERFACE_STATE
    );
    if (interfaceStateChannel) {
      interfaceStateChannel.on('message', (e) => {
        const message: constants.InterfaceStatusDto = e.data;
        const topics = [...message.algorithms, ...message.sensors];
        this.updateNodeAndTopicStatus();
        sendWorkerMessage(
          new Map(message.statusCommands.map((command) => [command.id, command])),
          new Map(topics.map((topic) => [topic.id, topic]))
        );
      });
    }
  }

  @logMethod('[SubSystemService][updateNodeStatus]', log.debug)
  private updateNodeAndTopicStatus() {
    this.rosBridgeConnectionService
      .getRosBridgeConnection(5)
      .then((connection) => {
        this.statusInterfaceRosBridgeSvc.getRosNodes(connection).then((nodes) => {
          const cleanedNodes = nodes.map((node) => {
            if (node.startsWith('/')) {
              return node.slice(1);
            }
            return node;
          });
          this.runningNodeSet = new Set(cleanedNodes);
        });
        this.statusInterfaceRosBridgeSvc.getRosTopics(connection).then((topics) => {
          this.runningTopicSet = new Set(topics);
        });
      })
      .catch(() => {
        log.warn('[SubSystemService][updateNodeStatus] Connection to ros-bridge error!');
      });
  }

  private sendWorkerMessage(
    commandMap: Map<number, constants.CommandsStatus>,
    topicMap: Map<number, constants.TopicType>,
    subSystemArr?: constants.SubSystem[],
    startedSubSystemMap?: Map<string, constants.SubSystem>
  ) {
    if (this.statusWorker) {
      const workerMessage: constants.ISubSystemWorkerMessage = {
        commandMap,
        topicMap,
        subSystems: subSystemArr || this.sharedStore.getState().sortedSubSystems,
        startedSubSystem: startedSubSystemMap || this.sharedStore.getState().startedSubSystemsMap
      };
      this.statusWorker.postMessage(workerMessage);
    }
  }

  @logMethod('[SubSystemService][statusLoop]', log.debug)
  private forkWorker() {
    this.isDiagnosticTimeout = false;
    if (!this.statusWorker) {
      this.statusWorker = utilityProcess.fork(
        getWorkerPath('workerSubSystemHealthCheck.js'),
        undefined,
        { serviceName: 'nrc_av_agent--sub-system-status', stdio: 'pipe' }
      );
      this.statusWorker.stdout?.on('data', (data) => {
        log.debug(`[SubSystemService][statusLoop] ${data.toString()}`);
      });
      this.statusWorker.stderr?.on('data', (data) => {
        log.error(`[SubSystemService][statusLoop] ${data.toString()}`);
      });
      this.statusWorker.on('message', (res) => {
        // Not an error
        if (!res.type) {
          const returnMessage: constants.ISubSystemWorkerReturn = res;
          if (returnMessage.diagLedStatus.length > 0) {
            const ledArray = Array.from(returnMessage.diagLedStatus, (value) => {
              if (value === undefined) {
                return 0;
              }
              return value;
            });
            // Message format for std_msgs/Int16MultiArray
            const message: constants.StdInt16ArrayTopicMessage = {
              data: ledArray
            };
            this.statusInterfaceRosBridgeSvc.publishMessage(
              constants.EnumRosBridgeTopic.LED_DIAGNOSTIC,
              message
            );
          }
          if (returnMessage.diagnosticSubSystem.length > 0 && !this.isDiagnosticTimeout) {
            this.isDiagnosticTimeout = true;
            const diagnosticPromises: Promise<constants.IResponse>[] =
              returnMessage.diagnosticSubSystem.flatMap((subSystem) => {
                const maxRetries = subSystem.diagRetry || DIAGNOSTIC.DIAGNOSTIC_RETRY;
                const tries = this.subSystemDiagnosticTries.get(subSystem.name);
                let currentTries = 1;
                if (tries) {
                  currentTries = tries + 1;
                }
                if (currentTries <= maxRetries) {
                  this.subSystemDiagnosticTries.set(subSystem.name, currentTries);
                  return this.runDiagnostic(subSystem.diagnostic);
                }
                return [];
              });
            // The result will return array of IResponse of all the diagnostic command
            // This is for future sprint where we want to keep track of
            // result of diagnostic command
            Promise.allSettled(diagnosticPromises)
              .then((result: PromiseSettledResult<constants.IResponse>[]) => {
                log.info(result);
              })
              .finally(() => {
                setTimeout(() => {
                  this.isDiagnosticTimeout = false;
                }, DIAGNOSTIC.DIAGNOSTIC_COOLDOWN_INTERVAL);
              });
          }
        }
      });
      this.statusWorker.once('exit', (code: number) => {
        log.debug(`[worker-sub-system-status] Process exited with code ${code}`);
        setTimeout(this.forkWorker.bind(this), DIAGNOSTIC.DIAGNOSTIC_PASSIVE_INTERVAL);
      });
    }
  }

  // eslint-disable-next-line max-lines-per-function
  @logMethod('[SubSystemService][runAllSubSystem]', log.debug)
  async runAllSubSystem(
    subSystems: constants.SubSystem[],
    replyOnChannel: (response: constants.IResponse) => void
  ) {
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const subSystem of subSystems) {
      if (this.checkSubSystemStatus(subSystem.name) === constants.SubSystemStatusType.RUNNING) {
        log.warn(
          // eslint-disable-next-line max-len
          `[SubSystemService][runAllSubSystem] Skipping sub system "${subSystem.name}" because already started`
        );
        // eslint-disable-next-line no-console
        console.log(`Skipping sub system "${subSystem.name}" because already started`);
        // eslint-disable-next-line no-continue
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.runSubSystem(subSystem.name, (response: constants.IResponse) => {
        if (response.status === 'error') {
          errorResponses.push(...response.message);
        }
      });
    }
    if (errorResponses.length > 0) {
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
    } else {
      replyOnChannel({
        status: 'success',
        data: SUB_SYSTEM.RUN_SUBSYSTEM_SUCCESS
      });
    }
  }

  @logMethod('[SubSystemService][runSubSystemCommand]', log.debug)
  private async runSubSystemCommand(subSystem: constants.SubSystem) {
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const command of subSystem.commands) {
      log.info(
        // eslint-disable-next-line max-len
        `[SubSystemService][runSubSystemCommand] Sub system ${subSystem.name} command :  ${command.command}`
      );
      // eslint-disable-next-line no-console
      console.log(`Sub system ${subSystem.name} command :  ${command.command}`);
      // eslint-disable-next-line no-await-in-loop
      const commandResponse = await this.rosSvc
        .runCommandsForAll(command, command.launchTime * 1000)
        .catch((err) => {
          const response: constants.IResponse & constants.IRunAllResponse = err;
          if (response.status === 'error') {
            log.error(
              // eslint-disable-next-line max-len
              `[SubSystemService][runSubSystemCommand] Sub system ${subSystem.name} : ${command.command} -- ${response.message}`
            );
            // eslint-disable-next-line no-console
            console.log(`Sub system ${subSystem.name} : ${command.command} -- ${response.message}`);
            errorResponses.push({ ...response, subSystemId: subSystem.id });
          } else {
            log.error(
              // eslint-disable-next-line max-len
              `[SubSystemService][runSubSystemCommand] Sub system ${subSystem.name} : ${command.command} non responsive`
            );
            // eslint-disable-next-line no-console
            console.log(`Sub system ${subSystem.name} : ${command.command} non responsive`);
            errorResponses.push({
              status: 'error',
              message: SUB_SYSTEM.RUN_SUBSYSTEM_FAIL,
              subSystemId: subSystem.id
            });
          }
        });
      if (commandResponse && commandResponse.status === 'success') {
        // eslint-disable-next-line no-await-in-loop
        await delayInMs(command.launchTime * 1000 || SUB_SYSTEM.DEFAULT_LAUNCH_TIME);
      }
    }
    return errorResponses;
  }

  @logMethod('[SubSystemService][stopSubSystemCommand]', log.debug)
  private async stopSubSystemCommand(subSystem: constants.SubSystem) {
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    const promiseArr: Promise<constants.IResponse>[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const command of subSystem.commands) {
      log.info(
        // eslint-disable-next-line max-len
        `[SubSystemService][runSubSystemCommand] Sub system ${subSystem.name} command :  ${command.command}`
      );
      // eslint-disable-next-line no-console
      console.log(`Sub system ${subSystem.name} command :  ${command.command}`);

      const promiseStop: Promise<constants.IResponse> = new Promise((resolve) => {
        command.nodes?.forEach((node) => {
          const commandKill = this.childProcessSvc.buildCommand(`rosnode kill "${node.name}"`, '');
          this.childProcessSvc.execAndForget(commandKill);
        });
        resolve({ status: 'success', data: ROS_COMMAND.STOP_COMMAND_SUCCESS });
      });
      promiseArr.push(promiseStop);
    }
    await Promise.allSettled(promiseArr).then((errorArr) => {
      // filter undefined
      errorArr.forEach((value) => {
        if (value.status === 'rejected') {
          errorResponses.push({ ...value.reason, subSystemId: subSystem.id });
        }
      });
    });

    return errorResponses;
  }

  // Return dependents of sub system
  private getDependentsList(subSystemName: string, returnStarted?: boolean) {
    const currentSortedSubSystems = new Array(...this.sharedStore.getState().sortedSubSystems);
    const checkDependents: string[] = [subSystemName];
    const totalDependents: string[] = [];
    currentSortedSubSystems.forEach((subSystem) => {
      if (
        new Set(subSystem.depends).size + new Set(checkDependents).size !==
        new Set([...subSystem.depends, ...checkDependents]).size
      ) {
        if (
          !returnStarted ||
          this.checkSubSystemStatus(subSystem.name, true) === constants.SubSystemStatusType.RUNNING
        ) {
          totalDependents.push(subSystem.name);
          checkDependents.push(subSystem.name);
        }
      }
    });
    return totalDependents;
  }

  private getDependenciesList(subSystemName: string, returnStarted?: boolean) {
    const totalDependencies: string[] = [];
    const currentSortedSubSystems = new Array(...this.sharedStore.getState().sortedSubSystems);
    const currenSubSystem = this.sharedStore.getState().subSystemsMap.get(subSystemName);
    if (!currenSubSystem) {
      return totalDependencies;
    }
    currentSortedSubSystems.reverse();
    let checkDependencies: Set<string> = new Set(currenSubSystem.depends);
    currentSortedSubSystems.forEach((subSystem) => {
      if (checkDependencies.has(subSystem.name)) {
        if (
          !returnStarted ||
          this.checkSubSystemStatus(subSystem.name, true) === constants.SubSystemStatusType.RUNNING
        ) {
          checkDependencies = new Set([...checkDependencies, ...subSystem.depends]);
          totalDependencies.push(subSystem.name);
        }
      }
    });
    return totalDependencies;
  }

  // eslint-disable-next-line complexity
  private checkSubSystemStatus(
    subSystemName: string,
    dependFlow?: boolean
  ): constants.SubSystemStatusType | undefined {
    const { subSystemsMap, startedSubSystemsMap } = this.sharedStore.getState();
    const subSystem = subSystemsMap.get(subSystemName);
    if (!subSystem) {
      return undefined;
    }
    const deadSubSystemTopics = this.returnDeadSubSystemTopics(subSystem);
    if (dependFlow) {
      if (!deadSubSystemTopics.length) {
        if (!subSystem.topics.length && !startedSubSystemsMap.get(subSystemName)) {
          // Because command status is no longer a metric to see if a sub system is alive
          return constants.SubSystemStatusType.STOPPED;
        }
        return constants.SubSystemStatusType.RUNNING;
      }
      if (deadSubSystemTopics.length === subSystem.topics.length) {
        return constants.SubSystemStatusType.STOPPED;
      }
      return constants.SubSystemStatusType.STOPPED;
    }
    if (!startedSubSystemsMap.get(subSystemName)) {
      return constants.SubSystemStatusType.STOPPED;
    }
    const totalSubSystemNodes = subSystem.commands
      .flatMap((command) => command.nodes)
      .map((node) => node.name);
    if (!subSystem.topics.length && !totalSubSystemNodes.length) {
      // Because command status is no longer a metric to see if a sub system is alive
      return constants.SubSystemStatusType.RUNNING;
    }
    if (
      deadSubSystemTopics.length >= subSystem.topics.length &&
      this.returnDeadSubSystemNodes(subSystem).length >= totalSubSystemNodes.length
    ) {
      const allTopicCleaned = deadSubSystemTopics.every((topic) => {
        if (this.runningTopicSet.has(topic.topicName)) {
          // Topic exist so we consider the topic still running just lack of messages
          return false;
        }
        return true;
      });
      return !allTopicCleaned
        ? constants.SubSystemStatusType.RUNNING
        : constants.SubSystemStatusType.STOPPED;
    }
    if (
      deadSubSystemTopics.length < subSystem.topics.length ||
      !subSystem.topics.length ||
      this.returnDeadSubSystemNodes(subSystem).length < totalSubSystemNodes.length ||
      !totalSubSystemNodes.length
    ) {
      return constants.SubSystemStatusType.RUNNING;
    }
    return undefined;
  }

  // eslint-disable-next-line max-lines-per-function
  @logMethod('[SubSystemService][runSubSystem]', log.debug)
  // eslint-disable-next-line complexity
  async runSubSystem(
    subSystemName: string,
    replyOnChannel: (response: constants.IResponse) => void,
    ignoreNodes = true
  ) {
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    const { subSystemsMap } = this.sharedStore.getState();
    const subSystem = subSystemsMap.get(subSystemName);
    if (!subSystem) {
      errorResponses.push({
        status: 'error',
        message: SUB_SYSTEM.SUBSYSTEM_NO_EXIST,
        subSystemId: 0
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
      return;
    }
    if (this.checkSubSystemStatus(subSystemName) === constants.SubSystemStatusType.RUNNING) {
      errorResponses.push({
        status: 'error',
        message: SUB_SYSTEM.RUN_SUBSYSTEM_ALREADY_START,
        subSystemId: subSystem.id
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
      return;
    }
    const dependencies = this.getDependenciesList(subSystemName, true);
    if (new Set(dependencies).size !== new Set([...dependencies, ...subSystem.depends]).size) {
      const startDependenciesSet = new Set(dependencies);
      const subSystemDependenciesSet = new Array(...subSystem.depends);
      const difDependenciesSet = new Set(
        [...subSystemDependenciesSet].filter(
          (dependenciesName) => !startDependenciesSet.has(dependenciesName)
        )
      );
      errorResponses.push({
        status: 'error',
        message: `Dependencies: "${Array.from(difDependenciesSet.values()).join(
          '" , "'
        )}" not started`,
        subSystemId: subSystem.id
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
      return;
    }
    try {
      const subSystemTimeout = delayInMs(subSystem.timeout * 1000 || SUB_SYSTEM.DEFAULT_TIMEOUT);
      const commandError = this.runSubSystemCommand(subSystem);
      const result = await Promise.race([commandError, subSystemTimeout]);
      this.subSystemDiagnosticTries.set(subSystem.name, 0);
      if (!result) {
        log.warn(`[SubSystemService][runSubSystem] Sub system "${subSystem.name}" timeout`);
        // eslint-disable-next-line no-console
        console.log(`Sub system "${subSystem.name}" timeout`);
        errorResponses.push({
          status: 'error',
          message: `Sub system "${subSystem.name}" timeout`,
          subSystemId: subSystem.id
        });
      }
      // else if (result.length) {
      //   errorResponses.push(...result);
      // }
      const deadNodeArr: string[] = ignoreNodes ? [] : this.returnDeadSubSystemNodes(subSystem);
      // const deadTopicErrorResponse: (constants.IResponse & constants.ISubSystemExtraInfo)[] =
      //   this.processStartedSubSystemTopic(subSystem);
      // errorResponses.push(...deadTopicErrorResponse);
      if (deadNodeArr.length) {
        log.error(
          `[SubSystemService][runSubSystem] Sub system "${
            subSystem.name
          }" : The ROS node "${deadNodeArr.join('" , "')}" does not exist`
        );
        errorResponses.push({
          status: 'error',
          message: `The ROS node "${deadNodeArr.join('" , "')}" does not exist`,
          subSystemId: subSystem.id
        });
      }
      // Get state again in callback just to be sure;
      const currentStartedMap = new Map(this.sharedStore.getState().startedSubSystemsMap);
      if (
        !currentStartedMap.get(subSystem.name)
        // && !deadTopicErrorResponse.length &&
        // !deadNodeArr.length
      ) {
        currentStartedMap.set(subSystem.name, subSystem);
        this.sharedStore.setState((state) => {
          // eslint-disable-next-line no-param-reassign
          state.startedSubSystemsMap = currentStartedMap;
        });
      }
      if (errorResponses && errorResponses.length > 0) {
        const errorLog = errorResponses
          .map((res) => {
            if (res.status === 'error') {
              return res.message;
            }
            return res.data;
          })
          .join(',');
        log.error(`[SubSystemService][runSubSystem] ${errorLog}`);
        replyOnChannel({
          status: 'error',
          message: errorResponses
        });
        return;
      }
      replyOnChannel({
        status: 'success',
        data: SUB_SYSTEM.RUN_SUBSYSTEM_SUCCESS
      });
    } catch {
      errorResponses.push({
        status: 'error',
        message: SUB_SYSTEM.RUN_SUBSYSTEM_FAIL,
        subSystemId: subSystem.id
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
    }
  }

  // eslint-disable-next-line max-lines-per-function
  @logMethod('[SubSystemService][stopSubSystem]', log.debug)
  async stopSubSystem(
    subSystemName: string,
    replyOnChannel: (response: constants.IResponse) => void,
    ignoreNodes = false
  ) {
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    const { subSystemsMap } = this.sharedStore.getState();
    const subSystem = subSystemsMap.get(subSystemName);
    if (!subSystem) {
      errorResponses.push({
        status: 'error',
        message: SUB_SYSTEM.SUBSYSTEM_NO_EXIST,
        subSystemId: 0
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
      return;
    }
    if (this.checkSubSystemStatus(subSystemName) === constants.SubSystemStatusType.STOPPED) {
      errorResponses.push({
        status: 'error',
        message: SUB_SYSTEM.STOP_SUBSYSTEM_ALREADY_STOP,
        subSystemId: subSystem.id
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
      return;
    }
    // const dependencies = this.getDependentsList(subSystemName, true);
    // if (dependencies.length > 0) {
    //   errorResponses.push({
    //     status: 'error',
    //     message: `Dependents: "${dependencies.join('" , "')}" not stopped`,
    //     subSystemId: subSystem.id
    //   });
    //   replyOnChannel({
    //     status: 'error',
    //     message: errorResponses
    //   });
    //   return;
    // }
    try {
      await this.stopSubSystemCommand(subSystem);
      // errorResponses.push(...commandError);
      this.subSystemDiagnosticTries.delete(subSystem.name);
      // Buffer for the topic to actually stop
      await delayInMs(SUB_SYSTEM.DEFAULT_STOP_TIME);
      const totalSubSystemNode = subSystem.commands
        .flatMap((command) => command.nodes)
        .map((node) => node.name);
      const deadTopicArr: constants.TopicSubSystem[] = this.returnDeadSubSystemTopics(subSystem);
      const deadNodeArr: string[] = ignoreNodes
        ? totalSubSystemNode
        : this.returnDeadSubSystemNodes(subSystem);
      if (deadNodeArr.length !== totalSubSystemNode.length) {
        const deadNodeNameSet = new Set(deadNodeArr);
        const difNodeSet = new Set(
          [...totalSubSystemNode].filter((node) => !deadNodeNameSet.has(node))
        );
        log.error(
          `[SubSystemService][stopSubSystem] Sub system "${
            subSystem.name
          } : Unable to stop subsystem, as the following nodes cannot be terminated:  "${Array.from(
            difNodeSet.values()
          ).join('" , "')}".`
        );
        errorResponses.push({
          status: 'error',
          // eslint-disable-next-line max-len
          message: `Unable to stop subsystem, as the following nodes cannot be terminated:  "${Array.from(
            difNodeSet.values()
          ).join('" , "')}".`,
          subSystemId: subSystem.id
        });
      } else if (deadTopicArr.length !== subSystem.topics.length) {
        const deadTopicNameSet = new Set(deadTopicArr.map((topic) => topic.topicName));
        const totalSubSystemTopic = subSystem.topics.map((topic) => topic.topicName);
        const difTopicSet = new Set(
          [...totalSubSystemTopic].filter((topic) => !deadTopicNameSet.has(topic))
        );
        log.error(
          `[SubSystemService][stopSubSystem] Sub system "${
            subSystem.name
          } : Unable to stop subsystem as the following health topics are active: "${Array.from(
            difTopicSet.values()
          ).join('" , "')}". Please verify the defined nodes in the configuration file.`
        );
        errorResponses.push({
          status: 'error',
          // eslint-disable-next-line max-len
          message: `Unable to stop subsystem as the following health topics are active: "${Array.from(
            difTopicSet.values()
          ).join('" , "')}". Please verify the defined nodes in the configuration file.`,
          subSystemId: subSystem.id
        });
      }

      // Get state again in callback just to be sure;
      const currentStartedMap = new Map(this.sharedStore.getState().startedSubSystemsMap);
      if (
        currentStartedMap.delete(subSystem.name)
        // && deadTopicArr.length === subSystem.topics.length &&
        // deadNodeArr.length === totalSubSystemNode.length
      ) {
        this.sharedStore.setState((state) => {
          // eslint-disable-next-line no-param-reassign
          state.startedSubSystemsMap = currentStartedMap;
        });
      }
      if (errorResponses && errorResponses.length > 0) {
        const errorLog = errorResponses
          .map((res) => {
            if (res.status === 'error') {
              return res.message;
            }
            return res.data;
          })
          .join(',');
        log.error(`[SubSystemService][stopSubSystem] ${errorLog}`);
        replyOnChannel({
          status: 'error',
          message: errorResponses
        });
        return;
      }
      replyOnChannel({
        status: 'success',
        data: SUB_SYSTEM.STOP_SUBSYSTEM_SUCCESS
      });
    } catch {
      errorResponses.push({
        status: 'error',
        message: SUB_SYSTEM.RUN_SUBSYSTEM_FAIL,
        subSystemId: subSystem.id
      });
      replyOnChannel({
        status: 'error',
        message: errorResponses
      });
    }
  }

  @logMethod('[SubSystemService][setSubSystem]', log.debug)
  async setSubSystem(
    subSystemArr: constants.SubSystem[],
    replyOnChannel: (response: constants.IResponse) => void
  ): Promise<void> {
    const updatedSubSystemArr = await Promise.all(
      subSystemArr.map(async (subSystem) => {
        const newSub = subSystem;
        newSub.commands = await Promise.all(
          newSub.commands.map(async (command) => {
            const newCommand = command;
            if (!newCommand.command.split(' ')[0].includes('roslaunch')) {
              return command;
            }
            newCommand.nodes = (await this.rosSvc.getNodesFromCommand(command)).map((nodeName) => ({
              id: 0,
              name: nodeName
            }));
            return newCommand;
          })
        );
        return newSub;
      })
    );
    const newSubSystemsMap = new Map(
      updatedSubSystemArr.map((subSystem) => [subSystem.name, subSystem])
    );
    this.sharedStore.setState((state) => {
      // eslint-disable-next-line no-param-reassign
      state.sortedSubSystems = updatedSubSystemArr;
      // eslint-disable-next-line no-param-reassign
      state.subSystemsMap = newSubSystemsMap;
    });
    replyOnChannel({
      status: 'success',
      data: SUB_SYSTEM.SET_SUBSYSTEM_SUCCESS
    });
  }

  getSubSystem(): constants.SubSystem[] {
    return this.sharedStore.getState().sortedSubSystems;
  }

  mapSubSystem(interfaceData: constants.InterfaceStatusDto): constants.SubSystemDto[] {
    const subSystems = this.getSubSystem();
    const topicMap = new Map(
      [...interfaceData.sensors, ...interfaceData.algorithms].map((topic) => [topic.id, topic])
    );
    const commandMap = new Map(
      interfaceData.statusCommands.map((command) => [command.id, command])
    );
    const subDto: constants.SubSystemDto[] = subSystems.map((subSystem) => {
      const topics: constants.TopicType[] = subSystem.topics.map(
        (topicSub) =>
          topicMap.get(topicSub.id) || {
            ...topicSub,
            msgCount: 0,
            healthCheckRate: 0,
            status: constants.RosTopicStatusType.BAD,
            uuid: ''
          }
      );
      const commands: constants.CommandsStatus[] = subSystem.commands.map(
        (commandSub) =>
          commandMap.get(commandSub.id) || {
            ...commandSub,
            status: constants.CommandsStatusType.STOPPED
          }
      );
      const status =
        this.checkSubSystemStatus(subSystem.name) === constants.SubSystemStatusType.RUNNING
          ? constants.SubSystemStatusType.RUNNING
          : constants.SubSystemStatusType.STOPPED;
      const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
      const { startedSubSystemsMap } = this.sharedStore.getState();
      if (
        status === constants.SubSystemStatusType.RUNNING ||
        (status === constants.SubSystemStatusType.STOPPED &&
          startedSubSystemsMap.get(subSystem.name))
      ) {
        errorResponses.push(...this.processStartedSubSystemTopic(subSystem));
      }
      return {
        ...subSystem,
        status,
        topics,
        commands,
        error: errorResponses
      };
    });
    return subDto;
  }

  @logMethod('[SubSystemService][processStartedSubSystemTopic]', log.debug)
  private processStartedSubSystemTopic(subSystem: constants.SubSystem) {
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    const deadTopicArr: constants.TopicSubSystem[] = this.returnDeadSubSystemTopics(subSystem);
    if (deadTopicArr.length) {
      deadTopicArr.forEach((topic) => {
        if (this.runningTopicSet.has(topic.topicName)) {
          log.debug(
            // eslint-disable-next-line max-len
            `[SubSystemService][processStartedSubSystemTopic] Sub system "${subSystem.name}" : The message rate of "${topic.topicName}" within  "${topic.name}" is below the error rate threshold.`
          );
          errorResponses.push({
            status: 'error',
            // eslint-disable-next-line max-len
            message: `The message rate of "${topic.topicName}" within  "${topic.name}" is below the error rate threshold.`,
            subSystemId: subSystem.id
          });
        } else {
          log.debug(
            // eslint-disable-next-line max-len
            `[SubSystemService][processStartedSubSystemTopic] Sub system "${subSystem.name}" : Topic "${topic.topicName}" of health check "${topic.name}" not exist`
          );
          errorResponses.push({
            status: 'error',
            message: `Topic "${topic.topicName}" of health check "${topic.name}" not exist`,
            subSystemId: subSystem.id
          });
        }
      });
    }
    return errorResponses;
  }

  @logMethod('[SubSystemService][clearCache]', log.debug)
  clearCache(): void {
    this.sharedStore.setState((state) => {
      // eslint-disable-next-line no-param-reassign
      state.sortedSubSystems = [];
      // eslint-disable-next-line no-param-reassign
      state.startedSubSystemsMap = new Map();
      // eslint-disable-next-line no-param-reassign
      state.subSystemsMap = new Map();
    });
    this.subSystemDiagnosticTries.clear();
    this.isDiagnosticTimeout = false;
  }

  @logMethod('[SubSystemService][returnDeadSubSystemTopics]', log.debug)
  private returnDeadSubSystemTopics(subSystem: constants.SubSystem): constants.TopicSubSystem[] {
    const deadTopicArr: constants.TopicSubSystem[] = [];
    subSystem.topics.forEach((topic) => {
      const currentTopic = this.statusInterfaceRosBridgeSvc.getTopic(topic.name, subSystem.type);
      if (!currentTopic || currentTopic.status === constants.RosTopicStatusType.BAD) {
        deadTopicArr.push(topic);
      }
    });
    return deadTopicArr;
  }

  @logMethod('[SubSystemService][returnDeadSubSystemNodes]', log.debug)
  private returnDeadSubSystemNodes(subSystem: constants.SubSystem): string[] {
    const startNodeSet = new Set(this.runningNodeSet);
    const subSystemNode = subSystem.commands
      .flatMap((command) => command.nodes)
      .map((node) => node.name);
    const deadNode = subSystemNode.flatMap((node) => {
      if (startNodeSet.has(node)) {
        return [];
      }
      return node;
    });
    return deadNode;
  }

  @logMethod('[SubSystemService][runDiagnostic]', log.debug)
  private runDiagnostic(diagnostic: string): Promise<constants.IResponse> {
    const diagnosticCommand = this.childProcessSvc.buildCommand(
      `rosrun nrc_av_ui ${diagnostic}`,
      ''
    );
    log.info(`[SubSystemService][runDiagnostic] Running: ${diagnosticCommand}`);
    return new Promise<constants.IResponse>((resolve, reject) => {
      try {
        this.childProcessSvc.executeAndValid(
          diagnosticCommand,
          10000,
          (response: constants.IResponse) => {
            if (response.status === 'error') {
              const errorResponse: constants.IResponse = {
                status: 'error',
                message: response.message
              };
              reject(errorResponse);
            } else {
              const responseWithPID: constants.IResponse = {
                ...response
              };
              resolve(responseWithPID);
            }
          },
          true
        );
      } catch (err) {
        const errorResponse: constants.IResponse = {
          status: 'error',
          message: ROS_COMMAND.RUN_COMMAND_FAIL
        };
        log.error(`[SubSystemService][runDiagnostic] ${err}`);
        reject(errorResponse);
      }
    });
  }
}
