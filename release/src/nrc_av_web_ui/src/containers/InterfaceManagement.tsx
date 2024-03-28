import { faFileImport } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'antd';
import * as React from 'react';
import UploadModal, { UploadModalMethods } from '../components/AddInterfaceModal/uploadModal';
import YamlEditorModal, {
  YamlEditorModalMethods
} from '../components/AddInterfaceModal/yamlEditorModal';
import InterfaceList from '../components/interfaceList';
import '../components/AddInterfaceModal/userWorker';
import { ModeEditor } from '../constants/editorYAML';

const InterfaceManagement = () => {
  const [interfaceId, setInterfaceId] = React.useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = React.useState<number>(0);
  const [yamlContent, setYamlContent] = React.useState<string>('');
  const [modeYamlEditor, setModeYamlEditor] = React.useState<string>('');

  const uploadModal = React.useRef<UploadModalMethods>(null);
  const yamlEditorModal = React.useRef<YamlEditorModalMethods>(null);

  const onInterfaceFileUploaded = React.useCallback(() => {
    uploadModal.current?.showModal();
    setInterfaceId(undefined);
  }, []);

  const onPaginationChange = (page: number) => {
    setCurrentPage(page - 1);
  };

  const onHandleOpenEditInterfacePopup = React.useCallback((id: number) => {
    setModeYamlEditor(ModeEditor.EDIT);
    yamlEditorModal.current?.showModal();
    setInterfaceId(id);
  }, []);

  const onUploadComplete = React.useCallback(() => {
    setModeYamlEditor(ModeEditor.CREATE);
    yamlEditorModal.current?.showModal();
  }, []);

  return (
    <div
      style={{
        margin: 'auto',
        marginTop: '50px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <Button
          type="primary"
          onClick={() => onInterfaceFileUploaded()}
          style={{ marginLeft: '10px' }}
        >
          Import <FontAwesomeIcon icon={faFileImport} style={{ marginLeft: '5px' }} />
        </Button>
      </div>
      <InterfaceList
        onUpdateIdChange={onHandleOpenEditInterfacePopup}
        currentPage={currentPage}
        onPaginationChange={onPaginationChange}
        setYamlContent={setYamlContent}
        setInterfaceId={setInterfaceId}
        interfaceId={interfaceId}
      />

      <UploadModal
        ref={uploadModal}
        setYamlContent={setYamlContent}
        onComplete={onUploadComplete}
      />
      <YamlEditorModal
        ref={yamlEditorModal}
        modeEditor={modeYamlEditor}
        content={yamlContent}
        interfaceId={interfaceId}
        currentPage={currentPage}
      />
    </div>
  );
};

export default InterfaceManagement;
