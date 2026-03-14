import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Expense, Income, Budget, Phase, Motorcycle, AppSettings, Page } from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_BUDGETS,
  DEFAULT_MOTORCYCLES,
  SEED_EXPENSES,
  SEED_INCOMES,
  getDefaultPhases,
} from '../data/defaults';
import { generateId } from '../utils/format';

interface AppState {
  // Navigation
  currentPage: Page;
  sidebarOpen: boolean;
  setPage: (page: Page) => void;
  toggleSidebar: () => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addExpenses: (expenses: (Omit<Expense, 'id'> & { id?: string })[]) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Income
  incomes: Income[];
  addIncome: (income: Omit<Income, 'id'>) => void;
  addIncomes: (incomes: (Omit<Income, 'id'> & { id?: string })[]) => void;
  updateIncome: (id: string, income: Partial<Income>) => void;
  deleteIncome: (id: string) => void;

  // Budgets
  budgets: Budget[];
  updateBudget: (category: string, limit: number) => void;
  addBudget: (budget: Budget) => void;
  deleteBudget: (category: string) => void;

  // Phases
  phases: Phase[];
  updatePhaseStatus: (phaseId: string, status: Phase['status']) => void;
  togglePhaseItem: (phaseId: string, itemId: string, paid: boolean, paidAmount?: number) => void;
  updatePhaseItem: (phaseId: string, itemId: string, updates: Partial<Phase['items'][0]>) => void;
  updatePhase: (phaseId: string, updates: Partial<Phase>) => void;
  addPhaseItem: (phaseId: string, item: Omit<Phase['items'][0], 'id'>) => void;
  removePhaseItem: (phaseId: string, itemId: string) => void;

  // Motorcycles
  motorcycles: Motorcycle[];
  setActiveMotorcycle: (id: string) => void;
  addMotorcycle: (moto: Omit<Motorcycle, 'id'>) => void;
  updateMotorcycle: (id: string, updates: Partial<Motorcycle>) => void;
  deleteMotorcycle: (id: string) => void;
  getActiveMotorcycle: () => Motorcycle | undefined;

  // Import/Export
  exportData: () => string;
  importData: (json: string) => boolean;
  resetData: () => void;
}

const activeMoto = DEFAULT_MOTORCYCLES.find((m) => m.active) || DEFAULT_MOTORCYCLES[0];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentPage: 'dashboard',
      sidebarOpen: true,
      setPage: (page) => set({ currentPage: page }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Settings
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      // Expenses
      expenses: SEED_EXPENSES,
      addExpense: (expense) =>
        set((s) => ({
          expenses: [{ ...expense, id: generateId() }, ...s.expenses],
        })),
      addExpenses: (newExpenses) =>
        set((s) => ({
          expenses: [
            ...newExpenses.map((e) => ({ ...e, id: e.id || generateId() } as Expense)),
            ...s.expenses,
          ],
        })),
      updateExpense: (id, updates) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      // Income
      incomes: SEED_INCOMES,
      addIncome: (income) =>
        set((s) => ({
          incomes: [{ ...income, id: generateId() }, ...s.incomes],
        })),
      addIncomes: (newIncomes) =>
        set((s) => ({
          incomes: [
            ...newIncomes.map((i) => ({ ...i, id: i.id || generateId() } as Income)),
            ...s.incomes,
          ],
        })),
      updateIncome: (id, updates) =>
        set((s) => ({
          incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      deleteIncome: (id) =>
        set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),

      // Budgets
      budgets: DEFAULT_BUDGETS,
      updateBudget: (category, limit) =>
        set((s) => ({
          budgets: s.budgets.map((b) =>
            b.category === category ? { ...b, limit } : b
          ),
        })),
      addBudget: (budget) =>
        set((s) => ({ budgets: [...s.budgets, budget] })),
      deleteBudget: (category) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.category !== category) })),

      // Phases
      phases: getDefaultPhases(activeMoto),
      updatePhaseStatus: (phaseId, status) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === phaseId ? { ...p, status } : p
          ),
        })),
      togglePhaseItem: (phaseId, itemId, paid, paidAmount) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  items: p.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          paid,
                          paidAmount: paid ? (paidAmount ?? item.estimatedCost) : 0,
                          paidDate: paid ? new Date().toISOString().split('T')[0] : null,
                        }
                      : item
                  ),
                }
              : p
          ),
        })),
      updatePhaseItem: (phaseId, itemId, updates) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  items: p.items.map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                }
              : p
          ),
        })),
      updatePhase: (phaseId, updates) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === phaseId ? { ...p, ...updates } : p
          ),
        })),
      addPhaseItem: (phaseId, item) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === phaseId
              ? { ...p, items: [...p.items, { ...item, id: generateId() }] }
              : p
          ),
        })),
      removePhaseItem: (phaseId, itemId) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === phaseId
              ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
              : p
          ),
        })),

      // Motorcycles
      motorcycles: DEFAULT_MOTORCYCLES,
      getActiveMotorcycle: () => get().motorcycles.find((m) => m.active),
      setActiveMotorcycle: (id) => {
        const moto = get().motorcycles.find((m) => m.id === id);
        if (!moto) return;
        set((s) => ({
          motorcycles: s.motorcycles.map((m) => ({ ...m, active: m.id === id })),
          phases: s.phases.map((p) => {
            if (p.id !== 'phase-4') return p;
            return {
              ...p,
              name: moto.name,
              items: p.items.map((item) => {
                if (item.id === 'moto-purchase') {
                  return { ...item, name: moto.name, estimatedCost: moto.price };
                }
                if (item.id === 'moto-insurance') {
                  return {
                    ...item,
                    name: `Seguro ${moto.name} (novel)`,
                    estimatedCost: moto.insuranceYear,
                  };
                }
                return item;
              }),
            };
          }),
        }));
      },
      addMotorcycle: (moto) =>
        set((s) => ({
          motorcycles: [...s.motorcycles, { ...moto, id: generateId() }],
        })),
      updateMotorcycle: (id, updates) =>
        set((s) => {
          const newMotos = s.motorcycles.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          );
          const updatedMoto = newMotos.find((m) => m.id === id);
          if (updatedMoto?.active) {
            return {
              motorcycles: newMotos,
              phases: s.phases.map((p) => {
                if (p.id !== 'phase-4') return p;
                return {
                  ...p,
                  name: updatedMoto.name,
                  items: p.items.map((item) => {
                    if (item.id === 'moto-purchase') {
                      return { ...item, name: updatedMoto.name, estimatedCost: updatedMoto.price };
                    }
                    if (item.id === 'moto-insurance') {
                      return {
                        ...item,
                        name: `Seguro ${updatedMoto.name} (novel)`,
                        estimatedCost: updatedMoto.insuranceYear,
                      };
                    }
                    return item;
                  }),
                };
              }),
            };
          }
          return { motorcycles: newMotos };
        }),
      deleteMotorcycle: (id) =>
        set((s) => ({
          motorcycles: s.motorcycles.filter((m) => m.id !== id),
        })),

      // Import/Export
      exportData: () => {
        const state = get();
        return JSON.stringify(
          {
            settings: state.settings,
            expenses: state.expenses,
            incomes: state.incomes,
            budgets: state.budgets,
            phases: state.phases,
            motorcycles: state.motorcycles,
          },
          null,
          2
        );
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            settings: data.settings ?? DEFAULT_SETTINGS,
            expenses: data.expenses ?? SEED_EXPENSES,
            incomes: data.incomes ?? SEED_INCOMES,
            budgets: data.budgets ?? DEFAULT_BUDGETS,
            phases: data.phases ?? getDefaultPhases(),
            motorcycles: data.motorcycles ?? DEFAULT_MOTORCYCLES,
          });
          return true;
        } catch {
          return false;
        }
      },
      resetData: () =>
        set({
          settings: DEFAULT_SETTINGS,
          expenses: SEED_EXPENSES,
          incomes: SEED_INCOMES,
          budgets: DEFAULT_BUDGETS,
          phases: getDefaultPhases(),
          motorcycles: DEFAULT_MOTORCYCLES,
        }),
    }),
    {
      name: 'roadto660-v2',
      version: 2,
    }
  )
);
