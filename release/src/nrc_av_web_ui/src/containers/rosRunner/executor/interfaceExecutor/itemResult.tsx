/* eslint-disable max-lines-per-function */
import { Button, List } from 'antd';
import Title from 'antd/es/typography/Title';
import * as React from 'react';
import InterfaceCommandBar from '../../../../components/InterfaceCommandBar';
import InterfaceInformation from '../../../../components/interfaceInformation';
import { CommandsStatus } from '../../../../constants/executionStatus';
import { useGetInterfaceById } from '../../../../hooks/queries/interface';
import { useRunAllCommands } from '../../../../hooks/queries/vehicle';
import { InterfaceExecutorContext } from '.';

interface IProps {
  vehicleId?: number;
  mapName: string;
}

const ItemResult: React.FC<IProps> = (props) => {
  const { vehicleId } = props;

  const {
    dataRunAllCommands,
    runAllCommands: runAllCommands,
    isExecutingCommand: isStartingAllCommands
  } = useRunAllCommands();
  const context = React.useContext(InterfaceExecutorContext);
  const { data: interfaceData } = useGetInterfaceById(context?.interfaceNameId);
  const [runAllCommandsData, setRunAllCommandsData] = React.useState<any>();

  React.useEffect(() => {
    setRunAllCommandsData(dataRunAllCommands);
  }, [dataRunAllCommands, runAllCommands, runAllCommandsData]);

  const onRunAllCommandsButtonClick = React.useCallback(() => {
    if (!vehicleId) {
      return;
    }
    if (context?.interfaceNameId) {
      runAllCommands({
        vehicleId,
        interfaceId: context.interfaceNameId
      });
    }
  }, [vehicleId, runAllCommands, context]);

  return (
    <div
      style={{
        position: 'relative',
        padding: '20px 10px',
        border: '2px solid rgb(221, 221, 221)'
      }}
    >
      <Title
        level={4}
        style={{
          marginTop: 0,
          position: 'absolute',
          top: '-15px',
          left: '20px',
          backgroundColor: 'rgb(245, 245, 245)',
          padding: '0 5px'
        }}
      >
        Details
      </Title>
      {/* <List.Item.Meta
        title={
          <InterfaceStatusBar
            body={context?.interfaceName}
            status={context?.status}
            runningButtonProps={{
              loading: isStopping,
              onClick: handleStopInterface
            }}
            stopButtonProps={{
              loading: isStarting,
              onClick: handleStartInterface
            }}
          />
        }
      /> */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5em'
        }}
      >
        <Title
          style={{
            marginTop: '0'
          }}
          level={5}
        >
          Commands
        </Title>
        <Button
          loading={isStartingAllCommands}
          type="primary"
          onClick={onRunAllCommandsButtonClick}
        >
          Run all
        </Button>
      </div>
      <List
        dataSource={interfaceData?.commands}
        renderItem={(item) => (
          <List.Item.Meta
            title={
              <InterfaceCommandBar
                body={item.name}
                commandId={item.id}
                vehicleId={vehicleId}
                interfaceId={context?.interfaceNameId}
                message={runAllCommandsData?.message || ''}
                isStartingAllCommands={isStartingAllCommands}
                commandRunning={
                  !!context?.interfaceCommands?.some(
                    (cmd) => cmd.id === item.id && cmd.status === CommandsStatus.RUNNING
                  )
                }
              />
            }
          />
        )}
      />

      <Title level={5} style={{ marginTop: 0 }}>
        Interface information
      </Title>
      <InterfaceInformation />
    </div>
  );
};

export default ItemResult;
