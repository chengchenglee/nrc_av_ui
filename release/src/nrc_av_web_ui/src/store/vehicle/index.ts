import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RedButtonStatus } from '../../constants/vehicleStatus';
import { ExtraVehicleInformation, VehicleDTO } from '../../dtos/vehicle';

export interface VehicleState {
  selectedVehicle: VehicleDTO | undefined;
  extraVehicleInformation: undefined;
  redButtonStatus: RedButtonStatus | null;
}

const initialState: VehicleState = {
  selectedVehicle: undefined,
  extraVehicleInformation: undefined,
  redButtonStatus: null
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
    },
    setRedButtonStatus: (state, action: PayloadAction<RedButtonStatus | null>) => {
      state.redButtonStatus = action.payload;
    }
  }
});

export const { setSelectedVehicle, setExtraVehicleInformation, setRedButtonStatus } =
  vehicleSlice.actions;
export const vehicleReducer = vehicleSlice.reducer;
