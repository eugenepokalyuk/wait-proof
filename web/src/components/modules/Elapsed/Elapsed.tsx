'use client';

import React, { FC, useEffect, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, m } from 'framer-motion';

import { digitTransition } from '@/lib/motion';
import { formatElapsed, serverNow } from '@/lib/time';

import classes from './Elapsed.module.scss';

interface Props {
  startedAt: string;
  size?: 'large' | 'small';
  className?: string;
}

const Digit: FC<{ char: string }> = ({ char }) => (
  <span className={classes.cell}>
    {/* initial={false}: при первом показе цифры просто стоят, анимируется
        только смена — иначе на открытии экрана прыгали бы все шесть разом */}
    <AnimatePresence initial={false}>
      <m.span
        key={char}
        className={classes.char}
        initial={{ y: '-70%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        exit={{ y: '70%', opacity: 0 }}
        transition={digitTransition}
      >
        {char}
      </m.span>
    </AnimatePresence>
  </span>
);

/** Сколько уже ждут. Тикает сам и не трогает стор: секунды обновляют только
 *  этот компонент, остальной экран не перерисовывается. */
export const Elapsed: FC<Props> = ({ startedAt, size = 'large', className }) => {
  const start = Date.parse(startedAt);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = serverNow();
      setNow(current);
      // Выравниваемся по границе секунды от старта, чтобы цифры менялись
      // ровно, а не с дрейфом setInterval
      const drift = (current - start) % 1000;
      timeout = setTimeout(tick, 1000 - (drift < 0 ? drift + 1000 : drift) + 8);
    };
    tick();
    return () => clearTimeout(timeout);
  }, [start]);

  const text = formatElapsed(now - start);

  if (size === 'small') {
    return <span className={clsx(classes.small, className)}>{text}</span>;
  }

  return (
    <span className={clsx(classes.large, className)} role="timer" aria-label={text}>
      {text.split('').map((char, index) =>
        char === ':' ? (
          <span key={index} className={classes.colon} aria-hidden="true">
            :
          </span>
        ) : (
          <Digit key={index} char={char} />
        ),
      )}
    </span>
  );
};
