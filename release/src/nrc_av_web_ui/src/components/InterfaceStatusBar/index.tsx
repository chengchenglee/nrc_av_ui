import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, ButtonProps } from 'antd';
import { FC, ReactNode } from 'react';
import { ExecutionStatus } from '../../constants/executionStatus';
import { convertExecutionStatus } from '../../utilities/converter';
import StatusButton from '../statusButton';

interface InterfaceStatusBarProps {
  status?: ExecutionStatus;
  body: ReactNode;
  runningButtonProps: ButtonProps;
  stopButtonProps: ButtonProps;
}

const InterfaceStatusBar: FC<InterfaceStatusBarProps> = ({
  status,
  body,
  runningButtonProps,
  stopButtonProps
}) => (
  <div style={{ display: 'flex', alignItems: 'center', lineHeight: '0.5' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        lineHeight: '0.5',
        flex: 1,
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '3px'
      }}
    >
      <div>
        <StatusButton status={convertExecutionStatus(status)} />
      </div>
      <div style={{ marginLeft: '10px', flex: 1 }}>{body}</div>
    </div>
    {status === ExecutionStatus.RUNNING ? (
      <Button
        danger
        type="primary"
        shape="circle"
        style={{ marginLeft: '10px', marginRight: '22px' }}
        {...runningButtonProps}
      >
        {(!runningButtonProps.loading ?? true) && (
          <FontAwesomeIcon icon={faStop} style={{ color: '#ffffff' }} />
        )}
      </Button>
    ) : (
      <Button
        type="primary"
        shape="circle"
        style={{
          marginLeft: '10px',
          marginRight: '22px',
          backgroundColor: '#00c853'
        }}
        {...stopButtonProps}
      >
        {(!stopButtonProps.loading ?? true) && (
          <FontAwesomeIcon icon={faPlay} style={{ color: '#ffffff' }} />
        )}
      </Button>
    )}
  </div>
);

export default InterfaceStatusBar;
