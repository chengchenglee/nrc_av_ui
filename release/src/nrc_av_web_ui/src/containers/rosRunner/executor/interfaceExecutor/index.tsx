import { faPlay, faStop, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Form, List, Select, Row, Col } from 'antd';
import Title from 'antd/es/typography/Title';
import * as React from 'react';
import { updateMap } from '../../../../api/vehicle';
import StatusButton from '../../../../components/statusButton';
import { ExecutionStatus } from '../../../../constants/executionStatus';
import { useGetInterfaceList } from '../../../../hooks/queries/interface';
import {
  useInterfaceFilesStatus,
  useExecuteInterface,
  useStopInterface
} from '../../../../hooks/queries/vehicle';
import ItemResult from './itemResult';

interface IProps {
  vehicleId?: number;
}

export interface InterfaceExecutorContextProps {
  status: ExecutionStatus | undefined;
  setStatus: React.Dispatch<React.SetStateAction<ExecutionStatus | undefined>>;
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

// eslint-disable-next-line max-lines-per-function
const InterfaceExecutor: React.FC<IProps> = (props) => {
  const [formInterface] = Form.useForm<SelectInterfaceForm>();
  const interfaceId = Form.useWatch('interfaceId', formInterface);
  const { vehicleId } = props;
  const interfaceFilesStatus = useInterfaceFilesStatus(vehicleId);
  const { data: interfaceList } = useGetInterfaceList({ pageSize: 9999 });
  const currentRunningInterface = React.useMemo(
    () => interfaceFilesStatus.data?.find((item) => item.status === ExecutionStatus.RUNNING),
    [interfaceFilesStatus.data]
  );
  const [status, setStatus] = React.useState<ExecutionStatus | undefined>();
  const [selectedMap, setSelectedMap] = React.useState(mapOptions[0].name);

  const { mutate: startInterface, isLoading } = useExecuteInterface();
  const { mutate: stopInterface, isLoading: isStopping } = useStopInterface();

  const onFinish = (values: SelectInterfaceForm) => {
    if (!vehicleId) {
      return;
    }

    const vehicle = {
      vehicleId,
      interfaceId: values.interfaceId
    };

    if (status === ExecutionStatus.RUNNING) {
      stopInterface(vehicle, {
        onSuccess: () => {
          setStatus(ExecutionStatus.STOPPED);
        }
      });
    } else {
      startInterface(
        { ...vehicle, mapName: selectedMap },
        {
          onSuccess: () => {
            setStatus(ExecutionStatus.RUNNING);
          }
        }
      );
    }
  };

  const contextValue = React.useMemo(() => ({ status, setStatus }), [status]);
  const handleMapChange = React.useCallback(
    async (value: string) => {
      const selectedOption = mapOptions.find((option) => option.name === value);
      if (selectedOption) {
        setSelectedMap(selectedOption.name);
        try {
          await updateMap({ vehicleId, mapName: selectedOption.name });
        } catch (error) {
          console.error(error);
        }
      }
    },
    [vehicleId, setSelectedMap]
  );

  React.useEffect(() => {
    if (currentRunningInterface) {
      setStatus(currentRunningInterface.status);
    }
  }, [currentRunningInterface, vehicleId]);

  React.useEffect(() => {
    formInterface.setFieldValue('interfaceId', currentRunningInterface?.id);
  }, [currentRunningInterface, formInterface]);

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
              <div style={{ display: 'flex' }}>
                <Form
                  initialValues={{
                    interfaceId: currentRunningInterface?.id
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
                        disabled={!vehicleId || !!currentRunningInterface?.id}
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
                          interfaceFilesStatus.data &&
                          interfaceFilesStatus.data[0]?.statusRunAll === 'ACTIVE'
                        }
                        defaultValue={mapOptions[0].name}
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
                        danger={status === ExecutionStatus.RUNNING}
                        type="primary"
                      >
                        {isLoading || isStopping ? (
                          <FontAwesomeIcon icon={faCircleNotch} spin style={{ color: '#ffffff' }} />
                        ) : (
                          <FontAwesomeIcon
                            icon={status === ExecutionStatus.RUNNING ? faStop : faPlay}
                            style={{ color: '#ffffff' }}
                          />
                        )}
                      </Button>
                    </Form.Item>
                  </Col>
                </Form>
              </div>
            </div>
          </div>
        </Col>
      </Row>
      {status === ExecutionStatus.RUNNING && (
        <Row>
          <div style={{ width: '100%', display: 'block' }}>
            <List
              itemLayout="vertical"
              dataSource={interfaceFilesStatus.data}
              renderItem={(item) => (
                <ItemResult
                  vehicleId={vehicleId}
                  item={item}
                  interfaceId={interfaceId}
                  mapName={selectedMap}
                />
              )}
            />
          </div>
        </Row>
      )}
    </InterfaceExecutorContext.Provider>
  );
};

export default InterfaceExecutor;
