import { Modal, Button, Input, message } from 'antd';
import * as React from 'react';
import { AddEditInterfaceDTO, InterfaceDetailDTO } from '../../dtos/interface';
import {
  useAddInterface,
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
  const { mutate: addInterface } = useAddInterface();
  const { refetch } = useGetInterfaceList({ currentPage });
  const handleCloneNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCloneName(event.target.value);
  };

  React.useEffect(() => {
    if (!showModal) {
      setCloneName('');
    }
  }, [showModal]);

  const removeId = (detailInterface: any): any => {
    if (detailInterface instanceof Array) {
      return detailInterface.map((item: any) => removeId(item));
    } else if (detailInterface !== null && typeof detailInterface === 'object') {
      const addInterface: any = {};
      for (const key in detailInterface) {
        if (key !== 'id') {
          addInterface[key] = removeId(detailInterface[key]);
        }
      }
      return addInterface;
    } else {
      return detailInterface;
    }
  };

  const convert = (originalObject: InterfaceDetailDTO): AddEditInterfaceDTO => {
    removeId(originalObject);
    if (originalObject.interfaceDestinations) {
      originalObject.interfaceDestinations = originalObject.interfaceDestinations.map(
        (dest: any) => ({
          ...dest.destination,
          name: dest.name
        })
      );
    }
    return removeId(originalObject);
  };

  const handleClone = () => {
    if (getInterfaceQuery?.data) {
      const addInterfaceDTO = convert(getInterfaceQuery.data);
      addInterfaceDTO.name = cloneName;

      addInterface(addInterfaceDTO, {
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
      });
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
