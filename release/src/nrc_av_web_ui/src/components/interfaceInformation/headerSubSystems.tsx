/* eslint-disable complexity */
/* eslint-disable indent */
/* eslint-disable max-lines-per-function */
/* eslint-disable import/order */
import { Badge, Button, Modal, Typography } from 'antd';
import * as React from 'react';
import './styles.scss';
import { faCircleNotch, faStop, faPlay, faD } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useExecSubSystem, useTerminateSubSystem } from '../../hooks/queries/subSystems';
import { InterfaceMessage, Message, Subsystem } from '../../dtos/interface';
import { SubSystemStatus } from '../../constants/executionStatus';
import { useSelector } from 'react-redux';
import { RootState, useStoreUser } from 'store';
import { adminEngineerCheck } from 'utilities/data';

const { Text } = Typography;

interface SubSystemsHeaderProps {
  subSystems: Subsystem;
  vehicleId: number;
  setErrorSub: any;
  setDiagResponse: any;
  setTopicErrorSub: any;
  dataExecute: InterfaceMessage;
  toggleHealthCheck: (name: string) => void;
  healthCheckInfoState: Map<string, boolean>;
}

const SubSystemsHeader: React.FC<SubSystemsHeaderProps> = ({
  subSystems,
  toggleHealthCheck,
  healthCheckInfoState,
  vehicleId,
  setErrorSub,
  setTopicErrorSub,
  setDiagResponse
}) => {
  const [execState, setExecState] = React.useState<boolean>(false);
  const [isLoadingExecAll, setIsLoadingExecAll] = React.useState<boolean>(false);
  const [checkError, setCheckError] = React.useState<boolean>(false);
  const [countdown, setCountdown] = React.useState(subSystems.timeout);
  const [activeDiag, setActiveDiag] = React.useState<boolean>(false);

  const { roles } = useStoreUser();
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

  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const [numberRetry, setNumberRetry] = React.useState(subSystems.diagTries);

  const isRunInterface = useSelector((state: RootState) => state.interfaceExecutor.runInterface);

  const shouldDisableButton = React.useMemo(() => adminEngineerCheck(roles), [roles]);

  React.useEffect(() => {
    if (subSystems.diagResponse.includes('[rosrun]')) {
      const formattedResponse = subSystems.diagResponse.split('[rosrun]').join('<br>[rosrun]');
      setDiagResponse(formattedResponse);
    } else {
      setDiagResponse('');
    }
    if (!subSystems.isDiagnostic) {
      setExecState(subSystems.status === SubSystemStatus.RUNNING);
    }

    if (isRunAllSubSystems && !execState && isRunInterface) {
      setIsLoadingExecAll(true);
    } else {
      setIsLoadingExecAll(false);
    }
  }, [execState, isRunAllSubSystems, isRunInterface, setDiagResponse, subSystems]);

  React.useEffect(() => {
    setActiveDiag(subSystems.isDiagnostic);

    let countdownInterval: number;
    setNumberRetry(subSystems.diagTries);
    if (activeDiag || subSystems.diagRetry === numberRetry) {
      countdownInterval = window.setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown === 0 && numberRetry !== subSystems.diagRetry) {
            setNumberRetry((prevNumberRetry) => prevNumberRetry + 1);
          } else if (countdown === 0 && numberRetry === subSystems.diagRetry) {
            return 0;
          } else {
            return prevCountdown - 1;
          }
          return countdown;
        });
      }, 1000);
    } else {
      // Reset countdown if activeDiag false
      setCountdown(subSystems.timeout);
    }

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [
    execState,
    countdown,
    numberRetry,
    subSystems.diagRetry,
    subSystems.timeout,
    activeDiag,
    subSystems.isDiagnostic,
    subSystems.diagTries
  ]);

  React.useEffect(() => {
    setCountdown(subSystems.timeout);
  }, [numberRetry, subSystems.timeout]);

  React.useEffect(() => {
    const dataExecuteSub = dataExecuteSubSystem as unknown as InterfaceMessage;
    const dataTerminationSub = dataStopSubSystem as unknown as Message;

    if (dataTerminationSub) {
      setErrorSub(dataTerminationSub?.message);
    }
    if (dataExecuteSub?.message) {
      setErrorSub(dataExecuteSub?.message);
    }
  }, [dataExecuteSubSystem, dataStopSubSystem, setErrorSub, subSystems.isProcessing]);

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
    setTopicErrorSub,
    subSystems.error,
    subSystems.id
  ]);

  const handleButtonClick = React.useCallback(
    (name: string, event: React.MouseEvent) => {
      event.stopPropagation();
      toggleHealthCheck(name);
      if (!vehicleId) {
        return;
      }
      if (!execState && name === 'exec') {
        resetMutateStopSubSystem();
        executeSubSystem({ vehicleId, subSystemName: subSystems.name });
        setCheckError(false);
        setErrorSub([]);
        setTopicErrorSub([]);
        setLastSubSystemError([]);
      } else if (execState && name === 'exec') {
        setIsModalOpen(true);
      }
    },
    [
      execState,
      executeSubSystem,
      resetMutateStopSubSystem,
      setErrorSub,
      setTopicErrorSub,
      subSystems.name,
      toggleHealthCheck,
      vehicleId
    ]
  );

  const handleOk = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsModalOpen(false);
    resetMutateExecuteSubSystem();
    stopSubSystem({ vehicleId, subSystemName: subSystems.name });
    setCheckError(false);
    setErrorSub([]);
    setTopicErrorSub([]);
    setLastSubSystemError([]);
  };

  const handleCancel = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsModalOpen(false);
  };

  const calculateBackgroundColor = () => {
    if (isExecutingSubSystem || isStopSubSystem || subSystems.isProcessing || isLoadingExecAll) {
      return !activeDiag ? 'grey' : activeDiag && numberRetry !== 0 ? '#ffc01a' : 'green';
    } else {
      return activeDiag && numberRetry !== 0 ? '#ffc01a' : execState ? 'red' : 'green';
    }
  };

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
            disabled={
              isExecutingSubSystem ||
              isStopSubSystem ||
              isLoadingExecAll ||
              subSystems.isProcessing ||
              (subSystems.diagRetry === numberRetry && countdown !== 0 && numberRetry !== 0) ||
              shouldDisableButton ||
              subSystems.isDiagnostic
            }
            style={{
              marginLeft: '5px',
              backgroundColor: calculateBackgroundColor()
            }}
          >
            {(isExecutingSubSystem ||
              isStopSubSystem ||
              subSystems.isProcessing ||
              isLoadingExecAll) &&
            !activeDiag ? (
              <FontAwesomeIcon icon={faCircleNotch} spin />
            ) : !activeDiag ? (
              <FontAwesomeIcon icon={execState ? faStop : faPlay} style={{ color: '#ffffff' }} />
            ) : (
              <FontAwesomeIcon icon={faD} fontSize={15} style={{ color: 'red' }} />
            )}
          </Button>
          <Modal
            width={400}
            onOk={handleOk}
            onCancel={handleCancel}
            title="Confirm"
            open={isModalOpen}
          >
            Are you sure you want to stop the <Text strong>{subSystems.name}</Text> subsytem?
          </Modal>
        </div>
        <Text strong style={{ marginLeft: '10px', paddingRight: '10px', fontSize: 15 }}>
          {subSystems.name}
        </Text>
      </div>

      {(activeDiag && lastSubSystemError) ||
      (subSystems.diagTries === subSystems.diagRetry && subSystems.diagRetry !== 0) ? (
        <Badge
          count={numberRetry}
          offset={[-7, 0]}
          style={{
            backgroundColor: 'red',
            borderRadius: '10px',
            border: '2px solid rgb(221, 221, 221)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              margin: '0 10px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              padding: '5px 15px',
              backgroundColor: '#ffc01a',
              borderRadius: '10px',
              border: '2px solid red'
            }}
          >
            <Text style={{ display: 'flex', alignItems: 'center', color: '#ff2804' }}>
              {numberRetry !== 0
                ? `${Math.floor(countdown / 60)}:${
                    countdown % 60 < 10 ? `0${countdown % 60}` : countdown % 60
                  }`
                : '0:0'}
            </Text>
          </div>
        </Badge>
      ) : null}

      <div></div>

      <div style={{ paddingLeft: '10px' }}>
        {subSystems.topics.map((item) => (
          <Button
            key={item.name}
            className={
              subSystems.status !== SubSystemStatus.STOPPED
                ? `machine-state ${item.status.toLocaleLowerCase()}`
                : `machine-state ${subSystems.status.toLocaleLowerCase()}`
            }
            onClick={(event) => handleButtonClick(item.name, event)}
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
