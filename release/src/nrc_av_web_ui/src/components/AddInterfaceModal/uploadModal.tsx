import { Modal, Upload, Button, message } from 'antd';
import { useState } from 'react';
import * as React from 'react';
import { userRole } from '../../constants/user';
import { useStoreUser } from '../../store';
import { roleCheck } from '../../utilities/data';

interface UploadModalProps {
  setYamlContent: any;
  onComplete: (() => void) | undefined;
}

export interface UploadModalMethods {
  showModal: () => void;
}

const UploadModal = React.forwardRef<UploadModalMethods, UploadModalProps>((props, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { roles } = useStoreUser();

  React.useImperativeHandle(ref, () => ({
    showModal: () => {
      setIsModalOpen(true);
    }
  }));

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleUpload = React.useCallback(
    async (file: File) => {
      if (!roleCheck([userRole.admin, userRole.engineer], roles)) {
        message.error('Not enough permission to upload');
        return false;
      }
      try {
        const textContent = await file.text();
        props.setYamlContent(textContent);
        props.onComplete?.();
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error parsing YAML:', error);
      }

      return false;
    },
    [props, roles]
  );

  return (
    <Modal
      title="Import Interface File"
      open={isModalOpen}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
    >
      <Upload beforeUpload={handleUpload} fileList={[]} accept=".yaml, .yml">
        <Button>Select Interface Configuration File</Button>
      </Upload>
    </Modal>
  );
});

UploadModal.displayName = 'UploadModal';

export default UploadModal;
