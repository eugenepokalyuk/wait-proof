'use client';

import React, { FC } from 'react';
import clsx from 'clsx';
import { m } from 'framer-motion';

import { Card, Skeleton } from '@/components/ui';
import { softSpring } from '@/lib/motion';
import { formatDuration } from '@/lib/time';
import { SideStatsDto, StatsPeriod, TimerDto, useStatsQuery } from '@/store/api';

import classes from './ScoreBoard.module.scss';

const Row: FC<{ label: string; stats: SideStatsDto; share: number; side: 'left' | 'right' }> = ({
  label,
  stats,
  share,
  side,
}) => (
  <div className={classes.row}>
    <div className={classes.head}>
      <span className={clsx(classes.label, classes[side])}>{label} ждал(а)</span>
      <span className={classes.total}>{formatDuration(stats.waited_seconds)}</span>
    </div>
    <div className={classes.bar}>
      {/* scaleX, а не width: ширина пересчитывает раскладку на каждом кадре */}
      <m.span
        className={clsx(classes.fill, classes[`${side}Fill`])}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: share }}
        transition={softSpring}
      />
    </div>
    <p className={classes.meta}>
      {stats.times
        ? `${stats.times} раз · в среднем ${formatDuration(stats.avg_seconds)} · рекорд ${formatDuration(stats.max_seconds)}`
        : 'Ни разу'}
    </p>
  </div>
);

export const ScoreBoard: FC<{ timer: TimerDto; period: StatsPeriod }> = ({ timer, period }) => {
  const { data, isFetching } = useStatsQuery({ id: timer.id, period });

  if (!data) return <Skeleton height={180} />;

  const max = Math.max(data.left.waited_seconds, data.right.waited_seconds, 1);
  const diff = data.left.waited_seconds - data.right.waited_seconds;
  let verdict = 'Пока поровну';
  if (Math.abs(diff) >= 60) {
    const more = diff > 0 ? timer.left.label : timer.right.label;
    verdict = `${more} ждал(а) больше на ${formatDuration(Math.abs(diff))}`;
  }

  return (
    <Card className={clsx(classes.board, { [classes.fetching]: isFetching })}>
      <p className={classes.verdict}>{verdict}</p>
      <Row label={timer.left.label} stats={data.left} share={data.left.waited_seconds / max} side="left" />
      <Row label={timer.right.label} stats={data.right} share={data.right.waited_seconds / max} side="right" />
    </Card>
  );
};
