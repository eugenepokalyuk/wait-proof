'use client';

import React, { FC, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, m, useAnimationControls } from 'framer-motion';

import { Button, Input, Segmented } from '@/components/ui';
import { quick } from '@/lib/motion';
import { errorDetail, useLoginMutation, useRegisterMutation } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { Routes } from '@/utils/consts';

import classes from './AuthForm.module.scss';

type Mode = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeNext = (next: string | null) =>
  // Только свои пути: иначе ?next=https://чужой-сайт увёл бы после входа
  next && next.startsWith('/') && !next.startsWith('//') ? next : Routes.Home;

export const AuthForm: FC = () => {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { hydrated, access } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<Mode>(params.get('next')?.startsWith(Routes.Invite) ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const shake = useAnimationControls();

  useEffect(() => {
    if (hydrated && access) router.replace(next);
  }, [hydrated, access, next, router]);

  const fail = (message: string) => {
    setError(message);
    shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) return fail('Проверь почту — в ней опечатка.');
    if (password.length < 8) return fail('Пароль — не короче 8 символов.');
    if (mode === 'register' && !name.trim()) return fail('Как тебя зовут?');

    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password }).unwrap();
      } else {
        await register({
          email: email.trim(),
          password,
          name: name.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).unwrap();
      }
      // Переход сделает эффект выше, когда токены лягут в стор
    } catch (err) {
      fail(errorDetail(err, 'Не получилось. Попробуй ещё раз.'));
    }
  };

  const pending = loginState.isLoading || registerState.isLoading;

  return (
    <div className={classes.root}>
      <div className={classes.hero}>
        <div className={classes.logo} aria-hidden="true">
          <span className={classes.logoKnob} />
        </div>
        <h1 className={classes.title}>Я тебя жду</h1>
        <p className={classes.subtitle}>Больше никаких споров, кто кого ждал.</p>
      </div>

      <m.form className={classes.form} onSubmit={submit} animate={shake} noValidate>
        <Segmented
          label="Вход или регистрация"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError('');
          }}
          options={[
            { value: 'login', label: 'Вход' },
            { value: 'register', label: 'Регистрация' },
          ]}
        />

        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <m.div
              key="name"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={quick}
            >
              <Input
                label="Имя"
                name="name"
                autoComplete="given-name"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как тебя будут видеть друзья"
              />
            </m.div>
          )}
        </AnimatePresence>

        <Input
          label="Почта"
          type="email"
          name="email"
          // username — подсказка связке ключей iOS: это логин, пароль к нему
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Пароль"
          type="password"
          name="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={mode === 'register' ? 'Не короче 8 символов. Телефон предложит его запомнить.' : undefined}
        />

        <AnimatePresence>
          {error && (
            <m.p
              className={classes.error}
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </m.p>
          )}
        </AnimatePresence>

        <Button type="submit" fullWidth pending={pending}>
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </Button>

        {mode === 'login' && (
          <p className={classes.note}>
            Забыл пароль? Писем мы пока не отправляем — напиши администратору,
            он задаст новый.
          </p>
        )}
      </m.form>

      <Link href={Routes.Install} className={classes.install}>
        Как установить на телефон
      </Link>
    </div>
  );
};
