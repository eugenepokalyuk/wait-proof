'use client';

import React, { FC, useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';

import { softSpring } from '@/lib/motion';
import { serverNow } from '@/lib/time';
import { TimerDto, useUndoTimerMutation } from '@/store/api';
import { useToast } from '@/store/hooks';

import classes from './UndoBar.module.scss';

/** «Отменить» после щелчка. Промах пальцем не должен попасть в счёт.
 *  Кнопку видит только тот, кто щёлкнул, и только пока сервер разрешает. */
export const UndoBar: FC<{ timer: TimerDto; meId: number | null }> = ({ timer, meId }) => {
  const [undo, undoState] = useUndoTimerMutation();
  const toast = useToast();
  const until = timer.undo && timer.undo.by === meId ? Date.parse(timer.undo.until) : 0;
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!until) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, until - serverNow()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [until]);

  const visible = left > 0;
  const seconds = Math.ceil(left / 1000);

  const onUndo = async () => {
    try {
      await undo({ id: timer.id, version: timer.version }).unwrap();
    } catch {
      toast('Отменить уже нельзя.');
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          className={classes.bar}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={softSpring}
        >
          <span className={classes.text}>Переключено</span>
          <button
            type="button"
            className={classes.button}
            onClick={onUndo}
            disabled={undoState.isLoading}
          >
            Отменить · {seconds}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
};
