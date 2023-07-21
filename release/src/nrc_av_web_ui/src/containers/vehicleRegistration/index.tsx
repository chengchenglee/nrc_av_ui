import { Tabs, TabsProps } from 'antd';
import { FC } from 'react';
import Register from '../Register';
import ROSRunner from '../rosRunner';

const items: TabsProps['items'] = [
  { key: '1', label: 'Vehicle Registration', children: <Register /> },
  { key: '2', label: 'Interface Execution', children: <ROSRunner /> }
];

type MainProps = {
  defaultActiveKey?: string;
};

const VehicleRegistration: FC<MainProps> = ({ defaultActiveKey = '2' }) => (
  <div className="App" style={{ overflow: 'auto' }}>
    <Tabs defaultActiveKey={defaultActiveKey} items={items} />
  </div>
);

export default VehicleRegistration;
