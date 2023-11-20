import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Descriptions, Empty, Form, message, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VehicleDTO } from '../dtos/vehicle';
import { doActivateVehicle, useWaitingVehicles } from '../hooks/queries/vehicle';

const { Title } = Typography;

const Register = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDTO | undefined>();
  const { data: waitingVehicles, isFetching } = useWaitingVehicles();
  const { mutate: activateVehicle, isLoading } = doActivateVehicle();
  const [messageApi, contextHolder] = message.useMessage();

  const selectVehicle = (value: number) => {
    if (!waitingVehicles) {
      setSelectedVehicle(undefined);
      return;
    }
    const selected = waitingVehicles.find((vehicle: VehicleDTO) => vehicle.id === value);
    setSelectedVehicle(selected);
  };

  const handleActiveVehicle = () => {
    if (!selectedVehicle?.id) {
      return;
    }
    activateVehicle(selectedVehicle.id, {
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

  const navigate = useNavigate();

  return (
    <>
      <div style={{ padding: 20 }}>
        <FontAwesomeIcon
          onClick={() => navigate('/vehicle/interface/execution')}
          fontSize={25}
          cursor="pointer"
          color="gray"
          icon={faChevronLeft}
        />
        {contextHolder}
        <div id="vehicle-select" style={{ paddingTop: 30 }}>
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
              Object.entries(selectedVehicle).map(([key, value]) => {
                if (typeof value !== 'object' && key !== 'id') {
                  return (
                    <Descriptions.Item key={key} label={key}>
                      {value}
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
      </div>
    </>
  );
};

export default Register;
