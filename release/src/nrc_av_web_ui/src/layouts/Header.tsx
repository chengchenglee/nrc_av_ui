import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Avatar, Dropdown, MenuProps, Typography } from 'antd';
import { Header as HeaderA } from 'antd/es/layout/layout';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import Container from '../components/Container';
import { store, useStoreUser } from '../store';
import { userThunk } from '../store/user/thunks';

const { Title } = Typography;

const Header = () => {
  const user = useStoreUser();
  const navigate = useNavigate();
  const items = useMemo<MenuProps['items']>(
    () => [
      {
        label: 'Vehicle Registration',
        key: '1',
        onClick: () => {
          navigate('/menu/registration');
        }
      },
      {
        label: 'Log out',
        key: '2',
        onClick: () => {
          logout().then(() => {
            store.dispatch(userThunk.getCurrentUser());
          });
        }
      }
    ],
    [navigate]
  );

  return (
    <HeaderA>
      <Container style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <Title
          level={2}
          style={{
            textAlign: 'center',
            color: 'white',
            fontWeight: 'bold',
            margin: 0,
            flex: 1
          }}
          onClick={() => navigate('/vehicle/interface/execution')}
        >
          Nissan
        </Title>

        {user.id !== 0 && (
          <Dropdown menu={{ items }} trigger={['click']}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <Avatar
                style={{
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                size={40}
                icon={<FontAwesomeIcon icon={faUser} color="black" />}
              />
              <Typography.Text
                style={{
                  color: 'white',
                  fontWeight: 600
                }}
              >
                Hello, {user.username}
              </Typography.Text>
            </div>
          </Dropdown>
        )}
      </Container>
    </HeaderA>
  );
};

export default Header;
