import type { Variants, Transition } from 'framer-motion';

// ─── Timing curves ───────────────────────────────────────────────
export const springSnappy: Transition = { type: 'spring', stiffness: 400, damping: 30 };
export const springBouncy: Transition = { type: 'spring', stiffness: 300, damping: 20 };
export const springSmooth: Transition = { type: 'spring', stiffness: 200, damping: 25 };
export const easeOut: Transition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] };
export const easeOutSlow: Transition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] };

// ─── Page transition ─────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(4px)',
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

// ─── Staggered children container ────────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

// ─── Fade up (for cards, sections) ───────────────────────────────
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

export const fadeUpSmall: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Scale fade (for modals, popups) ─────────────────────────────
export const scaleFade: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ─── Slide in from right (for form panels) ───────────────────────
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 30, height: 0 },
  animate: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    x: -20,
    height: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};

// ─── Collapse/expand ─────────────────────────────────────────────
export const collapseVariants: Variants = {
  initial: { opacity: 0, height: 0, overflow: 'hidden' },
  animate: {
    opacity: 1,
    height: 'auto',
    overflow: 'hidden',
    transition: {
      height: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.25, delay: 0.05 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    transition: {
      height: { type: 'spring', stiffness: 400, damping: 35 },
      opacity: { duration: 0.15 },
    },
  },
};

// ─── List items (for expense/income rows) ────────────────────────
export const listItem: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    x: 40,
    scale: 0.96,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

// ─── Card hover (shared across all cards) ────────────────────────
export const cardHover = {
  whileHover: {
    y: -2,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  whileTap: { scale: 0.985 },
};

// ─── Button interactions ─────────────────────────────────────────
export const buttonTap = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.02 },
};

export const buttonTapSmall = {
  whileTap: { scale: 0.92 },
};

// ─── Shimmer (for progress bars) ─────────────────────────────────
export const shimmer: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '200%',
    transition: {
      repeat: Infinity,
      repeatDelay: 3,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

// ─── Pulse glow ──────────────────────────────────────────────────
export const pulseGlow: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'easeInOut',
    },
  },
};

// ─── Sidebar nav item ────────────────────────────────────────────
export const navItem: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Number counter helper ───────────────────────────────────────
export function getCountDuration(value: number): number {
  if (Math.abs(value) > 10000) return 1.2;
  if (Math.abs(value) > 1000) return 0.9;
  return 0.6;
}
