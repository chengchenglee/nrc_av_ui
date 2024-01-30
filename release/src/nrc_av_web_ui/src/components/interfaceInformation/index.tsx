import { Collapse } from 'antd';
import * as React from 'react';
import { ExecutionStatus } from '../../constants/executionStatus';
import { InterfaceExecutorContext } from '../../containers/rosRunner/executor/interfaceExecutor';
import './styles.scss';
import { CommonInterfaceStatusDTO } from '../../dtos/machine-status';
import SubSystemsPanel from './panelSubSystem';

interface IProps {
  vehicleId: number;
  dataExecute: any;
}

// eslint-disable-next-line max-lines-per-function
const InterfaceInformation: React.FC<IProps> = (props) => {
  const { vehicleId, dataExecute } = props;
  const context = React.useContext(InterfaceExecutorContext);
  const [healthCheckInfoState, setHealthCheckInfoStateState] = React.useState(new Map());

  const toggleHealthCheck = (itemName: string) => {
    const newHealthCheckInfoState = new Map(healthCheckInfoState);
    newHealthCheckInfoState.set(itemName, !newHealthCheckInfoState.get(itemName));
    setHealthCheckInfoStateState(newHealthCheckInfoState);
  };

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

  const panelKeys = ['machines', 'subsystems', 'speed', 'gps'];
  return context && context.status === ExecutionStatus.RUNNING ? (
    <Collapse className="interface-information" defaultActiveKey={panelKeys}>
      <Collapse.Panel key="machines" header="Machines">
        {renderMachineItem(context?.interfaceMachines)}
      </Collapse.Panel>
      <Collapse.Panel key="subsystems" header="SubSystems">
        {context?.interfaceSubSystems.map((item) => (
          <SubSystemsPanel
            key={item.id}
            item={item}
            toggleHealthCheck={toggleHealthCheck}
            healthCheckInfoState={healthCheckInfoState}
            vehicleId={vehicleId}
            dataExecute={dataExecute}
          />
        ))}
      </Collapse.Panel>
    </Collapse>
  ) : (
    <></>
  );
};

export default InterfaceInformation;
