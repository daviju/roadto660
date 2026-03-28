// ─── Stripe public price IDs (safe to expose) ──────────────
export const STRIPE_PRICES = {
  monthly: {
    id: 'price_1TG0JNBy3EN0zfM2Qwhepm3D',
    amount: 3.99,
    label: 'Mensual',
    interval: 'mes',
  },
  annual: {
    id: 'price_1TG0JNBy3EN0zfM2dSnK0Jbq',
    amount: 29.99,
    label: 'Anual',
    interval: 'año',
    savings: Math.round((1 - 29.99 / (3.99 * 12)) * 100), // ~37%
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PRICES;
