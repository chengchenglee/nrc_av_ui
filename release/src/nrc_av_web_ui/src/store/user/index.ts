import { createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';
import { User } from '../../interfaces/models/user';
import { userThunk } from './thunks';

export interface UserState extends User {
  id: any;
  isLogin: boolean;
}

const initialState: UserState = {
  id: 0,
  username: '',
  password: '',
  isLogin: false
};

const reducer = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetState: () => ({ ...initialState }),
    updateLogin: (state) => ({ ...state, isLogin: true })
  },
  extraReducers: (builder) => {
    builder.addCase(userThunk.getCurrentUser.fulfilled, (state, { payload }) => ({
      ...state,
      ...payload,
      isLogin: true
    }));
    builder.addCase(userThunk.getCurrentUser.rejected, (state) => {
      const cookies = new Cookies();
      cookies.set('access-token', '', { maxAge: -999 });

      return { ...state, isLogin: true };
    });
  }
});
export const userActions = {
  ...reducer.actions
};
export const userReducer = reducer.reducer;
