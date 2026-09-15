import React, { FC, PropsWithChildren } from 'react';
import clsx from 'clsx';

import classes from './Card.module.scss';

interface Props extends PropsWithChildren {
  title?: string;
  className?: string;
  action?: React.ReactNode;
}

export const Card: FC<Props> = ({ title, action, className, children }) => (
  <section className={clsx(classes.card, className)}>
    {(title || action) && (
      <header className={classes.header}>
        {title && <h2 className={classes.title}>{title}</h2>}
        {action}
      </header>
    )}
    {children}
  </section>
);
