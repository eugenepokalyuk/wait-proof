'use client';

import { useDispatch, useSelector } from 'react-redux';

import { toastActions, Toast } from './slices/toast';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useToast = () => {
  const dispatch = useAppDispatch();
  return (text: string, tone: Toast['tone'] = 'default') =>
    dispatch(toastActions.shown(text, tone));
};
