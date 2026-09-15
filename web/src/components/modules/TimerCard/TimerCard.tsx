'use client';

import React, { FC } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { m } from 'framer-motion';

import type { TimerDto } from '@/store/api';
import { timerRoute } from '@/utils/consts';

import { Elapsed } from '../Elapsed/Elapsed';

import classes from './TimerCard.module.scss';

export const TimerCard: FC<{ timer: TimerDto; index?: number }> = ({ timer, index = 0 }) => {
  const waiting = timer.state !== 'none' && timer.current_wait;
  const waitedFor = timer.state === 'left' ? timer.left : timer.right;
  const waiter = timer.state === 'left' ? timer.right : timer.left;

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
    >
      <Link href={timerRoute(timer.id)} className={classes.card}>
        <div className={classes.names}>
          <span className={clsx(classes.dot, classes.left)} />
          <span className={classes.label}>{timer.left.label}</span>
          <span className={classes.amp}>и</span>
          <span className={classes.label}>{timer.right.label}</span>
          <span className={clsx(classes.dot, classes.right)} />
        </div>
        {waiting ? (
          <p className={classes.status}>
            <span>{waiter.label} ждёт · </span>
            <span className={timer.state === 'left' ? classes.leftText : classes.rightText}>
              {waitedFor.label}
            </span>
            <Elapsed startedAt={timer.current_wait!.started_at} size="small" className={classes.elapsed} />
          </p>
        ) : (
          <p className={classes.idle}>Никто никого не ждёт</p>
        )}
      </Link>
    </m.div>
  );
};
