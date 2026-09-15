import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { getDeviceId } from '@/lib/pwa';
import { setServerTime } from '@/lib/time';
import { authActions, AuthState } from '@/store/slices/auth';
import { API_URL } from '@/utils/consts';

import type { AuthDto } from './types';

type State = { auth: AuthState };

const raw = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as State).auth.access;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Device-Id', getDeviceId());
    return headers;
  },
});

// Один refresh на всех: экран таймера шлёт опрос, статистику и ленту почти
// одновременно, и три параллельных обновления по одному refresh-токену
// провалились бы — после ротации он одноразовый.
let refreshing: Promise<boolean> | null = null;

const refreshTokens = async (
  refresh: string,
  api: BaseQueryApi,
  extra: object,
) => {
  const result = await raw(
    { url: 'auth/refresh', method: 'POST', body: { refresh } },
    api,
    extra,
  );
  if (result.data) {
    const data = result.data as AuthDto;
    api.dispatch(
      authActions.signedIn({
        access: data.access,
        refresh: data.refresh,
        userId: data.user.id,
      }),
    );
    return true;
  }
  return false;
};

const noteServerTime = (data: unknown) => {
  const sample = Array.isArray(data) ? data[0] : data;
  if (sample && typeof sample === 'object' && 'server_time' in sample) {
    setServerTime(String((sample as { server_time: string }).server_time));
  }
};

export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  let result = await raw(args, api, extra);

  if (result.error?.status === 401) {
    const refresh = (api.getState() as State).auth.refresh;
    if (refresh) {
      refreshing ??= refreshTokens(refresh, api, extra as object).finally(
        () => {
          refreshing = null;
        },
      );
      if (await refreshing) {
        result = await raw(args, api, extra);
      } else {
        api.dispatch(authActions.signedOut());
      }
    }
  }

  noteServerTime(result.data);
  return result;
};

export const errorDetail = (error: unknown, fallback: string) => {
  const e = error as { status?: unknown; data?: { detail?: unknown } };
  if (e?.status === 'FETCH_ERROR') return 'Нет связи с сервером.';
  if (typeof e?.data?.detail === 'string') return e.data.detail;
  return fallback;
};
