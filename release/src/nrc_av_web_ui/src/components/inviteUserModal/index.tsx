import { yupResolver } from '@hookform/resolvers/yup';
import { Modal, Button, Form, message } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { isAxiosError } from 'axios';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import TextField from 'components/form/TextField';
import FormWrapper from 'components/wrappers/FormWrapper';
import { AddUserErrorResponse } from 'dtos/user';
import { useGetRoleList } from 'hooks/queries/role';
import { useAddUser } from 'hooks/queries/user';
import { InviteUserFormValue, inviteUserSchema } from 'validation/inviteUserSchema';
import Select from '../form/Select';

interface InviteUserModalProps {
  showModal: boolean;
  onCancel: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ showModal, onCancel }) => {
  const { mutate: addUser, isLoading } = useAddUser();

  const { data: roleList } = useGetRoleList();

  const roleOptions = React.useMemo<DefaultOptionType[]>(() => {
    if (!roleList) {
      return [];
    }
    return roleList?.map((item) => ({ label: item.name, value: item.id }));
  }, [roleList]);

  const methods = useForm<InviteUserFormValue>({
    mode: 'all',
    resolver: yupResolver(inviteUserSchema)
  });

  const handleFinish = (values: InviteUserFormValue) => {
    const updatedValues = {
      ...values,
      roles: Array.isArray(values.roles) ? values.roles : [values.roles]
    };

    addUser(updatedValues, {
      onSuccess: () => {
        message.success('Invite user successfully');
        methods.reset();
        onCancel();
      },
      onError: (err) => {
        if (isAxiosError<AddUserErrorResponse>(err) && err.response) {
          Object.keys(err.response.data).forEach((key) => {
            if (key === 'statusCode') {
              return;
            }
            message.error(err.response?.data[key as keyof AddUserErrorResponse]);
          });
        }
      }
    });
  };

  const onCancelInviteModal = () => {
    methods.reset();
    onCancel();
  };

  return (
    <Modal
      open={showModal}
      title={'Invite User'}
      onCancel={onCancelInviteModal}
      footer={[
        <Button key="cancel" onClick={onCancelInviteModal}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          htmlType="submit"
          form="inviteUserForm"
          disabled={isLoading}
        >
          Submit
        </Button>
      ]}
    >
      <FormWrapper methods={methods}>
        <Form
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 15 }}
          id="inviteUserForm"
          onFinish={methods.handleSubmit(handleFinish)}
        >
          <TextField label="Username" name="username" asterisk />
          <TextField label="Email" name="email" asterisk />
          <Select label="Role" name="roles" options={roleOptions} asterisk />
        </Form>
      </FormWrapper>
    </Modal>
  );
};

export default InviteUserModal;
