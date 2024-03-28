import { Modal, Typography } from 'antd';
import * as React from 'react';
import { useDeleteInterface } from 'hooks/queries/interface';

interface DeleteModalProps {
  showModal: boolean;
  onCancel: () => void;
  id: number;
  currentPage: number;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ showModal, onCancel, id, currentPage }) => {
  const { mutate: deleteInterface } = useDeleteInterface({ currentPage });

  const handleDelete = () => {
    onCancel();
    deleteInterface(id);
  };
  return (
    <Modal title="Confirm" open={showModal} onOk={handleDelete} onCancel={onCancel} destroyOnClose>
      <Typography>
        Are you sure you want to delete this interface? This action cannot be undone.
      </Typography>
    </Modal>
  );
};

export default DeleteModal;
