import { faChevronLeft, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'antd';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import AddEditInterfaceModel, {
  AddEditInterfaceModelMethods
} from '../components/AddInterfaceModel';
import InterfaceList from '../components/interfaceList';

const InterfaceManagement = () => {
  const addInterfacePopup = React.useRef<AddEditInterfaceModelMethods>(null);
  const editInterfacePopup = React.useRef<AddEditInterfaceModelMethods>(null);
  const navigate = useNavigate();
  const [editingId, setEditingId] = React.useState<number>();

  const onHandleOpenAddInterfacePopup = React.useCallback(() => {
    addInterfacePopup.current?.showModal();
  }, []);

  const onHandleOpenEditInterfacePopup = React.useCallback((id: number) => {
    editInterfacePopup.current?.showModal();
    setEditingId(id);
  }, []);

  return (
    <>
      <div
        style={{
          margin: 'auto',
          marginTop: '50px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <FontAwesomeIcon
            onClick={() => navigate('/vehicle/registration')}
            fontSize={25}
            cursor="pointer"
            color="gray"
            icon={faChevronLeft}
          />
          <Button
            icon={<FontAwesomeIcon icon={faPlus} style={{ marginRight: '10px' }} />}
            type="primary"
            onClick={() => onHandleOpenAddInterfacePopup()}
          >
            Add new Interface
          </Button>
        </div>
        <InterfaceList onUpdateIdChange={onHandleOpenEditInterfacePopup} />
        <AddEditInterfaceModel mode="EDIT" id={editingId} ref={editInterfacePopup} />
        <AddEditInterfaceModel mode="ADD" ref={addInterfacePopup} />
      </div>
    </>
  );
};

export default InterfaceManagement;
