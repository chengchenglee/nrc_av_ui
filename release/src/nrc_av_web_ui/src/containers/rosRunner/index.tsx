import { Collapse, Descriptions, Empty, Form, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { VehicleDTO } from '../../dtos/vehicle';
import { useActiveVehicles } from '../../hooks/queries/vehicle';
import { useStoreVehicle } from '../../store';
import { setSelectedVehicle } from '../../store/vehicle';
import InterfaceExecutor from './executor/interfaceExecutor';

const { Title } = Typography;

const ROSRunner = () => {
  const selectedVehicle = useStoreVehicle();

  const dispatch = useDispatch();

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
        dispatch(setSelectedVehicle(undefined));
        return;
      }
      const selected = activeVehicles.find((vehicle: VehicleDTO) => vehicle.id === value);
      dispatch(setSelectedVehicle(selected));
    },
    [activeVehicles, dispatch]
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
            value={selectedVehicle?.id}
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
