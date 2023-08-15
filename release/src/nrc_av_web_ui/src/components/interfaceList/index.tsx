import { Button, Pagination } from 'antd';
import Table, { ColumnsType } from 'antd/es/table';
import { FC, useEffect, useState } from 'react';
import { InterfaceListItem } from '../../dtos/interface';
import { useGetInterfaceList } from '../../hooks/queries/interface';
import CloneModal from '../CloneInterfaceModal';
import DeleteModal from '../DeleteInterfaceModal';

interface InterfaceListProps {
  onUpdateIdChange?: (id: number) => void;
}

// eslint-disable-next-line max-lines-per-function
const InterfaceList: FC<InterfaceListProps> = ({ onUpdateIdChange }) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const { data, isFetching, refetch } = useGetInterfaceList({ currentPage });
  const [showModalUpdate, setShowModalUpdate] = useState(false);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [idInterface, setIdInterface] = useState(Number);

  useEffect(() => {
    refetch();
  }, [currentPage, refetch]);

  const handleCloneButtonClick = (id: number) => {
    setIdInterface(id);
    setShowModalUpdate(true);
  };

  const handleDeleteButtonClick = (id: number) => {
    setIdInterface(id);
    setShowModalDelete(true);
  };

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
          <div style={{ display: 'flex' }}>
            <Button onClick={() => onUpdateIdChange?.(record.id)} type="primary">
              Update
            </Button>
            <Button
              style={{ marginLeft: '10px' }}
              onClick={() => handleCloneButtonClick(record.id)}
              type="primary"
            >
              Clone
            </Button>
            <Button
              style={{ marginLeft: '10px' }}
              onClick={() => handleDeleteButtonClick(record.id)}
              type="primary"
            >
              Delete
            </Button>
          </div>
        );
      }
    }
  ];

  const onPaginationChange = (page: number) => {
    setCurrentPage(page - 1);
  };

  const handleModalCancel = () => {
    setShowModalUpdate(false);
  };

  const handleModalDeleteCancel = () => {
    setShowModalDelete(false);
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

      <CloneModal
        currentPage={currentPage}
        showModal={showModalUpdate}
        id={idInterface}
        onCancel={handleModalCancel}
      />
      <DeleteModal
        currentPage={currentPage}
        showModal={showModalDelete}
        id={idInterface}
        onCancel={handleModalDeleteCancel}
      />
    </>
  );
};

export default InterfaceList;
