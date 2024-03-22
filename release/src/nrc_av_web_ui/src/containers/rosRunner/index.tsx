/* eslint-disable max-lines-per-function */
import { Collapse, Descriptions, Empty, Form, Select, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import moment from 'moment';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ExtraVehicleInformation, VehicleDTO } from '../../dtos/vehicle';
import { useActiveVehicles } from '../../hooks/queries/vehicle';
import { RootState, useStoreVehicle } from '../../store';
import { setSelectedVehicle } from '../../store/vehicle';
import InterfaceExecutor from './executor/interfaceExecutor';

const { Title } = Typography;
const { Panel } = Collapse;

interface VehicleDetailsProps {
  selectedVehicle: VehicleDTO | undefined;
  lastPingTime: string;
  extraVehicleInformation: ExtraVehicleInformation | undefined;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  selectedVehicle,
  lastPingTime,
  extraVehicleInformation
}) => {
  const renderStatusDescriptionItem = (key: string, value: string) => (
    <Descriptions.Item key={key} style={{ display: 'block', padding: 1 }} label={key}>
      {value} {lastPingTime}
    </Descriptions.Item>
  );

  const renderExtraInformation = () => {
    const latitude = extraVehicleInformation?.latitude || 0;
    const longitude = extraVehicleInformation?.longitude || 0;
    const velocity = extraVehicleInformation?.velocity || 0;

    return (
      <>
        {selectedVehicle && (
          <>
            <Descriptions.Item style={{ display: 'block', padding: 1 }} label="Latitude, Longitude">
              {`${latitude}, ${longitude}`}
            </Descriptions.Item>
            <Descriptions.Item style={{ display: 'block', padding: 1 }} label="Velocity">
              {velocity}
            </Descriptions.Item>
          </>
        )}
      </>
    );
  };

  return (
    <Descriptions style={{ paddingLeft: '40px', marginTop: '-8px', paddingTop: '0px' }}>
      {selectedVehicle &&
        Object.entries(selectedVehicle).map(([key, value]) => {
          if (typeof value !== 'object') {
            switch (key) {
              case 'id':
              case 'isOnline':
                return null;
              case 'status':
                return renderStatusDescriptionItem(key, value);
              default:
                return (
                  <Descriptions.Item key={key} style={{ display: 'block', padding: 1 }} label={key}>
                    {value}
                  </Descriptions.Item>
                );
            }
          }
          return null;
        })}
      {renderExtraInformation()}
    </Descriptions>
  );
};

const ROSRunner: React.FC = () => {
  const selectedVehicle = useStoreVehicle();
  const dispatch = useDispatch();

  const {
    data: activeVehicles,
    isFetching: isActiveVehiclesFetching,
    refetch
  } = useActiveVehicles();

  const [lastSseTime, setLastSseTime] = React.useState<number>(Date.now());
  const [lastPingTime, setLastPingTime] = React.useState<string>('');
  const [loadVehicleDetails, setLoadVehicleDetails] = React.useState<number>(Date.now());

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
      const lastConnected = selected?.lastConnected as unknown as Date;
      // Get the user's timezone from the browser
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const options = { timeZone: userTimezone };
      const formattedDateString = lastConnected.toLocaleString('en-US', options);
      const adjustedDate = new Date(formattedDateString).toString();
      if (selected) {
        dispatch(setSelectedVehicle({ ...selected, lastConnected: adjustedDate }));
      }
    },
    [activeVehicles, dispatch]
  );

  const extraVehicleInformation = useSelector(
    (state: RootState) => state.vehicle.extraVehicleInformation
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <div id="vehicle-select">
        <Title level={3} style={{ margin: '0px 0px 2px' }}>
          Select Vehicle
        </Title>
        <Form.Item style={{ marginBottom: 0 }}>
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
      <Collapse size="small" bordered={false} style={{ background: 'transparent' }}>
        <Panel
          className="collapse-no-padding"
          header="Vehicle detail"
          key="1"
          style={{ padding: '0px' }}
        >
          <VehicleDetails
            selectedVehicle={selectedVehicle}
            lastPingTime={lastPingTime}
            extraVehicleInformation={extraVehicleInformation}
          />
          {!selectedVehicle && <Empty />}
        </Panel>
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
