import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ExtraVehicleInformation, VehicleDTO } from '../../dtos/vehicle';

export interface VehicleState {
  selectedVehicle: VehicleDTO | undefined;
  extraVehicleInformation: undefined;
}

const initialState: VehicleState = {
  selectedVehicle: undefined,
  extraVehicleInformation: undefined
};

const vehicleSlice = createSlice({
  name: 'vehicle',
  initialState,
  reducers: {
    setSelectedVehicle: (state, action: PayloadAction<VehicleDTO | undefined>) => {
      state.selectedVehicle = action.payload;
    },
    setExtraVehicleInformation: (
      state: { extraVehicleInformation: ExtraVehicleInformation | undefined },
      action: PayloadAction<ExtraVehicleInformation | undefined>
    ) => {
      state.extraVehicleInformation = action.payload;
    }
  }
});

export const { setSelectedVehicle, setExtraVehicleInformation } = vehicleSlice.actions;
export const vehicleReducer = vehicleSlice.reducer;
