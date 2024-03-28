import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Tag, TableColumnsType, Button, Typography, Popconfirm } from 'antd';
import Table from 'antd/es/table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterUserParams, User } from 'dtos/user';
import { useDeleteUser, useGetListUsers } from 'hooks/queries/user';
import EditUserModal from '../EditUserModal';

interface DataType extends User {
  key: number;
}

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<FilterUserParams>({ currentPage: 1 });
  const [isOpenEdit, setOpenEdit] = React.useState(false);

  const { data, isLoading } = useGetListUsers({ ...filter, currentPage: filter.currentPage - 1 });

  const { mutate: deleteUser } = useDeleteUser();

  const tableData = React.useMemo<DataType[]>(
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    () => (data ? data.users.map((user) => ({ ...user, key: user.id })) : []),
    [data]
  );

  const columns: TableColumnsType<DataType> = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'name',
      render: (text) => <Typography>{text}</Typography>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Role',
      key: 'role',
      dataIndex: 'role',
      render: (_, { roles }) => (
        <>
          {roles.map((role) => (
            <Tag color="geekblue" key={role.name}>
              {role.name.toUpperCase()}
            </Tag>
          ))}
        </>
      )
    },
    {
      title: 'Active',
      key: 'isActive',
      dataIndex: 'isActive',
      render: (_, { isActive }) => (
        <Tag color={isActive === true ? 'blue' : 'red'}>{isActive ? 'YES' : 'NO'}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      dataIndex: 'actions',
      align: 'center',
      render: (_, record) => (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          <Button
            icon={<EditOutlined />}
            style={{ backgroundColor: 'green', color: 'white' }}
            onClick={() => {
              navigate({ search: `?id=${record.id}` });
              setOpenEdit(true);
            }}
          />
          <Popconfirm
            title={`Delete user ${record.username}`}
            description="Are you sure to delete this user?"
            onConfirm={() => deleteUser(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} style={{ backgroundColor: 'red', color: 'white' }} />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={tableData}
        loading={isLoading}
        pagination={{
          onChange(page, pageSize) {
            setFilter({ currentPage: page, pageSize });
          },
          defaultCurrent: filter.currentPage,
          total: data?.total
        }}
      />
      <EditUserModal isOpen={isOpenEdit} onClose={() => setOpenEdit(false)} />
    </>
  );
};

export default UserList;
