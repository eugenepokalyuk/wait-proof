'use client';

import React, { FC, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PushPrompt } from '@/components/modules';
import { Button, Card, Input, PageHeader, Skeleton, Switch } from '@/components/ui';
import { currentSubscription, getPushState } from '@/lib/push';
import { getDeviceId } from '@/lib/pwa';
import { formatDateTime } from '@/lib/time';
import {
  api,
  errorDetail,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useDevicesQuery,
  useLogoutMutation,
  useMeQuery,
  useRemoveDeviceMutation,
  useRotateInviteMutation,
  useTestPushMutation,
  useUpdateMeMutation,
} from '@/store/api';
import { useAppDispatch, useAppSelector, useToast } from '@/store/hooks';
import { authActions } from '@/store/slices/auth';
import { Routes } from '@/utils/consts';

import classes from './ProfileView.module.scss';

const deviceName = (ua: string) => {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Устройство';
};

export const ProfileView: FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const refresh = useAppSelector((state) => state.auth.refresh);

  const { data: me } = useMeQuery();
  const { data: devices } = useDevicesQuery();
  const [updateMe, updateState] = useUpdateMeMutation();
  const [rotate, rotateState] = useRotateInviteMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [deleteAccount, deleteState] = useDeleteAccountMutation();
  const [removeDevice] = useRemoveDeviceMutation();
  const [testPush, testState] = useTestPushMutation();
  const [logout] = useLogoutMutation();

  const [name, setName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    if (me) setName(me.name);
  }, [me?.name]);

  useEffect(() => {
    setPushOn(getPushState() === 'granted');
  }, []);

  const signOut = async () => {
    // Подписку этого устройства отзываем локально: иначе пуши чужой учётки
    // продолжили бы приходить на телефон после выхода
    try {
      const subscription = await currentSubscription();
      await subscription?.unsubscribe();
    } catch {
      // не страшно — сервер удалит мёртвую подписку при первой отправке
    }
    if (refresh) logout({ refresh });
    dispatch(authActions.signedOut());
    dispatch(api.util.resetApiState());
    router.replace(Routes.Login);
  };

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateMe({ name: name.trim() }).unwrap();
      toast('Имя сохранено', 'success');
    } catch (err) {
      toast(errorDetail(err, 'Не получилось сохранить.'), 'error');
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword }).unwrap();
      setOldPassword('');
      setNewPassword('');
      toast('Пароль изменён. Остальные устройства вышли.', 'success');
    } catch (err) {
      toast(errorDetail(err, 'Не получилось сменить пароль.'), 'error');
    }
  };

  const removeAccount = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await deleteAccount({ password: deletePassword }).unwrap();
      dispatch(authActions.signedOut());
      dispatch(api.util.resetApiState());
      router.replace(Routes.Login);
    } catch (err) {
      toast(errorDetail(err, 'Не получилось удалить аккаунт.'), 'error');
    }
  };

  if (!me) return <Skeleton height={320} />;

  const myDevice = getDeviceId();

  return (
    <div className={classes.root}>
      <PageHeader title="Профиль" subtitle={me.email} />

      <Card title="Имя">
        <form className={classes.inline} onSubmit={saveName}>
          <Input label="Как тебя видят друзья" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={classes.grow} />
          <Button type="submit" disabled={!name.trim() || name.trim() === me.name} pending={updateState.isLoading}>
            Сохранить
          </Button>
        </form>
      </Card>

      <PushPrompt />

      <Card title="Уведомления">
        <p className={classes.hint}>О каждом переключении тумблера уведомление приходит всегда.</p>
        <Switch
          label="Напоминания"
          description="Пока тебя ждут — с интервалом из настроек таймера"
          checked={me.notify_reminders}
          onChange={(value) => updateMe({ notify_reminders: value })}
        />
        <Switch
          label="Друзья"
          description="Заявки и новые друзья"
          checked={me.notify_friends}
          onChange={(value) => updateMe({ notify_friends: value })}
        />
        {pushOn && (
          <Button
            variant="secondary"
            size="small"
            pending={testState.isLoading}
            onClick={() =>
              testPush()
                .unwrap()
                .then(() => toast('Отправили — проверь шторку', 'success'))
                .catch((err) => toast(errorDetail(err, 'Не доставлено.'), 'error'))
            }
          >
            Прислать проверочное
          </Button>
        )}
      </Card>

      {devices && devices.length > 0 && (
        <Card title="Устройства с уведомлениями">
          {devices.map((device) => (
            <div key={device.id} className={classes.device}>
              <div className={classes.grow}>
                <p className={classes.deviceName}>
                  {deviceName(device.user_agent)}
                  {device.device_id === myDevice && <span className={classes.tag}>это</span>}
                </p>
                <p className={classes.hint}>
                  {device.last_success_at
                    ? `Последний пуш: ${formatDateTime(device.last_success_at)}`
                    : `Подключено: ${formatDateTime(device.created_at)}`}
                </p>
              </div>
              <Button variant="ghost" size="small" onClick={() => removeDevice(device.id)}>
                Убрать
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Card title="Ссылка-приглашение">
        <p className={classes.code}>{me.invite_code}</p>
        <p className={classes.hint}>
          Если ссылка ушла не туда — выпусти новую. Старая перестанет работать.
        </p>
        <Button variant="secondary" size="small" pending={rotateState.isLoading} onClick={() => rotate()}>
          Выпустить новую
        </Button>
      </Card>

      <Card title="Пароль">
        <form className={classes.stack} onSubmit={savePassword}>
          <input type="text" name="username" autoComplete="username" value={me.email} readOnly hidden />
          <Input label="Текущий пароль" type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <Input label="Новый пароль" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint="Не короче 8 символов" />
          <Button type="submit" size="small" disabled={!oldPassword || newPassword.length < 8} pending={passwordState.isLoading}>
            Сменить пароль
          </Button>
        </form>
      </Card>

      <Button variant="secondary" fullWidth onClick={signOut}>
        Выйти
      </Button>

      {!showDelete ? (
        <Button variant="danger" size="small" onClick={() => setShowDelete(true)}>
          Удалить аккаунт
        </Button>
      ) : (
        <Card title="Удаление аккаунта">
          <form className={classes.stack} onSubmit={removeAccount}>
            <p className={classes.hint}>
              Общие таймеры уйдут в архив. У друзей останется история, но вместо тебя там будет
              «Удалённый пользователь». Отменить нельзя.
            </p>
            <Input label="Пароль для подтверждения" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            <div className={classes.inline}>
              <Button type="button" variant="secondary" size="small" onClick={() => setShowDelete(false)}>
                Не надо
              </Button>
              <Button type="submit" variant="danger" size="small" disabled={!deletePassword} pending={deleteState.isLoading}>
                Удалить навсегда
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
