const ipcMsg = {
  R2M: {
    REGISTER_INFO: 'REGISTER_INFO',
    GET_STORAGE: 'GET_STORAGE',
    SET_STORAGE: 'SET_STORAGE'
  },
  M2R: {
    REGISTER_INFO_REPLY: 'REGISTER_INFO_REPLY'
  },
  RMR: {
    VEHICLE_INFO: 'VEHICLE_INFO'
  },
  storageKeys: {
    EXAMPLE_KEY: 'EXAMPLE_KEY'
  }
};

export default ipcMsg;
