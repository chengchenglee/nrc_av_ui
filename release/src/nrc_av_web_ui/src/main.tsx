import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider as ThemeConfigProvider } from 'antd';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import theme from './config/antd/theme';
import { initPublicClient } from './config/axios/publicClient';
import queryClient from './config/query/queryClient';
import './index.css';
import { store } from './store';

initPublicClient(store);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <ThemeConfigProvider theme={theme}>
        <React.StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </React.StrictMode>
      </ThemeConfigProvider>
    </QueryClientProvider>
  </Provider>
);
