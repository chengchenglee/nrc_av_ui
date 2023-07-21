/* eslint-disable max-lines-per-function */
import { Button, List } from 'antd';
import Title from 'antd/es/typography/Title';
import * as React from 'react';
import InterfaceCommandBar from '../../../../components/InterfaceCommandBar';
import InterfaceInformation from '../../../../components/interfaceInformation';
import { InterfaceFileStatusDTO } from '../../../../dtos/interface-file';
import { useGetInterfaceById } from '../../../../hooks/queries/interface';
import { useRunAllCommands } from '../../../../hooks/queries/vehicle';
import { InterfaceExecutorContext } from '.';

interface IProps {
  vehicleId?: number;
  interfaceId?: number;
  item: InterfaceFileStatusDTO;
  mapName: string;
}

const ItemResult: React.FC<IProps> = (props) => {
  const { vehicleId, item, interfaceId } = props;

  const {
    dataRunAllCommands,
    runAllCommands: runAllCommands,
    isExecutingCommand: isStartingAllCommands
  } = useRunAllCommands();
  const { data: interfaceData } = useGetInterfaceById(interfaceId);
  const context = React.useContext(InterfaceExecutorContext);
  const [runAllCommandsData, setRunAllCommandsData] = React.useState<any>();

  React.useEffect(() => {
    if (context?.setStatus) {
      context.setStatus(props.item.status);
    }
    // NOTE: should not have context as dependencies here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.item.status]);

  React.useEffect(() => {
    setRunAllCommandsData(dataRunAllCommands);
  }, [dataRunAllCommands, runAllCommands, runAllCommandsData]);

  const onRunAllCommandsButtonClick = React.useCallback(() => {
    if (!vehicleId) {
      return;
    }
    runAllCommands({
      vehicleId,
      interfaceId: item.id
    });
  }, [vehicleId, runAllCommands, item.id]);

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
            body={item.fileName}
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
                interfaceId={interfaceId}
                message={runAllCommandsData?.message || ''}
              />
            }
          />
        )}
      />

      <Title level={5} style={{ marginTop: 0 }}>
        Interface information
      </Title>
      <InterfaceInformation vehicleId={vehicleId} item={item} />
    </div>
  );
};

export default ItemResult;
