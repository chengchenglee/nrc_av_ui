const TYPES = {
  FileSystem: Symbol.for('IFileSystem'),
  Path: Symbol.for('IPath'),
  ChildProcess: Symbol.for('IChildProcess'),
  ElectronWrapper: Symbol.for('IElectronWrapper'),
  AutoUpdater: Symbol.for('IAutoUpdater'),
  Communication: Symbol.for('ICommunication'),
  Configuration: Symbol.for('IConfiguration'),
  WebStorage: Symbol.for('IWebStorage'),
  Logic: Symbol.for('ILogic'),
  StatusROSNode: Symbol.for('IStatusROSNode'),
  StatusInterfaceFile: Symbol.for('IStatusInterfaceFile'),
  Log: Symbol.for('ILog'),
  BrowserWindowService: Symbol.for('IBrowserWindowService'),
  StatusInterfaceService: Symbol.for('IStatusInterfaceService'),
  StatusInterfaceRosBridgeService: Symbol.for('IStatusInterfaceRosBridgeService'),
  InterfaceFileService: Symbol.for('IInterfaceFileService'),
  RosService: Symbol.for('IRosService')
};

export default TYPES;
