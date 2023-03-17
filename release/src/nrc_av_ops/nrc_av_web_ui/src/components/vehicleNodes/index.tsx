import { Button, Checkbox, List, Spin } from 'antd';
import { CheckboxValueType } from 'antd/es/checkbox/Group';
import * as React from 'react';
import { useROSNodes } from '../../hooks/queries/vehicle';
import StatusButton from '../statusButton';
import './styles.scss';

interface IProps {
  vehicleId?: number;
}

const VehicleNodes: React.FC<IProps> = (props) => {
  const { vehicleId } = props;

  const [selectedNodes, setSelectedNodes] = React.useState<CheckboxValueType[]>([]);

  const rosNodes = useROSNodes(vehicleId);

  const syncNodes = () => {
    //
  };

  const runNodes = () => {
    //
  };

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
        <span>ROS Node</span>
      </div>
      <Button onClick={syncNodes}>Sync</Button>
    </div>
  );

  const getBody = () => {
    if (rosNodes.isFetching) {
      return (
        <Spin tip="Loading" size="large">
          <div className="spin__content" />
        </Spin>
      );
    }
    return (
      <Checkbox.Group
        style={{ width: '100%', display: 'block', maxHeight: 400, overflow: 'auto' }}
        value={selectedNodes}
        onChange={(checkedNodes) => {
          setSelectedNodes(checkedNodes);
        }}
      >
        <List
          itemLayout="horizontal"
          dataSource={rosNodes.data}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <>
                    <StatusButton status="online" />
                    <Checkbox value={item.id} />
                  </>
                }
                title={`${item.packageName}/${item.name}`}
              />
            </List.Item>
          )}
        />
      </Checkbox.Group>
    );
  };

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
      <Button id="btn-rosrun" onClick={runNodes}>
        Run
      </Button>
    </div>
  );

  return (
    <div id="vehicle-nodes">
      {getHeader()}
      {getBody()}
      {getFooter()}
    </div>
  );
};

export default VehicleNodes;
