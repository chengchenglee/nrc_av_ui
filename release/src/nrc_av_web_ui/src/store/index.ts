import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import { userReducer, UserState } from './user';

export interface RootState {
  user: UserState;
}

const reducers = combineReducers<RootState>({
  user: userReducer
});

export const store = configureStore({
  reducer: reducers
});

export type Store = typeof store;
export const useStoreUser = () => useSelector<RootState, UserState>((state) => state.user);
