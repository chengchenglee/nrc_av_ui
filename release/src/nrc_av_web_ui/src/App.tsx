import { Tabs, TabsProps } from 'antd';
import { GetCurrentUserWrapper } from './components/wrappers/getCurrentUserWrapper';
import { RouterProtectionWrapper } from './components/wrappers/routerProtectionWrapper';
import CarRegister from './containers/CarRegister';
import CarRunTest from './containers/CarRunTest';

const items: TabsProps['items'] = [
  { key: '1', label: 'Register Car', children: <CarRegister /> },
  { key: '2', label: 'Run Test', children: <CarRunTest /> }
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
