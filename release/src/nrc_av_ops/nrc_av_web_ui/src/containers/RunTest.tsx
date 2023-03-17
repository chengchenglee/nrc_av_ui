import { Button, Descriptions, Empty, Form, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useMemo, useState } from 'react';
import StatusButton from '../components/statusButton';
import VehicleNodes from '../components/vehicleNodes';
import { doRunROSCore } from '../hooks/queries/agent';
import { useActiveVehicles } from '../hooks/queries/vehicle';
import { Vehicle } from '../interfaces/models/vehicle';
const { Title } = Typography;

// eslint-disable-next-line max-lines-per-function
const RunTest = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>();

  const { data: activeVehicles, isFetching: isActiveVehiclesFetching } = useActiveVehicles();
  const { refetch: refetchROSCore, isFetching: isRequestROSCoreFetching } = doRunROSCore(
    selectedVehicle?.id
  );

  const vehicleOptions = useMemo<DefaultOptionType[]>(() => {
    if (!activeVehicles) {
      return [];
    }
    return activeVehicles.map((vehicle: Vehicle) => ({
      label: vehicle.name ? vehicle.name : vehicle.certKey,
      value: vehicle.id
    }));
  }, [activeVehicles]);

  const selectVehicle = (value: number) => {
    if (!activeVehicles) {
      setSelectedVehicle(undefined);
      return;
    }
    const selected = activeVehicles.find((vehicle: Vehicle) => vehicle.id === value);
    setSelectedVehicle(selected);
  };

  const renderRightPanel = () => (
    <div style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          fontSize: 16,
          fontWeight: 500,
          marginBottom: '8px',
          marginTop: '60px',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '5px'
        }}
      >
        <StatusButton status="idle" />
        <div style={{ flex: 1, lineHeight: '32px' }}>
          <span>ROS Core</span>
        </div>
        <Button
          loading={isRequestROSCoreFetching}
          onClick={() => {
            refetchROSCore();
          }}
        >
          Start
        </Button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <VehicleNodes vehicleId={selectedVehicle?.id} />
      </div>
    </div>
  );
  return (
    <>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div id="vehicle-select">
            <Title level={5}>SELECT A VEHICLE</Title>
            <Form.Item>
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
          <div id="vehicle-detail">
            <Descriptions title="Detail">
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
          </div>
        </div>
        <div style={{ flex: 1 }}>{renderRightPanel()}</div>
      </div>
    </>
  );
};

export default RunTest;
