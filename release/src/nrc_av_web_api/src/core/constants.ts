export const constant = Object.freeze({
  authHeader: 'authorization',
  authController: {
    loginCookieTime: 1000 * 60 * 60 * 24 * 30,
    registerCookieTime: 1000 * 60 * 60 * 24 * 30,
    googleUserCookieTime: 1000 * 60 * 60 * 24 * 30,
    facebookUserCookieTime: 1000 * 60 * 60 * 24 * 30,
    tokenName: 'access-token'
  },
  default: {
    orderBy: 'createAt',
    currentPage: 0,
    pageSize: 12,
    pageSizeMd: 24,
    pageSizeLg: 48,
    hashingSalt: 8
  },
  NS: {
    APP_INFO: 'app-info',
    APP_ERROR: 'app-error',
    APP_WARN: 'app-warn',
    HTTP: 'http-app',
    MAIL: 'http-mail'
  },
  INITIAL_PASSWORD: '123@Abcde'
});

export const message = Object.freeze({
  loginFail: 'Invalid email or password',
  notFound: 'Not found',
  forbidden: 'Forbidden',
  usernameExisted: 'Username already exists',
  emailExisted: 'Email already exists',
  phoneExisted: 'Phone already exists',
  invalidImage: 'Invalid image',
  s3Error: 'S3 error',
  invalidStatus: 'Invalid status',
  duplicatedField: 'Duplicated field',
  agentError: 'Agent error',
  vehicleNotFound: 'Vehicle not found',
  modelNotFound: 'Model not found',
  rosNodeNotFound: 'Ros node not found',
  agentIsOffline: 'Agent is offline',
  fileNameRequired: 'File name is required',
  machineNotFound: 'Machine not found',
  interfaceNotFound: 'Interface not found',
  interfaceExisted: 'Interface already exists',
  commandNotFound: 'Command not found',
  interfaceNoCommand: 'The interface does not have any commands',
  notHavePermission: 'You do not have permission',
  agentTimeout: 'Agent timeout',
  invalidSubSystem: 'Invalid sub system configuration',
  somethingWentWrong: 'Something went wrong',
  roleNotFound: 'Role not found',
  usernamePasswordIncorrect: 'Username or password is not correct',
  passwordIncorrect: 'The current password is not correct',
  requestChangePassword: 'Request change password on next login',
  userNotActive: 'User is not active',
  noRole: 'No role found',
  userNotFound: 'User not found',
  invalidToken: 'Invalid token'
});
