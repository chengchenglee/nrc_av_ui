import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import { VehicleDTO } from '../dtos/vehicle';
import { interfaceExecutorReducer } from './command';
import { mapReducer } from './map';
import { userReducer, UserState } from './user';
import { vehicleReducer, VehicleState } from './vehicle';

export interface RootState {
  user: UserState;
  map: ReturnType<typeof mapReducer>;
  vehicle: VehicleState;
  interfaceExecutor: ReturnType<typeof interfaceExecutorReducer>;
}

const reducers = combineReducers<RootState>({
  user: userReducer,
  map: mapReducer,
  vehicle: vehicleReducer,
  interfaceExecutor: interfaceExecutorReducer
});

export const store = configureStore({
  reducer: reducers
});

export type Store = typeof store;
export const useStoreUser = () => useSelector<RootState, UserState>((state) => state.user);
export const useStoreMap = () =>
  useSelector<RootState, ReturnType<typeof mapReducer>>((state) => state.map);
export const useStoreVehicle = () =>
  useSelector<RootState, VehicleDTO | undefined>((state) => state.vehicle.selectedVehicle);
export const useStoreInterfaceExecutor = () =>
  useSelector<RootState, ReturnType<typeof interfaceExecutorReducer>>(
    (state) => state.interfaceExecutor
  );
