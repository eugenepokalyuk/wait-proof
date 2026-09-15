'use client';

import { useSearchParams } from 'next/navigation';

/** Числовой id из ?id= — или null, если его нет или он кривой. */
export const useSearchId = (): number | null => {
  const raw = useSearchParams().get('id');
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
};
