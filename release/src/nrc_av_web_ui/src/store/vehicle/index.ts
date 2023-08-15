import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VehicleDTO } from '../../dtos/vehicle';

export interface VehicleState {
  selectedVehicle: VehicleDTO | undefined;
}

const initialState: VehicleState = {
  selectedVehicle: undefined
};

const vehicleSlice = createSlice({
  name: 'vehicle',
  initialState,
  reducers: {
    setSelectedVehicle: (state, action: PayloadAction<VehicleDTO | undefined>) => {
      state.selectedVehicle = action.payload;
    }
  }
});

export const { setSelectedVehicle } = vehicleSlice.actions;
export const vehicleReducer = vehicleSlice.reducer;
