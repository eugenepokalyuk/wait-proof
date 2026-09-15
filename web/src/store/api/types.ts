/** Контракт Django как есть: snake_case не переименовываем — при
 *  расхождении с бэкендом иначе не найти концов. */

export type Side = 'none' | 'left' | 'right';

export interface UserDto {
  id: number;
  email: string;
  name: string;
  invite_code: string;
  invite_url: string;
  timezone: string;
  notify_reminders: boolean;
  notify_friends: boolean;
}

export interface AuthDto {
  access: string;
  refresh: string;
  user: UserDto;
}

export interface ConfigDto {
  poll_interval_seconds: number;
  undo_seconds: number;
  vapid_public_key: string;
}

export interface PersonDto {
  id: number;
  name: string;
  email: string;
}

export interface FriendDto extends PersonDto {
  since: string;
  timer_id: number | null;
}

export interface FriendRequestsDto {
  incoming: { id: number; user: PersonDto; created_at: string }[];
  outgoing: { id: number; email: string; created_at: string }[];
}

export interface TimerSideDto {
  user_id: number | null;
  name: string;
  label: string;
}

export interface TimerDto {
  id: number;
  left: TimerSideDto;
  right: TimerSideDto;
  state: Side;
  version: number;
  current_wait: {
    id: number;
    started_at: string;
    started_by: number | null;
  } | null;
  /** Кнопка «Отменить»: кто может и до какого момента. */
  undo: { until: string; by: number } | null;
  reminder_minutes: 0 | 15 | 30 | 60;
  server_time: string;
}

export interface WaitDto {
  id: number;
  waiter: { id: number | null; name: string };
  waited_for: { id: number | null; name: string };
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  started_by: number | null;
  ended_by: number | null;
  end_reason: '' | 'stopped' | 'switched' | 'auto_closed' | 'archived' | 'admin';
  counts: boolean;
}

export interface WaitsPageDto {
  results: WaitDto[];
  next: number | null;
}

export type StatsPeriod = 'week' | 'month' | 'all';

export interface SideStatsDto {
  waited_seconds: number;
  times: number;
  avg_seconds: number;
  max_seconds: number;
}

export interface StatsDto {
  period: StatsPeriod;
  since: string | null;
  left: SideStatsDto;
  right: SideStatsDto;
}

export interface DeviceDto {
  id: number;
  device_id: string;
  user_agent: string;
  created_at: string;
  last_success_at: string | null;
}

export interface ApiErrorData {
  detail?: string;
  timer?: TimerDto;
  timer_id?: number;
}
