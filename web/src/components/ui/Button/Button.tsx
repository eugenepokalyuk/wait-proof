'use client';

import React, { FC } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { HTMLMotionProps, m } from 'framer-motion';

import classes from './Button.module.scss';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'medium' | 'small';
  fullWidth?: boolean;
  /** Идёт запрос: кнопка неактивна и чуть гаснет. Спиннер не рисуем —
   *  запросы здесь короткие, и мелькающее колесо раздражает сильнее паузы. */
  pending?: boolean;
  href?: string;
  icon?: React.ReactNode;
}

export const Button: FC<Props> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth,
  pending,
  href,
  icon,
  className,
  children,
  disabled,
  ...rest
}) => {
  const cx = clsx(
    classes.button,
    classes[variant],
    classes[size],
    { [classes.full]: fullWidth, [classes.pending]: pending },
    className,
  );

  const content = (
    <>
      {icon && <span className={classes.icon}>{icon}</span>}
      {children && <span>{children}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cx}>
        {content}
      </Link>
    );
  }

  return (
    <m.button
      type="button"
      className={cx}
      disabled={disabled || pending}
      whileTap={{ scale: 0.97 }}
      {...rest}
    >
      {content}
    </m.button>
  );
};
