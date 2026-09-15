'use client';

import React, { FC } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';

import { BigToggle, Elapsed, PushPrompt } from '@/components/modules';
import { Button, HistoryIcon, PageHeader, SettingsIcon, Skeleton } from '@/components/ui';
import { useOnline, useSearchId } from '@/lib/hooks';
import { softSpring } from '@/lib/motion';
import { formatTime } from '@/lib/time';
import {
  errorDetail,
  Side,
  useConfigQuery,
  useSwitchTimerMutation,
  useTimerQuery,
} from '@/store/api';
import { useAppSelector, useToast } from '@/store/hooks';
import { Routes, timerHistoryRoute, timerSettingsRoute } from '@/utils/consts';

import { UndoBar } from '../UndoBar/UndoBar';
import { WeekScore } from '../WeekScore/WeekScore';

import classes from './TimerView.module.scss';

export const TimerView: FC = () => {
  const id = useSearchId();
  const meId = useAppSelector((state) => state.auth.userId);
  const online = useOnline();
  const toast = useToast();
  const { data: config } = useConfigQuery();

  const { data: timer, error, isLoading } = useTimerQuery(id ?? 0, {
    skip: !id,
    // Второй участник щёлкнул — узнаём за пару секунд. Пуш приходит
    // быстрее и сам дёргает обновление, опрос — страховка без пушей
    pollingInterval: (config?.poll_interval_seconds ?? 5) * 1000,
    skipPollingIfUnfocused: true,
  });
  const [switchTimer, switchState] = useSwitchTimerMutation();

  if (!id || (error && !timer)) {
    return (
      <div className={classes.missing}>
        <PageHeader title="Таймер не найден" backHref={Routes.Home} />
        <p>{errorDetail(error, 'Возможно, его отправили в архив.')}</p>
        <Button href={Routes.Home}>К таймерам</Button>
      </div>
    );
  }

  if (isLoading || !timer) {
    return (
      <div className={classes.root}>
        <PageHeader title=" " backHref={Routes.Home} />
        <Skeleton height={260} />
      </div>
    );
  }

  // Пока запрос в пути, показываем то, что нажали: опрос, стартовавший до
  // щелчка, может вернуть старое положение и дёрнуть ручку назад
  const pending = switchState.isLoading && switchState.originalArgs?.id === timer.id;
  const shownState: Side = pending ? switchState.originalArgs!.waitingFor : timer.state;

  const onChange = async (side: Side) => {
    try {
      await switchTimer({ id: timer.id, waitingFor: side, version: timer.version, meId }).unwrap();
    } catch (err) {
      const status = (err as { status?: number }).status;
      toast(
        errorDetail(err, 'Не получилось переключить. Попробуй ещё раз.'),
        status === 409 ? 'default' : 'error',
      );
    }
  };

  const waitedFor = shownState === 'left' ? timer.left : timer.right;
  const waiter = shownState === 'left' ? timer.right : timer.left;
  const wait = shownState !== 'none' ? timer.current_wait : null;
  const colorClass = shownState === 'left' ? classes.leftText : classes.rightText;

  return (
    <div className={classes.root}>
      <PageHeader
        title={`${timer.left.label} и ${timer.right.label}`}
        backHref={Routes.Home}
        actions={
          <>
            <Link href={timerHistoryRoute(timer.id)} aria-label="История">
              <HistoryIcon size={20} />
            </Link>
            <Link href={timerSettingsRoute(timer.id)} aria-label="Настройки таймера">
              <SettingsIcon size={20} />
            </Link>
          </>
        }
      />

      <section className={classes.stage}>
        <BigToggle
          value={shownState}
          onChange={onChange}
          leftLabel={timer.left.label}
          rightLabel={timer.right.label}
          disabled={!online}
        />

        <div className={classes.status}>
          <AnimatePresence mode="wait" initial={false}>
            {wait ? (
              <m.div
                key={`wait-${shownState}`}
                className={classes.waiting}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={softSpring}
              >
                <p className={classes.overline}>
                  {waiter.label} ждёт <span className={colorClass}>{waitedFor.label}</span> уже
                </p>
                <Elapsed startedAt={wait.started_at} />
                <p className={classes.caption}>с {formatTime(wait.started_at)}</p>
                <Button
                  variant="secondary"
                  className={classes.stop}
                  onClick={() => onChange('none')}
                  disabled={!online}
                >
                  Дождались
                </Button>
              </m.div>
            ) : (
              <m.div
                key="idle"
                className={classes.idle}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={softSpring}
              >
                <p className={classes.idleTitle}>Никто никого не ждёт</p>
                <p className={classes.caption}>
                  Щёлкни на имя того, кого ждут, — таймер пойдёт, а второй
                  получит уведомление.
                </p>
                <WeekScore timer={timer} />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <PushPrompt compact />

      <UndoBar timer={timer} meId={meId} />
    </div>
  );
};
