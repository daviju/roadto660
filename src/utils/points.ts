// ── Points calculation and verification ────────────────────────

export const POINT_TABLE = {
  REGISTER_EXPENSE: 5,
  REGISTER_INCOME: 5,
  EXCEL_IMPORT: 50,
  STREAK_7_DAYS: 100,
  MONTH_UNDER_BUDGET: 200,
  CATEGORY_UNDER_BUDGET: 50,
  FIRST_MONTH: 100,
  THREE_MONTHS: 500,
} as const;

/** Points for completing a goal item (scales with cost) */
export function pointsForItem(cost: number): number {
  if (cost <= 0) return 50;
  return Math.min(Math.max(50, Math.floor(cost / 10)), 200);
}

/** Points for completing an entire goal */
export function pointsForGoal(totalCost: number): number {
  return Math.min(Math.floor(totalCost / 5), 2000);
}

// ── Rewards ────────────────────────────────────────────────────

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'pro_month' | 'pro_feature' | 'badge';
  duration_months?: number;
}

export const REWARDS: Reward[] = [
  {
    id: 'pro_1m',
    name: '1 mes de PRO',
    description: 'Acceso completo a todas las funciones PRO durante 1 mes',
    cost: 5000,
    type: 'pro_month',
    duration_months: 1,
  },
  {
    id: 'pro_feature_3m',
    name: '3 meses de funcion PRO',
    description: 'Acceso a una funcion PRO especifica (ej: informes email) durante 3 meses',
    cost: 3000,
    type: 'pro_feature',
    duration_months: 3,
  },
  {
    id: 'pro_feature_6m',
    name: '6 meses de funcion PRO',
    description: 'Acceso a una funcion PRO especifica durante 6 meses (mas rentable: 750/mes)',
    cost: 4500,
    type: 'pro_feature',
    duration_months: 6,
  },
  {
    id: 'badge_star',
    name: 'Badge Estrella',
    description: 'Badge exclusivo de estrella en tu perfil',
    cost: 500,
    type: 'badge',
  },
  {
    id: 'badge_fire',
    name: 'Badge Fuego',
    description: 'Badge de racha de fuego en tu perfil',
    cost: 500,
    type: 'badge',
  },
  {
    id: 'badge_diamond',
    name: 'Badge Diamante',
    description: 'Badge diamante de logros en tu perfil',
    cost: 1000,
    type: 'badge',
  },
];

/** Check if user can verify a goal completion against transactions */
export function canVerifyGoalCompletion(
  goalCost: number,
  recentExpenses: { amount: number; date: string }[],
  tolerancePct = 0.1
): boolean {
  const minAmount = goalCost * (1 - tolerancePct);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const cutoff = sixtyDaysAgo.toISOString().split('T')[0];

  // Check if any single expense matches within tolerance
  const matchingExpense = recentExpenses.find(
    (e) => e.amount >= minAmount && e.amount <= goalCost * 1.1 && e.date >= cutoff
  );
  if (matchingExpense) return true;

  // Check if total of recent expenses sum to the goal cost within tolerance
  const recentTotal = recentExpenses
    .filter((e) => e.date >= cutoff)
    .reduce((s, e) => s + e.amount, 0);
  return recentTotal >= minAmount;
}
