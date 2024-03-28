import { UtilityProcess, utilityProcess } from 'electron';
import log from 'electron-log';
import { createSharedStore } from 'electron-shared-state';
import { inject, injectable } from 'inversify';
import * as constants from '../../../shared/constants';
import { RosTopicStatusType } from '../../../shared/constants';
import { DIAGNOSTIC, ROS_COMMAND, SUB_SYSTEM } from '../../constants';
import TYPES from '../../inversify/types';
import { delayInMs, getWorkerPath } from '../../utils';
import { logMethod } from '../log/logDecorator';
import MutexList from './mutex/mutexlist';
//  shared/constants';

import type {
  IRosService,
  IStatusInterfaceRosBridgeService,
  ISubSystem,
  IChildProcess,
  IStatusCommands,
  IRedButton
} from '../../inversify/interfaces';

@injectable()
export default class SubSystemService implements ISubSystem {
  private sharedStore;

  private statusWorker!: UtilityProcess;

  private subSystemDiagnosticTimeout: Map<string, constants.SubSystem>;

  private subSystemDiagnosticTries: Map<string, number>;

  private subSystemDiagnosticResponse: Map<string, string>;

  // private subSystemIsProcessing: MutexMap<string, constants.SubSystem>;
  private subSystemIsProcessing: Map<string, constants.SubSystem>;

  private subSystemIsDiagnostic: Map<string, constants.SubSystem>;

  private diagnosedSubSystems = new MutexList<string>();

  private runningNodeSet: Set<string>;

  private runningTopicSet: Set<string>;

  private diagnosticLocked: boolean;

  constructor(
    @inject(TYPES.RosService) private rosSvc: IRosService,
    @inject(TYPES.StatusInterfaceRosBridgeService)
    private statusInterfaceRosBridgeSvc: IStatusInterfaceRosBridgeService,
    @inject(TYPES.StatusCommandsService) private commandsStatusSvc: IStatusCommands,
    @inject(TYPES.ChildProcess) private childProcessSvc: IChildProcess,
    @inject(TYPES.RedButton)
    private redButtonService: IRedButton
  ) {
    const initialValue: constants.SubSystemServiceState = {
      sortedSubSystems: [],
      subSystemsMap: new Map(),
      startedSubSystemsMap: new Map()
    };
    this.runningNodeSet = new Set();
    this.runningTopicSet = new Set();
    this.subSystemDiagnosticResponse = new Map();
    this.subSystemDiagnosticTries = new Map();
    this.subSystemIsProcessing = new Map<string, constants.SubSystem>();
    this.subSystemIsDiagnostic = new Map();
    this.sharedStore = createSharedStore<constants.SubSystemServiceState>(initialValue);
    this.subSystemDiagnosticTimeout = new Map();
    this.sendWorkerMessage = this.sendWorkerMessage.bind(this);
    this.diagnosticLocked = false;
  }

  // eslint-disable-next-line require-await
  private async isSubSystemGreen(subSystem: constants.SubSystem) {
    const topics = this.statusInterfaceRosBridgeSvc.getAllTopics();
    const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

    const result = subSystem.topics.every((topic) => {
      const subSystemTopic = topicMap.get(topic.id);
      // Return false if subSystemTopic is BAD or not found
      if (
        !this.sharedStore.getState().startedSubSystemsMap.get(subSystem.name) ||
        !subSystemTopic || // if topic is not found, consider it as not BAD
        subSystemTopic.status === RosTopicStatusType.BAD
      ) {
        return false;
      }
      return true;
    });
    return result;
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
      log.info('[SubSystemService][initStatusChecking] Status checking loop init!');
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

  @logMethod('[SubSystemService][updateNodeAndTopicStatus]', log.debug)
  private updateNodeAndTopicStatus() {
    const cleanedNodes = this.statusInterfaceRosBridgeSvc.getRosNodesCache().map((node) => {
      if (node.startsWith('/')) {
        return node.slice(1);
      }
      return node;
    });
    this.runningNodeSet = new Set(cleanedNodes);
    this.runningTopicSet = new Set(this.statusInterfaceRosBridgeSvc.getRosTopicsCache());
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

  private handleLedStatus(diagLedStatus: number[]) {
    // eslint-disable-next-line no-param-reassign
    diagLedStatus[SUB_SYSTEM.DEFAULT_RECORDING_LED_INDEX] =
      this.redButtonService.getStatus() === constants.RecordingStatus.RECORDING ? 2 : 0;
    const ledArray = Array.from(diagLedStatus, (value) => {
      if (value === undefined) {
        return 0;
      }
      return value;
    });
    if (ledArray.length > 0) {
      // Message format for std_msgs/Int16MultiArray
      const message: constants.StdInt16ArrayTopicMessage = {
        data: ledArray
      };
      this.statusInterfaceRosBridgeSvc.publishMessage(
        constants.EnumRosBridgeTopic.LED_DIAGNOSTIC,
        message
      );
    }
  }

  private async restartSubSystemIfDiagnosticFails(subSystem: constants.SubSystem) {
    const maxRetries = subSystem.diagRetry;
    if (maxRetries === 0) {
      // eslint-disable-next-line no-console
      // console.log(
      // eslint-disable-next-line max-len
      //   `${subSystem.name}: Diagnostic not processed due to retry parameter being 0 or not declared`
      // );
      await this.diagnosedSubSystems.remove(subSystem.name);
      return null;
    }
    const currentTries = this.subSystemDiagnosticTries.get(subSystem.name) || 0;

    if (maxRetries && currentTries < maxRetries) {
      // eslint-disable-next-line no-console
      console.log(`${subSystem.name}: Diagnostic process - ${currentTries + 1}`);
      return this.restartSubSystemWithRetry(subSystem);
    }
    await this.diagnosedSubSystems.remove(subSystem.name);
    return null;
  }

  // eslint-disable-next-line require-await
  @logMethod('[SubSystemService][diagnoseAndRestart]', log.debug)
  private async diagnoseAndRestart(subSystem: constants.SubSystem): Promise<void> {
    // eslint-disable-next-line no-async-promise-executor, require-await
    return new Promise<void>(async (resolve, reject) => {
      // Set up a boolean flag to track completion
      let completed = false;

      if (!subSystem.diagnostic) {
        this.restartSubSystem(subSystem.name)
          .then(() => {
            // If all processes complete successfully, resolve the outer promise
            completed = true;
            this.subSystemDiagnosticResponse.delete(subSystem.name);
            // eslint-disable-next-line no-console
            console.log(`${subSystem.name}: Restart successful`);
            resolve();
          })
          .catch((error) => {
            // If any process fails, reject the outer promise
            reject(error);
          });
      } else {
        // Once the diagnostic is complete, start the restart process
        this.runDiagnostic(subSystem)
          .then((result) => {
            log.info('[SubSystemService][diagnoseAndRestart]');
            log.info(result);
            const sucessResponse = result as constants.ISuccessResponse &
              constants.ISubSystemExtraInfo;
            this.subSystemDiagnosticResponse.set(subSystem.name, sucessResponse.data);
          })
          .catch((err: constants.IErrorResponse & constants.ISubSystemExtraInfo) => {
            log.error('[SubSystemService][diagnoseAndRestart]');
            log.error(err);
            this.subSystemDiagnosticResponse.set(subSystem.name, err.message);
          })
          .finally(() => {
            const restartPromise = this.restartSubSystem(subSystem.name);
            return restartPromise;
          })
          .then(() => {
            // If all processes complete successfully, resolve the outer promise
            completed = true;
            this.subSystemDiagnosticResponse.delete(subSystem.name);
            // eslint-disable-next-line no-console
            console.log(`${subSystem.name}: Restart successful`);
            resolve();
          })
          .catch((error) => {
            // If any process fails, reject the outer promise
            reject(error);
          });
      }
      // Set a timeout for the entire process
      setTimeout(() => {
        if (!completed) {
          reject(new Error(`Diagnostic and restart timed out after ${subSystem.timeout} s`));
        }
      }, subSystem.timeout * 1000);
    });
  }

  // eslint-disable-next-line require-await
  @logMethod('[SubSystemService][restartSubSystemWithRetry]', log.debug)
  private async restartSubSystemWithRetry(subSystem: constants.SubSystem) {
    const currentTries = this.subSystemDiagnosticTries.get(subSystem.name) || 0;

    // this.subSystemDiagnosticTimeout.set(subSystem.name, subSystem);
    this.subSystemDiagnosticTries.set(subSystem.name, currentTries + 1);
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<constants.IResponse & constants.ISubSystemExtraInfo>(async (resolve) => {
      // const result = await this.waitForSubSystemRunning(subSystem.name, 4000, 400);
      // duration should be subSystem.timeout
      // eslint-disable-next-line no-console
      console.log(
        `${subSystem.name}: waiting for recovery in ${SUB_SYSTEM.DEFAULT_DIAGNOSTIC_WAIT}ms...`
      );
      const result = await this.waitForSubSystemGreen(
        subSystem,
        SUB_SYSTEM.DEFAULT_DIAGNOSTIC_WAIT
      );

      if (this.isSubSystemStarted(subSystem.name)) {
        if (result.success === true) {
          // eslint-disable-next-line no-console
          console.log(`${subSystem.name}: Recover successful`);

          this.subSystemDiagnosticTries.set(subSystem.name, 0);
          resolve({
            status: 'success',
            data: SUB_SYSTEM.SUBSYSTEM_DIAGNOSTIC_RECOVERED,
            subSystemId: subSystem.id
          });
        } else {
          try {
            this.subSystemIsDiagnostic.set(subSystem.name, subSystem);
            await this.diagnoseAndRestart(subSystem);
            this.subSystemDiagnosticTries.set(subSystem.name, 0);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(`${subSystem.name} - err: ${error}`);
            log.error(`[SubSystemService][restartSubSystemWithRetry] ${error}`);
          } finally {
            if (currentTries + 1 >= subSystem.diagRetry) {
              // eslint-disable-next-line no-console
              console.log(
                // eslint-disable-next-line max-len
                `${subSystem.name}: Diagnostic process reached the maximum number of retries - ${subSystem.diagRetry}.`
              );
              const finalResult = await this.waitForSubSystemGreen(
                subSystem,
                SUB_SYSTEM.DEFAULT_DIAGNOSTIC_BUFFER
              );
              if (!finalResult) {
                // Subsystem diagnostic still fail after maximum retries
                // eslint-disable-next-line no-console
                console.log(`${subSystem.name}: Stop`);
                await this.stopSubSystemPromise(subSystem);
              }
            }
            this.subSystemIsDiagnostic.delete(subSystem.name);
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`${subSystem.name}: exit diagnostic as it's stopped`);
      }

      await this.diagnosedSubSystems.remove(subSystem.name);
    });
  }

  // eslint-disable-next-line require-await
  private async stopSubSystemPromise(subSystem: constants.SubSystem) {
    return new Promise<constants.IResponse & constants.ISubSystemExtraInfo>((resolve) => {
      this.stopSubSystemInt(
        subSystem,
        () => {
          resolve({
            status: 'error',
            message: SUB_SYSTEM.SUBSYSTEM_DIAGNOSTIC_EXCEED_TRIES,
            subSystemId: subSystem.id
          });
        },
        false,
        false,
        true
      );
    });
  }

  // eslint-disable-next-line require-await
  private async processDiagnosticSubSystems(diagnosticSubSystem: constants.SubSystem[]) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const restartSubSystemMap: Map<string, constants.SubSystem> = new Map();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const diagnosticPromises = diagnosticSubSystem.flatMap(async (subSystem) => {
      const diagnosedSubSystemResult = await this.diagnosedSubSystems.contains(subSystem.name);
      if (
        // this.subSystemDiagnosticTimeout.has(subSystem.name) ||
        // this.subSystemIsDiagnostic.has(subSystem.name) ||
        this.subSystemIsProcessing.has(subSystem.name) ||
        diagnosedSubSystemResult
      ) {
        return null;
      }

      this.diagnosedSubSystems.add(subSystem.name);
      return this.restartSubSystemIfDiagnosticFails(subSystem);
    });

    // const results = await Promise.allSettled(diagnosticPromises);
    // this.restartSortedSubSystem(restartSubSystemMap);

    // if (results.length > 0) {
    //   log.info(results);
    // }
  }

  private async handleStatusWorkerMessage(res: constants.ISubSystemWorkerReturn) {
    if (this.statusInterfaceRosBridgeSvc.interfaceRunning()) {
      const returnMessage: constants.ISubSystemWorkerReturn = res;

      if (returnMessage.diagLedStatus.length > 0) {
        await this.handleLedStatus(returnMessage.diagLedStatus);
      }

      if (returnMessage.diagnosticSubSystem.length > 0) {
        await this.processDiagnosticSubSystems(returnMessage.diagnosticSubSystem);
      }
    }
  }

  @logMethod('[SubSystemService][statusLoop]', log.debug)
  private forkWorker() {
    this.subSystemDiagnosticTimeout.clear();

    if (!this.statusWorker) {
      this.statusWorker = utilityProcess.fork(
        getWorkerPath('workerSubSystemHealthCheck.js'),
        undefined,
        { serviceName: 'nrc_av_agent--sub-system-status', stdio: 'pipe' }
      );

      this.setupWorkerEventHandlers();

      this.statusWorker.once('exit', (code: number) => {
        log.debug(`[worker-sub-system-status] Process exited with code ${code}`);
        setTimeout(this.forkWorker.bind(this), DIAGNOSTIC.DIAGNOSTIC_PASSIVE_INTERVAL);
      });
    }
  }

  private setupWorkerEventHandlers() {
    this.statusWorker.stdout?.on('data', (data) => {
      log.debug(`[SubSystemService][statusLoop] ${data.toString()}`);
    });

    this.statusWorker.stderr?.on('data', (data) => {
      log.error(`[SubSystemService][statusLoop] ${data.toString()}`);
    });

    this.statusWorker.on('message', this.handleStatusWorkerMessage.bind(this));
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

  @logMethod('[SubSystemService][restartSortedSubSystem]', log.debug)
  private async restartSortedSubSystem(restartSubSystemMap: Map<string, constants.SubSystem>) {
    // eslint-disable-next-line no-restricted-syntax
    for (const subSystem of this.sharedStore.getState().sortedSubSystems) {
      if (restartSubSystemMap.has(subSystem.name)) {
        this.subSystemIsProcessing.set(subSystem.name, subSystem);
        // eslint-disable-next-line no-await-in-loop
        await delayInMs(SUB_SYSTEM.DEFAULT_RESTART_BUFFER);
        if (
          this.checkSubSystemStatus(subSystem.name, true) === constants.SubSystemStatusType.STOPPED
        ) {
          // eslint-disable-next-line no-await-in-loop
          await this.restartSubSystem(subSystem.name);
        }
        // eslint-disable-next-line no-await-in-loop
        await this.subSystemIsProcessing.delete(subSystem.name);
      }
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
      console.log(`${subSystem.name} - run command:  ${command.command}`);
      const commandStartTime = performance.now();
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
            errorResponses.push({ ...response, subSystemId: subSystem.id });
          } else {
            log.error(
              // eslint-disable-next-line max-len
              `[SubSystemService][runSubSystemCommand] Sub system ${subSystem.name} : ${command.command} non responsive`
            );
            errorResponses.push({
              status: 'error',
              message: SUB_SYSTEM.RUN_SUBSYSTEM_FAIL,
              subSystemId: subSystem.id
            });
          }
        });
      if (commandResponse && commandResponse.status === 'success') {
        const timeRemain = Math.max(
          command.launchTime * 1000 - (performance.now() - commandStartTime),
          SUB_SYSTEM.DEFAULT_LAUNCH_TIME
        );
        // eslint-disable-next-line no-await-in-loop
        await delayInMs(timeRemain);
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

      const promiseStop: Promise<constants.IResponse> = new Promise((resolve) => {
        command.nodes?.forEach((node) => {
          const commandKill = this.childProcessSvc.buildCommand(`rosnode kill "${node.name}"`, '');
          this.childProcessSvc.execAndForget(commandKill);
        });
        // Only kill if we don't detect any nodes for roslaunch
        // (or user dont define any node for rosrun)
        if (!command.nodes || command.nodes.length === 0) {
          this.commandsStatusSvc.killCommand(command.id);
        }
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

  // eslint-disable-next-line require-await
  private async waitForSubSystemGreen(
    subSystem: constants.SubSystem,
    bufferDuration: number
  ): Promise<{ success: boolean }> {
    if (!this.isSubSystemStarted(subSystem.name)) {
      return { success: false };
    }
    return this.waitForCondition(
      subSystem,
      () => this.isSubSystemGreen(subSystem),
      bufferDuration / 10,
      10
    );
  }

  private async waitForCondition(
    subSystem: constants.SubSystem,
    condition: () => Promise<boolean>, // Change the condition function to return a Promise<boolean>
    intervalWait: number,
    remainingTries: number
  ): Promise<{ success: boolean }> {
    if (!this.isSubSystemStarted(subSystem.name)) {
      return { success: false };
    }

    if (await condition()) {
      // Await the result of the condition function
      return { success: true };
    }

    if (remainingTries > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, intervalWait);
      });
      return this.waitForCondition(subSystem, condition, intervalWait, remainingTries - 1);
    }

    return { success: false };
  }

  // private async waitForSubSystemRunning(
  //   subSystemName: string,
  //   bufferDuration: number,
  //   remainingTries: number
  // ): Promise<{ success: boolean }> {

  //   const maxTries = bufferDuration / 10;

  //   // Check subsystem status
  //   const status = this.checkSubSystemStatus(subSystemName, true);

  //   if (status === constants.SubSystemStatusType.RUNNING) {
  //     return { success: true };
  //   }

  //   if (remainingTries > 0) {
  //     // Retry after a short delay
  //     await new Promise(resolve => setTimeout(resolve, bufferDuration / maxTries));

  //     // Recursive call for the next attempt
  // eslint-disable-next-line max-len
  //     return await this.waitForSubSystemRunning(subSystemName, bufferDuration, remainingTries - 1);
  //   }

  //   // Timeout without the subsystem being in "RUNNING" state
  //   return { success: false };
  // }

  @logMethod('[SubSystemService][restartSubSystem]', log.debug)
  private async restartSubSystem(subSystemName: string) {
    const { subSystemsMap } = this.sharedStore.getState();
    const subSystem = subSystemsMap.get(subSystemName);
    if (!subSystem) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`${subSystem.name}: Restarting...`);
    await this.stopSubSystemInt(subSystem, () => null, false, false, false);
    await this.runSubSystem(subSystemName, () => null, true, false, false);
    // eslint-disable-next-line max-len
    // await this.waitForSubSystemRunning(subSystemName, SUB_SYSTEM.DEFAULT_TIMEOUT, SUB_SYSTEM.DEFAULT_TIMEOUT / 10);
  }

  private handleErrorAndReply(
    replyOnChannel: (response: constants.IResponse) => void,
    options: {
      message: string;
      subSystemId?: number;
    }
  ) {
    const { message, subSystemId } = options;
    const response: constants.IResponse & constants.ISubSystemExtraInfo = {
      status: 'error',
      message,
      subSystemId: subSystemId || 0
    };
    log.error(`[SubSystemService][runSubSystem] ${message}`);
    replyOnChannel({
      status: 'error',
      message: [response]
    });
  }

  private isSubSystemStarted(subSystemName: string): boolean {
    const currentStartedMap = this.sharedStore.getState().startedSubSystemsMap;
    return currentStartedMap.has(subSystemName);
  }

  private setSubSystemStarted(subSystem: constants.SubSystem): void {
    // Create a copy of the current startedSubSystemsMap
    const currentStartedMap = new Map(this.sharedStore.getState().startedSubSystemsMap);

    // Update the map with the new subSystem entry
    currentStartedMap.set(subSystem.name, subSystem);

    // Update the shared store state
    this.sharedStore.setState((state) => {
      // eslint-disable-next-line no-param-reassign
      state.startedSubSystemsMap = currentStartedMap;
    });
  }

  private startMonitorTopics(subSystem: constants.SubSystem): void {
    const message: constants.IRosBridgeTopicWorkerMessageStart = {
      type: constants.EnumRosBridgeTopicWorkerMessage.START,
      topidIdList: subSystem.topics.map((topic) => topic.id)
    };
    this.statusInterfaceRosBridgeSvc.sendAllTopicWorker(message);
  }

  // eslint-disable-next-line max-lines-per-function
  @logMethod('[SubSystemService][runSubSystem]', log.debug)
  // eslint-disable-next-line complexity
  async runSubSystem(
    subSystemName: string,
    replyOnChannel: (response: constants.IResponse) => void,
    ignoreNodes = true,
    resetTriesCounter = true,
    flagIsProcessing = true
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
    const { subSystemsMap } = this.sharedStore.getState();
    const subSystem = subSystemsMap.get(subSystemName);
    if (!subSystem) {
      this.handleErrorAndReply(replyOnChannel, {
        message: SUB_SYSTEM.SUBSYSTEM_DIAGNOSTIC_NO_EXIST
      });
      return;
    }
    try {
      if (flagIsProcessing) {
        this.subSystemIsProcessing.set(subSystemName, subSystem);
      }
      if (this.checkSubSystemStatus(subSystemName) === constants.SubSystemStatusType.RUNNING) {
        this.handleErrorAndReply(replyOnChannel, {
          message: SUB_SYSTEM.RUN_SUBSYSTEM_ALREADY_START
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
        this.handleErrorAndReply(replyOnChannel, {
          message: `Dependencies: "${Array.from(difDependenciesSet.values()).join(
            '" , "'
          )}" not started`,
          subSystemId: subSystem.id
        });
        return;
      }

      // const subSystemTimeout = delayInMs(subSystem.timeout * 1000 || SUB_SYSTEM.DEFAULT_TIMEOUT);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const commandError = this.runSubSystemCommand(subSystem);
      // const result = await Promise.race([commandError, subSystemTimeout]);
      // if (!result && !Array.isArray(result)) {
      //   log.warn(`[SubSystemService][runSubSystem] Sub system "${subSystem.name}" timeout`);
      // eslint-disable-next-line max-len
      //   this.handleErrorAndReply(replyOnChannel, { message: `Sub system "${subSystem.name}" timeout`, subSystemId: subSystem.id });
      // }
      this.setSubSystemStarted(subSystem);
      this.startMonitorTopics(subSystem);

      await this.waitForSubSystemGreen(
        subSystem,
        subSystem.timeout * 1000 || SUB_SYSTEM.DEFAULT_TIMEOUT
      );
      // await delayInMs(SUB_SYSTEM.DEFAULT_START_TIME);
      const deadNodeArr: string[] = ignoreNodes ? [] : this.returnDeadSubSystemNodes(subSystem);

      if (deadNodeArr.length) {
        this.handleErrorAndReply(replyOnChannel, {
          message: `The ROS node "${deadNodeArr.join('" , "')}" does not exist`,
          subSystemId: subSystem.id
        });
      }

      replyOnChannel({
        status: 'success',
        data: SUB_SYSTEM.RUN_SUBSYSTEM_SUCCESS
      });
    } catch {
      this.handleErrorAndReply(replyOnChannel, {
        message: SUB_SYSTEM.RUN_SUBSYSTEM_FAIL,
        subSystemId: subSystem.id
      });
    } finally {
      if (flagIsProcessing) {
        this.subSystemIsProcessing.delete(subSystemName);
      }
      if (resetTriesCounter) {
        // TODO why not OOP
        this.subSystemDiagnosticTries.set(subSystemName, 0);
      }
    }
  }

  // eslint-disable-next-line max-lines-per-function
  @logMethod('[SubSystemService][stopSubSystemInt]', log.debug)
  private async stopSubSystemInt(
    subSystem: constants.SubSystem,
    replyOnChannel: (response: constants.IResponse) => void,
    ignoreNodes: boolean,
    resetTriesCounter: boolean,
    flagIsProcessing: boolean
  ) {
    try {
      if (flagIsProcessing) {
        this.subSystemIsProcessing.set(subSystem.name, subSystem);
      }
      if (this.checkSubSystemStatus(subSystem.name) === constants.SubSystemStatusType.STOPPED) {
        this.handleErrorAndReply(replyOnChannel, {
          message: SUB_SYSTEM.STOP_SUBSYSTEM_ALREADY_STOP,
          subSystemId: subSystem.id
        });

        return;
      }

      await this.stopSubSystemCommand(subSystem);
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
        this.handleErrorAndReply(replyOnChannel, {
          message: `[SubSystemService][stopSubSystem] Sub system "${
            subSystem.name
          } : Unable to stop subsystem, as the following nodes cannot be terminated:  "${Array.from(
            difNodeSet.values()
          ).join('" , "')}".`,
          subSystemId: subSystem.id
        });
        return;
      }
      if (deadTopicArr.length !== subSystem.topics.length) {
        const deadTopicNameSet = new Set(deadTopicArr.map((topic) => topic.topicName));
        const totalSubSystemTopic = subSystem.topics.map((topic) => topic.topicName);
        const difTopicSet = new Set(
          [...totalSubSystemTopic].filter((topic) => !deadTopicNameSet.has(topic))
        );
        this.handleErrorAndReply(replyOnChannel, {
          message: `[SubSystemService][stopSubSystem] Sub system "${
            subSystem.name
          } : Unable to stop subsystem as the following health topics are active: "${Array.from(
            difTopicSet.values()
          ).join('" , "')}". Please verify the defined nodes in the configuration file.`,
          subSystemId: subSystem.id
        });
        return;
      }

      const message: constants.IRosBridgeTopicWorkerMessageStop = {
        type: constants.EnumRosBridgeTopicWorkerMessage.STOP,
        topidIdList: subSystem.topics.map((topic) => topic.id)
      };
      this.statusInterfaceRosBridgeSvc.sendAllTopicWorker(message);

      replyOnChannel({
        status: 'success',
        data: SUB_SYSTEM.STOP_SUBSYSTEM_SUCCESS
      });
    } catch {
      this.handleErrorAndReply(replyOnChannel, {
        message: SUB_SYSTEM.RUN_SUBSYSTEM_FAIL,
        subSystemId: subSystem.id
      });
    } finally {
      // Get state again in callback just to be sure;
      const currentStartedMap = new Map(this.sharedStore.getState().startedSubSystemsMap);
      currentStartedMap.delete(subSystem.name);
      this.sharedStore.setState((state) => {
        // eslint-disable-next-line no-param-reassign
        state.startedSubSystemsMap = currentStartedMap;
        if (flagIsProcessing) {
          this.subSystemIsProcessing.delete(subSystem.name);
        }
        if (resetTriesCounter) {
          this.subSystemDiagnosticTries.delete(subSystem.name);
        }
      });
    }
  }

  // eslint-disable-next-line max-lines-per-function
  @logMethod('[SubSystemService][stopSubSystem]', log.debug)
  async stopSubSystem(
    subSystemName: string,
    replyOnChannel: (response: constants.IResponse) => void,
    ignoreNodes = false,
    resetTriesCounter = true,
    flagIsProcessing = true
  ) {
    const { subSystemsMap } = this.sharedStore.getState();
    const subSystem = subSystemsMap.get(subSystemName);
    if (!subSystem) {
      this.handleErrorAndReply(replyOnChannel, { message: SUB_SYSTEM.SUBSYSTEM_NO_EXIST });
      return;
    }
    this.diagnosedSubSystems.remove(subSystem.name);
    await this.stopSubSystemInt(
      subSystem,
      replyOnChannel,
      ignoreNodes,
      resetTriesCounter,
      flagIsProcessing
    );
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

  // eslint-disable-next-line max-len
  // async mapSubSystem(interfaceData: constants.InterfaceStatusDto): Promise<constants.SubSystemDto[]> {
  //   try {
  //     const subSystems = this.getSubSystem();
  //     const topicMap = new Map(
  //       [...interfaceData.sensors, ...interfaceData.algorithms].map((topic) => [topic.id, topic])
  //     );
  //     const commandMap = new Map(
  //       interfaceData.statusCommands.map((command) => [command.id, command])
  //     );

  // eslint-disable-next-line max-len
  //     const subDtoPromises: Promise<constants.SubSystemDto>[] = subSystems.map(async (subSystem) => {
  //       const topics: constants.TopicType[] = subSystem.topics.map(
  //         (topicSub) =>
  //           topicMap.get(topicSub.id) || {
  //             ...topicSub,
  //             msgCount: 0,
  //             healthCheckRate: 0,
  //             status: constants.RosTopicStatusType.BAD,
  //             uuid: ''
  //           }
  //       );
  //       const commands: constants.CommandsStatus[] = subSystem.commands.map(
  //         (commandSub) =>
  //           commandMap.get(commandSub.id) || {
  //             ...commandSub,
  //             status: constants.CommandsStatusType.STOPPED
  //           }
  //       );
  //       const status =
  //         this.checkSubSystemStatus(subSystem.name) === constants.SubSystemStatusType.RUNNING
  //           ? constants.SubSystemStatusType.RUNNING
  //           : constants.SubSystemStatusType.STOPPED;
  //       const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
  //       const { startedSubSystemsMap } = this.sharedStore.getState();
  //       if (
  //         status === constants.SubSystemStatusType.RUNNING ||
  //         (status === constants.SubSystemStatusType.STOPPED &&
  //           startedSubSystemsMap.get(subSystem.name))
  //       ) {
  //         errorResponses.push(...this.processStartedSubSystemTopic(subSystem));
  //       }
  //       const isProcessing = await this.subSystemIsProcessing.has(subSystem.name);
  //       return {
  //         ...subSystem,
  //         status,
  //         topics,
  //         commands,
  //         isProcessing,
  //         isDiagnostic: this.subSystemIsDiagnostic.has(subSystem.name),
  //         diagTries: this.subSystemDiagnosticTries.get(subSystem.name) || 0,
  //         error: errorResponses
  //       };
  //     });

  //     const subDto = await Promise.all(subDtoPromises);
  //     return subDto;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

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
        isProcessing: this.subSystemIsProcessing.has(subSystem.name),
        isDiagnostic: this.subSystemIsDiagnostic.has(subSystem.name),
        diagResponse: this.subSystemDiagnosticResponse.get(subSystem.name) || '',
        diagTries: this.subSystemDiagnosticTries.get(subSystem.name) || 0,
        error: errorResponses
      };
    });
    return subDto;
  }

  @logMethod('[SubSystemService][processStartedSubSystemTopic]', log.debug)
  private processStartedSubSystemTopic(
    subSystem: constants.SubSystem
  ): (constants.IResponse & constants.ISubSystemExtraInfo)[] {
    return this.returnDeadSubSystemTopics(subSystem).map((topic) => {
      let message = `Topic "${topic.topicName}" of health check "${topic.name}" does not exist`;
      if (this.runningTopicSet.has(topic.topicName)) {
        // eslint-disable-next-line max-len
        message = `The message rate of "${topic.topicName}" within "${topic.name}" is below the error rate threshold.`;
      }
      log.debug(
        // eslint-disable-next-line max-len
        `[SubSystemService][processStartedSubSystemTopic] Sub system "${subSystem.name}" : ${message}`
      );

      return {
        status: 'error',
        message,
        subSystemId: subSystem.id
      };
    });
  }

  // @logMethod('[SubSystemService][processStartedSubSystemTopic]', log.debug)
  // private processStartedSubSystemTopic(subSystem: constants.SubSystem) {
  //   const errorResponses: (constants.IResponse & constants.ISubSystemExtraInfo)[] = [];
  //   const deadTopicArr: constants.TopicSubSystem[] = this.returnDeadSubSystemTopics(subSystem);
  //   if (deadTopicArr.length) {
  //     deadTopicArr.forEach((topic) => {
  //       if (this.runningTopicSet.has(topic.topicName)) {
  //         log.debug(
  // eslint-disable-next-line max-len
  //           `[SubSystemService][processStartedSubSystemTopic] Sub system "${subSystem.name}" : The message rate of "${topic.topicName}" within  "${topic.name}" is below the error rate threshold.`
  //         );
  //         errorResponses.push({
  //           status: 'error',
  // eslint-disable-next-line max-len
  //           message: `The message rate of "${topic.topicName}" within  "${topic.name}" is below the error rate threshold.`,
  //           subSystemId: subSystem.id
  //         });
  //       } else {
  //         log.debug(
  // eslint-disable-next-line max-len
  //           `[SubSystemService][processStartedSubSystemTopic] Sub system "${subSystem.name}" : Topic "${topic.topicName}" of health check "${topic.name}" not exist`
  //         );
  //         errorResponses.push({
  //           status: 'error',
  //           message: `Topic "${topic.topicName}" of health check "${topic.name}" not exist`,
  //           subSystemId: subSystem.id
  //         });
  //       }
  //     });
  //   }
  //   return errorResponses;
  // }

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
    this.subSystemDiagnosticResponse.clear();
    this.subSystemDiagnosticTries.clear();
    this.subSystemIsProcessing.clear();
    this.subSystemIsDiagnostic.clear();
    this.subSystemDiagnosticTimeout.clear();
  }

  @logMethod('[SubSystemService][returnDeadSubSystemTopics]', log.debug)
  private returnDeadSubSystemTopics(subSystem: constants.SubSystem): constants.TopicSubSystem[] {
    const deadTopicArr: constants.TopicSubSystem[] = [];
    subSystem.topics.forEach((topic) => {
      const currentTopic = this.statusInterfaceRosBridgeSvc.getTopicById(topic.id);
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

  // eslint-disable-next-line require-await
  @logMethod('[SubSystemService][runDiagnostic]', log.debug)
  private async runDiagnostic(
    subSystem: constants.SubSystem
  ): Promise<constants.IResponse & constants.ISubSystemExtraInfo> {
    const diagnosticCommand = this.childProcessSvc.buildCommand(
      `rosrun nrc_av_ui ${subSystem.diagnostic}`,
      ''
    );
    log.info(`[SubSystemService][runDiagnostic] Running: ${diagnosticCommand}`);
    return new Promise<constants.IResponse & constants.ISubSystemExtraInfo>((resolve, reject) => {
      try {
        // eslint-disable-next-line no-console
        console.log(`${subSystem.name}: Trigger file ${subSystem.diagnostic}`);
        this.childProcessSvc.executeAndValid(
          diagnosticCommand,
          subSystem.timeout * 1000 || SUB_SYSTEM.DEFAULT_TIMEOUT,
          (response: constants.IResponse) => {
            // What ????
            setTimeout(() => null, DIAGNOSTIC.DIAGNOSTIC_BUFFER_END_TIME);
            if (response.status === 'error') {
              const errorResponse: constants.IResponse & constants.ISubSystemExtraInfo = {
                status: 'error',
                message: response.message,
                subSystemId: subSystem.id
              };
              reject(errorResponse);
            } else {
              const responseWithPID: constants.IResponse & constants.ISubSystemExtraInfo = {
                ...response,
                subSystemId: subSystem.id
              };
              resolve(responseWithPID);
            }
          },
          false,
          true
        );
      } catch (err) {
        const errorResponse: constants.IResponse & constants.ISubSystemExtraInfo = {
          status: 'error',
          message: ROS_COMMAND.RUN_COMMAND_FAIL,
          subSystemId: subSystem.id
        };
        log.error(`[SubSystemService][runDiagnostic] ${err}`);
        // eslint-disable-next-line no-console
        console.log(`${subSystem.name}: ${err}`);
        // this.subSystemIsDiagnostic.delete(subSystem.name);
        reject(errorResponse);
      }
    });
  }
}
