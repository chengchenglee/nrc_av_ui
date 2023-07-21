import { CopyrightOutlined } from '@ant-design/icons';
import { Layout, Typography } from 'antd';
import { Outlet } from 'react-router-dom';

const { Header, Footer, Content } = Layout;
const { Title, Paragraph } = Typography;
const MainLayout = () => (
  <Layout style={{ minHeight: '95vh' }}>
    <Header>
      <Title
        level={1}
        style={{
          color: 'white',
          margin: 'auto',
          padding: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        Nissan AV Agent
      </Title>
    </Header>
    <Content>
      <Outlet />
    </Content>
    <Footer style={{ position: 'fixed', left: 0, bottom: 0, right: 0, padding: '5px 50px' }}>
      <Paragraph
        style={{
          margin: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px'
        }}
      >
        Powered by Nissan
        <CopyrightOutlined style={{ margin: '5px' }} />
      </Paragraph>
    </Footer>
  </Layout>
);

export default MainLayout;
