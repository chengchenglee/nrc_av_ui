import { useQuery } from '@tanstack/react-query';
import { getSequences } from '../../api/sequence';
import { SEQUENCES } from '../../constants/query';

export const useGetSequences = () =>
  useQuery([SEQUENCES], getSequences, { select: (res) => res.data });
