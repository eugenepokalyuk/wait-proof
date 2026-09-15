'use client';

import React, { FC, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Input, Segmented } from '@/components/ui';
import {
  ApiErrorData,
  errorDetail,
  FriendDto,
  useCreateTimerMutation,
  useMeQuery,
} from '@/store/api';
import { useToast } from '@/store/hooks';
import { timerRoute } from '@/utils/consts';

import classes from './CreateTimerForm.module.scss';

export const CreateTimerForm: FC<{ friend: FriendDto }> = ({ friend }) => {
  const router = useRouter();
  const toast = useToast();
  const { data: me } = useMeQuery();
  const [create, state] = useCreateTimerMutation();
  const [left, setLeft] = useState<'friend' | 'me'>('friend');
  const [leftLabel, setLeftLabel] = useState('');
  const [rightLabel, setRightLabel] = useState('');

  const myName = me?.name ?? 'Я';
  const leftName = left === 'me' ? myName : friend.name;
  const rightName = left === 'me' ? friend.name : myName;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const timer = await create({
        friend_id: friend.id,
        left,
        left_label: leftLabel.trim() || undefined,
        right_label: rightLabel.trim() || undefined,
      }).unwrap();
      router.push(timerRoute(timer.id));
    } catch (err) {
      const existing = (err as { data?: ApiErrorData }).data?.timer_id;
      if (existing) {
        router.push(timerRoute(existing));
        return;
      }
      toast(errorDetail(err, 'Не получилось создать таймер.'), 'error');
    }
  };

  return (
    <form className={classes.form} onSubmit={submit}>
      <Segmented
        label="Кто слева"
        value={left}
        onChange={setLeft}
        options={[
          { value: 'friend', label: `Слева ${friend.name}` },
          { value: 'me', label: 'Слева я' },
        ]}
      />
      <div className={classes.labels}>
        <Input
          label="Подпись слева"
          placeholder={leftName}
          maxLength={20}
          value={leftLabel}
          onChange={(e) => setLeftLabel(e.target.value)}
          hint="Например, «Она»"
        />
        <Input
          label="Подпись справа"
          placeholder={rightName}
          maxLength={20}
          value={rightLabel}
          onChange={(e) => setRightLabel(e.target.value)}
          hint="Например, «Он»"
        />
      </div>
      <Button type="submit" fullWidth pending={state.isLoading}>
        Создать таймер
      </Button>
    </form>
  );
};
