import { Button, Typography } from 'antd';
import { Header as HeaderA } from 'antd/es/layout/layout';
import { logout } from '../api/auth';
import Container from '../components/Container';
import { store } from '../store';
import { userThunk } from '../store/user/thunks';

const { Title } = Typography;

const Header = () => (
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
      >
        Nissan-Kelly
      </Title>
      <Button
        type="primary"
        size="large"
        onClick={() => {
          logout();
          store.dispatch(userThunk.getCurrentUser());
          window.location.replace(window.location.origin);
        }}
      >
        Logout
      </Button>
    </Container>
  </HeaderA>
);

export default Header;
