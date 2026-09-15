'use client';

import React, { FC, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { PushPrompt, TimerCard } from '@/components/modules';
import { Button, PageHeader, PlusIcon, Skeleton } from '@/components/ui';
import { useMeQuery, useTimersQuery } from '@/store/api';
import { Routes, timerRoute } from '@/utils/consts';

import classes from './HomeView.module.scss';

const AUTO_OPENED = 'wp.auto-opened';

export const HomeView: FC = () => {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const { data: timers, isLoading } = useTimersQuery(undefined, {
    pollingInterval: 15_000,
    skipPollingIfUnfocused: true,
  });
  const redirected = useRef(false);

  // Один таймер — сразу на него: список из одной строки — лишний тап на
  // каждом открытии. Но только при запуске, иначе вкладка «Таймеры» не
  // открывалась бы вовсе
  useEffect(() => {
    if (redirected.current || timers?.length !== 1) return;
    try {
      if (sessionStorage.getItem(AUTO_OPENED)) return;
      sessionStorage.setItem(AUTO_OPENED, '1');
    } catch {
      // без sessionStorage просто открываем
    }
    redirected.current = true;
    router.replace(timerRoute(timers[0].id));
  }, [timers, router]);

  return (
    <div className={classes.root}>
      <PageHeader title="Таймеры" subtitle={me ? `Привет, ${me.name}` : undefined} />

      <PushPrompt compact />

      {isLoading && <Skeleton height={96} />}

      {timers?.map((timer, index) => (
        <TimerCard key={timer.id} timer={timer} index={index} />
      ))}

      {timers && timers.length === 0 && (
        <div className={classes.empty}>
          <p className={classes.emptyTitle}>Пока ни одного таймера</p>
          <p className={classes.emptyText}>
            Таймер создаётся на двоих. Добавь друга — ссылкой или по почте — и
            создай с ним таймер.
          </p>
          <Button href={Routes.Friends} icon={<PlusIcon />}>
            Добавить друга
          </Button>
        </div>
      )}
    </div>
  );
};
