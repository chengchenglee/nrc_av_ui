/* eslint-disable max-lines-per-function */
import { faPlay, faStop, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Row, Col, Form, Select, Skeleton } from 'antd';
import Title from 'antd/es/typography/Title';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateMap } from '../../../../api/vehicle';
import StatusButton from '../../../../components/statusButton';
import { BASE_URL } from '../../../../constants/config';
import { ExecutionStatus, StatusRunAll } from '../../../../constants/executionStatus';
import {
  AlgorithmStatusDTO,
  CommandsStatusDTO,
  GetInterfaceInfoDTO,
  MachineStatusDTO,
  SensorStatusDTO
} from '../../../../dtos/machine-status';
import { useGetInterfaceList } from '../../../../hooks/queries/interface';
import { useExecuteInterface, useStopInterface } from '../../../../hooks/queries/vehicle';
import { RootState, store } from '../../../../store';
import { setSelectedMap } from '../../../../store/map';
import { userThunk } from '../../../../store/user/thunks';
import ItemResult from './itemResult';

interface IProps {
  vehicleId?: number;
}

export interface InterfaceExecutorContextProps {
  status: ExecutionStatus | undefined;
  interfaceName: string;
  interfaceNameId: number | undefined;
  interfaceMachines: MachineStatusDTO[];
  interfaceSensors: SensorStatusDTO[];
  interfaceAlgorithms: AlgorithmStatusDTO[];
  interfaceStatusRunAll: StatusRunAll;
  interfaceCommands: CommandsStatusDTO[];
  setStatus: React.Dispatch<React.SetStateAction<ExecutionStatus | undefined>>;
  setInterfaceName: React.Dispatch<React.SetStateAction<string>>;
  setInterfaceNameId: React.Dispatch<React.SetStateAction<number | undefined>>;
  setInterfaceMachines: React.Dispatch<React.SetStateAction<MachineStatusDTO[]>>;
  setInterfaceSensors: React.Dispatch<React.SetStateAction<SensorStatusDTO[]>>;
  setInterfaceAlgorithms: React.Dispatch<React.SetStateAction<AlgorithmStatusDTO[]>>;
  setInterfaceCommands: React.Dispatch<React.SetStateAction<CommandsStatusDTO[]>>;
  setInterfaceStatusRunAll: React.Dispatch<React.SetStateAction<StatusRunAll>>;
}

export const InterfaceExecutorContext = React.createContext<
  InterfaceExecutorContextProps | undefined
>(undefined);

interface SelectInterfaceForm {
  interfaceId: number;
}

const mapOptions = [
  { id: 1, name: 'Sanborn2019MMv24' },
  { id: 2, name: 'Sanborn2020PNHv2' },
  { id: 3, name: 'MiniMap' },
  { id: 4, name: 'SC_Cached' },
  { id: 5, name: 'SanMiguel_Cached' },
  { id: 6, name: 'Noe.set' },
  { id: 7, name: 'Franklin.set' },
  { id: 8, name: 'THill_Cached' }
];

const InterfaceExecutor: React.FC<IProps> = (props) => {
  const [formInterface] = Form.useForm<SelectInterfaceForm>();
  const { vehicleId } = props;
  const { data: interfaceList } = useGetInterfaceList({ pageSize: 9999 });
  const [status, setStatus] = React.useState<ExecutionStatus | undefined>();
  const [vehicleInit, setVehicleInit] = React.useState<boolean>(true);
  const [interfaceNameId, setInterfaceNameId] = React.useState<number | undefined>();
  const [interfaceName, setInterfaceName] = React.useState<string>('');
  const [interfaceMachines, setInterfaceMachines] = React.useState<MachineStatusDTO[]>([]);
  const [interfaceSensors, setInterfaceSensors] = React.useState<SensorStatusDTO[]>([]);
  const [interfaceAlgorithms, setInterfaceAlgorithms] = React.useState<AlgorithmStatusDTO[]>([]);
  const [interfaceCommands, setInterfaceCommands] = React.useState<CommandsStatusDTO[]>([]);
  const [interfaceStatusRunAll, setInterfaceStatusRunAll] = React.useState<StatusRunAll>(
    StatusRunAll.DEACTIVE
  );
  const { mutate: startInterface, isLoading } = useExecuteInterface();
  const selectedMap = useSelector((state: RootState) => state.map.selectedMap);
  const { mutate: stopInterface, isLoading: isStopping } = useStopInterface();
  const sseRef = React.useRef<EventSource>();
  const reInitVehicleInterfaceState = () => {
    setInterfaceNameId(undefined);
    setStatus(ExecutionStatus.STOPPED);
    setInterfaceMachines([]);
    setInterfaceSensors([]);
    setInterfaceAlgorithms([]);
    setInterfaceCommands([]);
    setInterfaceStatusRunAll(StatusRunAll.DEACTIVE);
  };

  const handleSse = React.useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
    }
    sseRef.current = new EventSource(`${BASE_URL}/vehicle/${vehicleId}/interface/details-status`, {
      withCredentials: true
    });
    sseRef.current.onmessage = ({ data }) => {
      const parsedData = JSON.parse(data) as GetInterfaceInfoDTO;
      setStatus(parsedData.status);
      if (parsedData.interfaceId && parsedData.status === ExecutionStatus.RUNNING) {
        setInterfaceNameId(parsedData.interfaceId);
        formInterface.setFieldValue('interfaceId', parsedData.interfaceId);
      }
      if (parsedData.status !== ExecutionStatus.RUNNING) {
        setInterfaceNameId(undefined);
      }
      setInterfaceName(parsedData.interfaceName);
      setInterfaceMachines(parsedData.machines);
      setInterfaceSensors(parsedData.sensors);
      setInterfaceAlgorithms(parsedData.algorithms);
      setInterfaceStatusRunAll(parsedData.statusRunAll);
      setInterfaceCommands(parsedData.statusCommands);
      setVehicleInit(false);
    };
    sseRef.current.onerror = () => {
      if (sseRef.current && sseRef.current.readyState === sseRef.current.CLOSED) {
        store.dispatch(userThunk.getCurrentUser());
      }
      setInterfaceNameId(undefined);
      setStatus(ExecutionStatus.STOPPED);
      setInterfaceMachines([]);
      setInterfaceSensors([]);
      setInterfaceAlgorithms([]);
      setInterfaceStatusRunAll(StatusRunAll.DEACTIVE);
      setVehicleInit(false);
    };
  }, [formInterface, vehicleId]);

  React.useEffect(() => {
    setVehicleInit(true);
    reInitVehicleInterfaceState();
    if (vehicleId) {
      handleSse();
      return () => {
        setVehicleInit(true);
        if (sseRef.current) {
          sseRef.current.close();
        }
      };
    }
    return () => {
      setInterfaceStatusRunAll(StatusRunAll.DEACTIVE);
      setVehicleInit(false);
    };
  }, [vehicleId, formInterface, handleSse, selectedMap]);

  const contextValue = React.useMemo(
    () => ({
      status,
      setStatus,
      interfaceNameId,
      setInterfaceNameId,
      interfaceName,
      setInterfaceName,
      interfaceMachines,
      setInterfaceMachines,
      interfaceSensors,
      setInterfaceSensors,
      interfaceAlgorithms,
      setInterfaceAlgorithms,
      interfaceStatusRunAll,
      setInterfaceStatusRunAll,
      interfaceCommands,
      setInterfaceCommands
    }),
    [
      status,
      interfaceNameId,
      interfaceName,
      interfaceMachines,
      interfaceSensors,
      interfaceAlgorithms,
      interfaceStatusRunAll,
      interfaceCommands
    ]
  );

  const dispatch = useDispatch();

  const handleMapChange = React.useCallback(
    async (value: string) => {
      const selectedOption = mapOptions.find((option) => option.name === value);
      if (selectedOption) {
        try {
          await updateMap({ vehicleId, mapName: selectedOption.name });
          dispatch(setSelectedMap(selectedOption.name));
        } catch (error) {
          console.error(error);
        }
      }
    },
    [vehicleId, dispatch]
  );

  const onFinish = (values: SelectInterfaceForm) => {
    if (!vehicleId) {
      return;
    }
    const vehicle = {
      vehicleId,
      interfaceId: values.interfaceId
    };

    if (contextValue?.status === ExecutionStatus.RUNNING) {
      dispatch(setSelectedMap(mapOptions[0].name));
      stopInterface(vehicle, {
        onSuccess: () => {
          reInitVehicleInterfaceState();
        }
      });
    } else {
      startInterface(
        { ...vehicle, mapName: selectedMap },
        {
          onSuccess: () => {
            setVehicleInit(true);
          }
        }
      );
    }
  };

  return (
    <InterfaceExecutorContext.Provider value={contextValue}>
      <Row>
        <Col span={24}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              fontSize: 16,
              fontWeight: 500
            }}
          >
            <StatusButton status="none" />
            <div style={{ flex: 1, lineHeight: '32px' }}>
              <Title level={3}>Interface</Title>
              <Skeleton active loading={vehicleInit}>
                <div style={{ display: 'flex' }}>
                  <Form
                    initialValues={{
                      interfaceId: contextValue?.interfaceNameId
                    }}
                    form={formInterface}
                    style={{ display: 'flex', width: '100%' }}
                    onFinish={onFinish}
                  >
                    <Col xs={10} sm={10} md={11} lg={11} xl={11}>
                      <Form.Item
                        style={{
                          marginRight: '5px',
                          flex: 1
                        }}
                        name="interfaceId"
                      >
                        <Select
                          disabled={
                            !vehicleId ||
                            !!contextValue?.interfaceNameId ||
                            contextValue?.status === ExecutionStatus.RUNNING
                          }
                          placeholder="Select interface"
                          style={{ width: '100%' }}
                        >
                          {interfaceList?.interfaces.map((item) => (
                            <Select.Option key={item.id} value={item.id}>
                              {item.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={10} sm={10} md={11} lg={11} xl={11}>
                      <Form.Item style={{ marginRight: '5px' }}>
                        <Select
                          disabled={
                            contextValue?.status === ExecutionStatus.RUNNING &&
                            contextValue?.interfaceStatusRunAll === StatusRunAll.ACTIVE
                          }
                          defaultValue={selectedMap}
                          style={{ width: '100%' }}
                          placeholder="Select map"
                          options={mapOptions.map((option) => ({
                            label: option.name,
                            value: option.name
                          }))}
                          onChange={handleMapChange}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={3} sm={3} md={2} lg={2} xl={2}>
                      <Form.Item>
                        <Button
                          shape="circle"
                          htmlType="submit"
                          disabled={isLoading || isStopping}
                          danger={contextValue?.status === ExecutionStatus.RUNNING}
                          type="primary"
                        >
                          {isLoading || isStopping ? (
                            <FontAwesomeIcon
                              icon={faCircleNotch}
                              spin
                              style={{ color: '#ffffff' }}
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={
                                contextValue?.status === ExecutionStatus.RUNNING ? faStop : faPlay
                              }
                              style={{ color: '#ffffff' }}
                            />
                          )}
                        </Button>
                      </Form.Item>
                    </Col>
                  </Form>
                </div>
              </Skeleton>
            </div>
          </div>
        </Col>
      </Row>
      {contextValue?.status === ExecutionStatus.RUNNING && (
        <Row>
          <Skeleton active loading={vehicleInit}>
            <div style={{ width: '100%', display: 'block' }}>
              {contextValue?.interfaceNameId && (
                <ItemResult vehicleId={vehicleId} mapName={selectedMap} />
              )}
            </div>
          </Skeleton>
        </Row>
      )}
    </InterfaceExecutorContext.Provider>
  );
};

export default InterfaceExecutor;
