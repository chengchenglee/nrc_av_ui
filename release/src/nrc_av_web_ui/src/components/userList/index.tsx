import { Tag, TableColumnsType } from 'antd';
import Table from 'antd/es/table';
import * as React from 'react';
import { FilterUserParams, User } from 'dtos/user';
import { useGetListUsers } from 'hooks/queries/user';

interface DataType extends User {
  key: number;
}

const columns: TableColumnsType<DataType> = [
  {
    title: 'Username',
    dataIndex: 'username',
    key: 'name',
    render: (text) => <text>{text}</text>
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
  }
];

const UserList: React.FC = () => {
  const [filter, setFilter] = React.useState<FilterUserParams>({ currentPage: 1 });
  const { data, isLoading } = useGetListUsers({ ...filter, currentPage: filter.currentPage - 1 });

  const tableData = React.useMemo<DataType[]>(
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    () => (data ? data.users.map((user) => ({ ...user, key: user.id })) : []),
    [data]
  );

  return (
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
  );
};

export default UserList;
