// Our own easing functions (no animation library). t is in [0, 1].

export type Easing = (t: number) => number;

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const linear: Easing = (t) => clamp01(t);

/** Slow start and end; used for tokens moving between nodes. */
export const easeInOutCubic: Easing = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Fast start, gentle stop; used for state changes settling in. */
export const easeOutQuart: Easing = (t) => 1 - Math.pow(1 - clamp01(t), 4);
