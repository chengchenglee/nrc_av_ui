import { Tabs, TabsProps } from 'antd';
import { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import InterfaceManagement from '../InterfaceManagement';
import ROSRunner from '../rosRunner';

const items: TabsProps['items'] = [
  {
    key: 'vehicle/interface/execution',
    label: 'Interface Execution',
    children: <ROSRunner />
  },
  { key: 'vehicle/interface/manage', label: 'Manage Interfaces', children: <InterfaceManagement /> }
];

type MainProps = {
  defaultActiveKey?: string;
};

const VehicleInterface: FC<MainProps> = () => {
  const navigate = useNavigate();
  const { source } = useParams();

  return (
    <div className="App">
      <Tabs activeKey={source} onChange={(path) => navigate(`../${path}`)} items={items} />
    </div>
  );
};

export default VehicleInterface;
