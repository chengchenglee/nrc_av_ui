import { faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Avatar, Dropdown, MenuProps, Typography } from 'antd';
import { Header as HeaderA } from 'antd/es/layout/layout';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from 'components/Container';
import { userRole } from 'constants/user';
import { useLogout } from 'hooks/queries/auth';
import { store, useStoreUser } from 'store';
import { userThunk } from 'store/user/thunks';
import { roleCheck } from 'utilities/data';

const { Title } = Typography;

const Header = () => {
  const { username, id, roles } = useStoreUser();
  const { mutateAsync: logout } = useLogout();
  const navigate = useNavigate();
  const shouldDisable = useCallback(
    (acceptedRoles: string[]) => roleCheck(acceptedRoles, roles),
    [roles]
  );
  const items = useMemo<MenuProps['items']>(
    () =>
      [
        {
          label: 'Vehicle Registration',
          key: '1',
          disabled: !shouldDisable([userRole.admin]),
          onClick: () => {
            navigate('/menu/registration');
          }
        },
        {
          label: 'User Management',
          key: '2',
          disabled: !shouldDisable([userRole.admin]),
          onClick: () => {
            navigate('/menu/manage/user');
          }
        },
        {
          label: 'Change Password',
          key: '3',
          onClick: () => {
            navigate('/auth/change-password');
          }
        },
        {
          label: 'Log out',
          key: '4',
          onClick: () => {
            logout().then(() => {
              store.dispatch(userThunk.getCurrentUser());
            });
          }
        }
      ].filter((item) => !item.disabled),
    [logout, navigate, shouldDisable]
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

        {id !== 0 && (
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
                Hello, {username}
              </Typography.Text>
            </div>
          </Dropdown>
        )}
      </Container>
    </HeaderA>
  );
};

export default Header;
