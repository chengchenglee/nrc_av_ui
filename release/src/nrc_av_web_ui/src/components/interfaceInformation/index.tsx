import { Collapse } from 'antd';
import * as React from 'react';
import { BASE_URL } from '../../constants/config';
import { ExecutionStatus } from '../../constants/executionStatus';
import { InterfaceExecutorContext } from '../../containers/rosRunner/executor/interfaceExecutor';
import { InterfaceFileStatusDTO } from '../../dtos/interface-file';
import './styles.scss';
import { CommonInterfaceStatusDTO, GetInterfaceInfoDTO } from '../../dtos/machine-status';

interface IProps {
  vehicleId?: number;
  item: InterfaceFileStatusDTO;
}

const InterfaceInformation: React.FC<IProps> = ({ vehicleId, item }) => {
  const context = React.useContext(InterfaceExecutorContext);
  const [data, setData] = React.useState<GetInterfaceInfoDTO | null>();
  React.useEffect(() => {
    const sse = new EventSource(
      `${BASE_URL}/vehicle/${vehicleId}/interface/${item.id}/details-status`,
      {
        withCredentials: true
      }
    );
    sse.onmessage = ({ data }) => {
      const parsedData = JSON.parse(data) as GetInterfaceInfoDTO;

      setData(parsedData);
    };
    return () => {
      sse.close();
    };
  }, [item.id, vehicleId]);

  const renderMachineItem = (data?: CommonInterfaceStatusDTO<string>[]) => {
    if (!data) {
      return null;
    }

    return (
      <div
        style={{
          display: 'flex',
          gap: '3px',
          flexWrap: 'wrap'
        }}
      >
        {data.map((item) => (
          <span
            className={`machine-state ${item.status.toLocaleLowerCase()}`}
            style={{
              cursor: 'default',
              margin: '0 3px',
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid #d9d9d9',
              fontWeight: 'normal'
            }}
            key={item.name}
          >
            {item.name}
          </span>
        ))}
      </div>
    );
  };
  const panelKeys = ['machines', 'sensors', 'alg'];

  return context && context.status === ExecutionStatus.RUNNING ? (
    <>
      <Collapse className="interface-information" defaultActiveKey={panelKeys}>
        <Collapse.Panel key="machines" header="Machines">
          {renderMachineItem(data?.machines)}
        </Collapse.Panel>
        <Collapse.Panel key="sensors" header="Sensors">
          {renderMachineItem(data?.sensors)}
        </Collapse.Panel>
        <Collapse.Panel key="alg" header="Algorithms">
          {renderMachineItem(data?.algorithms)}
        </Collapse.Panel>
      </Collapse>
    </>
  ) : (
    <></>
  );
};

export default InterfaceInformation;
