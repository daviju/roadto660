import { differenceInDays, differenceInMonths, parseISO } from 'date-fns';
import type { Expense, Income, Phase } from '../types';
import { getMonthDateRange } from './format';

// ─── Balance / Objectives ────────────────────────────────────────
export function getAvailableBalance(currentBalance: number, emergencyFund: number): number {
  return Math.max(0, currentBalance - emergencyFund);
}

export function getTotalObjective(phases: Phase[]): number {
  return phases.reduce(
    (sum, phase) => sum + phase.items.reduce((s, item) => s + item.estimatedCost, 0),
    0
  );
}

export function getTotalPaid(phases: Phase[]): number {
  return phases.reduce(
    (sum, phase) => sum + phase.items.reduce((s, item) => s + (item.paid ? item.paidAmount : 0), 0),
    0
  );
}

export function getPhaseTotal(phase: Phase): number {
  return phase.items.reduce((sum, item) => sum + item.estimatedCost, 0);
}

export function getPhasePaid(phase: Phase): number {
  return phase.items.reduce((sum, item) => sum + (item.paid ? item.paidAmount : 0), 0);
}

// ─── Time ────────────────────────────────────────────────────────
export function getDaysRemaining(targetDate: string): number {
  return Math.max(0, differenceInDays(parseISO(targetDate), new Date()));
}

export function getMonthsRemaining(targetDate: string): number {
  return Math.max(1, differenceInMonths(parseISO(targetDate), new Date()));
}

export function getRequiredMonthlySavings(
  totalObjective: number,
  totalPaid: number,
  availableBalance: number,
  targetDate: string
): number {
  const remaining = totalObjective - totalPaid - availableBalance;
  if (remaining <= 0) return 0;
  const months = getMonthsRemaining(targetDate);
  return remaining / months;
}

// ─── Expense/Income Filtering (pay-day aware) ────────────────────
function filterByDateRange(
  items: { date: string }[],
  month: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): typeof items {
  const { start, end } = getMonthDateRange(month, payDay, cycleMode);
  return items.filter((item) => item.date >= start && item.date <= end);
}

export function getMonthExpenses(
  expenses: Expense[],
  month: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): Expense[] {
  return filterByDateRange(expenses, month, payDay, cycleMode) as Expense[];
}

export function getMonthIncome(
  incomes: Income[],
  month: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): Income[] {
  return filterByDateRange(incomes, month, payDay, cycleMode) as Income[];
}

export function getMonthTotalExpenses(
  expenses: Expense[],
  month: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): number {
  return getMonthExpenses(expenses, month, payDay, cycleMode).reduce((sum, e) => sum + e.amount, 0);
}

export function getMonthTotalIncome(
  incomes: Income[],
  month: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): number {
  return getMonthIncome(incomes, month, payDay, cycleMode).reduce((sum, i) => sum + i.amount, 0);
}

export function getCategoryExpenses(
  expenses: Expense[],
  month: string,
  category: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): number {
  return getMonthExpenses(expenses, month, payDay, cycleMode)
    .filter((e) => e.category === category)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getExpensesByCategory(
  expenses: Expense[],
  month: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): Record<string, number> {
  const monthExpenses = getMonthExpenses(expenses, month, payDay, cycleMode);
  const result: Record<string, number> = {};
  for (const e of monthExpenses) {
    result[e.category] = (result[e.category] || 0) + e.amount;
  }
  return result;
}

// ─── Projections ─────────────────────────────────────────────────
export function projectSavingsTimeline(
  currentBalance: number,
  emergencyFund: number,
  monthlySavings: number,
  totalObjective: number,
  totalPaid: number,
  targetDate: string
): { month: string; projected: number; required: number }[] {
  const points: { month: string; projected: number; required: number }[] = [];
  const now = new Date();
  const target = parseISO(targetDate);
  const totalMonths = differenceInMonths(target, now) + 1;
  const available = getAvailableBalance(currentBalance, emergencyFund);
  const remaining = totalObjective - totalPaid;
  const requiredMonthly = remaining > available ? (remaining - available) / Math.max(1, totalMonths) : 0;

  for (let i = 0; i <= totalMonths; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    points.push({
      month: monthStr,
      projected: Math.min(remaining, available + monthlySavings * i),
      required: Math.min(remaining, available + requiredMonthly * i),
    });
  }

  return points;
}

// ─── Motorcycle helpers ──────────────────────────────────────────
export function getMotorcycleTotalPlanCost(
  phases: Phase[],
  motoPrice: number,
  motoInsurance: number
): number {
  // Phases 1-3 fixed + Phase 4 from the motorcycle
  const fixed = phases
    .filter((p) => p.id !== 'phase-4')
    .reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.estimatedCost, 0), 0);
  return fixed + motoPrice + motoInsurance;
}

export function getEstimatedPurchaseDate(
  remaining: number,
  monthlySavings: number
): Date | null {
  if (monthlySavings <= 0) return null;
  const monthsNeeded = Math.ceil(remaining / monthlySavings);
  const date = new Date();
  date.setMonth(date.getMonth() + monthsNeeded);
  return date;
}
