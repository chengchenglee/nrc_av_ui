/* eslint-disable max-lines-per-function */
import { Button, Card, Col, Divider, Form, Input, Row, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IHostConfig, IVehicleInfoConfig } from '../../../shared/configurationTypes';
import ipcMsg from '../../../shared/ipcMsg';

interface IRegisterInfo {
  name: string;
  model: string;
  host: string;
  rosWorkspace: string;
}

interface RegisterFormProps {
  mode: 'ADD' | 'EDIT';
  vehicleInfo?: IVehicleInfoConfig;
  connectionInfo?: IHostConfig;
}

const { Meta } = Card;

const RegisterForm = ({ mode, connectionInfo, vehicleInfo }: RegisterFormProps) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);

  const onFinish = (registerInfo: IRegisterInfo) => {
    const { name, model, host, rosWorkspace } = registerInfo;
    const newVehicleInfo = { name, model };
    const newConnectionInfo = { host, rosWorkspace };

    if (mode === 'ADD') {
      window.ipcChannel.send(ipcMsg.R2M.REGISTER_INFO, newVehicleInfo, newConnectionInfo);
    } else if (mode === 'EDIT') {
      setSubmitLoading(true);
      window.ipcChannel.send(
        ipcMsg.R2M.UPDATE_VEHICLE,
        { ...vehicleInfo, ...newVehicleInfo },
        newConnectionInfo
      );
    }
  };

  const onFinishFailed = (errorInfo: unknown) => {
    console.error('Failed:', errorInfo);
  };

  const initialValue = useMemo(() => {
    // Common info is init value for both add and edit form
    const commonInfo = {
      host: connectionInfo?.host || 'ws://54.151.30.41:3000',
      rosWorkspace: connectionInfo?.rosWorkspace || '~/projects/nrc_ws'
    };

    if (mode === 'EDIT') {
      return {
        name: vehicleInfo?.name || '',
        model: vehicleInfo?.model || '',
        ...commonInfo
      };
    }

    return commonInfo;
  }, [vehicleInfo]);

  const onCancel = () => {
    navigate('/');
  };

  useEffect(() => {
    if (mode === 'EDIT') {
      form.setFieldsValue(initialValue || {});
    }
  }, [initialValue]);

  useEffect(() => {
    window.ipcChannel.receive(ipcMsg.M2R.UPDATE_VEHICLE_REPLY, () => {
      setSubmitLoading(false);
    });
    return () => {
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.UPDATE_VEHICLE_REPLY);
    };
  }, []);

  return (
    <Card>
      <Meta
        title={mode === 'ADD' ? 'Agent Information' : 'Edit Configuration'}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column'
        }}
      />
      <Divider />
      <Spin spinning={submitLoading}>
        <Row justify="center">
          <Col span={20}>
            <Form
              name="basic"
              labelWrap
              labelAlign="left"
              labelCol={{ flex: '200px' }}
              wrapperCol={{ flex: 1 }}
              initialValues={initialValue}
              onFinish={onFinish}
              colon={false}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
              form={form}
            >
              <Form.Item
                label="Vehicle Name"
                name="name"
                rules={[{ required: true, message: 'Please input vehicle name!' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Vehicle Model"
                name="model"
                rules={[{ required: true, message: 'Please input vehicle model!' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Connection URL"
                name="host"
                rules={[{ required: true, message: 'Please input connection URL!' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="ROS Workspace Folder"
                name="rosWorkspace"
                rules={[{ required: true, message: 'Please input ROS Workspace Folder!' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '30px'
                  }}
                >
                  {mode === 'EDIT' && (
                    <Button type="primary" danger onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button type="primary" htmlType="submit">
                    Submit
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Spin>
    </Card>
  );
};

RegisterForm.defaultProps = {
  vehicleInfo: undefined,
  connectionInfo: undefined
};

export default RegisterForm;
