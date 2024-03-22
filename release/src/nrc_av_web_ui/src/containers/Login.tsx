import { Button, Form, Input, message } from 'antd';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { LoginDTO } from 'dtos/auth';
import { useLogin } from 'hooks/queries/auth';
import { store } from 'store';
import { userThunk } from 'store/user/thunks';
import FirstTimeChangePassword from './FirstTimeChangePassword';

const Login = () => {
  const [loginDTO, setLoginDTO] = useState<LoginDTO>({ username: '', password: '' });
  const [formChangePass, setFormChangePass] = useState(false);
  const { mutate: loginHandler, error } = useLogin();

  const onFinish = (values: LoginDTO) => {
    setLoginDTO(values);
    loginHandler(values, {
      onSuccess: () => {
        message.success('Login successfully');
        store.dispatch(userThunk.getCurrentUser());
      },
      onError: (err) => {
        if (isAxiosError(err) && err.response) {
          if (err.response.data.errorMessage && err.response.status !== 424) {
            message.error(err.response.data.errorMessage);
          }
        } else {
          message.error('Failed to login');
        }
      }
    });
  };

  useEffect(() => {
    if (isAxiosError(error) && error.response?.status === 424) {
      setFormChangePass(true);
    }
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        marginTop: '50px'
      }}
    >
      {formChangePass ? (
        <FirstTimeChangePassword username={loginDTO.username} password={loginDTO.password} />
      ) : (
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
      )}
    </div>
  );
};

export default Login;
