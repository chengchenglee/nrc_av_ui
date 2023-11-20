import { Collapse, Descriptions, Empty, Form, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import moment from 'moment';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { VehicleStatus } from '../../constants/vehicleStatus';
import { VehicleDTO } from '../../dtos/vehicle';
import { useActiveVehicles } from '../../hooks/queries/vehicle';
import { useStoreVehicle } from '../../store';
import { setSelectedVehicle } from '../../store/vehicle';
import InterfaceExecutor from './executor/interfaceExecutor';

const { Title } = Typography;

// eslint-disable-next-line max-lines-per-function
const ROSRunner = () => {
  const selectedVehicle = useStoreVehicle();
  const dispatch = useDispatch();

  const {
    data: activeVehicles,
    isFetching: isActiveVehiclesFetching,
    refetch
  } = useActiveVehicles();

  const [lastSseTime, setLastSseTime] = React.useState(Date.now());
  const [lastPingTime, setLastPingTime] = React.useState('');
  const [loadVehicleDetails, setLoadVehicleDetails] = React.useState(Date.now());

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

  React.useEffect(() => {
    const seconds = Math.round(
      moment
        .duration(
          Math.max(0, new Date(loadVehicleDetails).getTime() - new Date(lastSseTime).getTime()),
          'milliseconds'
        )
        .asSeconds()
    );
    if (seconds > 60) {
      setLastPingTime(`${Math.round(seconds / 60)} minute(s) ago`);
    } else if (seconds > 2) {
      setLastPingTime(`${seconds} second(s) ago`);
    } else {
      setLastPingTime('');
    }
  }, [lastSseTime, loadVehicleDetails]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1px'
      }}
    >
      <div id="vehicle-select">
        <Title level={3} style={{ margin: '0px 0px 2px' }}>
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
            onDropdownVisibleChange={() => {
              refetch();
            }}
            loading={isActiveVehiclesFetching}
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
        <Collapse.Panel
          className="collapse-no-padding"
          header="Vehicle detail"
          key="1"
          style={{ padding: '0px' }}
        >
          <Descriptions style={{ paddingLeft: '40px', marginTop: '-8px', paddingTop: '0px' }}>
            {selectedVehicle &&
              Object.entries(selectedVehicle).map(([k, v]) => {
                if (typeof v !== 'object') {
                  switch (k) {
                    case 'id':
                      return null;
                    case 'isOnline':
                      return null;
                    case 'status':
                      switch (v) {
                        case VehicleStatus.ACTIVE:
                          return (
                            <Descriptions.Item
                              key={k}
                              style={{ display: 'block', padding: 1 }}
                              label={k}
                            >
                              {v} {lastPingTime}
                            </Descriptions.Item>
                          );
                        case VehicleStatus.OFFLINE:
                          return (
                            <Descriptions.Item
                              key={k}
                              style={{ display: 'block', padding: 1 }}
                              label={k}
                            >
                              {v} {lastPingTime}
                            </Descriptions.Item>
                          );
                        default:
                          return (
                            <Descriptions.Item
                              key={k}
                              style={{ display: 'block', padding: 1 }}
                              label={k}
                            >
                              {v}
                            </Descriptions.Item>
                          );
                      }

                    default:
                      return (
                        <Descriptions.Item
                          key={k}
                          style={{ display: 'block', padding: 1 }}
                          label={k}
                        >
                          {v}
                        </Descriptions.Item>
                      );
                  }
                }
                return null;
              })}
          </Descriptions>
          {!selectedVehicle && <Empty />}
        </Collapse.Panel>
      </Collapse>
      <InterfaceExecutor
        vehicleId={selectedVehicle?.id}
        setLastSseTime={setLastSseTime}
        setLoadVehicleDetails={setLoadVehicleDetails}
      />
    </div>
  );
};

export default ROSRunner;
