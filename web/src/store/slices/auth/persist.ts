import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import { authActions, AuthState } from './authSlice';

const KEY = 'wp.auth';

export const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.access && parsed?.refresh && parsed?.userId) return parsed;
  } catch {
    // Битая запись или localStorage недоступен — просто не вошли
  }
  return null;
};

export const authListener = createListenerMiddleware();

authListener.startListening({
  matcher: isAnyOf(authActions.signedIn, authActions.signedOut),
  effect: (_, api) => {
    const { access, refresh, userId } = (api.getState() as { auth: AuthState })
      .auth;
    try {
      if (access && refresh) {
        localStorage.setItem(KEY, JSON.stringify({ access, refresh, userId }));
      } else {
        localStorage.removeItem(KEY);
      }
    } catch {
      // Без хранилища сессия проживёт до закрытия вкладки
    }
  },
});
