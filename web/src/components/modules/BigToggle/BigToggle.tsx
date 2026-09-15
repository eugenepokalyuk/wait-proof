'use client';

import React, { FC, KeyboardEvent, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { m, PanInfo, useAnimationControls, useMotionValue, useTransform } from 'framer-motion';

import { knobSpring } from '@/lib/motion';
import type { Side } from '@/store/api';

import classes from './BigToggle.module.scss';

interface Props {
  value: Side;
  onChange: (side: Side) => void;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

const PAD = 6;
const ORDER: Side[] = ['left', 'none', 'right'];

/** Тумблер на три положения. Ручка на имени — этого человека ждут.
 *
 *  Положение ручки — motion value, а не стейт: при свайпе она двигается
 *  60 раз в секунду, и перерисовывать на это React было бы расточительно.
 *  Подсветка сторон вычисляется из той же координаты. */
export const BigToggle: FC<Props> = ({ value, onChange, leftLabel, rightLabel, disabled }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ travel: 0, knob: 0 });
  const x = useMotionValue(0);
  // Анимируем через controls, а не императивный animate(): тот тянет весь
  // движок в стартовый бандл, а controls работают на лениво загруженных фичах
  const controls = useAnimationControls();
  const dragging = useRef(false);
  const placed = useRef(false);

  // Координаты трёх положений от ширины дорожки. Держим в ref, чтобы
  // трансформации ниже всегда видели свежие значения после поворота экрана
  const positions = useRef<Record<Side, number>>({ left: 0, none: 0, right: 0 });
  positions.current = {
    left: 0,
    none: geometry.travel / 2,
    right: geometry.travel,
  };

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const knob = track.clientHeight - PAD * 2;
      setGeometry({ travel: Math.max(0, track.clientWidth - PAD * 2 - knob), knob });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!geometry.travel || dragging.current) return;
    const target = positions.current[value];
    if (!placed.current) {
      // Первое размещение без анимации: ручка не должна «приезжать» при
      // каждом открытии экрана
      x.set(target);
      placed.current = true;
      return;
    }
    controls.start({ x: target, transition: knobSpring });
  }, [value, geometry.travel, x, controls]);

  const leftGlow = useTransform(x, (v) => {
    const center = positions.current.none;
    return center ? Math.min(1, Math.max(0, 1 - v / center)) : 0;
  });
  const rightGlow = useTransform(x, (v) => {
    const { none: center, right } = positions.current;
    return right > center ? Math.min(1, Math.max(0, (v - center) / (right - center))) : 0;
  });

  const choose = (side: Side) => {
    if (disabled) return;
    if (side !== value) {
      navigator.vibrate?.(12);
      onChange(side);
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    dragging.current = false;
    // Проецируем бросок по скорости: быстрый короткий свайп должен
    // перекидывать ручку, а не возвращать её назад
    const projected = x.get() + info.velocity.x * 0.12;
    const nearest = ORDER.reduce((best, side) =>
      Math.abs(positions.current[side] - projected) < Math.abs(positions.current[best] - projected)
        ? side
        : best,
    );
    controls.start({ x: positions.current[disabled ? value : nearest], transition: knobSpring });
    if (!disabled) choose(nearest);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const index = ORDER.indexOf(value);
    if (event.key === 'ArrowLeft' && index > 0) choose(ORDER[index - 1]);
    if (event.key === 'ArrowRight' && index < ORDER.length - 1) choose(ORDER[index + 1]);
  };

  return (
    <div className={clsx(classes.root, { [classes.disabled]: disabled })}>
      <div className={classes.names}>
        <button
          type="button"
          className={clsx(classes.name, classes.nameLeft, { [classes.nameActive]: value === 'left' })}
          onClick={() => choose('left')}
          tabIndex={-1}
        >
          {leftLabel}
        </button>
        <button
          type="button"
          className={clsx(classes.name, classes.nameRight, { [classes.nameActive]: value === 'right' })}
          onClick={() => choose('right')}
          tabIndex={-1}
        >
          {rightLabel}
        </button>
      </div>

      <div
        ref={trackRef}
        className={classes.track}
        role="radiogroup"
        aria-label="Кого ждут"
        onKeyDown={onKeyDown}
      >
        <m.span className={clsx(classes.glow, classes.glowLeft)} style={{ opacity: leftGlow }} />
        <m.span className={clsx(classes.glow, classes.glowRight)} style={{ opacity: rightGlow }} />

        {ORDER.map((side) => (
          <button
            key={side}
            type="button"
            role="radio"
            aria-checked={value === side}
            tabIndex={value === side ? 0 : -1}
            aria-label={
              side === 'none'
                ? 'Никто никого не ждёт'
                : `Ждут: ${side === 'left' ? leftLabel : rightLabel}`
            }
            className={clsx(classes.zone, classes[`zone_${side}`])}
            onClick={() => choose(side)}
          />
        ))}

        <m.div
          className={classes.knob}
          style={{ x, width: geometry.knob || undefined, height: geometry.knob || undefined }}
          animate={controls}
          drag={disabled ? false : 'x'}
          dragConstraints={{ left: 0, right: geometry.travel }}
          dragElastic={0.08}
          dragMomentum={false}
          whileTap={{ scale: 0.94 }}
          whileDrag={{ scale: 1.03 }}
          onDragStart={() => {
            dragging.current = true;
          }}
          onDragEnd={onDragEnd}
        >
          <m.span className={clsx(classes.knobFill, classes.knobLeft)} style={{ opacity: leftGlow }} />
          <m.span className={clsx(classes.knobFill, classes.knobRight)} style={{ opacity: rightGlow }} />
          <span className={classes.grip} />
        </m.div>
      </div>

      <p className={clsx(classes.center, { [classes.centerActive]: value === 'none' })}>
        никто
      </p>
    </div>
  );
};
