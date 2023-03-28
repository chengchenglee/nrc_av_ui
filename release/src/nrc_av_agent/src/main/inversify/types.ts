const TYPES = {
  FileSystem: Symbol.for('IFileSystem'),
  Path: Symbol.for('IPath'),
  ChildProcess: Symbol.for('IChildProcess'),
  ElectronWrapper: Symbol.for('IElectronWrapper'),
  ElectronStore: Symbol.for('IElectronStore'),
  AutoUpdater: Symbol.for('IAutoUpdater'),
  Communication: Symbol.for('ICommunication'),
  Configuration: Symbol.for('IConfiguration'),
  WebStorage: Symbol.for('IWebStorage'),
  Logic: Symbol.for('ILogic')
};

export default TYPES;
