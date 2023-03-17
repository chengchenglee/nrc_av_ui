import {
  AccountSASPermissions,
  AccountSASResourceTypes,
  AccountSASServices,
  SASProtocol,
  StorageSharedKeyCredential,
  generateAccountSASQueryParameters
} from '@azure/storage-file-share';
import { injectable } from 'inversify';
import { IWebStorage } from '../../inversify/interfaces';

@injectable()
export default class AzureService implements IWebStorage {
  private serviceCredential: StorageSharedKeyCredential | undefined;

  private azureAccountName: string | undefined;

  private azureAccountKey: string | undefined;

  private azureReleaseFile = 'ncr-av-agent-release';

  constructor() {
    this.azureAccountName = import.meta.env.VITE_AZURE_ACCOUNT_NAME;
    this.azureAccountKey = import.meta.env.VITE_AZURE_ACCOUNT_KEY;
    if (this.azureAccountName && this.azureAccountKey) {
      this.serviceCredential = new StorageSharedKeyCredential(
        this.azureAccountName,
        this.azureAccountKey
      );
    }
  }

  private createAccountSas(): string | undefined {
    if (!this.serviceCredential) {
      return undefined;
    }
    const sasOptions = {
      services: AccountSASServices.parse('btqf').toString(), // blobs, tables, queues, files
      resourceTypes: AccountSASResourceTypes.parse('sco').toString(), // service, container, object
      permissions: AccountSASPermissions.parse('rwdlacup'), // permissions
      protocol: SASProtocol.Https,
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 10 * 60 * 1000) // 10 minutes
    };

    const sasToken = generateAccountSASQueryParameters(
      sasOptions,
      this.serviceCredential
    ).toString();

    // prepend sasToken with `?`
    return sasToken[0] === '?' ? sasToken : `?${sasToken}`;
  }

  getFeedUrl(): string {
    const sasToken = this.createAccountSas();
    if (!sasToken || !this.azureAccountName || !this.azureReleaseFile) {
      return '';
    }
    // eslint-disable-next-line max-len
    return `https://${this.azureAccountName}.file.core.windows.net/${this.azureReleaseFile}/${sasToken}`;
  }
}
