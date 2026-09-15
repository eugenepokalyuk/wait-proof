'use client';

import React, { FC } from 'react';
import Link from 'next/link';

import { formatDuration } from '@/lib/time';
import { TimerDto, useStatsQuery } from '@/store/api';
import { timerHistoryRoute } from '@/utils/consts';

import classes from './WeekScore.module.scss';

export const WeekScore: FC<{ timer: TimerDto }> = ({ timer }) => {
  const { data } = useStatsQuery({ id: timer.id, period: 'week' });
  if (!data || (!data.left.times && !data.right.times)) return null;

  return (
    <Link href={timerHistoryRoute(timer.id)} className={classes.score}>
      <span className={classes.title}>Ждали на этой неделе</span>
      <span className={classes.row}>
        <span className={classes.left}>{timer.left.label}</span>
        <b>{formatDuration(data.left.waited_seconds)}</b>
      </span>
      <span className={classes.row}>
        <span className={classes.right}>{timer.right.label}</span>
        <b>{formatDuration(data.right.waited_seconds)}</b>
      </span>
    </Link>
  );
};
