'use client';

import React, { FC, useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';

import { BellIcon, Button, CloseIcon } from '@/components/ui';
import { softSpring } from '@/lib/motion';
import { getPushState, PushState, subscribePush } from '@/lib/push';
import { getDeviceId } from '@/lib/pwa';
import { useConfigQuery, useSubscribeDeviceMutation } from '@/store/api';
import { useToast } from '@/store/hooks';
import { Routes } from '@/utils/consts';

import classes from './PushPrompt.module.scss';

const DISMISS_KEY = 'wp.push-prompt-dismissed';

/** Просьба включить уведомления. Показывается, пока пуши не включены, и
 *  прячется навсегда крестиком — второй раз уговаривать не будем. */
export const PushPrompt: FC<{ compact?: boolean }> = ({ compact }) => {
  const [state, setState] = useState<PushState>('unsupported');
  const [dismissed, setDismissed] = useState(true);
  const [pending, setPending] = useState(false);
  const { data: config } = useConfigQuery();
  const [subscribe] = useSubscribeDeviceMutation();
  const toast = useToast();

  useEffect(() => {
    setState(getPushState());
    try {
      setDismissed(!compact ? false : localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, [compact]);

  const enable = async () => {
    if (!config?.vapid_public_key) {
      toast('Уведомления на сервере ещё не настроены.', 'error');
      return;
    }
    setPending(true);
    try {
      const body = await subscribePush(config.vapid_public_key);
      setState(getPushState());
      if (!body) {
        if (getPushState() === 'denied') {
          toast('Уведомления запрещены. Разреши их в настройках телефона.', 'error');
        }
        return;
      }
      await subscribe({
        ...body,
        device_id: getDeviceId(),
        user_agent: navigator.userAgent,
      }).unwrap();
      toast('Уведомления включены', 'success');
    } catch {
      toast('Не получилось включить уведомления.', 'error');
    } finally {
      setPending(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // не страшно — просто покажем ещё раз
    }
  };

  const visible =
    !dismissed && (state === 'default' || state === 'needs-install' || (!compact && state === 'denied'));

  let text = 'Узнавай сразу, когда тебя ждут или дождались.';
  if (state === 'needs-install') {
    text = 'На iPhone уведомления приходят только приложению на экране «Домой».';
  } else if (state === 'denied') {
    text = 'Уведомления запрещены. Включи их в настройках телефона для этого приложения.';
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <m.div
          className={classes.card}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={softSpring}
        >
          <span className={classes.icon}>
            <BellIcon size={22} />
          </span>
          <div className={classes.body}>
            <p className={classes.title}>Включи уведомления</p>
            <p className={classes.text}>{text}</p>
            {state === 'needs-install' ? (
              <Button size="small" href={Routes.Install}>
                Как установить
              </Button>
            ) : state === 'default' ? (
              <Button size="small" onClick={enable} pending={pending}>
                Включить
              </Button>
            ) : null}
          </div>
          {compact && (
            <button type="button" className={classes.close} onClick={dismiss} aria-label="Скрыть">
              <CloseIcon size={18} />
            </button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
};
