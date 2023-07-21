/* eslint-disable max-lines-per-function */
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Badge, Card, Col, Descriptions, Divider, Row, Space, Tooltip } from 'antd';
import React, { FC, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IVehicleInfoConfig,
  IVehicleConnection,
  IHostConfig,
  IUpdatedVehicleConfig
} from '../../../shared/configurationTypes';
import { EnumVehicleConnectionState, EnumVehicleStatusState } from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';

const { Meta } = Card;

interface HomeProps {
  vehicleInfo?: IVehicleInfoConfig;
  connectionInfo?: IHostConfig;
}

const Home: FC<HomeProps> = ({ vehicleInfo, connectionInfo }) => {
  const [vehicleStatus, setVehicleStatus] = React.useState<EnumVehicleStatusState>(
    EnumVehicleStatusState.FETCHING
  );
  const location = useLocation();
  if (location.state) {
    const updateConfig = location.state as IUpdatedVehicleConfig;
    // eslint-disable-next-line no-param-reassign
    vehicleInfo = updateConfig.vehicleConfig;
    // eslint-disable-next-line no-param-reassign
    connectionInfo = updateConfig.hostConfig;
  }
  const [vehicleConnectionInfo, setVehicleConnectionInfo] = React.useState<IVehicleConnection>({
    vehicleConnectionStatus: EnumVehicleConnectionState.OFFLINE,
    vehicleOfflineReason: 'Connecting to server...'
  });
  const navigate = useNavigate();
  const displayConnectionStatus = useCallback(() => {
    switch (vehicleConnectionInfo.vehicleConnectionStatus) {
      case EnumVehicleConnectionState.ONLINE:
        return <Badge status="success" text="Online" />;
      case EnumVehicleConnectionState.OFFLINE:
        return (
          <Space>
            <Badge status="error" text="Offline" />
            <Tooltip title={vehicleConnectionInfo.vehicleOfflineReason}>
              <ExclamationCircleOutlined />
            </Tooltip>
          </Space>
        );
      default:
        return null;
    }
  }, [vehicleConnectionInfo]);

  const displayVehicleStatus = useCallback(() => {
    switch (vehicleStatus) {
      case EnumVehicleStatusState.ACTIVE:
        return <Badge status="success" text="Approved" />;
      case EnumVehicleStatusState.ROS_BRIDGE_INIT:
        return <Badge status="processing" text="Initializing Ros Bridge" />;
      case EnumVehicleStatusState.ROS_CONNECTION_INIT:
        return <Badge status="processing" text="Connecting to Ros Bridge..." />;
      case EnumVehicleStatusState.WAITING:
        return <Badge status="processing" text="Waiting for approval" />;
      default:
        return <Badge status="processing" text="Fetching status from server..." />;
    }
  }, [vehicleStatus]);

  const getContent = useCallback(() => {
    if (!vehicleInfo || !vehicleConnectionInfo || !connectionInfo) {
      return null;
    }
    return (
      <Descriptions layout="horizontal" bordered>
        <Descriptions.Item span={12} label="Name">
          {vehicleInfo.name}
        </Descriptions.Item>
        <Descriptions.Item span={12} label="Model">
          {vehicleInfo.model}
        </Descriptions.Item>
        <Descriptions.Item span={12} label="Host URL">
          {connectionInfo.host}
        </Descriptions.Item>
        <Descriptions.Item span={12} label="MAC Address">
          {vehicleInfo.macAddress}
        </Descriptions.Item>
        <Descriptions.Item span={12} label="Key">
          {vehicleInfo.certKey}
        </Descriptions.Item>
        <Descriptions.Item span={12} label="Vehicle status">
          {displayVehicleStatus()}
        </Descriptions.Item>
        <Descriptions.Item span={12} label="Connection status">
          {displayConnectionStatus()}
        </Descriptions.Item>
      </Descriptions>
    );
  }, [
    vehicleInfo,
    vehicleConnectionInfo,
    connectionInfo,
    displayConnectionStatus,
    displayVehicleStatus
  ]);

  React.useEffect(() => {
    window.ipcChannel.sendAndReceive(ipcMsg.RMR.VEHICLE_STATUS_REQUEST);
    window.ipcChannel
      .sendAndReceive(ipcMsg.RMR.VEHICLE_CONNECTION_STATUS_REQUEST)
      ?.then((connected: boolean | undefined) => {
        if (connected) {
          setVehicleConnectionInfo({
            vehicleConnectionStatus: EnumVehicleConnectionState.ONLINE,
            vehicleOfflineReason: undefined
          });
        }
      });
    window.ipcChannel.receive(ipcMsg.M2R.VEHICLE_CONNECTION_STATUS, (info: IVehicleConnection) => {
      setVehicleConnectionInfo(info);
    });
    window.ipcChannel.receive(ipcMsg.M2R.VEHICLE_STATUS, (info: EnumVehicleStatusState) => {
      setVehicleStatus(info);
    });
    return () => {
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.VEHICLE_CONNECTION_STATUS);
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.VEHICLE_STATUS);
    };
  }, []);

  useEffect(() => {
    if (!vehicleInfo) {
      navigate('/add');
    }
  }, [vehicleInfo]);

  return (
    <Card>
      <Meta
        title={vehicleInfo ? 'Agent Information' : 'Agent Configuration'}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column'
        }}
      />
      <Divider />
      <Row justify="center">
        <Col span={20}>{getContent()}</Col>
      </Row>
    </Card>
  );
};

Home.defaultProps = {
  vehicleInfo: undefined,
  connectionInfo: undefined
};
export default Home;
