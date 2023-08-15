import { Collapse } from 'antd';
import * as React from 'react';
import { ExecutionStatus } from '../../constants/executionStatus';
import { InterfaceExecutorContext } from '../../containers/rosRunner/executor/interfaceExecutor';
import './styles.scss';
import { CommonInterfaceStatusDTO } from '../../dtos/machine-status';

const InterfaceInformation: React.FC = () => {
  const context = React.useContext(InterfaceExecutorContext);

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
          {renderMachineItem(context?.interfaceMachines)}
        </Collapse.Panel>
        <Collapse.Panel key="sensors" header="Sensors">
          {renderMachineItem(context?.interfaceSensors)}
        </Collapse.Panel>
        <Collapse.Panel key="alg" header="Algorithms">
          {renderMachineItem(context?.interfaceAlgorithms)}
        </Collapse.Panel>
      </Collapse>
    </>
  ) : (
    <></>
  );
};

export default InterfaceInformation;
