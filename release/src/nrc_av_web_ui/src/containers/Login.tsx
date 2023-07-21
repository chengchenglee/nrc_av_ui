import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { LoginDTO } from '../dtos/login';
import { useLogin } from '../hooks/queries/auth';

const Login = () => {
  const [loginDTO, setLoginDTO] = useState<LoginDTO>({ username: '', password: '' });
  const runLogin = useLogin(loginDTO);
  const onFinish = (values: LoginDTO) => {
    setLoginDTO(values);
  };

  useEffect(() => {
    if (loginDTO.username.length && loginDTO.password.length) {
      runLogin.refetch();
    }
  }, [loginDTO, runLogin]);

  return (
    <div
      style={{
        display: 'flex',
        marginTop: '50px'
      }}
    >
      <Form
        name="basic"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 20 }}
        style={{
          width: '30%',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
        }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: 'Please input your username!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button style={{ width: '100%' }} type="primary" htmlType="submit">
            Login
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Login;
