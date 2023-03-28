import { inject, injectable } from 'inversify';
import { APP_CONFIG_FOLDER_NAME } from 'src/main/constants';
import TYPES from '../../inversify/types';
import { ConfigProps } from './types';
import type {
  IConfiguration,
  IElectronWrapper,
  IFileSystem,
  IPath
} from '../../inversify/interfaces';

@injectable()
export default class ConfigurationService implements IConfiguration {
  private configs: Map<string, ConfigProps>;

  private configFolderPath!: string;

  constructor(
    @inject(TYPES.ElectronWrapper) private electronService: IElectronWrapper,
    @inject(TYPES.FileSystem) private fsService: IFileSystem,
    @inject(TYPES.Path) private pathService: IPath
  ) {
    this.configs = new Map<string, ConfigProps>();
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

  getConfigs(configName: string): ConfigProps | undefined {
    return this.configs.get(configName);
  }

  getConfig(configName: string, propName: keyof ConfigProps): string | undefined {
    return this.getConfigs(configName)?.[propName];
  }

  updateConfig(configName: string, newConfigs: ConfigProps): void {
    this.configs.set(configName, newConfigs);
    const filePath = this.pathService.join(this.configFolderPath, `${configName}.json`);
    this.fsService.writeFile(filePath, JSON.stringify(newConfigs, null, 2), null, () => {});
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
