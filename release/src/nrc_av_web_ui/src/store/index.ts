import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import { VehicleDTO } from '../dtos/vehicle';
import { mapReducer } from './map';
import { userReducer, UserState } from './user';
import { vehicleReducer, VehicleState } from './vehicle';

export interface RootState {
  user: UserState;
  map: ReturnType<typeof mapReducer>;
  vehicle: VehicleState;
}

const reducers = combineReducers<RootState>({
  user: userReducer,
  map: mapReducer,
  vehicle: vehicleReducer
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
