import { Button, Checkbox, List } from 'antd';
import { CheckboxValueType } from 'antd/es/checkbox/Group';
import * as React from 'react';
import { ExecutionStatus } from '../../constants/executionStatus';
import { ROSNodeDTO, ROSNodeStatusDTO } from '../../dtos/ros-node';
import { doROSNodesExecution, useROSNodes, useSyncedROSNodes } from '../../hooks/queries/vehicle';
import { convertExecutionStatus } from '../../utilities/converter';
import ModalSync from '../modalSync';
import StatusButton from '../statusButton';
import './styles.scss';

interface IProps {
  vehicleId?: number;
  rosCoreStatus: string;
  rosNodesStatus?: ROSNodeStatusDTO[];
}

// eslint-disable-next-line max-lines-per-function
const VehicleNodes: React.FC<IProps> = (props) => {
  const { vehicleId, rosCoreStatus, rosNodesStatus } = props;

  const [selectedNodes, setSelectedNodes] = React.useState<CheckboxValueType[]>([]);

  const popupRef = React.useRef(null);

  const rosNodes = useROSNodes(vehicleId);
  const syncedNodesQueryResult = useSyncedROSNodes(vehicleId);
  const { mutate: runROSNodes, isLoading } = doROSNodesExecution();

  const syncNodes = () => {
    (popupRef.current as any)?.showModal();
  };

  const runNodes = () => {
    if (!vehicleId || !(selectedNodes instanceof Array<number>)) {
      return;
    }
    runROSNodes(
      { vehicleId, nodeIds: selectedNodes as number[] },
      {
        onSettled: () => {
          setSelectedNodes([]);
        }
      }
    );
  };

  const dataSource = React.useMemo((): ROSNodeDTO[] | undefined => {
    const resNodes = rosNodes.data?.map((node) => {
      const matchedNode = rosNodesStatus?.find(
        (nodeStatus) => nodeStatus.name === node.name && nodeStatus.packageName === node.packageName
      );
      return {
        ...node,
        status: matchedNode?.status || ExecutionStatus.NOT_STARTED
      };
    });

    return resNodes;
  }, [rosNodes.data, rosNodesStatus]);

  const getHeader = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        fontSize: 16,
        fontWeight: 500,
        lineHeight: '32px'
      }}
    >
      <div style={{ flex: 1 }}>
        <span>ROS Nodes</span>
      </div>
      <Button onClick={syncNodes} disabled={!vehicleId}>
        Sync
      </Button>
    </div>
  );

  const getBody = () => (
    <Checkbox.Group
      style={{ width: '100%', display: 'block', maxHeight: 400, overflow: 'auto' }}
      value={selectedNodes}
      onChange={(checkedNodes) => {
        setSelectedNodes(checkedNodes);
      }}
    >
      <List
        loading={rosNodes.isFetching}
        itemLayout="horizontal"
        dataSource={dataSource}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <>
                  <StatusButton status={convertExecutionStatus(item.status)} />
                  <Checkbox value={item.id} disabled={item.status === ExecutionStatus.RUNNING} />
                </>
              }
              title={`${item.packageName}/${item.name}`}
            />
          </List.Item>
        )}
      />
    </Checkbox.Group>
  );

  const getFooter = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        fontSize: 16,
        fontWeight: 500
      }}
    >
      <div style={{ flex: 1 }} />
      <Button
        id="btn-rosrun"
        onClick={runNodes}
        disabled={
          !vehicleId || selectedNodes.length <= 0 || rosCoreStatus !== ExecutionStatus.RUNNING
        }
        loading={isLoading}
      >
        Run
      </Button>
    </div>
  );

  return (
    <div id="vehicle-nodes">
      {getHeader()}
      {getBody()}
      {getFooter()}
      <ModalSync ref={popupRef} vehicleId={vehicleId} syncedQueryData={syncedNodesQueryResult} />
    </div>
  );
};

export default VehicleNodes;
