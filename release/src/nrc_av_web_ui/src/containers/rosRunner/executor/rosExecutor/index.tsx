import { Button } from 'antd';
import * as React from 'react';
import StatusButton from '../../../../components/statusButton';
import VehicleNodes from '../../../../components/vehicleNodes';
import { ExecutionStatus } from '../../../../constants/executionStatus';
import { useROSNodesStatus, doROSCoreExecution } from '../../../../hooks/queries/vehicle';
import { convertExecutionStatus } from '../../../../utilities/converter';
interface IProps {
  vehicleId?: number;
}

const ROSExecutor: React.FC<IProps> = (props) => {
  const { vehicleId } = props;

  const rosNodesStatus = useROSNodesStatus(vehicleId);

  const rosCoreStatus = React.useMemo(() => {
    const matchedNode = rosNodesStatus.data?.find((nodeStatus) => nodeStatus.name === 'rosout');
    return matchedNode?.status || ExecutionStatus.NOT_STARTED;
  }, [rosNodesStatus.data]);

  const { refetch, isFetching } = doROSCoreExecution(vehicleId);

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          fontSize: 16,
          fontWeight: 500,
          marginBottom: '8px',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '5px'
        }}
      >
        <StatusButton status={!vehicleId ? 'none' : convertExecutionStatus(rosCoreStatus)} />
        <div style={{ flex: 1, lineHeight: '32px' }}>
          <span>ROS Core</span>
        </div>
        <Button
          loading={isFetching}
          onClick={() => {
            refetch();
          }}
          disabled={!vehicleId || rosCoreStatus === ExecutionStatus.RUNNING}
        >
          Start
        </Button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <VehicleNodes
          vehicleId={vehicleId}
          rosCoreStatus={rosCoreStatus}
          rosNodesStatus={rosNodesStatus.data}
        />
      </div>
    </div>
  );
};

export default ROSExecutor;
