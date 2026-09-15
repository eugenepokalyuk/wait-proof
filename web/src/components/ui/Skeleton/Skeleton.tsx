import React, { FC } from 'react';
import clsx from 'clsx';

import classes from './Skeleton.module.scss';

export const Skeleton: FC<{ height?: number; className?: string }> = ({
  height = 64,
  className,
}) => <div className={clsx(classes.skeleton, className)} style={{ height }} />;
