import { publicClient } from '../config/axios/publicClient';
import { BASE_URL } from '../constants/config';
import { ApiResponse } from '../interfaces/api';
import { Sequence } from '../interfaces/models/sequence';

const url = BASE_URL + '/sequence';

export const getSequences = (): ApiResponse<Sequence[]> => publicClient.get(url);
