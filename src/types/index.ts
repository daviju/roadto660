import type { User } from '@supabase/supabase-js';

// ─── Database types ─────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  monthly_income: number;
  pay_day: number;
  emergency_fund: number;
  currency: string;
  theme: 'dark' | 'light' | 'system';
  module_expenses: boolean;
  module_income: boolean;
  module_budgets: boolean;
  module_timeline: boolean;
  module_motorcycles: boolean;
  module_charts: boolean;
  module_tips: boolean;
  module_simulator: boolean;
  onboarding_completed: boolean;
  points: number;
  streak_days: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  monthly_budget: number;
  is_temporary: boolean;
  type: 'expense' | 'income' | 'both';
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  type: 'expense' | 'income';
  concept: string | null;
  transaction_date: string;
  source: 'manual' | 'excel_import';
  original_concept: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  target_amount_min: number | null;
  target_amount_max: number | null;
  recurring_cost_annual: number;
  category: string;
  icon: string;
  is_active: boolean;
  is_achieved: boolean;
  achieved_date: string | null;
  target_date: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  items?: GoalItem[];
}

export interface GoalItem {
  id: string;
  goal_id: string;
  user_id: string;
  name: string;
  cost: number;
  is_paid: boolean;
  paid_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface TimelinePhase {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  items?: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  phase_id: string;
  user_id: string;
  name: string;
  cost: number;
  is_paid: boolean;
  paid_date: string | null;
  sort_order: number;
  created_at: string;
}

export interface BalanceSnapshot {
  id: string;
  user_id: string;
  balance: number;
  snapshot_date: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export interface PointEvent {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  created_at: string;
}

// ─── App types ──────────────────────────────────────────────────

export type Page =
  | 'dashboard'
  | 'movements'
  | 'expenses'
  | 'income'
  | 'budget'
  | 'timeline'
  | 'charts'
  | 'goals'
  | 'advice'
  | 'settings'
  | 'admin'
  | 'pricing';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

// ─── Simulator types ────────────────────────────────────────────

export interface SavingScenario {
  id: string;
  label: string;
  icon: string;
  categories: { name: string; currentSpend: number; reducedTo: number }[];
  extraSavingsPerMonth: number;
  estimatedDate: Date;
  monthsSaved: number;
}

// ─── Legacy compatibility (used by existing components during migration) ──

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  createdAt?: string;
}

export interface Income {
  id: string;
  date: string;
  amount: number;
  concept: string;
  description: string;
  createdAt?: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface PhaseItem {
  id: string;
  name: string;
  estimatedCost: number;
  paid: boolean;
  paidAmount: number;
  paidDate: string | null;
}

export interface Phase {
  id: string;
  name: string;
  targetDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  items: PhaseItem[];
  color: string;
}

export interface Motorcycle {
  id: string;
  name: string;
  price: number;
  priceMin: number;
  priceMax: number;
  insuranceYear: number;
  type: string;
  active: boolean;
  notes: string;
}

export interface AppSettings {
  currentBalance: number;
  emergencyFund: number;
  monthlyIncome: number;
  cashbackNet: number;
  targetDate: string;
  categories: string[];
  incomeConcepts: string[];
  payDay: number;
  cycleMode: 'calendar' | 'payday';
  theme: 'dark' | 'light' | 'system';
}

export interface MonthlySnapshot {
  month: string;
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}

export interface Movement {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
}
