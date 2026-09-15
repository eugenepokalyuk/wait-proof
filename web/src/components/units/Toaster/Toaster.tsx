'use client';

import React, { FC, useEffect } from 'react';
import clsx from 'clsx';
import { AnimatePresence, m } from 'framer-motion';

import { softSpring } from '@/lib/motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Toast, toastActions } from '@/store/slices/toast';

import classes from './Toaster.module.scss';

const LIFETIME = 3500;

const ToastItem: FC<{ toast: Toast }> = ({ toast }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const id = setTimeout(() => dispatch(toastActions.dismissed(toast.id)), LIFETIME);
    return () => clearTimeout(id);
  }, [dispatch, toast.id]);

  return (
    <m.div
      layout
      role="status"
      className={clsx(classes.toast, classes[toast.tone])}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={softSpring}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 30) dispatch(toastActions.dismissed(toast.id));
      }}
    >
      {toast.text}
    </m.div>
  );
};

export const Toaster: FC = () => {
  const toasts = useAppSelector((state) => state.toast);
  return (
    <div className={classes.stack} aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
