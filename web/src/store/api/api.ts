import { createApi } from '@reduxjs/toolkit/query/react';

import { serverNow } from '@/lib/time';
import { authActions } from '@/store/slices/auth';

import { baseQuery } from './baseQuery';
import type {
  ApiErrorData,
  AuthDto,
  ConfigDto,
  DeviceDto,
  FriendDto,
  FriendRequestsDto,
  Side,
  StatsDto,
  StatsPeriod,
  TimerDto,
  UserDto,
  WaitsPageDto,
} from './types';

const signIn = async (
  queryFulfilled: Promise<{ data: AuthDto }>,
  dispatch: (action: unknown) => unknown,
) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(
      authActions.signedIn({
        access: data.access,
        refresh: data.refresh,
        userId: data.user.id,
      }),
    );
    dispatch(api.util.upsertQueryData('me', undefined, data.user));
  } catch {
    // Ошибку показывает форма
  }
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Me',
    'Friends',
    'Requests',
    'Timers',
    'Timer',
    'Waits',
    'Stats',
    'Devices',
  ],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    config: build.query<ConfigDto, void>({
      query: () => 'config',
      keepUnusedDataFor: 3600,
    }),

    // --- Вход ---

    register: build.mutation<
      AuthDto,
      { email: string; password: string; name: string; timezone: string }
    >({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) =>
        signIn(queryFulfilled, dispatch),
    }),
    login: build.mutation<AuthDto, { email: string; password: string }>({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) =>
        signIn(queryFulfilled, dispatch),
    }),
    logout: build.mutation<void, { refresh: string }>({
      query: (body) => ({ url: 'auth/logout', method: 'POST', body }),
    }),

    // --- Профиль ---

    me: build.query<UserDto, void>({
      query: () => 'me',
      providesTags: ['Me'],
    }),
    updateMe: build.mutation<
      UserDto,
      Partial<
        Pick<UserDto, 'name' | 'timezone' | 'notify_reminders' | 'notify_friends'>
      >
    >({
      query: (body) => ({ url: 'me', method: 'PATCH', body }),
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          api.util.updateQueryData('me', undefined, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.upsertQueryData('me', undefined, data));
        } catch {
          undo.undo();
        }
      },
      invalidatesTags: (_, __, patch) => (patch.name ? ['Timers', 'Timer'] : []),
    }),
    rotateInvite: build.mutation<UserDto, void>({
      query: () => ({ url: 'me/invite-code/rotate', method: 'POST' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(api.util.upsertQueryData('me', undefined, data));
      },
    }),
    changePassword: build.mutation<
      AuthDto,
      { old_password: string; new_password: string }
    >({
      query: (body) => ({ url: 'me/password', method: 'POST', body }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) =>
        signIn(queryFulfilled, dispatch),
    }),
    deleteAccount: build.mutation<void, { password: string }>({
      query: (body) => ({ url: 'me/delete', method: 'POST', body }),
    }),

    // --- Друзья ---

    friends: build.query<FriendDto[], void>({
      query: () => 'friends',
      providesTags: ['Friends'],
    }),
    friendRequests: build.query<FriendRequestsDto, void>({
      query: () => 'friends/requests',
      providesTags: ['Requests'],
    }),
    sendFriendRequest: build.mutation<{ detail: string }, { email: string }>({
      query: (body) => ({ url: 'friends/requests', method: 'POST', body }),
      invalidatesTags: ['Requests', 'Friends'],
    }),
    acceptFriendRequest: build.mutation<FriendDto, number>({
      query: (id) => ({ url: `friends/requests/${id}/accept`, method: 'POST' }),
      invalidatesTags: ['Requests', 'Friends'],
    }),
    declineFriendRequest: build.mutation<void, number>({
      query: (id) => ({ url: `friends/requests/${id}/decline`, method: 'POST' }),
      invalidatesTags: ['Requests'],
    }),
    cancelFriendRequest: build.mutation<void, number>({
      query: (id) => ({ url: `friends/requests/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Requests'],
    }),
    acceptInvite: build.mutation<FriendDto & { created: boolean }, string>({
      query: (code) => ({ url: 'friends/invite', method: 'POST', body: { code } }),
      invalidatesTags: ['Friends', 'Requests'],
    }),
    removeFriend: build.mutation<void, number>({
      query: (id) => ({ url: `friends/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Friends', 'Timers', 'Timer'],
    }),

    // --- Таймеры ---

    timers: build.query<TimerDto[], void>({
      query: () => 'timers',
      providesTags: ['Timers'],
    }),
    timer: build.query<TimerDto, number>({
      query: (id) => `timers/${id}`,
      providesTags: (_, __, id) => [{ type: 'Timer', id }],
    }),
    createTimer: build.mutation<
      TimerDto,
      {
        friend_id: number;
        left: 'me' | 'friend';
        left_label?: string;
        right_label?: string;
      }
    >({
      query: (body) => ({ url: 'timers', method: 'POST', body }),
      invalidatesTags: ['Timers', 'Friends'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.upsertQueryData('timer', data.id, data));
        } catch {
          // Ошибку показывает экран
        }
      },
    }),
    updateTimer: build.mutation<
      TimerDto,
      {
        id: number;
        left_label?: string;
        right_label?: string;
        reminder_minutes?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `timers/${id}`,
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(api.util.upsertQueryData('timer', id, data));
      },
      invalidatesTags: ['Timers'],
    }),
    swapSides: build.mutation<TimerDto, number>({
      query: (id) => ({ url: `timers/${id}/swap-sides`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(api.util.upsertQueryData('timer', id, data));
      },
      invalidatesTags: (_, __, id) => ['Timers', { type: 'Stats', id }],
    }),
    archiveTimer: build.mutation<void, number>({
      query: (id) => ({ url: `timers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Timers', 'Friends'],
    }),

    /** Щелчок тумблера. Оптимистично: ручка уезжает до ответа сервера,
     *  при конфликте встаёт туда, где тумблер на самом деле. */
    switchTimer: build.mutation<
      TimerDto,
      { id: number; waitingFor: Side; version: number; meId: number | null }
    >({
      query: ({ id, waitingFor, version }) => ({
        url: `timers/${id}/switch`,
        method: 'POST',
        body: { waiting_for: waitingFor, version },
      }),
      async onQueryStarted(
        { id, waitingFor, meId },
        { dispatch, queryFulfilled },
      ) {
        const optimistic = dispatch(
          api.util.updateQueryData('timer', id, (draft) => {
            if (draft.state === waitingFor) return;
            draft.state = waitingFor;
            draft.undo = null;
            draft.current_wait =
              waitingFor === 'none'
                ? null
                : {
                    id: -1,
                    started_at: new Date(serverNow()).toISOString(),
                    started_by: meId,
                  };
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.upsertQueryData('timer', id, data));
        } catch (err) {
          const data = (err as { error?: { status?: number; data?: ApiErrorData } })
            .error;
          if (data?.status === 409 && data.data?.timer) {
            dispatch(api.util.upsertQueryData('timer', id, data.data.timer));
          } else {
            optimistic.undo();
          }
        }
      },
      invalidatesTags: (_, __, { id }) => [
        { type: 'Stats', id },
        { type: 'Waits', id },
        'Timers',
      ],
    }),
    undoTimer: build.mutation<TimerDto, { id: number; version: number }>({
      query: ({ id, version }) => ({
        url: `timers/${id}/undo`,
        method: 'POST',
        body: { version },
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.upsertQueryData('timer', id, data));
        } catch (err) {
          const data = (err as { error?: { data?: ApiErrorData } }).error?.data;
          if (data?.timer) {
            dispatch(api.util.upsertQueryData('timer', id, data.timer));
          }
        }
      },
      invalidatesTags: (_, __, { id }) => [
        { type: 'Stats', id },
        { type: 'Waits', id },
        'Timers',
      ],
    }),
    waits: build.infiniteQuery<WaitsPageDto, number, number | null>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (last) => last.next,
      },
      query: ({ queryArg, pageParam }) =>
        `timers/${queryArg}/waits${pageParam ? `?before=${pageParam}` : ''}`,
      providesTags: (_, __, id) => [{ type: 'Waits', id }],
    }),
    stats: build.query<StatsDto, { id: number; period: StatsPeriod }>({
      query: ({ id, period }) => `timers/${id}/stats?period=${period}`,
      providesTags: (_, __, { id }) => [{ type: 'Stats', id }],
    }),

    // --- Пуши ---

    devices: build.query<DeviceDto[], void>({
      query: () => 'push/subscriptions',
      providesTags: ['Devices'],
    }),
    subscribeDevice: build.mutation<
      DeviceDto,
      {
        device_id: string;
        endpoint: string;
        keys: { p256dh: string; auth: string };
        user_agent: string;
      }
    >({
      query: (body) => ({ url: 'push/subscriptions', method: 'POST', body }),
      invalidatesTags: ['Devices'],
    }),
    removeDevice: build.mutation<void, number>({
      query: (id) => ({ url: `push/subscriptions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Devices'],
    }),
    testPush: build.mutation<{ delivered: number }, void>({
      query: () => ({ url: 'push/test', method: 'POST' }),
    }),
  }),
});

export const {
  useConfigQuery,
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateMeMutation,
  useRotateInviteMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useFriendsQuery,
  useFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useCancelFriendRequestMutation,
  useAcceptInviteMutation,
  useRemoveFriendMutation,
  useTimersQuery,
  useTimerQuery,
  useCreateTimerMutation,
  useUpdateTimerMutation,
  useSwapSidesMutation,
  useArchiveTimerMutation,
  useSwitchTimerMutation,
  useUndoTimerMutation,
  useWaitsInfiniteQuery,
  useStatsQuery,
  useDevicesQuery,
  useSubscribeDeviceMutation,
  useRemoveDeviceMutation,
  useTestPushMutation,
} = api;
