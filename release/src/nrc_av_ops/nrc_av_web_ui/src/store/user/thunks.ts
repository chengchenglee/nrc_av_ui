import { createAsyncThunk } from '@reduxjs/toolkit';
import { getMe } from '../../api/user';
import { User } from '../../interfaces/models/user';

export const userThunk = {
  getCurrentUser: createAsyncThunk<User, void>('getCurrentUser', async (_, { rejectWithValue }) => {
    try {
      const res = await getMe();
      return res.data;
    } catch (error) {
      return rejectWithValue(null);
    }
  })
};
