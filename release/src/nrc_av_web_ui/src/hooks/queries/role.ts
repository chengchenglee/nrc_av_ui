import { useQuery } from '@tanstack/react-query';
import { getListRole } from '../../api/role';
export const useGetRoleList = () =>
  useQuery([], getListRole, {
    select: (res) => res.data
  });
