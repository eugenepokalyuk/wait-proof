const pad = (n: number) => String(n).padStart(2, '0');

/** «00:23:41» — для большого таймера. */
export const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

/** «40 с», «23 мин», «1 ч 5 мин» — так, как это сказал бы человек. */
export const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} с`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
};

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const day = sameDay(date, today)
    ? 'сегодня'
    : sameDay(date, yesterday)
      ? 'вчера'
      : dateFormat.format(date).replace('.', '');
  return `${day}, ${timeFormat.format(date)}`;
};
