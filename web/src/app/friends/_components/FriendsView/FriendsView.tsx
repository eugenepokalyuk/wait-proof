'use client';

import React, { FC, FormEvent, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';

import {
  Button,
  Card,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  Input,
  PageHeader,
  ShareIcon,
  Skeleton,
} from '@/components/ui';
import { softSpring } from '@/lib/motion';
import {
  errorDetail,
  FriendDto,
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useFriendRequestsQuery,
  useFriendsQuery,
  useMeQuery,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
} from '@/store/api';
import { useToast } from '@/store/hooks';
import { timerRoute } from '@/utils/consts';

import { CreateTimerForm } from '../CreateTimerForm/CreateTimerForm';

import classes from './FriendsView.module.scss';

const listItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -24 },
  transition: softSpring,
};

export const FriendsView: FC = () => {
  const toast = useToast();
  const { data: me } = useMeQuery();
  const { data: friends, isLoading } = useFriendsQuery();
  const { data: requests } = useFriendRequestsQuery();
  const [send, sendState] = useSendFriendRequestMutation();
  const [accept] = useAcceptFriendRequestMutation();
  const [decline] = useDeclineFriendRequestMutation();
  const [cancel] = useCancelFriendRequestMutation();
  const [email, setEmail] = useState('');

  const share = async () => {
    if (!me) return;
    const text = `Давай решим, кто кого ждёт. Добавляйся: ${me.invite_url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Я тебя жду', text, url: me.invite_url });
        return;
      }
      await navigator.clipboard.writeText(me.invite_url);
      toast('Ссылка скопирована', 'success');
    } catch {
      // Закрыли окно «Поделиться» — это не ошибка
    }
  };

  const copy = async () => {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.invite_url);
      toast('Ссылка скопирована', 'success');
    } catch {
      toast('Не получилось скопировать', 'error');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await send({ email: email.trim() }).unwrap();
      setEmail('');
      toast(result.detail, 'success');
    } catch (err) {
      toast(errorDetail(err, 'Не получилось отправить заявку.'), 'error');
    }
  };

  return (
    <div className={classes.root}>
      <PageHeader title="Друзья" />

      <Card title="Пригласить ссылкой">
        <p className={classes.hint}>
          Отправь ссылку — друг откроет её, войдёт, и вы сразу станете друзьями.
        </p>
        <div className={classes.row}>
          <Button icon={<ShareIcon />} onClick={share} disabled={!me} className={classes.grow}>
            Поделиться
          </Button>
          <Button variant="secondary" icon={<CopyIcon />} onClick={copy} disabled={!me} aria-label="Скопировать ссылку" />
        </div>
      </Card>

      <Card title="Добавить по почте">
        <form className={classes.inline} onSubmit={submit}>
          <Input
            label="Почта друга"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className={classes.grow}
          />
          <Button type="submit" disabled={!email.includes('@')} pending={sendState.isLoading}>
            Позвать
          </Button>
        </form>
      </Card>

      <AnimatePresence initial={false}>
        {requests && requests.incoming.length > 0 && (
          <m.div {...listItem}>
            <Card title="Хотят дружить">
              <AnimatePresence initial={false}>
                {requests.incoming.map((request) => (
                  <m.div key={request.id} className={classes.person} {...listItem}>
                    <Avatar name={request.user.name} />
                    <div className={classes.personText}>
                      <p className={classes.name}>{request.user.name}</p>
                      <p className={classes.email}>{request.user.email}</p>
                    </div>
                    <button type="button" className={classes.iconButton} aria-label="Отклонить" onClick={() => decline(request.id)}>
                      <CloseIcon size={20} />
                    </button>
                    <button
                      type="button"
                      className={`${classes.iconButton} ${classes.accept}`}
                      aria-label="Принять"
                      onClick={() =>
                        accept(request.id)
                          .unwrap()
                          .then(() => toast(`${request.user.name} теперь в друзьях`, 'success'))
                          .catch((err) => toast(errorDetail(err, 'Не получилось.'), 'error'))
                      }
                    >
                      <CheckIcon size={20} />
                    </button>
                  </m.div>
                ))}
              </AnimatePresence>
            </Card>
          </m.div>
        )}
      </AnimatePresence>

      <Card title="Друзья">
        {isLoading && <Skeleton height={56} />}
        {friends?.length === 0 && (
          <p className={classes.hint}>Пока никого. Поделись ссылкой — это быстрее всего.</p>
        )}
        <AnimatePresence initial={false}>
          {friends?.map((friend) => (
            <m.div key={friend.id} {...listItem}>
              <FriendRow friend={friend} />
            </m.div>
          ))}
        </AnimatePresence>
      </Card>

      {requests && requests.outgoing.length > 0 && (
        <Card title="Ждут ответа">
          <AnimatePresence initial={false}>
            {requests.outgoing.map((request) => (
              <m.div key={request.id} className={classes.person} {...listItem}>
                <div className={classes.personText}>
                  <p className={classes.name}>{request.email}</p>
                  <p className={classes.email}>Заявка отправлена</p>
                </div>
                <Button variant="ghost" size="small" onClick={() => cancel(request.id)}>
                  Отменить
                </Button>
              </m.div>
            ))}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
};

const Avatar: FC<{ name: string }> = ({ name }) => (
  <span className={classes.avatar} aria-hidden="true">
    {name.slice(0, 1).toUpperCase()}
  </span>
);

const FriendRow: FC<{ friend: FriendDto }> = ({ friend }) => {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [remove, removeState] = useRemoveFriendMutation();

  const onRemove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 4000);
      return;
    }
    try {
      await remove(friend.id).unwrap();
    } catch (err) {
      toast(errorDetail(err, 'Не получилось удалить.'), 'error');
    }
  };

  return (
    <div className={classes.friend}>
      <div className={classes.person}>
        <Avatar name={friend.name} />
        <div className={classes.personText}>
          <p className={classes.name}>{friend.name}</p>
          <p className={classes.email}>{friend.email}</p>
        </div>
        {friend.timer_id ? (
          <Button size="small" href={timerRoute(friend.timer_id)}>
            Таймер
          </Button>
        ) : (
          <Button size="small" variant={creating ? 'secondary' : 'primary'} onClick={() => setCreating((v) => !v)}>
            {creating ? 'Скрыть' : 'Создать таймер'}
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {creating && !friend.timer_id && (
          <m.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={softSpring}
          >
            <CreateTimerForm friend={friend} />
          </m.div>
        )}
      </AnimatePresence>

      <button type="button" className={classes.remove} onClick={onRemove} disabled={removeState.isLoading}>
        {confirmRemove ? 'Нажми ещё раз, чтобы удалить' : 'Удалить из друзей'}
      </button>
    </div>
  );
};
