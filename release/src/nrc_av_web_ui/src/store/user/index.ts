import { createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';
import { Role } from '../../dtos/role';
import { UserDTO } from '../../dtos/user';
import { userThunk } from './thunks';

export interface UserState extends UserDTO {
  id: number;
  isLogin: boolean;
  loading: boolean;
  isActive: boolean;
  roles: Role[];
}

const initialState: UserState = {
  id: 0,
  username: '',
  password: '',
  isLogin: false,
  loading: true,
  isActive: false,
  roles: []
};

const reducer = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetState: () => ({ ...initialState }),
    updateLogin: (state) => ({ ...state, isLogin: false })
  },
  extraReducers: (builder) => {
    builder.addCase(userThunk.getCurrentUser.fulfilled, (state, { payload }) => ({
      ...state,
      ...payload,
      isLogin: true,
      loading: false
    }));
    builder.addCase(userThunk.getCurrentUser.rejected, () => {
      const cookies = new Cookies();
      cookies.set('access-token', '', { maxAge: -999 });

      return { ...initialState, loading: false };
    });
  }
});
export const userActions = {
  ...reducer.actions
};
export const userReducer = reducer.reducer;
