import { Button, Form, Input } from 'antd';
import React from 'react';
import ipcMsg from '../../../shared/ipcMsg';

interface IRegisterInfo {
  name: string;
  model: string;
  host: string;
  rosWorkspace: string;
}

const onFinish = (registerInfo: IRegisterInfo) => {
  const { name, model, host, rosWorkspace } = registerInfo;
  const vehicleInfo = { name, model };
  const connectionInfo = { host, rosWorkspace };
  window.ipcChannel.send(ipcMsg.R2M.REGISTER_INFO, vehicleInfo, connectionInfo);
};

const onFinishFailed = (errorInfo: unknown) => {
  console.error('Failed:', errorInfo);
};

const RegisterForm: React.FC = () => (
  <div id="register_form">
    <h3>Agent Configuration</h3>
    <Form
      name="basic"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{
        maxWidth: 600,
        width: '60%',
        margin: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative'
      }}
      initialValues={{ host: 'ws://localhost:3000', rosWorkspace: '~/projects/nrc_ws' }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
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

      <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  </div>
);

export default RegisterForm;
