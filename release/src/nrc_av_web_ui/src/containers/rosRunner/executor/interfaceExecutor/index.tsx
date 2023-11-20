/* eslint-disable max-lines-per-function */
import { faPlay, faStop, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Row, Col, Form, Select, Skeleton, Checkbox } from 'antd';
import Title from 'antd/es/typography/Title';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateMap } from '../../../../api/vehicle';
import StatusButton from '../../../../components/statusButton';
import { BASE_URL } from '../../../../constants/config';
import { ExecutionStatus, StatusRunAll } from '../../../../constants/executionStatus';
import { VehicleStatus } from '../../../../constants/vehicleStatus';
import { Subsystem } from '../../../../dtos/interface';
import { GetInterfaceInfoDTO, MachineStatusDTO } from '../../../../dtos/machine-status';
import { RunInterfaceParamDTO } from '../../../../dtos/vehicle';
import { useGetInterfaceList } from '../../../../hooks/queries/interface';
import { useExecuteInterface, useStopInterface } from '../../../../hooks/queries/vehicle';
import { RootState, store, useStoreVehicle } from '../../../../store';
import { setRunAllSubSystems, setRunInterface } from '../../../../store/command';
import { setSelectedMap } from '../../../../store/map';
import { userThunk } from '../../../../store/user/thunks';
import { setSelectedVehicle } from '../../../../store/vehicle';
import ItemResult from './itemResult';

interface IProps {
  vehicleId?: number;
  setLastSseTime: (lastSseTime: number) => void;
  setLoadVehicleDetails: (anyNumber: number) => void;
}

export interface InterfaceExecutorContextProps {
  status: ExecutionStatus | undefined;
  interfaceName: string;
  interfaceNameId: number | undefined;
  interfaceMachines: MachineStatusDTO[];
  interfaceSubSystems: Subsystem[];
  interfaceStatusRunAll: StatusRunAll;
  setStatus: React.Dispatch<React.SetStateAction<ExecutionStatus | undefined>>;
  setInterfaceName: React.Dispatch<React.SetStateAction<string>>;
  setInterfaceNameId: React.Dispatch<React.SetStateAction<number | undefined>>;
  setInterfaceMachines: React.Dispatch<React.SetStateAction<MachineStatusDTO[]>>;
  setInterfaceSubSystems: React.Dispatch<React.SetStateAction<any[]>>;
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

// eslint-disable-next-line complexity
const InterfaceExecutor: React.FC<IProps> = (props) => {
  const selectedVehicle = useStoreVehicle();
  const dispatch = useDispatch();
  const [formInterface] = Form.useForm<SelectInterfaceForm>();
  const { vehicleId, setLastSseTime, setLoadVehicleDetails } = props;
  const [vehicleStatus, setVehicleStatus] = React.useState<VehicleStatus>(VehicleStatus.OFFLINE);
  const { data: interfaceList } = useGetInterfaceList({ pageSize: 9999 });
  const [status, setStatus] = React.useState<ExecutionStatus | undefined>();
  const [vehicleInit, setVehicleInit] = React.useState<boolean>(true);
  const [interfaceNameId, setInterfaceNameId] = React.useState<number | undefined>();
  const [interfaceName, setInterfaceName] = React.useState<string>('');
  const [interfaceMachines, setInterfaceMachines] = React.useState<MachineStatusDTO[]>([]);
  const [interfaceSubSystems, setInterfaceSubSystems] = React.useState<any[]>([]);
  const [interfaceStatusRunAll, setInterfaceStatusRunAll] = React.useState<StatusRunAll>(
    StatusRunAll.DEACTIVE
  );
  const [isInterfaceSelected, setIsInterfaceSelected] = React.useState(false);

  const isRunAllSubSystems = useSelector(
    (state: RootState) => state.interfaceExecutor.runAllSubSystems
  );

  const { dataExecute, executeInterface, isExecutingInterface } = useExecuteInterface();
  const selectedMap = useSelector((state: RootState) => state.map.selectedMap);
  const { mutate: stopInterface, isLoading: isStopping } = useStopInterface();
  const sseRef = React.useRef<EventSource>();
  const reInitVehicleInterfaceState = () => {
    setInterfaceNameId(undefined);
    setStatus(ExecutionStatus.STOPPED);
    setInterfaceMachines([]);
    setInterfaceSubSystems([]);
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
      setInterfaceSubSystems(parsedData.subSystems);
      setInterfaceStatusRunAll(parsedData.statusRunAll);
      setVehicleInit(false);
      setVehicleStatus(VehicleStatus.ACTIVE);
      setLastSseTime(Date.now());
    };
    sseRef.current.onerror = () => {
      if (sseRef.current && sseRef.current.readyState === sseRef.current.CLOSED) {
        store.dispatch(userThunk.getCurrentUser());
      }
      setInterfaceNameId(undefined);
      setStatus(ExecutionStatus.STOPPED);
      setInterfaceMachines([]);
      setInterfaceSubSystems([]);
      setInterfaceStatusRunAll(StatusRunAll.DEACTIVE);
      setVehicleInit(false);
      setVehicleStatus(VehicleStatus.OFFLINE);
      setLoadVehicleDetails(Date.now());
    };
    // Do not put dispatch in dependencies
  }, [formInterface, setLastSseTime, setLoadVehicleDetails, vehicleId]);

  React.useEffect(() => {
    dispatch(setRunInterface(isExecutingInterface));
  }, [
    vehicleId,
    formInterface,
    handleSse,
    selectedMap,
    dataExecute,
    isExecutingInterface,
    dispatch
  ]);

  React.useEffect(() => {
    setVehicleInit(true);
    reInitVehicleInterfaceState();
    if (vehicleId) {
      handleSse();
      const loadDetailInterval = setInterval(() => {
        setLoadVehicleDetails(Date.now());
      }, 1000);
      return () => {
        setVehicleInit(true);
        clearInterval(loadDetailInterval);
        if (sseRef.current) {
          sseRef.current.close();
        }
      };
    }
    return () => {
      setInterfaceStatusRunAll(StatusRunAll.DEACTIVE);
      setVehicleInit(false);
    };
  }, [vehicleId, formInterface, handleSse, selectedMap, setLoadVehicleDetails]);

  React.useEffect(() => {
    if (vehicleStatus && selectedVehicle && vehicleStatus !== selectedVehicle?.status) {
      dispatch(
        setSelectedVehicle({
          ...selectedVehicle,
          status: vehicleStatus
        })
      );
    }
  }, [dispatch, selectedVehicle, vehicleStatus]);

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
      interfaceSubSystems,
      setInterfaceSubSystems,
      interfaceStatusRunAll,
      setInterfaceStatusRunAll
    }),
    [
      status,
      interfaceNameId,
      interfaceName,
      interfaceMachines,
      interfaceSubSystems,
      interfaceStatusRunAll
    ]
  );

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
      const params: RunInterfaceParamDTO = {
        startAllSubSystem: isRunAllSubSystems
      };
      executeInterface(
        { ...vehicle, mapName: selectedMap, params },
        {
          onSuccess: () => {
            setVehicleInit(true);
          }
        }
      );
    }
  };

  const runningAllCommands = useSelector(
    (state: RootState) => state.interfaceExecutor.isStartingAllCommands
  );

  const runningCommands = useSelector(
    (state: RootState) => state.interfaceExecutor.isStartingCommands
  );
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
              {vehicleId ? (
                <>
                  <Title level={3} style={{ margin: '0px 0px 2px' }}>
                    Interface
                  </Title>
                  <Skeleton active loading={vehicleInit}>
                    <div style={{ display: 'flex' }}>
                      <Form
                        initialValues={{
                          interfaceId: contextValue?.interfaceNameId
                        }}
                        form={formInterface}
                        style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
                        onFinish={onFinish}
                      >
                        <Form.Item
                          style={{
                            marginRight: '5px',
                            flex: 3
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
                            onChange={(value) => setIsInterfaceSelected(!!value)}
                          >
                            {interfaceList?.interfaces.map((item) => (
                              <Select.Option key={item.id} value={item.id}>
                                {item.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item style={{ marginRight: '5px', flex: 3 }}>
                          <Select
                            disabled={
                              contextValue?.status === ExecutionStatus.RUNNING && isRunAllSubSystems
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

                        <Form.Item style={{ marginRight: '5px', flex: 1 }}>
                          <Checkbox
                            style={{ width: '100%' }}
                            checked={isRunAllSubSystems}
                            disabled={
                              isExecutingInterface ||
                              isStopping ||
                              contextValue?.status === ExecutionStatus.RUNNING
                            }
                            onClick={() => {
                              dispatch(setRunAllSubSystems(!isRunAllSubSystems));
                            }}
                          >
                            Start all subsystems
                          </Checkbox>
                        </Form.Item>

                        <Form.Item style={{ marginRight: '5px', flex: 1 }}>
                          <Button
                            shape="circle"
                            htmlType="submit"
                            disabled={
                              isExecutingInterface ||
                              isStopping ||
                              runningAllCommands ||
                              runningCommands ||
                              (!isInterfaceSelected &&
                                contextValue?.status === ExecutionStatus.STOPPED)
                            }
                            danger={contextValue?.status === ExecutionStatus.RUNNING}
                            type="primary"
                          >
                            {isExecutingInterface || isStopping ? (
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
                      </Form>
                    </div>
                  </Skeleton>
                </>
              ) : (
                <div></div>
              )}
            </div>
          </div>
        </Col>
      </Row>
      {contextValue?.status === ExecutionStatus.RUNNING && (
        <Row>
          <Skeleton active loading={vehicleInit}>
            <div style={{ width: '100%', display: 'block' }}>
              {contextValue?.interfaceNameId && (
                <ItemResult vehicleId={vehicleId} mapName={selectedMap} dataExecute={dataExecute} />
              )}
            </div>
          </Skeleton>
        </Row>
      )}
    </InterfaceExecutorContext.Provider>
  );
};

export default InterfaceExecutor;
