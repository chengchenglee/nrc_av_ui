import { Modal, Button, Input, message } from 'antd';
import * as React from 'react';
import {
  useCloneInterface,
  useGetInterfaceById,
  useGetInterfaceList
} from '../../hooks/queries/interface';

interface CloneModalProps {
  showModal: boolean;
  onCancel: () => void;
  id: number;
  currentPage: number;
}

const CloneModal: React.FC<CloneModalProps> = ({ showModal, onCancel, id, currentPage }) => {
  const [cloneName, setCloneName] = React.useState('');
  const getInterfaceQuery = useGetInterfaceById(id);
  const { mutate: cloneInterface } = useCloneInterface();
  const { refetch } = useGetInterfaceList({ currentPage });
  const handleCloneNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCloneName(event.target.value);
  };

  React.useEffect(() => {
    if (!showModal) {
      setCloneName('');
    }
  }, [showModal]);

  const handleClone = () => {
    if (getInterfaceQuery?.data) {
      cloneInterface(
        { id, data: { name: cloneName } },
        {
          onSuccess: () => {
            message.success('Clone interface success');
            refetch();
          },
          onError: (error: any) => {
            if (error.response.data.message !== undefined) {
              message.error(error.response.data.message);
            } else {
              message.error('An error occurred while attempting to clone the Interface');
            }
          }
        }
      );
    }
    onCancel();
  };

  return (
    <Modal
      open={showModal}
      title={'Clone Interface'}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="clone" type="primary" onClick={handleClone}>
          Clone
        </Button>
      ]}
    >
      <p>
        Clone from: <b>{getInterfaceQuery.data?.name}</b>
      </p>
      <p>Please enter the name for the clone interface:</p>
      <Input value={cloneName} onChange={handleCloneNameChange} />
    </Modal>
  );
};

export default CloneModal;
