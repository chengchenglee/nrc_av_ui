/* eslint-disable max-len */
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Pagination } from 'antd';
import Table, { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import { FC, useEffect, useState } from 'react';
import { InterfaceListItem } from '../../dtos/interface';
import { useGetContentByIdInterface, useGetInterfaceList } from '../../hooks/queries/interface';
import CloneModal from '../CloneInterfaceModal';
import DeleteModal from '../DeleteInterfaceModal';

interface InterfaceListProps {
  onUpdateIdChange?: (id: number) => void;
  onPaginationChange: (page: number) => void;
  currentPage: number;
  setYamlContent: any;
}

interface DataYaml {
  data: {
    content: string;
  };
}

// eslint-disable-next-line max-lines-per-function
const InterfaceList: FC<InterfaceListProps> = ({
  onUpdateIdChange,
  onPaginationChange,
  currentPage,
  setYamlContent
}) => {
  const { data, isFetching, refetch } = useGetInterfaceList({ currentPage });
  const [showModalUpdate, setShowModalUpdate] = useState(false);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [idInterface, setIdInterface] = useState(Number);

  const { data: dataYaml, refetch: refetchYml } = useGetContentByIdInterface(idInterface);

  useEffect(() => {
    if (dataYaml) {
      setYamlContent((dataYaml as unknown as DataYaml).data.content);
    }
  }, [dataYaml, setYamlContent]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleEditButtonClick = (id: number) => {
    onUpdateIdChange?.(id);
    setIdInterface(id);
    if (id === idInterface) {
      refetchYml();
    }
  };

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
      title: 'Updated Time',
      dataIndex: 'updatedAt',
      render: (updatedAt) => moment(updatedAt).format('MMM D, YYYY, h:mm A')
    },
    {
      title: 'Actions',
      dataIndex: '',
      width: '15%',
      render(_, record) {
        return (
          <div style={{ display: 'flex' }}>
            <Button
              key="edit"
              type="primary"
              style={{ marginLeft: '10px', backgroundColor: 'green' }}
              onClick={() => handleEditButtonClick(record.id)}
              icon={<EditOutlined />}
            />
            <Button
              key="clone"
              type="primary"
              style={{ marginLeft: '10px', backgroundColor: '#ffcc00' }}
              onClick={() => handleCloneButtonClick(record.id)}
              icon={<CopyOutlined />}
            />
            <Button
              key="delete"
              type="primary"
              style={{ marginLeft: '10px', backgroundColor: 'red' }}
              onClick={() => handleDeleteButtonClick(record.id)}
              icon={<DeleteOutlined />}
            />
          </div>
        );
      }
    }
  ];

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
          total={data?.total ?? 0}
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
