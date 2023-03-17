declare global {
  interface Window {
    ipcChannel: {
      /* ELECTRON IPC TYPES */
      send(channel: string, ...args: any[]): void;
      receive(channel: string, callback: (...args: any[]) => void): void;
      sendAndReceive: (channel: string, ...args: any[]) => Promise<any> | undefined;
    };
    ipcStorage: {
      /* ELECTRON IPC TYPES */
      set: (key: string, val: unknown) => void;
      get: (key: string) => unknown;
    };
  }
}

export {};
