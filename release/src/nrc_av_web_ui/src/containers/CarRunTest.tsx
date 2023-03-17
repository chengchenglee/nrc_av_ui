import { Button, Descriptions, Divider, Empty, Form, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useEffect, useMemo, useState } from 'react';
import ROSResult from '../components/ROSResult';
import { useRunROSCore, useRunROSNode } from '../hooks/queries/agent';
import {
  useGetActiveCars,
  useGetInterfacesByModel,
  useGetCmdsByInterfaceId,
  useGetCarById
} from '../hooks/queries/cars';
import { Car } from '../interfaces/models/car';
import { Interface } from '../interfaces/models/interface';
const { Title } = Typography;

const ROSCoresOptions = [
  {
    label: 'Launch ROS Core',
    value: 1
  }
];

// eslint-disable-next-line max-lines-per-function
const CarRunTest = () => {
  const [selectedCar, setSelectedCar] = useState<Car>();
  const [selectedInterface, setSelectedInterface] = useState<Interface>();
  const [selectedROSCore, setSelectedROSCore] = useState<number>();
  const [selectedROSNode, setSelectedROSNode] = useState<number>();
  const [isROSError, setIsROSError] = useState<boolean>(false);
  const [rosResult, setROSResult] = useState<string>();

  const carsQuery = useGetActiveCars();
  const interfacesQuery = useGetInterfacesByModel(selectedCar?.model.id || 0);
  const cmdQuery = useGetCmdsByInterfaceId(selectedInterface?.id || 0);
  const runROSCoreQuery = useRunROSCore(selectedCar?.id, selectedROSCore);
  const runROSNodeQuery = useRunROSNode(selectedCar?.id, selectedROSNode);
  const runSelectCarDetail = useGetCarById(selectedCar?.id || 0);

  const carOptions = useMemo<DefaultOptionType[]>(() => {
    if (!carsQuery.data) {
      return [];
    }
    return carsQuery.data.map((i: { name: any; certKey: any; id: any }) => ({
      label: i.name ? i.name : i.certKey,
      value: i.id
    }));
  }, [carsQuery.data]);

  const interfaceOptions = useMemo<DefaultOptionType[]>(() => {
    if (!interfacesQuery.data) {
      return [];
    }
    return interfacesQuery.data.map((i: { agentName: any; id: any }) => ({
      label: i.agentName,
      value: i.id
    }));
  }, [interfacesQuery.data]);

  const handleSelectCar = (value: number) => {
    if (!carsQuery.data) {
      setSelectedCar(undefined);
      return;
    }
    const selected = carsQuery.data.find((car: { id: number }) => car.id === value);
    setSelectedCar(selected);
    runSelectCarDetail.refetch();
  };

  const handleSelectInterface = (value: number) => {
    if (!interfacesQuery.data) {
      setSelectedInterface(undefined);
      return;
    }
    const selected = interfacesQuery.data.find(
      (interfaces: { id: number }) => interfaces.id === value
    );
    setSelectedInterface(selected);
    runSelectCarDetail.refetch();
  };

  const handleSelectROSNode = (value: number) => {
    setIsROSError(false);
    setSelectedROSNode(value);
  };

  useEffect(() => {
    if (selectedROSCore) {
      runROSCoreQuery.refetch().then((res) => {
        if (res.isError) {
          setIsROSError(true);
          setROSResult(undefined);
        } else {
          setROSResult(res.data);
        }
        setSelectedROSCore(undefined);
      });
    }
  }, [selectedROSCore]);

  const handleSendROSCore = (value: number) => {
    setIsROSError(false);
    if (!selectedROSCore || value !== selectedROSCore) {
      setSelectedROSCore(value);
    }
  };

  const handleSendROSNode = () => {
    setIsROSError(false);
    runROSNodeQuery.refetch().then((res) => {
      if (res.isError) {
        setIsROSError(true);
        setROSResult(undefined);
      } else {
        setROSResult(res.data);
      }
    });
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div id="car-select">
            <Title level={5}>SELECT A CAR</Title>
            <Form.Item>
              <Select
                className="app-select"
                options={carOptions}
                style={{ width: '100%' }}
                onChange={handleSelectCar}
                loading={carsQuery.isFetching}
                disabled={carsQuery.isFetching}
              />
            </Form.Item>
          </div>
          <div id="car-detail">
            <Descriptions title="Detail">
              {selectedCar &&
                Object.entries(selectedCar).map(([k, v]) => {
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
            {!selectedCar && <Empty />}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div id="car-select">
            <Title level={5}>SELECT INTERFACE</Title>
            <Form.Item>
              <Select
                className="app-select"
                options={interfaceOptions}
                style={{ width: '100%' }}
                onChange={handleSelectInterface}
                loading={carsQuery.isFetching}
                disabled={carsQuery.isFetching}
              />
            </Form.Item>
          </div>
          <div style={{ flex: 1, marginTop: 8 }}>
            {ROSCoresOptions.length &&
              ROSCoresOptions.map((rosCore) => (
                <div
                  key={rosCore.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    fontSize: 16,
                    fontWeight: 500,
                    marginBottom: 8,
                    paddingTop: 52
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span>{rosCore.label}</span>
                  </div>
                  <Button
                    loading={runROSCoreQuery.isFetching && rosCore.value === selectedROSCore}
                    onClick={() => handleSendROSCore(rosCore.value)}
                  >
                    Send
                  </Button>
                </div>
              ))}
            <div style={{ flex: 1, position: 'relative' }}>
              <Title level={5}>Launch ROS Node</Title>
              <Form.Item>
                <Select
                  className="app-select"
                  options={
                    cmdQuery.data &&
                    cmdQuery.data.map((i: { name: unknown; id: unknown }) => ({
                      label: i.name,
                      value: i.id
                    }))
                  }
                  style={{ width: '85%' }}
                  onChange={handleSelectROSNode}
                  loading={carsQuery.isFetching}
                  disabled={carsQuery.isFetching}
                />
                <Button
                  loading={runROSNodeQuery.isFetching}
                  onClick={() => handleSendROSNode()}
                  style={{ right: 0, position: 'absolute' }}
                >
                  Send
                </Button>
              </Form.Item>
            </div>
          </div>
        </div>
      </div>
      <Divider />
      <Title level={5}>RESULT</Title>
      <p
        style={{
          height: 'auto',
          backgroundColor: '#eeeeee',
          display: 'block',
          padding: 16
        }}
      >
        <ROSResult
          data={rosResult}
          isError={isROSError}
          title="ROS Result: "
          errorMessage="Fail"
          successMessage="Success"
        />
      </p>
    </>
  );
};

export default CarRunTest;
