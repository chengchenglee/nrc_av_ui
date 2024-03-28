import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Form, Modal, Spin, message } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { FC, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { useGetUserById, useUpdateUser } from 'hooks/queries/user';
import { EditUserFormValue, editUserSchema } from 'validation/editUserSchema';
import { useGetRoleList } from '../../hooks/queries/role';
import Checkbox from '../form/Checkbox';
import Select from '../form/Select';
import TextField from '../form/TextField';
import FormWrapper from '../wrappers/FormWrapper';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditUserModal: FC<EditUserModalProps> = ({ isOpen, onClose }) => {
  const [queryParams, setQueryParams] = useSearchParams();

  const userId = useMemo(() => queryParams.get('id'), [queryParams]);

  const { mutateAsync: updateUser, isLoading: updatingUser } = useUpdateUser();

  const { data: userData } = useGetUserById(userId);

  const { data: roleList } = useGetRoleList();

  const roleOptions = useMemo<DefaultOptionType[]>(() => {
    if (!roleList) {
      return [];
    }
    return roleList?.map((item) => ({ label: item.name, value: item.id }));
  }, [roleList]);

  const methods = useForm<EditUserFormValue>({
    mode: 'all',
    resolver: yupResolver(editUserSchema)
  });

  const onCloseHandler = useCallback(() => {
    queryParams.delete('id');
    setQueryParams(queryParams);
    methods.reset({ email: '', role: null, username: '' });
    onClose();
  }, [methods, onClose, queryParams, setQueryParams]);

  const onConfirm = useCallback(
    async (e: EditUserFormValue) => {
      if (!userId || !e.role) {
        message.error('Missing user ID');
        return undefined;
      }
      delete e.username;
      return await updateUser(
        {
          id: Number(userId),
          email: e.email,
          roles: [e.role],
          isActive: e.isActive
        },
        { onSuccess: () => onCloseHandler() }
      );
    },
    [onCloseHandler, updateUser, userId]
  );

  useEffect(() => {
    if (userData) {
      // TODO: Have to adjust this for multiple roles in the future
      methods.setValue('email', userData.email);
      methods.setValue('role', userData.roles[0].id);
      methods.setValue('isActive', userData.isActive);
      methods.setValue('username', userData.username);
    }
  }, [methods, userData]);

  return (
    <Modal
      open={isOpen}
      title="Edit User"
      style={{ display: 'flex', flexDirection: 'column' }}
      destroyOnClose
      onCancel={onCloseHandler}
      footer={[
        <Button key="cancel" onClick={onCloseHandler}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          htmlType="submit"
          form="editUserForm"
          disabled={updatingUser}
        >
          Submit
        </Button>
      ]}
    >
      <FormWrapper methods={methods}>
        {userData ? (
          <Form
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 16 }}
            id="editUserForm"
            onFinish={methods.handleSubmit(onConfirm)}
          >
            <TextField label="Username" name="username" disabled />
            <TextField label="Email" name="email" asterisk />
            <Select label="Role" name="role" options={roleOptions} asterisk />
            <Checkbox label="Active" name="isActive" asterisk />
          </Form>
        ) : (
          <Spin />
        )}
      </FormWrapper>
    </Modal>
  );
};

export default EditUserModal;
