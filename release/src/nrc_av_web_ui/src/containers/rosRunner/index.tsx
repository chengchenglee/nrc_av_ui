import { Collapse, Descriptions, Empty, Form, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import * as React from 'react';
import { VehicleDTO } from '../../dtos/vehicle';
import { useActiveVehicles } from '../../hooks/queries/vehicle';
import InterfaceExecutor from './executor/interfaceExecutor';

const { Title } = Typography;

const ROSRunner = () => {
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleDTO | undefined>(undefined);

  const { data: activeVehicles, isFetching: isActiveVehiclesFetching } = useActiveVehicles();

  const vehicleOptions = React.useMemo<DefaultOptionType[]>(() => {
    if (!activeVehicles) {
      return [];
    }
    return activeVehicles.map((vehicle: VehicleDTO) => ({
      label: vehicle.name ? vehicle.name : vehicle.certKey,
      value: vehicle.id
    }));
  }, [activeVehicles]);

  const selectVehicle = React.useCallback(
    (value: number) => {
      if (!activeVehicles) {
        setSelectedVehicle(undefined);
        return;
      }
      const selected = activeVehicles.find((vehicle: VehicleDTO) => vehicle.id === value);
      setSelectedVehicle(selected);
    },
    [activeVehicles]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div id="vehicle-select">
        <Title level={3} style={{ marginBottom: '14px' }}>
          Select Vehicle
        </Title>
        <Form.Item
          style={{
            marginBottom: 0
          }}
        >
          <Select
            className="app-select"
            options={vehicleOptions}
            style={{ width: '100%' }}
            onChange={selectVehicle}
            loading={isActiveVehiclesFetching}
            disabled={isActiveVehiclesFetching}
          />
        </Form.Item>
      </div>
      <Collapse
        size="small"
        bordered={false}
        style={{
          background: 'transparent'
        }}
      >
        <Collapse.Panel className="collapse-no-padding" header="Vehicle detail" key="1">
          <Descriptions style={{ paddingLeft: '40px', marginTop: '5px' }}>
            {selectedVehicle &&
              Object.entries(selectedVehicle).map(([k, v]) => {
                if (typeof v !== 'object' && k !== 'id') {
                  return (
                    <Descriptions.Item key={k} style={{ display: 'block' }} label={k}>
                      {v}
                    </Descriptions.Item>
                  );
                }
                return null;
              })}
          </Descriptions>
          {!selectedVehicle && <Empty />}
        </Collapse.Panel>
      </Collapse>
      <InterfaceExecutor vehicleId={selectedVehicle?.id} />
    </div>
  );
};

export default ROSRunner;
