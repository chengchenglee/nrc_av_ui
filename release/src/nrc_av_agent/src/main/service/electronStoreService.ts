/* eslint-disable @typescript-eslint/no-explicit-any */
import Store from 'electron-store';
import { injectable } from 'inversify';
import { IElectronStore } from '../inversify/interfaces';

@injectable()
export default class ElectronStoreService implements IElectronStore {
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  get(key: string, defaultValue?: any): any {
    return this.store.get(key, defaultValue);
  }

  set(key: string, value?: any): void {
    this.store.set(key, value);
  }
}
