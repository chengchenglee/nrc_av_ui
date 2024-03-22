import { userRole } from 'constants/user';
import { Role } from 'dtos/role';

export const removeObjectKey = (data: any, keys: string[]) => {
  if (data instanceof Array) {
    data.forEach((item) => {
      removeObjectKey(item, keys);
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (keys.includes(key)) {
        delete data[key];
      } else {
        removeObjectKey(value, keys);
      }
    });

    return data;
  }

  return data;
};

export const replacePlaceholders = (
  template: string,
  replacements: Record<string, string>
): string => {
  for (const key in replacements) {
    // eslint-disable-next-line no-prototype-builtins
    if (replacements.hasOwnProperty(key)) {
      const placeholder = `{${key}}`;
      template = template.replace(placeholder, replacements[key]);
    }
  }
  return template;
};

export const roleCheck = (acceptedRoles: string[], data: Role[]): boolean =>
  data.filter((role) => acceptedRoles.includes(role.name)).length > 0;

export const adminEngineerCheck = (roles: Role[]) =>
  !roleCheck([userRole.admin, userRole.engineer], roles);
