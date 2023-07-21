import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { IHostConfig, IVehicleInfoConfig } from '../shared/configurationTypes';
import ipcMsg from '../shared/ipcMsg';
import Home from './Components/home/Home';
import MainLayout from './Components/layout/mainLayout';
import RegisterForm from './Components/registerForm/RegisterForm';

const App = () => {
  const navigate = useNavigate();
  const [vehicleInfo, setVehicleInfo] = useState<IVehicleInfoConfig | undefined>();
  const [connectionInfo, setConnectionInfo] = useState<IHostConfig | undefined>(undefined);
  useEffect(() => {
    window.ipcChannel.receive(ipcMsg.M2R.NAVIGATE, (path: string) => {
      navigate(path);
    });

    window.ipcChannel.receive(ipcMsg.M2R.REGISTER_INFO_REPLY, (info: IVehicleInfoConfig) => {
      setVehicleInfo(info);
    });

    window.ipcChannel
      .sendAndReceive(ipcMsg.RMR.CONNECTION_INFO)
      ?.then((info: IHostConfig | undefined) => {
        setConnectionInfo(info);
      });

    window.ipcChannel.receive(ipcMsg.M2R.CONNECTION_INFO_REPLY, (info: IHostConfig) => {
      setConnectionInfo(info);
    });

    window.ipcChannel
      .sendAndReceive(ipcMsg.RMR.VEHICLE_INFO)
      ?.then((info: IVehicleInfoConfig | undefined) => {
        setVehicleInfo(info);
      });
    return () => {
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.NAVIGATE);
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.REGISTER_INFO_REPLY);
      window.ipcChannel.removeAllListeners(ipcMsg.M2R.CONNECTION_INFO_REPLY);
    };
  }, []);

  useEffect(() => {
    if (vehicleInfo) {
      navigate('/');
    } else {
      navigate('/add');
    }
  }, [vehicleInfo]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<Home vehicleInfo={vehicleInfo} connectionInfo={connectionInfo} />}
        />
        <Route
          path="/add"
          element={
            <RegisterForm mode="ADD" vehicleInfo={vehicleInfo} connectionInfo={connectionInfo} />
          }
        />
        <Route
          path="/edit"
          element={
            <RegisterForm mode="EDIT" vehicleInfo={vehicleInfo} connectionInfo={connectionInfo} />
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
