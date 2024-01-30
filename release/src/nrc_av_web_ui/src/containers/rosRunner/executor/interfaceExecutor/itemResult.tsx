/* eslint-disable max-lines-per-function */
import Title from 'antd/es/typography/Title';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import InterfaceInformation from '../../../../components/interfaceInformation';
import { useRunAllCommands } from '../../../../hooks/queries/vehicle';

interface IProps {
  vehicleId?: number;
  mapName: string;
  dataExecute: any;
}

const ItemResult: React.FC<IProps> = (props) => {
  const { vehicleId, dataExecute } = props;

  const dispatch = useDispatch();

  const {
    dataRunAllCommands,
    runAllCommands,
    isExecutingCommand: isStartingAllCommands
  } = useRunAllCommands();
  const [runAllCommandsData, setRunAllCommandsData] = React.useState<any>();

  React.useEffect(() => {
    setRunAllCommandsData(dataRunAllCommands);
  }, [dataRunAllCommands, dispatch, isStartingAllCommands, runAllCommands, runAllCommandsData]);

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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5em'
        }}
      ></div>

      <Title level={5} style={{ marginTop: 0 }}>
        Interface information
      </Title>
      <InterfaceInformation vehicleId={vehicleId ?? 0} dataExecute={dataExecute} />
    </div>
  );
};

export default ItemResult;
