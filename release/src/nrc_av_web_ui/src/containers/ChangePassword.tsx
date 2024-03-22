import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Form, message } from 'antd';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { logout } from 'api/auth';
import TextField from 'components/form/TextField';
import FormWrapper from 'components/wrappers/FormWrapper';
import { useChangePassword } from 'hooks/queries/auth';
import { store, useStoreUser } from 'store';
import { userThunk } from 'store/user/thunks';
import { ChangePasswordFormValue, changePasswordSchema } from 'validation/changePasswordSchema';
import { ChangePasswordErrorResponse } from '../dtos/auth';

// eslint-disable-next-line max-lines-per-function
const ChangePassword = () => {
  const navigate = useNavigate();
  const methods = useForm<ChangePasswordFormValue>({
    resolver: yupResolver(changePasswordSchema),
    mode: 'all'
  });
  const { username } = useStoreUser();
  const { mutate: changePasswordHandler, isLoading } = useChangePassword();
  const onFinish = (values: ChangePasswordFormValue) => {
    if (isLoading) {
      return;
    }
    changePasswordHandler(
      {
        username,
        password: values.password,
        newPassword: values.newPassword
      },
      {
        onSuccess: () => {
          message.success('Change password successfully');
          logout().then(() => {
            store.dispatch(userThunk.getCurrentUser());
          });
        },
        onError(err) {
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
    <div
      style={{
        padding: 20
      }}
    >
      <FontAwesomeIcon
        onClick={() => navigate('/vehicle/interface/execution')}
        fontSize={25}
        cursor="pointer"
        color="gray"
        icon={faChevronLeft}
      />
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
          <TextField
            name="password"
            label="Current Password"
            inputStyle={{ maxWidth: 400 }}
            password
            asterisk
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
            <Button type="primary" htmlType="submit" style={{ minWidth: 120 }} disabled={isLoading}>
              Submit
            </Button>
          </Form.Item>
        </Form>
      </FormWrapper>
    </div>
  );
};

export default ChangePassword;
