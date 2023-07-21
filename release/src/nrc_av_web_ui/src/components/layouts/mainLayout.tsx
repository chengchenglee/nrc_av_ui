import { Layout } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { FC, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../../layouts/Header';
import Container from '../Container';

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: FC<MainLayoutProps> = () => (
  <Layout
    style={{
      height: '100vh'
    }}
  >
    <Header />
    <Content style={{ padding: '0 0', overflow: 'scroll' }}>
      <Container>
        <Outlet />
      </Container>
    </Content>
  </Layout>
);

export default MainLayout;
