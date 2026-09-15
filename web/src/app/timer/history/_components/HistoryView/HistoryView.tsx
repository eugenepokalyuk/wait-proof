'use client';

import React, { FC, useState } from 'react';

import { PageHeader, Segmented, Skeleton } from '@/components/ui';
import { useSearchId } from '@/lib/hooks';
import { StatsPeriod, useTimerQuery } from '@/store/api';
import { Routes, timerRoute } from '@/utils/consts';

import { ScoreBoard } from '../ScoreBoard/ScoreBoard';
import { WaitList } from '../WaitList/WaitList';

import classes from './HistoryView.module.scss';

export const HistoryView: FC = () => {
  const id = useSearchId();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { data: timer } = useTimerQuery(id ?? 0, { skip: !id });

  if (!id) return <PageHeader title="История" backHref={Routes.Home} />;

  return (
    <div className={classes.root}>
      <PageHeader title="История" subtitle={timer ? `${timer.left.label} и ${timer.right.label}` : undefined} backHref={timerRoute(id)} />

      <Segmented
        label="Период"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: 'Неделя' },
          { value: 'month', label: 'Месяц' },
          { value: 'all', label: 'Всё время' },
        ]}
      />

      {timer ? <ScoreBoard timer={timer} period={period} /> : <Skeleton height={180} />}
      {timer && <WaitList timer={timer} />}
    </div>
  );
};
