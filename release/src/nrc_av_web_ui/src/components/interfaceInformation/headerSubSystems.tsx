/* eslint-disable indent */
/* eslint-disable max-lines-per-function */
/* eslint-disable import/order */
import { Button, Typography } from 'antd';
import * as React from 'react';
import './styles.scss';
import { faCircleNotch, faStop, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useExecSubSystem, useTerminateSubSystem } from '../../hooks/queries/subSystems';
import { InterfaceMessage, Message, Subsystem } from '../../dtos/interface';
import { SubSystemStatus } from '../../constants/executionStatus';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const { Text } = Typography;

interface SubSystemsHeaderProps {
  subSystems: Subsystem;
  vehicleId: number;
  setErrorSub: any;
  setTopicErrorSub: any;
  setActiveKey: any;
  dataExecute: InterfaceMessage;
  toggleHealthCheck: (name: string) => void;
  healthCheckInfoState: Map<string, boolean>;
}

const SubSystemsHeader: React.FC<SubSystemsHeaderProps> = ({
  subSystems,
  toggleHealthCheck,
  healthCheckInfoState,
  vehicleId,
  dataExecute,
  setErrorSub,
  setTopicErrorSub,
  setActiveKey
}) => {
  const [execState, setExecState] = React.useState<boolean>(false);
  const [isLoadingExecAll, setIsLoadingExecAll] = React.useState<boolean>(false);
  const [checkError, setCheckError] = React.useState<boolean>(false);
  const {
    dataExecuteSubSystem,
    executeSubSystem,
    isExecutingSubSystem,
    resetMutateExecuteSubSystem
  } = useExecSubSystem();
  const { dataStopSubSystem, stopSubSystem, isStopSubSystem, resetMutateStopSubSystem } =
    useTerminateSubSystem();
  const isRunAllSubSystems = useSelector(
    (state: RootState) => state.interfaceExecutor.runAllSubSystems
  );
  const [lastSubSystemError, setLastSubSystemError] = React.useState<Message[]>([]);

  const isRunInterface = useSelector((state: RootState) => state.interfaceExecutor.runInterface);

  React.useEffect(() => {
    const dataExecuteSub = dataExecuteSubSystem as unknown as InterfaceMessage;
    const dataTerminationSub = dataStopSubSystem as unknown as Message;
    if (dataTerminationSub) {
      setActiveKey(subSystems.id);
      setErrorSub(dataTerminationSub?.message);
    }
    if (dataExecuteSub?.message) {
      setActiveKey(subSystems.id);
      setErrorSub(dataExecuteSub?.message);
    }
    if (dataExecute?.message) {
      for (const message of dataExecute.message) {
        if (message.subSystemId === subSystems.id) {
          setActiveKey(subSystems.id);
        }
      }
    }
    const isSubSystemRunning = subSystems.status === SubSystemStatus.RUNNING;
    setExecState(isSubSystemRunning);
    if (isRunAllSubSystems && !execState && isRunInterface) {
      setIsLoadingExecAll(true);
    } else {
      setIsLoadingExecAll(false);
    }
  }, [
    dataExecute.message,
    dataExecuteSubSystem,
    dataStopSubSystem,
    execState,
    isRunAllSubSystems,
    isRunInterface,
    setActiveKey,
    setErrorSub,
    subSystems.id,
    subSystems.status
  ]);

  React.useEffect(() => {
    if (!isExecutingSubSystem && !isStopSubSystem && !isLoadingExecAll) {
      if (subSystems.error) {
        const parsedStringCurrent = new Set(subSystems.error.map((error) => error.message));
        const parsedStringLast = new Set(lastSubSystemError.map((error) => error.message));
        if (
          parsedStringCurrent.size !==
            new Set([...parsedStringCurrent, ...parsedStringLast]).size ||
          parsedStringCurrent.size !== parsedStringLast.size
        ) {
          setLastSubSystemError(subSystems.error);
          setTopicErrorSub(subSystems.error);
          setCheckError(true);
          setActiveKey(subSystems.id);
        }
      }
      if (subSystems.error.length === 0 && lastSubSystemError.length !== 0) {
        setLastSubSystemError([]);
        setTopicErrorSub([]);
        setCheckError(false);
      }
    }
  }, [
    isExecutingSubSystem,
    isLoadingExecAll,
    isStopSubSystem,
    lastSubSystemError,
    setActiveKey,
    setTopicErrorSub,
    subSystems.error,
    subSystems.id
  ]);

  const handleButtonClick = React.useCallback(
    (name: string, event: React.MouseEvent, itemId?: number) => {
      event.stopPropagation();
      toggleHealthCheck(name);
      if (!vehicleId) {
        return;
      }
      if (itemId) {
        setActiveKey([itemId]);
      }
      if (!execState && name === 'exec') {
        resetMutateStopSubSystem();
        executeSubSystem({ vehicleId, subSystemName: subSystems.name });
        setCheckError(false);
        setErrorSub([]);
        setTopicErrorSub([]);
        setLastSubSystemError([]);
      } else if (execState && name === 'exec') {
        resetMutateExecuteSubSystem();
        stopSubSystem({ vehicleId, subSystemName: subSystems.name });
        setCheckError(false);
        setErrorSub([]);
        setTopicErrorSub([]);
        setLastSubSystemError([]);
      }
    },
    [
      execState,
      executeSubSystem,
      resetMutateExecuteSubSystem,
      resetMutateStopSubSystem,
      setActiveKey,
      setErrorSub,
      setTopicErrorSub,
      stopSubSystem,
      subSystems.name,
      toggleHealthCheck,
      vehicleId
    ]
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '2px 2px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
          background: '#d9d9d9',
          borderRadius: '10px',
          border: checkError ? '2px solid red' : ''
        }}
      >
        <div>
          <Button
            shape="circle"
            onClick={(event) => handleButtonClick('exec', event)}
            htmlType="submit"
            type="primary"
            style={{
              marginLeft: '5px',
              backgroundColor:
                isExecutingSubSystem || isStopSubSystem || isLoadingExecAll
                  ? 'grey'
                  : execState
                  ? 'red'
                  : 'green'
            }}
          >
            {isExecutingSubSystem || isStopSubSystem || isLoadingExecAll ? (
              <FontAwesomeIcon icon={faCircleNotch} spin />
            ) : (
              <FontAwesomeIcon icon={execState ? faStop : faPlay} style={{ color: '#ffffff' }} />
            )}
          </Button>
        </div>
        <Text strong style={{ marginLeft: '10px', paddingRight: '10px', fontSize: 15 }}>
          {subSystems.name}
        </Text>
      </div>

      <div style={{ paddingLeft: '10px' }}>
        {subSystems.topics.map((item) => (
          <Button
            key={item.name}
            className={`machine-state ${item.status.toLocaleLowerCase()}`}
            onClick={(event) => handleButtonClick(item.name, event, subSystems.id)}
            style={{
              margin: '0 3px',
              padding: '4px 8px',
              borderRadius: '5px',
              border: healthCheckInfoState.get(item.name)
                ? '2px solid #0096FF'
                : '1px solid #d9d9d9',
              fontWeight: 'normal'
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SubSystemsHeader;
