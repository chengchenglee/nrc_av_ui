import { faChevronLeft, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from 'antd';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import InviteUserModal from '../components/inviteUserModal';
import UserList from '../components/userList';
const UserManagement = () => {
  const navigate = useNavigate();
  const [showModalInviteUser, setShowModalInviteUser] = React.useState(false);
  const handleInviteButtonClick = () => {
    setShowModalInviteUser(true);
  };

  const handleModalInviteCancel = () => {
    setShowModalInviteUser(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <FontAwesomeIcon
        onClick={() => navigate('/vehicle/interface/execution')}
        fontSize={25}
        cursor="pointer"
        color="gray"
        icon={faChevronLeft}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <Button
          type="primary"
          onClick={() => handleInviteButtonClick()}
          style={{ marginLeft: '10px' }}
        >
          Invite <FontAwesomeIcon icon={faUserPlus} style={{ marginLeft: '5px' }} />
        </Button>
      </div>
      <InviteUserModal showModal={showModalInviteUser} onCancel={handleModalInviteCancel} />
      <UserList />
    </div>
  );
};
export default UserManagement;
