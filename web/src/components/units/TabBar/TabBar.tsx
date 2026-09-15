'use client';

import React, { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { m } from 'framer-motion';

import { FriendsIcon, ProfileIcon, TimerIcon } from '@/components/ui';
import { softSpring } from '@/lib/motion';
import { useFriendRequestsQuery } from '@/store/api';
import { Routes } from '@/utils/consts';

import classes from './TabBar.module.scss';

const tabs = [
  { href: Routes.Home, label: 'Таймеры', Icon: TimerIcon, match: ['/', '/timer'] },
  { href: Routes.Friends, label: 'Друзья', Icon: FriendsIcon, match: ['/friends', '/invite'] },
  { href: Routes.Profile, label: 'Профиль', Icon: ProfileIcon, match: ['/profile'] },
];

export const TabBar: FC = () => {
  const pathname = usePathname().replace(/\/$/, '') || '/';
  const { data: requests } = useFriendRequestsQuery(undefined, {
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });
  const incoming = requests?.incoming.length ?? 0;

  const isActive = (match: string[]) =>
    match.some((m) => (m === '/' ? pathname === '/' : pathname.startsWith(m)));

  return (
    <nav className={classes.bar} aria-label="Разделы">
      {tabs.map(({ href, label, Icon, match }) => {
        const active = isActive(match);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(classes.tab, { [classes.active]: active })}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <m.span layoutId="tab-pill" className={classes.pill} transition={softSpring} />
            )}
            <span className={classes.icon}>
              <Icon size={22} />
              {href === Routes.Friends && incoming > 0 && (
                <span className={classes.badge}>{incoming}</span>
              )}
            </span>
            <span className={classes.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
