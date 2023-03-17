import React, { useCallback } from 'react';
import ipcMsg from '../../../shared/ipcMsg';
import RegisterForm from '../registerForm/RegisterForm';
import './Home.scss';

interface IMachineInfoState {
  certKey?: string;
  name?: string;
  model?: string;
  macAddress?: string;
}

const Home = () => {
  const [vehicleInfo, setMachineInfo] = React.useState<IMachineInfoState | undefined>(undefined);

  const getContent = useCallback(() => {
    if (!vehicleInfo) {
      return null;
    }
    return (
      <table>
        <tbody>
          <tr>
            <td>Name:</td>
            <td>{vehicleInfo.name}</td>
          </tr>
          <tr>
            <td>Model:</td>
            <td>{vehicleInfo.model}</td>
          </tr>
          <tr>
            <td>MAC Address:</td>
            <td>{vehicleInfo.macAddress}</td>
          </tr>
          <tr>
            <td>Key:</td>
            <td>{vehicleInfo.certKey}</td>
          </tr>
        </tbody>
      </table>
    );
  }, [vehicleInfo]);

  React.useEffect(() => {
    window.ipcChannel.sendAndReceive(ipcMsg.RMR.VEHICLE_INFO).then((info: IMachineInfoState) => {
      setMachineInfo(info);
    });
    window.ipcChannel.receive(ipcMsg.M2R.REGISTER_INFO_REPLY, (info: IMachineInfoState) => {
      setMachineInfo(info);
    });
  }, []);

  return (
    <div>
      <header className="App-Header">
        <h1>Welcome to Nissan AV Agent</h1>
      </header>
      <section className="Content">{vehicleInfo ? getContent() : <RegisterForm />}</section>
      <footer className="footer">
        Powered by&nbsp;<span>Nissan</span>
      </footer>
    </div>
  );
};

export default Home;
