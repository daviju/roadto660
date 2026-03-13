export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
}

export interface Income {
  id: string;
  date: string;
  amount: number;
  concept: string;
  description: string;
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
}

export type Page =
  | 'dashboard'
  | 'expenses'
  | 'income'
  | 'budget'
  | 'timeline'
  | 'charts'
  | 'motorcycles'
  | 'settings';

export interface MonthlySnapshot {
  month: string;
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}
