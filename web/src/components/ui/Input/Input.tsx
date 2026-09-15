'use client';

import React, { FC, useId, useState } from 'react';
import clsx from 'clsx';

import { EyeIcon } from '../Icons/Icons';

import classes from './Input.module.scss';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input: FC<Props> = ({ label, error, hint, type, className, ...rest }) => {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <label className={clsx(classes.field, className)} htmlFor={id}>
      <span className={classes.label}>{label}</span>
      <span className={clsx(classes.box, { [classes.invalid]: error })}>
        <input
          id={id}
          className={classes.input}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className={classes.eye}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <EyeIcon size={20} off={visible} />
          </button>
        )}
      </span>
      {(error || hint) && (
        <span className={error ? classes.error : classes.hint}>{error || hint}</span>
      )}
    </label>
  );
};
