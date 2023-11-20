/* eslint-disable max-lines-per-function */
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Badge, Card, Col, Descriptions, Divider, Progress, Row, Space, Tooltip } from 'antd';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IVehicleInfoConfig,
  IVehicleConnection,
  IHostConfig,
  IUpdatedVehicleConfig
} from '../../../shared/configurationTypes';
import {
  EnumVehicleConnectionState,
  EnumVehicleStatusState,
  ROS_BRIDGE_INIT
} from '../../../shared/constants';
import ipcMsg from '../../../shared/ipcMsg';
import CollapsibleMessageList from '../message/Message';

const { Meta } = Card;

interface HomeProps {
  vehicleInfo?: IVehicleInfoConfig;
  connectionInfo?: IHostConfig;
}

const Home: FC<HomeProps> = ({ vehicleInfo, connectionInfo }) => {
  const [vehicleStatus, setVehicleStatus] = React.useState<EnumVehicleStatusState>(
    EnumVehicleStatusState.FETCHING
  );

  const [progress, setProgress] = useState<number>(0);

  const setProgressToValue = (value: number) => {
    setProgress(value);
  };

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (progress < 99) {
        setProgress(
          (prevProgress) =>
            prevProgress + Math.floor(Math.random() * ROS_BRIDGE_INIT.PERCENT_MOVEMENT_PROGRESS)
        );
      }
    }, ROS_BRIDGE_INIT.PROGRESS_INTERVAL);

    const checkProgressCompletion = () => {
      const checkStatusInterval = setInterval(() => {
        if (vehicleStatus === EnumVehicleStatusState.ACTIVE) {
          setProgressToValue(100);
          clearInterval(checkStatusInterval);
        }
      }, ROS_BRIDGE_INIT.CHECK_INTERVAL);
    };

    checkProgressCompletion();

    return () => {
      clearInterval(progressInterval);
    };
  }, [progress, vehicleStatus]);
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
    if (progress >= 100 && vehicleStatus === EnumVehicleStatusState.ACTIVE) {
      return 'Approved';
    }
    switch (vehicleStatus) {
      case EnumVehicleStatusState.ROS_BRIDGE_INIT:
        return 'Initializing Ros Bridge';
      case EnumVehicleStatusState.ROS_CONNECTION_INIT:
        return 'Connecting to Ros Bridge...';
      case EnumVehicleStatusState.WAITING:
        return 'Waiting for approval';
      default:
        return 'Fetching status from server...';
    }
  }, [vehicleStatus, progress]);

  const getContent = useCallback(() => {
    const progressColor = { '0%': '#87d068', '50%': '#ffe58f', '100%': '#ffccc7' };
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Progress
              type="circle"
              style={{ paddingRight: 10 }}
              strokeColor={progressColor}
              width={40}
              percent={
                vehicleStatus === EnumVehicleStatusState.ACTIVE
                  ? Math.min(progress, 100)
                  : Math.min(progress, 99)
              }
            />
            {displayVehicleStatus()}
          </div>
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
    vehicleStatus,
    progress,
    displayVehicleStatus,
    displayConnectionStatus
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
  }, [navigate, vehicleInfo]);

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
        <Col span={19}>{getContent()}</Col>
      </Row>
      <Divider />
      <CollapsibleMessageList />
    </Card>
  );
};

Home.defaultProps = {
  vehicleInfo: undefined,
  connectionInfo: undefined
};
export default Home;
