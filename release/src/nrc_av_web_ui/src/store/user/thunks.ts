import { createAsyncThunk } from '@reduxjs/toolkit';
import { getMe } from '../../api/user';
import { UserDTO } from '../../dtos/user';

export const userThunk = {
  getCurrentUser: createAsyncThunk<UserDTO, void>(
    'getCurrentUser',
    async (_, { rejectWithValue }) => {
      try {
        const res = await getMe();
        return res.data;
      } catch (error) {
        return rejectWithValue(null);
      }
    }
  )
};
