import { Modal, message, Typography } from 'antd';
import * as React from 'react';
import { useDeleteInterface, useGetInterfaceList } from '../../hooks/queries/interface';

interface DeleteModalProps {
  showModal: boolean;
  onCancel: () => void;
  id: number;
  currentPage: number;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ showModal, onCancel, id, currentPage }) => {
  const { refetch } = useGetInterfaceList({ currentPage });
  const { mutate: deleteInterface } = useDeleteInterface();

  const handleDelete = () => {
    onCancel();
    deleteInterface(id, {
      onSuccess: () => {
        message.success('Delete interface success');
        refetch();
      },
      onError: (error: any) => {
        if (error.response.data.message !== undefined) {
          message.error(error.response.data.message);
        } else {
          message.error('An error occurred while attempting to delete the Interface');
        }
      }
    });
  };
  return (
    <Modal title="Confirm" open={showModal} onOk={handleDelete} onCancel={onCancel}>
      <Typography>
        Are you sure you want to delete this interface? This action cannot be undone.
      </Typography>
    </Modal>
  );
};

export default DeleteModal;
