import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  access: string | null;
  refresh: string | null;
  userId: number | null;
  /** Токены прочитаны из localStorage. До этого не знаем, вошёл ли человек,
   *  и не должны ни пускать, ни выкидывать на экран входа. */
  hydrated: boolean;
}

const initialState: AuthState = {
  access: null,
  refresh: null,
  userId: null,
  hydrated: false,
};

interface Tokens {
  access: string;
  refresh: string;
  userId: number;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrated(state, { payload }: PayloadAction<Tokens | null>) {
      state.hydrated = true;
      if (payload) {
        state.access = payload.access;
        state.refresh = payload.refresh;
        state.userId = payload.userId;
      }
    },
    signedIn(state, { payload }: PayloadAction<Tokens>) {
      state.access = payload.access;
      state.refresh = payload.refresh;
      state.userId = payload.userId;
      state.hydrated = true;
    },
    signedOut(state) {
      state.access = null;
      state.refresh = null;
      state.userId = null;
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
