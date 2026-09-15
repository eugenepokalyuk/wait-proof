import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { api } from './api/api';
import { authListener, authReducer } from './slices/auth';
import { toastReducer } from './slices/toast';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    toast: toastReducer,
  },
  // RTK Query держит на middleware кэш, опрос и дедупликацию. authListener
  // пишет токены в localStorage; prepend — чтобы он видел экшены первым.
  middleware: (getDefault) =>
    getDefault().prepend(authListener.middleware).concat(api.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Без этого refetchOnFocus/refetchOnReconnect не работают: RTK Query нужно
// подписаться на события окна
if (typeof window !== 'undefined') setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
