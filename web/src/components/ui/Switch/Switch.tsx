'use client';

import React, { FC } from 'react';
import clsx from 'clsx';
import { m } from 'framer-motion';

import { softSpring } from '@/lib/motion';

import classes from './Switch.module.scss';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: FC<Props> = ({ checked, onChange, label, description, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    className={classes.row}
    onClick={() => onChange(!checked)}
  >
    <span className={classes.text}>
      <span className={classes.label}>{label}</span>
      {description && <span className={classes.description}>{description}</span>}
    </span>
    <span className={clsx(classes.track, { [classes.on]: checked })}>
      <m.span
        className={classes.thumb}
        animate={{ x: checked ? 20 : 0 }}
        transition={softSpring}
      />
    </span>
  </button>
);
