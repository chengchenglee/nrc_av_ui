import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { executeSybSystems, terminateSybSystems } from '../../api/subSystems';

export const useExecSubSystem = () => {
  const mutation = useMutation(executeSybSystems, {
    onError: (err: AxiosError<{ message: string }>) => err
  });

  let statusRunSubSystem = '';

  const getDataExecuted = () => {
    if (mutation.isSuccess) {
      statusRunSubSystem = mutation.data?.data.status;
      return '';
    } else if (mutation.isError) {
      return mutation.error?.response?.data ?? '';
    } else {
      return mutation.data ?? '';
    }
  };
  return {
    dataExecuteSubSystem: getDataExecuted(),
    statusRunSubSystem,
    executeSubSystem: mutation.mutate,
    isExecutingSubSystem: mutation.isLoading,
    resetMutateExecuteSubSystem: mutation.reset
  };
};

export const useTerminateSubSystem = () => {
  const mutation = useMutation(terminateSybSystems, {
    onError: (err: AxiosError<{ message: string }>) => err
  });

  const getDataExecuted = () => {
    if (mutation.isSuccess) {
      return '';
    } else if (mutation.isError) {
      return mutation.error?.response?.data ?? '';
    } else {
      return mutation.data ?? '';
    }
  };
  return {
    dataStopSubSystem: getDataExecuted(),
    stopSubSystem: mutation.mutate,
    isStopSubSystem: mutation.isLoading,
    resetMutateStopSubSystem: mutation.reset
  };
};
