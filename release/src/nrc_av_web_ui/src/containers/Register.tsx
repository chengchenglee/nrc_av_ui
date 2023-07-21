import { Button, Descriptions, Empty, Form, message, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useMemo, useState } from 'react';
import { VehicleDTO } from '../dtos/vehicle';
import { doActivateVehicle, useWaitingVehicles } from '../hooks/queries/vehicle';

const { Title } = Typography;

const Register = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDTO>();
  const { data: waitingVehicles, isFetching } = useWaitingVehicles();
  const { mutate: activeVehicle, isLoading } = doActivateVehicle();
  const [messageApi, contextHolder] = message.useMessage();

  const selectVehicle = (value: number) => {
    if (!waitingVehicles) {
      setSelectedVehicle(undefined);
      return;
    }
    const selected = waitingVehicles.find((vehicle: { id: number }) => vehicle.id === value);
    setSelectedVehicle(selected);
  };

  const handleActiveVehicle = () => {
    if (!selectedVehicle?.id) {
      return;
    }
    activeVehicle(selectedVehicle.id, {
      onSuccess: () => {
        setSelectedVehicle(undefined);
        messageApi.success('Register successfully!');
      }
    });
  };

  const vehicleOptions = useMemo<DefaultOptionType[]>(() => {
    if (!waitingVehicles) {
      return [];
    }

    return waitingVehicles.map((vehicle: VehicleDTO) => ({
      label: vehicle.name || vehicle.certKey,
      value: vehicle.id
    }));
  }, [waitingVehicles]);

  return (
    <>
      {contextHolder}
      <div id="vehicle-select">
        <Title level={5} style={{ margin: '0 0 10px' }}>
          Please select a vehicle:
        </Title>
        <Form.Item>
          <Select
            className="app-select"
            options={vehicleOptions}
            style={{ width: '100%' }}
            value={selectedVehicle?.id}
            onChange={selectVehicle}
            loading={isFetching}
            disabled={isFetching}
          />
        </Form.Item>
      </div>
      <div id="vehicle-detail">
        <Descriptions title="Vehicle Detail">
          {selectedVehicle &&
            Object.entries(selectedVehicle).map(([k, v]) => {
              if (typeof v !== 'object' && k !== 'id') {
                return (
                  <Descriptions.Item key={k} label={k}>
                    {v}
                  </Descriptions.Item>
                );
              }
              return null;
            })}
        </Descriptions>
        {!selectedVehicle && <Empty />}
      </div>
      <Button loading={isLoading} type="primary" onClick={handleActiveVehicle}>
        Register
      </Button>
    </>
  );
};

export default Register;
