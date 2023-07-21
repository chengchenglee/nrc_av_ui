import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'antd';
import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import { useExecuteCommand, useStopCommand } from '../../hooks/queries/vehicle';

interface InterfaceCommonBarProps {
  body: ReactNode;
  vehicleId?: number;
  interfaceId?: number;
  commandId?: number;
  message: any[];
}

// eslint-disable-next-line max-lines-per-function
const InterfaceCommandBar: FC<InterfaceCommonBarProps> = ({
  body,
  interfaceId,
  vehicleId,
  commandId,
  message
}) => {
  // eslint-disable-next-line prefer-const
  let { data, executeCommand, isExecutingCommand } = useExecuteCommand();
  const { mutate: stopCommand, isLoading: isStoppingCommand } = useStopCommand();
  const [errorText, setErrorText] = useState<any>('');
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  const handleExecuteCommand = useCallback(() => {
    setErrorText('');
    if (!commandId || !vehicleId || !interfaceId) {
      console.error('Missing commandId, vehicleId or interfaceId ');
      return;
    }
    executeCommand({ commandId, vehicleId, interfaceId });
  }, [commandId, executeCommand, interfaceId, vehicleId]);

  useEffect(() => {
    setErrorText('');
    let filteredData = [];
    if (Array.isArray(message)) {
      filteredData = message.filter((item) => item.idCommand === commandId);
    }
    if (data !== '' && filteredData.length === 0) {
      setErrorText(data);
    } else {
      setErrorText('');
    }
    if (filteredData.length > 0) {
      setErrorText(filteredData[0].error);
    }
  }, [commandId, data, message]);

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
            type="primary"
            shape="circle"
            style={{ marginLeft: '10px', backgroundColor: '#00c853' }}
            loading={isExecutingCommand}
            onClick={handleExecuteCommand}
          >
            {!isExecutingCommand && <FontAwesomeIcon icon={faPlay} style={{ color: '#ffffff' }} />}
          </Button>
          <Button
            danger
            type="primary"
            shape="circle"
            style={{ marginLeft: '10px' }}
            loading={isStoppingCommand}
            onClick={handleStopCommand}
          >
            {!isStoppingCommand && <FontAwesomeIcon icon={faStop} style={{ color: '#ffffff' }} />}
          </Button>
        </div>
      </div>
      {errorText !== '' && data ? (
        <div style={{ color: 'red', marginTop: '10px' }}>{getTruncatedText(errorText)}</div>
      ) : (
        <div style={{ color: 'red', marginTop: '10px' }}>{getTruncatedText(errorText || data)}</div>
      )}
    </>
  );
};

export default InterfaceCommandBar;
