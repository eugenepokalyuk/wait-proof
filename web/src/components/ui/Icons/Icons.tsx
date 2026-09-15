import React, { FC, SVGProps } from 'react';

// Инлайн SVG одним стилем: 24×24, обводка 2, цвет от текста. Иконочный
// пакет ради дюжины значков — сотни килобайт, которые никто не увидит.

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Svg: FC<IconProps> = ({ size = 24, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const TimerIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="7" width="19" height="10" rx="5" />
    <circle cx="8" cy="12" r="2.5" />
  </Svg>
);

export const FriendsIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.4 3.3-5.5 6.5-5.5s5.7 2.1 6.5 5.5" />
    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.9c1.5.9 2.5 2.6 3 5.1" />
  </Svg>
);

export const ProfileIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c1-3.8 4.1-6 8-6s7 2.2 8 6" />
  </Svg>
);

export const BackIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const HistoryIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 19V11M10 19V5M16 19v-6M22 19H2" />
  </Svg>
);

export const SettingsIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
);

export const ShareIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </Svg>
);

export const CopyIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="8" y="8" width="13" height="13" rx="3" />
    <path d="M16 8V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2" />
  </Svg>
);

export const BellIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
    <path d="M10 21h4" />
  </Svg>
);

export const SwapIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </Svg>
);

export const PlusIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const CheckIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const CloseIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const EyeIcon: FC<IconProps & { off?: boolean }> = ({ off, ...p }) => (
  <Svg {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </Svg>
);

export const AddToHomeIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M12 8v8M8 12h8" />
  </Svg>
);
