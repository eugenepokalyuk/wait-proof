'use client';

import React, { FC } from 'react';
import clsx from 'clsx';
import { m } from 'framer-motion';

import { Button, Card } from '@/components/ui';
import { formatDateTime, formatDuration } from '@/lib/time';
import { TimerDto, useWaitsInfiniteQuery, WaitDto } from '@/store/api';

import classes from './WaitList.module.scss';

const reasonNote: Partial<Record<WaitDto['end_reason'], string>> = {
  auto_closed: 'закрыто автоматически',
  archived: 'таймер в архиве',
  admin: 'закрыл администратор',
};

export const WaitList: FC<{ timer: TimerDto }> = ({ timer }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useWaitsInfiniteQuery(timer.id);
  const waits = data?.pages.flatMap((page) => page.results) ?? [];

  const sideOf = (userId: number | null) =>
    userId === timer.left.user_id ? 'left' : userId === timer.right.user_id ? 'right' : null;

  return (
    <Card title="Все ожидания">
      {!isLoading && waits.length === 0 && <p className={classes.empty}>Здесь появятся ожидания.</p>}
      <ul className={classes.list}>
        {waits.map((wait, index) => {
          const side = sideOf(wait.waiter.id);
          const note = reasonNote[wait.end_reason];
          return (
            <m.li
              key={wait.id}
              className={clsx(classes.item, { [classes.muted]: !wait.counts })}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 10) * 0.03, duration: 0.2 }}
            >
              <span className={clsx(classes.dot, side && classes[side])} />
              <div className={classes.body}>
                <p className={classes.line}>
                  <b>{wait.waiter.name}</b> ждал(а) · {wait.waited_for.name}
                </p>
                <p className={classes.meta}>
                  {formatDateTime(wait.started_at)}
                  {note ? ` · ${note}` : ''}
                </p>
              </div>
              <span className={classes.duration}>
                {wait.duration_seconds === null ? 'идёт' : formatDuration(wait.duration_seconds)}
              </span>
            </m.li>
          );
        })}
      </ul>
      {hasNextPage && (
        <Button variant="secondary" size="small" onClick={() => fetchNextPage()} pending={isFetchingNextPage}>
          Показать ещё
        </Button>
      )}
    </Card>
  );
};
