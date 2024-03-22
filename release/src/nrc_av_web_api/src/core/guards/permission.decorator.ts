import { SetMetadata } from '@nestjs/common';

export const PermissionRequired = (...permission: string[]) =>
  SetMetadata('permissions', permission);
