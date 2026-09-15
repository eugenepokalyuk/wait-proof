'use client';

import React, { useId } from 'react';
import clsx from 'clsx';
import { m } from 'framer-motion';

import { softSpring } from '@/lib/motion';

import classes from './Segmented.module.scss';

interface Props<T extends string | number> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export const Segmented = <T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: Props<T>) => {
  // layoutId уникален на экземпляр: два переключателя на одном экране не
  // должны перетаскивать подложку друг у друга
  const layoutId = useId();

  return (
    <div role="radiogroup" aria-label={label} className={clsx(classes.root, className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={clsx(classes.option, { [classes.active]: active })}
            onClick={() => onChange(option.value)}
          >
            {active && (
              <m.span
                layoutId={layoutId}
                className={classes.thumb}
                transition={softSpring}
              />
            )}
            <span className={classes.text}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
