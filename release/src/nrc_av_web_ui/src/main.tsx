import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider as ThemeConfigProvider, Layout } from 'antd';
import { Content } from 'antd/es/layout/layout';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Container from './components/Container';
import theme from './config/antd/theme';
import queryClient from './config/query/queryClient';
import './index.css';
import Login from './containers/Login';
import Header from './layouts/Header';
import { store } from './store';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/auth/login',
    element: <Login />
  },
  {
    path: '/cars/registration',
    element: <App />
  }
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <ThemeConfigProvider theme={theme}>
        <Layout>
          <Header />
          <Content style={{ padding: '24px 0' }}>
            <Container style={{ height: '100vh' }}>
              <React.StrictMode>
                <RouterProvider router={router}></RouterProvider>
              </React.StrictMode>
            </Container>
          </Content>
        </Layout>
      </ThemeConfigProvider>
    </QueryClientProvider>
    ,
  </Provider>
);
