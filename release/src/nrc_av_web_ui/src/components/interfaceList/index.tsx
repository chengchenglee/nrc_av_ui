import { Button, Pagination } from 'antd';
import Table, { ColumnsType } from 'antd/es/table';
import { FC, useState } from 'react';
import { InterfaceListItem } from '../../dtos/interface';
import { useGetInterfaceList } from '../../hooks/queries/interface';

interface InterfaceListProps {
  onUpdateIdChange?: (id: number) => void;
}

const InterfaceList: FC<InterfaceListProps> = ({ onUpdateIdChange }) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const { data, isFetching } = useGetInterfaceList({ currentPage });

  const columns: ColumnsType<InterfaceListItem> = [
    {
      title: 'No.',
      dataIndex: 'id',
      rowScope: 'row'
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Model',
      dataIndex: 'modelName',
      key: 'modelName'
    },
    {
      title: 'Actions',
      dataIndex: '',
      width: '15%',
      render(_, record) {
        return (
          <Button onClick={() => onUpdateIdChange?.(record.id)} type="primary">
            Update
          </Button>
        );
      }
    }
  ];

  const onPaginationChange = (page: number) => {
    setCurrentPage(page - 1);
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <Table
          columns={columns}
          dataSource={data?.interfaces?.map((value) => ({
            ...value,
            key: value.id,
            modelName: value.model?.name
          }))}
          loading={isFetching}
          pagination={false}
        />
        <Pagination
          style={{ marginTop: '20px', right: 0, position: 'absolute' }}
          defaultCurrent={1}
          total={data?.total || 0}
          onChange={onPaginationChange}
          showSizeChanger={false}
        />
      </div>
    </>
  );
};

export default InterfaceList;
