import { Modal, Upload, Button } from 'antd';
import { useState } from 'react';
import * as React from 'react';

interface UploadModalProps {
  setYamlContent: any;
  onComplete: (() => void) | undefined;
}

export interface UploadModalMethods {
  showModal: () => void;
}

const UploadModal = React.forwardRef<UploadModalMethods, UploadModalProps>((props, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    [props]
  );

  return (
    <Modal title="Import Interface File" open={isModalOpen} onCancel={handleCancel} footer={null}>
      <Upload beforeUpload={handleUpload} fileList={[]} accept=".yaml, .yml">
        <Button>Select Interface Configuration File</Button>
      </Upload>
    </Modal>
  );
});

UploadModal.displayName = 'UploadModal';

export default UploadModal;
