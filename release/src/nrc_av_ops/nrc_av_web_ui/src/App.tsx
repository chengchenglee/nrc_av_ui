import { Tabs, TabsProps } from 'antd';
import { GetCurrentUserWrapper } from './components/wrappers/getCurrentUserWrapper';
import { RouterProtectionWrapper } from './components/wrappers/routerProtectionWrapper';
import Register from './containers/Register';
import RunTest from './containers/RunTest';

const items: TabsProps['items'] = [
  { key: '1', label: 'Register Vehicle', children: <Register /> },
  { key: '2', label: 'Run Test', children: <RunTest /> }
];

const App = () => (
  <GetCurrentUserWrapper>
    <RouterProtectionWrapper>
      <div className="App" style={{ display: 'flex' }}>
        <Tabs items={items} />
      </div>
    </RouterProtectionWrapper>
  </GetCurrentUserWrapper>
);

export default App;
