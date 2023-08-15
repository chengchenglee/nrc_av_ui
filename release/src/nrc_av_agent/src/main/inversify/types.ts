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
  Log: Symbol.for('ILog'),
  BrowserWindowService: Symbol.for('IBrowserWindowService'),
  StatusInterfaceRosBridgeService: Symbol.for('IStatusInterfaceRosBridgeService'),
  InterfaceFileService: Symbol.for('IInterfaceFileService'),
  RosService: Symbol.for('IRosService'),
  RosBridgeServerService: Symbol.for('IRosBridgeServerService'),
  RosBridgeConnectionService: Symbol.for('IRosBridgeConnectionService'),
  StatusCommandsService: Symbol.for('IStatusCommands')
};

export default TYPES;
