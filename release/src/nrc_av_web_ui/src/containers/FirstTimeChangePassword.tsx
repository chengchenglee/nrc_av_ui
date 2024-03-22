import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Form, Typography, message } from 'antd';
import { isAxiosError } from 'axios';
import { FC } from 'react';
import { useForm } from 'react-hook-form';
import TextField from 'components/form/TextField';
import { useChangePassword, useLogin } from 'hooks/queries/auth';
import { store } from 'store';
import { userThunk } from 'store/user/thunks';
import {
  FirstTimeChangePasswordFormValue,
  firstTimeChangePasswordSchema
} from 'validation/changePasswordSchema';
import FormWrapper from '../components/wrappers/FormWrapper';
import { ChangePasswordErrorResponse } from '../dtos/auth';

interface FirstTimeChangePasswordProps {
  username: string;
  password: string;
}

// eslint-disable-next-line max-lines-per-function
const FirstTimeChangePassword: FC<FirstTimeChangePasswordProps> = ({ username, password }) => {
  const { mutate: changePassword, isLoading } = useChangePassword();
  const { mutate: login, isLoading: isLoginLoading } = useLogin();
  const methods = useForm<FirstTimeChangePasswordFormValue>({
    resolver: yupResolver(firstTimeChangePasswordSchema),
    mode: 'all'
  });
  const onFinish = (values: FirstTimeChangePasswordFormValue) => {
    if (isLoading || isLoginLoading) {
      return;
    }
    const { username, newPassword, password } = values;
    changePassword(
      { username, newPassword, password },
      {
        onSuccess: () => {
          login(
            { username, password: newPassword },
            {
              onSuccess: () => {
                message.success('Login successful');
                store.dispatch(userThunk.getCurrentUser());
              },
              onError: () => {
                message.error('Failed to login');
              }
            }
          );
        },
        onError: (err) => {
          if (isAxiosError<ChangePasswordErrorResponse>(err) && err.response) {
            Object.keys(err.response.data).forEach((key) => {
              if (key === 'statusCode') {
                return;
              }
              message.error(err.response?.data[key as keyof ChangePasswordErrorResponse]);
            });
          }
        }
      }
    );
  };
  return (
    <FormWrapper methods={methods}>
      <Form
        onFinish={methods.handleSubmit(onFinish)}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <Typography style={{ marginBottom: 24, fontSize: 24, fontWeight: 500 }}>
          Change Password
        </Typography>
        <TextField
          name="username"
          label="Username"
          inputStyle={{ maxWidth: 400 }}
          disabled
          asterisk
          defaultValue={username}
        />
        <TextField
          name="password"
          label="Current Password"
          inputStyle={{ maxWidth: 400 }}
          password
          asterisk
          defaultValue={password}
        />
        <TextField
          name="newPassword"
          label="New Password"
          inputStyle={{ maxWidth: 400 }}
          password
          asterisk
        />
        <TextField
          name="confirmPassword"
          label="Confirm Password"
          inputStyle={{ maxWidth: 400 }}
          password
          asterisk
        />

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            style={{ minWidth: 120 }}
            disabled={isLoading || isLoginLoading}
          >
            Submit
          </Button>
        </Form.Item>
      </Form>
    </FormWrapper>
  );
};

export default FirstTimeChangePassword;
