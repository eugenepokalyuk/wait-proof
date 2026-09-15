import React, { FC } from 'react';
import Link from 'next/link';

import { BackIcon } from '../Icons/Icons';

import classes from './PageHeader.module.scss';

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export const PageHeader: FC<Props> = ({ title, subtitle, backHref, actions }) => (
  <header className={classes.header}>
    {backHref && (
      <Link href={backHref} className={classes.back} aria-label="Назад">
        <BackIcon />
      </Link>
    )}
    <div className={classes.titles}>
      <h1 className={classes.title}>{title}</h1>
      {subtitle && <p className={classes.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={classes.actions}>{actions}</div>}
  </header>
);
