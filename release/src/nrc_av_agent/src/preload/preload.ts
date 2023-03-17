import { contextBridge, ipcRenderer } from 'electron';
import ipcMsg from '../shared/ipcMsg';

contextBridge.exposeInMainWorld('ipcChannel', {
  // From render to main.
  send: (channel: string, ...args: unknown[]) => {
    const validChannels = Object.values(ipcMsg.R2M);
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  // From main to render.
  receive: (channel: string, callback: (...args0: any) => void) => {
    const validChannels = Object.values(ipcMsg.M2R);
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  // From render to main and back again.
  sendAndReceive: (channel: string, ...args: any[]): Promise<any> | undefined => {
    const validChannels = Object.values(ipcMsg.RMR);
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    }
    return undefined;
  }
});

contextBridge.exposeInMainWorld('ipcStorage', {
  set(key: string, val: unknown): void {
    const validKeys = Object.values(ipcMsg.storageKeys);
    if (validKeys.includes(key)) {
      ipcRenderer.send(ipcMsg.R2M.SET_STORAGE, key, val);
    }
  },
  get(key: string): unknown {
    const validKeys = Object.values(ipcMsg.storageKeys);
    if (validKeys.includes(key)) {
      return ipcRenderer.sendSync(ipcMsg.R2M.GET_STORAGE, key);
    }
    return undefined;
  }
});
