'use client';

import React, { FC, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Card, Input, PageHeader, Segmented, Skeleton, SwapIcon } from '@/components/ui';
import { useSearchId } from '@/lib/hooks';
import {
  errorDetail,
  useArchiveTimerMutation,
  useSwapSidesMutation,
  useTimerQuery,
  useUpdateTimerMutation,
} from '@/store/api';
import { useToast } from '@/store/hooks';
import { Routes, timerRoute } from '@/utils/consts';

import classes from './TimerSettingsView.module.scss';

export const TimerSettingsView: FC = () => {
  const id = useSearchId();
  const router = useRouter();
  const toast = useToast();
  const { data: timer } = useTimerQuery(id ?? 0, { skip: !id });
  const [update, updateState] = useUpdateTimerMutation();
  const [swap, swapState] = useSwapSidesMutation();
  const [archive, archiveState] = useArchiveTimerMutation();

  const [leftLabel, setLeftLabel] = useState('');
  const [rightLabel, setRightLabel] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    if (timer) {
      setLeftLabel(timer.left.label);
      setRightLabel(timer.right.label);
    }
  }, [timer?.left.label, timer?.right.label]);

  if (!id) return <PageHeader title="Настройки" backHref={Routes.Home} />;
  if (!timer) return <Skeleton height={300} />;

  const saveLabels = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await update({ id, left_label: leftLabel.trim(), right_label: rightLabel.trim() }).unwrap();
      toast('Подписи сохранены', 'success');
    } catch (err) {
      toast(errorDetail(err, 'Не получилось сохранить.'), 'error');
    }
  };

  const onArchive = async () => {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    try {
      await archive(id).unwrap();
      router.replace(Routes.Home);
    } catch (err) {
      toast(errorDetail(err, 'Не получилось.'), 'error');
    }
  };

  const labelsChanged = leftLabel.trim() !== timer.left.label || rightLabel.trim() !== timer.right.label;

  return (
    <div className={classes.root}>
      <PageHeader title="Настройки" subtitle={`${timer.left.name} и ${timer.right.name}`} backHref={timerRoute(id)} />

      <Card title="Подписи">
        <form className={classes.form} onSubmit={saveLabels}>
          <div className={classes.labels}>
            <Input label={`Слева · ${timer.left.name}`} value={leftLabel} maxLength={20} onChange={(e) => setLeftLabel(e.target.value)} />
            <Input label={`Справа · ${timer.right.name}`} value={rightLabel} maxLength={20} onChange={(e) => setRightLabel(e.target.value)} />
          </div>
          <div className={classes.row}>
            <Button type="submit" size="small" disabled={!labelsChanged || !leftLabel.trim() || !rightLabel.trim()} pending={updateState.isLoading}>
              Сохранить
            </Button>
            <Button
              variant="secondary"
              size="small"
              icon={<SwapIcon />}
              pending={swapState.isLoading}
              onClick={() => swap(id).unwrap().catch((err) => toast(errorDetail(err, 'Не получилось.'), 'error'))}
            >
              Поменять местами
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Напоминания">
        <p className={classes.hint}>Как часто напоминать тому, кого ждут.</p>
        <Segmented
          label="Интервал напоминаний"
          value={timer.reminder_minutes}
          onChange={(value) =>
            update({ id, reminder_minutes: value }).unwrap().catch((err) => toast(errorDetail(err, 'Не получилось.'), 'error'))
          }
          options={[
            { value: 0, label: 'Выкл' },
            { value: 15, label: '15 мин' },
            { value: 30, label: '30 мин' },
            { value: 60, label: '1 ч' },
          ]}
        />
      </Card>

      <Card title="Архив">
        <p className={classes.hint}>
          Таймер пропадёт у обоих. История сохранится, но новый таймер с этим другом начнётся с нуля.
        </p>
        <Button variant="danger" size="small" onClick={onArchive} pending={archiveState.isLoading}>
          {confirmArchive ? 'Точно убрать в архив?' : 'Убрать в архив'}
        </Button>
      </Card>
    </div>
  );
};
