import { Button, Descriptions, Empty, Form, message, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useMemo, useState } from 'react';
import { useChangeCarStatus, useGetWaitingCars } from '../hooks/queries/cars';
import { Car } from '../interfaces/models/car';

const { Title } = Typography;

const CarRegister = () => {
  const [selectedCar, setSelectedCar] = useState<Car>();
  const { data: cars, isFetching } = useGetWaitingCars();
  const { mutate: changeCarStatus, isLoading } = useChangeCarStatus();
  const [messageApi, contextHolder] = message.useMessage();

  const handleSelectCar = (value: number) => {
    if (!cars) {
      setSelectedCar(undefined);
      return;
    }
    const selected = cars.find((car: { id: number }) => car.id === value);
    setSelectedCar(selected);
  };

  const handleChangeCarStatus = () => {
    if (!selectedCar?.id) {
      return;
    }
    changeCarStatus(selectedCar.id, {
      onSuccess: () => {
        setSelectedCar(undefined);
        messageApi.success('Change status successfully!');
      }
    });
  };

  const carOptions = useMemo<DefaultOptionType[]>(() => {
    if (!cars) {
      return [];
    }

    return cars.map((car: Car) => ({
      label: car.name || car.certKey,
      value: car.id
    }));
  }, [cars]);

  return (
    <>
      {contextHolder}
      <div id="car-select">
        <Title level={5} style={{ margin: '0 0 10px' }}>
          Please select a car:
        </Title>
        <Form.Item>
          <Select
            className="app-select"
            options={carOptions}
            style={{ width: '100%' }}
            value={selectedCar?.id}
            onChange={handleSelectCar}
            loading={isFetching}
            disabled={isFetching}
          />
        </Form.Item>
      </div>
      <div id="car-detail">
        <Descriptions title="Car Detail">
          {selectedCar &&
            Object.entries(selectedCar).map(([k, v]) => {
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
        {!selectedCar && <Empty />}
      </div>
      <Button loading={isLoading} type="primary" onClick={handleChangeCarStatus}>
        Register
      </Button>
    </>
  );
};

export default CarRegister;
