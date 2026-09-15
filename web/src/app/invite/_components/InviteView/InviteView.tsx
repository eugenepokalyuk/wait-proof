'use client';

import React, { FC, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';

import { Button, CheckIcon, Skeleton } from '@/components/ui';
import { softSpring } from '@/lib/motion';
import { errorDetail, useAcceptInviteMutation } from '@/store/api';
import { Routes, timerRoute } from '@/utils/consts';

import classes from './InviteView.module.scss';

export const InviteView: FC = () => {
  const code = useSearchParams().get('code') ?? '';
  const [accept, { data, error, isUninitialized, isLoading }] = useAcceptInviteMutation();
  const sent = useRef(false);

  useEffect(() => {
    // Один раз: в dev React монтирует эффекты дважды, а приглашение — не
    // та операция, которую хочется слать повторно
    if (!code || sent.current) return;
    sent.current = true;
    accept(code);
  }, [code, accept]);

  if (!code) {
    return (
      <div className={classes.root}>
        <h1 className={classes.title}>В ссылке нет кода</h1>
        <p className={classes.text}>Попроси друга отправить ссылку ещё раз.</p>
        <Button href={Routes.Friends}>К друзьям</Button>
      </div>
    );
  }

  if (isUninitialized || isLoading) {
    return (
      <div className={classes.root}>
        <Skeleton height={160} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={classes.root}>
        <h1 className={classes.title}>Не получилось</h1>
        <p className={classes.text}>{errorDetail(error, 'Ссылка не сработала.')}</p>
        <Button href={Routes.Friends}>К друзьям</Button>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <m.span
        className={classes.check}
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...softSpring, delay: 0.1 }}
      >
        <CheckIcon size={36} />
      </m.span>
      <h1 className={classes.title}>
        {data.created ? `Теперь вы друзья с ${data.name}` : `Вы уже друзья с ${data.name}`}
      </h1>
      <p className={classes.text}>Осталось создать общий таймер.</p>
      {data.timer_id ? (
        <Button href={timerRoute(data.timer_id)}>Открыть таймер</Button>
      ) : (
        <Button href={Routes.Friends}>Создать таймер</Button>
      )}
    </div>
  );
};
