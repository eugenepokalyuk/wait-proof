'use client';

import React, { FC, useEffect, useState } from 'react';
import { m } from 'framer-motion';

import { AddToHomeIcon, Button, Card, PageHeader, ShareIcon } from '@/components/ui';
import {
  canPromptInstall,
  isAndroid,
  isIOS,
  isStandalone,
  onInstallAvailability,
  promptInstall,
} from '@/lib/pwa';
import { Routes } from '@/utils/consts';

import classes from './InstallView.module.scss';

type Platform = 'ios' | 'android' | 'other';

const Step: FC<React.PropsWithChildren<{ n: number; index: number }>> = ({ n, index, children }) => (
  <m.li
    className={classes.step}
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06, duration: 0.25 }}
  >
    <span className={classes.n}>{n}</span>
    <span className={classes.stepText}>{children}</span>
  </m.li>
);

export const InstallView: FC = () => {
  const [platform, setPlatform] = useState<Platform>('other');
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    setPlatform(isIOS() ? 'ios' : isAndroid() ? 'android' : 'other');
    setInstalled(isStandalone());
    setCanPrompt(canPromptInstall());
    return onInstallAvailability(() => setCanPrompt(canPromptInstall()));
  }, []);

  return (
    <div className={classes.root}>
      <PageHeader title="На экран «Домой»" backHref={Routes.Home} />

      {installed ? (
        <Card>
          <p className={classes.text}>Приложение уже установлено — ты открыл его с экрана «Домой». 🎉</p>
          <Button href={Routes.Home}>Продолжить</Button>
        </Card>
      ) : (
        <>
          <p className={classes.lead}>
            Так приложение открывается одним касанием, без адресной строки, и
            умеет присылать уведомления.
          </p>

          {platform === 'ios' && (
            <Card title="iPhone и iPad · Safari">
              <ol className={classes.steps}>
                <Step n={1} index={0}>
                  Открой эту страницу в <b>Safari</b> — в других браузерах на iPhone так не выйдет.
                </Step>
                <Step n={2} index={1}>
                  Нажми <ShareIcon size={18} className={classes.inline} /> <b>Поделиться</b> внизу экрана.
                </Step>
                <Step n={3} index={2}>
                  Выбери <AddToHomeIcon size={18} className={classes.inline} /> <b>На экран «Домой»</b> и нажми «Добавить».
                </Step>
                <Step n={4} index={3}>
                  Открой «Жду» с экрана «Домой» и <b>войди ещё раз</b> — у приложения своё хранилище,
                  вход из Safari туда не переносится. Связка ключей подставит пароль.
                </Step>
                <Step n={5} index={4}>
                  Включи уведомления — нужна iOS 16.4 или новее.
                </Step>
              </ol>
            </Card>
          )}

          {platform === 'android' && (
            <Card title="Android · Chrome">
              {canPrompt ? (
                <Button fullWidth onClick={() => promptInstall()}>
                  Установить приложение
                </Button>
              ) : (
                <ol className={classes.steps}>
                  <Step n={1} index={0}>Открой меню <b>⋮</b> в правом верхнем углу Chrome.</Step>
                  <Step n={2} index={1}>Выбери <b>Установить приложение</b> или <b>Добавить на главный экран</b>.</Step>
                </ol>
              )}
            </Card>
          )}

          {platform === 'other' && (
            <Card title="Компьютер">
              <p className={classes.text}>
                Открой ссылку на телефоне — там приложением пользоваться удобнее. В Chrome на
                компьютере установка есть в адресной строке, значок справа.
              </p>
              {canPrompt && <Button onClick={() => promptInstall()}>Установить</Button>}
            </Card>
          )}
        </>
      )}
    </div>
  );
};
