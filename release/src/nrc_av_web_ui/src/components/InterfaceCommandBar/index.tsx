/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable consistent-return */
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */
/* eslint-disable max-lines-per-function */
import { faCircleNotch, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'antd';
import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useExecuteCommand, useStopCommand } from '../../hooks/queries/vehicle';
import { setIsStartingCommands, setIsStartingAllCommands } from '../../store/command';
interface InterfaceCommonBarProps {
  body: ReactNode;
  vehicleId?: number;
  interfaceId?: number;
  commandId?: number;
  message: any[];
  isStartingAllCommands: boolean;
  commandRunning?: boolean;
  interfaceProcessing?: boolean;
  dataExecuteInterface?: any;
}

// eslint-disable-next-line complexity
const InterfaceCommandBar: FC<InterfaceCommonBarProps> = ({
  body,
  interfaceId,
  vehicleId,
  commandId,
  message,
  isStartingAllCommands,
  commandRunning,
  interfaceProcessing,
  dataExecuteInterface
}) => {
  let { dataExecute, executeCommand, isExecutingCommand } = useExecuteCommand();
  const { mutate: stopCommand, isLoading: isStoppingCommand } = useStopCommand();
  const [errorText, setErrorText] = useState<any>('');
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventClicked, setEventClicked] = useState(Boolean);

  const dispatch = useDispatch();

  const handleExecuteCommand = useCallback(() => {
    if (!commandId || !vehicleId || !interfaceId) {
      console.error('Missing commandId, vehicleId or interfaceId ');
      return;
    }
    executeCommand({ commandId, vehicleId, interfaceId });
  }, [commandId, executeCommand, interfaceId, vehicleId]);

  useEffect(() => {
    dispatch(setIsStartingCommands(isProcessing));
    dispatch(setIsStartingAllCommands(isProcessing));
    if ((isStartingAllCommands && !commandRunning) || interfaceProcessing) {
      setIsProcessing(true);
      setEventClicked(true);
    }

    if ((eventClicked && commandRunning) || errorText) {
      setIsProcessing(false);
    }
    if ((!eventClicked && !commandRunning) || errorText) {
      setIsProcessing(false);
    }

    if (isProcessing) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [
    commandRunning,
    dispatch,
    errorText,
    eventClicked,
    isExecutingCommand,
    isProcessing,
    isStartingAllCommands,
    interfaceProcessing
  ]);

  useEffect(() => {
    setErrorText('');
    let filteredData = [];
    if (Array.isArray(message)) {
      filteredData = message.filter((item) => item.idCommand === commandId);
    }
    if (filteredData.length > 0) {
      setErrorText(filteredData[0].error);
    }
  }, [commandId, commandRunning, dataExecute, isProcessing, message]);

  const handleStopCommand = useCallback(() => {
    if (!commandId || !vehicleId || !interfaceId) {
      console.error('Missing commandId, vehicleId or interfaceId ');
      return;
    }

    stopCommand({ commandId, vehicleId, interfaceId });
  }, [commandId, interfaceId, stopCommand, vehicleId]);

  const toggleBodyExpansion = () => {
    setIsBodyExpanded((prevExpanded) => !prevExpanded);
  };

  const handleClick = () => {
    setIsProcessing(true);

    if (!commandRunning) {
      if (!(isProcessing || isStartingAllCommands)) {
        handleExecuteCommand();
        setEventClicked(true);
      }
    } else {
      handleStopCommand();
      setEventClicked(false);
    }
  };

  const getTruncatedText = (text: string | undefined) => {
    const maxLength = 25;
    if (text) {
      const bodyText = text.toString();
      if (bodyText.length > maxLength) {
        if (isBodyExpanded) {
          return (
            <>
              {text}
              <Button type="link" onClick={toggleBodyExpansion}>
                Less
              </Button>
            </>
          );
        } else {
          return (
            <>
              {bodyText.substring(0, maxLength)}...
              <Button type="link" onClick={toggleBodyExpansion}>
                More
              </Button>
            </>
          );
        }
      }
      return text;
    }
    return null;
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          lineHeight: '0.5',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            lineHeight: '0.5',
            flex: 1,
            padding: '16px',
            borderRadius: '20px',
            border: errorText && message.length > 0 ? '1px solid red' : '',
            backgroundColor: 'white'
          }}
        >
          <div style={{ marginLeft: '10px', flex: 1 }}>{body}</div>
        </div>

        <div style={{ display: 'flex', gap: '0' }}>
          <Button
            shape="circle"
            htmlType="submit"
            style={{
              marginLeft: '10px',
              backgroundColor: isProcessing ? 'grey' : commandRunning ? 'red' : 'green'
            }}
            disabled={isExecutingCommand || isStoppingCommand || isStartingAllCommands}
            type="primary"
            onClick={handleClick}
          >
            {isProcessing ? (
              <FontAwesomeIcon icon={faCircleNotch} spin style={{ color: '#ffffff' }} />
            ) : (
              // eslint-disable-next-line max-len
              <FontAwesomeIcon
                icon={commandRunning ? faStop : faPlay}
                style={{ color: '#ffffff' }}
              />
            )}
          </Button>
        </div>
      </div>
      {errorText !== '' && dataExecute ? (
        <div style={{ color: '#cc0000', marginTop: '10px' }}>{getTruncatedText(errorText)}</div>
      ) : (
        <div style={{ color: '#cc0000', marginTop: '10px' }}>
          {!isProcessing
            ? getTruncatedText(
                errorText ||
                  dataExecute ||
                  (dataExecuteInterface?.commandId === commandId
                    ? dataExecuteInterface?.message
                    : '')
              )
            : ''}
        </div>
      )}
    </>
  );
};

export default InterfaceCommandBar;
