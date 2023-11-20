import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isStartingAllCommands: false,
  isStartingCommands: false,
  runAllSubSystems: false,
  runInterface: false // New state
};

const interfaceExecutorSlice = createSlice({
  name: 'interfaceExecutor',
  initialState,
  reducers: {
    setIsStartingAllCommands: (state, action) => {
      state.isStartingAllCommands = action.payload;
    },
    setIsStartingCommands: (state, action) => {
      state.isStartingCommands = action.payload;
    },
    setRunAllSubSystems: (state, action) => {
      state.runAllSubSystems = action.payload;
    },
    setRunInterface: (state, action) => {
      state.runInterface = action.payload;
    }
  }
});

export const {
  setIsStartingAllCommands,
  setIsStartingCommands,
  setRunAllSubSystems,
  setRunInterface
} = interfaceExecutorSlice.actions;

export const interfaceExecutorReducer = interfaceExecutorSlice.reducer;
