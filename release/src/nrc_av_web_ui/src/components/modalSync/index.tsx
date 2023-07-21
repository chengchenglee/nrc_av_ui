import { faEquals, faCirclePlus, faCircleMinus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { UseQueryResult } from '@tanstack/react-query';
import { List, Modal } from 'antd';
import diff from 'diff-arrays-of-objects';
import * as React from 'react';
import { ROSNodeDTO, ROSNodeSyncingDTO } from '../../dtos/ros-node';
import { doUpdateROSNodes } from '../../hooks/queries/vehicle';
import './styles.scss';

interface IROSNodeSyncingData {
  name: string;
  packageName: string;
  icon: React.ReactElement;
  status: 'added' | 'removed' | 'same';
}

interface IROSNodeSyncing {
  isChanged: boolean;
  data: IROSNodeSyncingData[];
}

const convertData = (
  items: ROSNodeDTO[],
  status: 'added' | 'removed' | 'same'
): IROSNodeSyncingData[] =>
  items.map((item) => ({
    name: item.name,
    packageName: item.packageName,
    icon: (
      <FontAwesomeIcon
        style={{
          color: status === 'added' ? 'green' : status === 'removed' ? 'red' : 'gray',
          width: '17px',
          height: '17px'
        }}
        icon={status === 'added' ? faCirclePlus : status === 'removed' ? faCircleMinus : faEquals}
      />
    ),
    status
  }));

const addUniqueKey = (nodes: ROSNodeDTO[]) =>
  nodes.map((node) => ({
    name: node.name,
    packageName: node.packageName,
    uniqeKey: `${node.packageName}/${node.name}`
  }));

interface IProps {
  vehicleId: number | undefined;
  syncedQueryData: UseQueryResult<ROSNodeSyncingDTO, any>;
}

export interface ModelSyncMethods {
  showModal: (fileId: number) => void;
}

const ModalSync = React.forwardRef<ModelSyncMethods, IProps>((props, ref) => {
  const { vehicleId, syncedQueryData } = props;

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDataLoading, setDataLoading] = React.useState(false);

  const { mutate: updateROSNodes, isLoading } = doUpdateROSNodes();

  React.useImperativeHandle(ref, () => ({
    showModal: () => {
      setIsModalOpen(true);
    }
  }));

  const handleOk = () => {
    const rosNodes = syncedQueryData.data?.latestNodes;
    if (!vehicleId || !rosNodes) {
      return;
    }
    updateROSNodes(
      { vehicleId, rosNodes },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
        onSettled: () => {
          syncedQueryData.remove();
        }
      }
    );
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const contentData = React.useMemo((): IROSNodeSyncing | undefined => {
    if (!isModalOpen || !syncedQueryData.data || syncedQueryData.isError) {
      return undefined;
    }
    const currNodes = addUniqueKey(syncedQueryData.data.currentNodes);
    const latestNodes = addUniqueKey(syncedQueryData.data.latestNodes);
    const res = diff(currNodes, latestNodes, 'uniqeKey');
    const data = [
      ...convertData(res.removed, 'removed'),
      ...convertData(res.added, 'added'),
      ...convertData(res.same, 'same')
    ];
    return {
      isChanged: res.removed.length > 0 || res.added.length > 0,
      data
    };
  }, [syncedQueryData.data, isModalOpen, syncedQueryData.isError]);

  React.useEffect(() => {
    if (isModalOpen && vehicleId) {
      setDataLoading(true);
      syncedQueryData.refetch().then(() => {
        setDataLoading(false);
      });
    }
  }, [isModalOpen]);

  return (
    <Modal
      className="model-custom"
      title="ROS Nodes synchronizing"
      open={isModalOpen}
      onOk={handleOk}
      okButtonProps={{ disabled: !contentData?.isChanged }}
      onCancel={handleCancel}
      maskClosable={false}
      confirmLoading={isLoading}
    >
      <List
        loading={isDataLoading}
        style={{ overflowY: 'auto', maxHeight: '400px' }}
        itemLayout="horizontal"
        dataSource={contentData?.data}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              className={`item-state ${item.status}`}
              avatar={item.icon}
              title={`${item.packageName}/${item.name}`}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
});

ModalSync.displayName = 'ModalSync';

export default ModalSync;
