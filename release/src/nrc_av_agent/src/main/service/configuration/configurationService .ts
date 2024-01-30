import { inject, injectable } from 'inversify';
import { APP_CONFIG_FOLDER_NAME } from 'src/main/constants';
import { ConfigType } from '../../../shared/configurationTypes';
import TYPES from '../../inversify/types';
import type {
  IConfiguration,
  IElectronWrapper,
  IFileSystem,
  IPath
} from '../../inversify/interfaces';

@injectable()
export default class ConfigurationService implements IConfiguration {
  private configs: Map<string, ConfigType>;

  private configFolderPath!: string;

  private printenvFolderPath!: string;

  constructor(
    @inject(TYPES.ElectronWrapper) private electronService: IElectronWrapper,
    @inject(TYPES.FileSystem) private fsService: IFileSystem,
    @inject(TYPES.Path) private pathService: IPath
  ) {
    this.configs = new Map<string, ConfigType>();
    this.initConfigs();
  }

  initConfigs(): void {
    if (
      process.env.NODE_ENV === 'production' &&
      this.electronService.getApp().isPackaged === true
    ) {
      this.configFolderPath = this.pathService.resolve(
        this.electronService.getPath('userData'),
        APP_CONFIG_FOLDER_NAME
      );
    } else {
      this.configFolderPath = this.pathService.resolve(
        __dirname,
        `../../../${APP_CONFIG_FOLDER_NAME}`
      );
    }

    this.checkAndCreateConfigPath();
  }

  initConfigsFileLogProcess(): void {
    if (
      process.env.NODE_ENV === 'production' &&
      this.electronService.getApp().isPackaged === true
    ) {
      this.printenvFolderPath = this.pathService.resolve(
        this.electronService.getPath('userData'),
        APP_CONFIG_FOLDER_NAME
      );
    } else {
      this.printenvFolderPath = this.pathService.resolve(
        __dirname,
        `../../../${APP_CONFIG_FOLDER_NAME}`
      );
    }

    this.checkAndCreateEnvLogPath();
  }

  pathPrintEnvFolder(): string {
    return this.configFolderPath;
  }

  loadConfigs(configName: string): boolean {
    const filePath = this.pathService.join(this.configFolderPath, `${configName}.json`);
    const isExist = this.fsService.existsSync(filePath);
    if (!isExist) {
      return false;
    }
    const configuration = this.fsService.readFileSync(filePath, undefined);
    this.configs.set(configName, JSON.parse(configuration.toString()));
    return true;
  }

  private isPrintEnvFolderExist(): boolean {
    return this.fsService.existsSync(this.configFolderPath);
  }

  private checkAndCreateEnvLogPath(): void {
    if (this.isPrintEnvFolderExist()) {
      return;
    }
    this.fsService.mkdirSync(this.configFolderPath);
  }

  createConfig<T extends ConfigType>(configName: string, value: T): void {
    this.configs.set(configName, value);
    const filePath = this.pathService.join(this.configFolderPath, `${configName}.json`);
    this.fsService.writeFile(filePath, JSON.stringify(value, null, 2), null, () => undefined);
  }

  getConfigs<T extends ConfigType>(configName: string): T | undefined {
    return this.configs.get(configName) as T;
  }

  getConfig<T extends ConfigType, K extends keyof T>(
    configName: string,
    propName: K
  ): T[K] | undefined {
    return this.getConfigs<T>(configName)?.[propName];
  }

  private isConfigFolderExist(): boolean {
    return this.fsService.existsSync(this.configFolderPath);
  }

  private checkAndCreateConfigPath(): void {
    if (this.isConfigFolderExist()) {
      return;
    }
    this.fsService.mkdirSync(this.configFolderPath);
  }
}
