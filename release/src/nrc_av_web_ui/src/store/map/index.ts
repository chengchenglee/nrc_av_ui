import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MapState {
  selectedMap: string;
}

const initialState: MapState = {
  selectedMap: localStorage.getItem('selectedMap') || 'Sanborn2019MMv24'
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setSelectedMap: (state, action: PayloadAction<string>) => {
      state.selectedMap = action.payload;
      localStorage.setItem('selectedMap', action.payload);
    }
  }
});

export const { setSelectedMap } = mapSlice.actions;
export const mapReducer = mapSlice.reducer;
