import type { Transition } from 'framer-motion';

// Все пружины и кривые — здесь. Ни одной «магической» stiffness в
// компонентах: одинаковые движения и должны ощущаться одинаково.

/** Ручка тумблера: быстрая, с лёгким перелётом — щёлкает, как настоящая. */
export const knobSpring: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.9,
};

/** Появление карточек, тостов, блоков. */
export const softSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
};

export const quick: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};

export const digitTransition: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
};
