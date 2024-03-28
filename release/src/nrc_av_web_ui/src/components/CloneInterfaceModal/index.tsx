import { Modal, Button, Input, message, Spin } from 'antd';
import * as React from 'react';
import { useCloneInterface, useGetInterfaceById } from 'hooks/queries/interface';

interface CloneModalProps {
  showModal: boolean;
  onCancel: () => void;
  id: number;
  currentPage: number;
}

const CloneModal: React.FC<CloneModalProps> = ({ showModal, onCancel, id, currentPage }) => {
  const [cloneName, setCloneName] = React.useState('');

  const { data: interfaceData } = useGetInterfaceById(id);

  const { mutate: cloneInterface, isLoading: isCloning } = useCloneInterface({ currentPage });

  const handleCloneNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCloneName(event.target.value);
  };

  React.useEffect(() => {
    if (!showModal) {
      setCloneName('');
    }
  }, [showModal]);

  const handleClone = () => {
    if (cloneName.trim().length === 0) {
      message.error('Blank interface name');
      return 0;
    }
    if (interfaceData) {
      cloneInterface({ id, data: { name: cloneName } });
    }
    return onCancel();
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
        <Button key="clone" type="primary" onClick={handleClone} disabled={isCloning}>
          Clone
        </Button>
      ]}
      destroyOnClose
    >
      {interfaceData ? (
        <>
          <p>
            Clone from: <b>{interfaceData?.name}</b>
          </p>
          <p>Please enter the name for the clone interface:</p>
          <Input value={cloneName} onChange={handleCloneNameChange} />
        </>
      ) : (
        <Spin />
      )}
    </Modal>
  );
};

export default CloneModal;
