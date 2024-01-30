/* eslint-disable max-len */
export enum ModeEditor {
  CREATE = 'CREATE',
  EDIT = 'EDIT'
}

export enum ErrMsgEditor {
  INTERFACE_NAME_ALREADY_EXIST = 'The interface name "{nameInterface}" already exists in the database.',
  DEPENDENCY_NOT_EXIST = 'Subsystem "{subSystemName}" depends on subsystem "{dependencyName}", which is not defined in this YAML file.',
  DEPENDENCY_CIRCULAR = 'Subsytems "{subSystemName}" and "{dependencyName}" form a circular dependency.'
}

export enum Yaml {
  YAML_EXCEPTION = 'YAMLException'
}
