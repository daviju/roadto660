import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useStore } from '../store/useStore';
import { DEFAULT_SETTINGS } from '../data/defaults';
import type {
  AppSettings,
  Expense,
  Income,
  Budget,
  Phase,
  PhaseItem,
  Motorcycle,
  Category,
  Transaction,
  TimelinePhase,
  TimelineItem,
  Goal,
  GoalItem,
} from '../types';

// ─── Local-storage keys for settings not in DB ──────────────────
const LS_KEY = 'roadto660-extra-settings';

interface ExtraSettings {
  currentBalance: number;
  cashbackNet: number;
  targetDate: string;
  cycleMode: 'calendar' | 'payday';
}

function loadExtraSettings(): ExtraSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultExtra(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultExtra();
}

function saveExtraSettings(s: ExtraSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function defaultExtra(): ExtraSettings {
  return {
    currentBalance: DEFAULT_SETTINGS.currentBalance,
    cashbackNet: DEFAULT_SETTINGS.cashbackNet,
    targetDate: DEFAULT_SETTINGS.targetDate,
    cycleMode: DEFAULT_SETTINGS.cycleMode,
  };
}

// ─── Context shape ──────────────────────────────────────────────

interface DataContextType {
  // Data
  settings: AppSettings;
  expenses: Expense[];
  incomes: Income[];
  budgets: Budget[];
  phases: Phase[];
  motorcycles: Motorcycle[];
  loading: boolean;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Expenses
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addExpenses: (expenses: (Omit<Expense, 'id'> & { id?: string })[]) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Incomes
  addIncome: (income: Omit<Income, 'id'>) => void;
  addIncomes: (incomes: (Omit<Income, 'id'> & { id?: string })[]) => void;
  updateIncome: (id: string, updates: Partial<Income>) => void;
  deleteIncome: (id: string) => void;

  // Budgets
  updateBudget: (category: string, limit: number) => void;
  addBudget: (budget: Budget) => void;
  deleteBudget: (category: string) => void;

  // Phases
  updatePhaseStatus: (phaseId: string, status: Phase['status']) => void;
  togglePhaseItem: (phaseId: string, itemId: string, paid: boolean, paidAmount?: number) => void;
  updatePhaseItem: (phaseId: string, itemId: string, updates: Partial<PhaseItem>) => void;
  updatePhase: (phaseId: string, updates: Partial<Phase>) => void;
  addPhaseItem: (phaseId: string, item: Omit<PhaseItem, 'id'>) => void;
  removePhaseItem: (phaseId: string, itemId: string) => void;
  addPhase: (name: string, targetDate?: string) => Promise<void>;
  removePhase: (phaseId: string) => Promise<void>;

  // Motorcycles
  setActiveMotorcycle: (id: string) => void;
  addMotorcycle: (moto: Omit<Motorcycle, 'id'>) => void;
  updateMotorcycle: (id: string, updates: Partial<Motorcycle>) => void;
  deleteMotorcycle: (id: string) => void;
  getActiveMotorcycle: () => Motorcycle | undefined;

  // Navigation
  setPage: (page: string) => void;

  // Import / Export
  exportData: () => string;
  importData: (json: string) => boolean;
  resetData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

// ─── Helpers: Supabase → legacy format ──────────────────────────

function categoryMap(cats: Category[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of cats) m.set(c.id, c.name);
  return m;
}

function categoryIdByName(cats: Category[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of cats) m.set(c.name, c.id);
  return m;
}

function toExpenses(txs: Transaction[], catMap: Map<string, string>): Expense[] {
  return txs
    .filter((t) => t.type === 'expense')
    .map((t) => ({
      id: t.id,
      date: t.transaction_date,
      amount: Number(t.amount),
      category: (t.category_id && catMap.get(t.category_id)) || 'Otros',
      description: t.concept || t.original_concept || '',
      createdAt: t.created_at,
    }));
}

function toIncomes(txs: Transaction[], catMap: Map<string, string>): Income[] {
  return txs
    .filter((t) => t.type === 'income')
    .map((t) => ({
      id: t.id,
      date: t.transaction_date,
      amount: Number(t.amount),
      concept: (t.category_id && catMap.get(t.category_id)) || t.concept || 'Otros',
      description: t.concept || t.original_concept || '',
      createdAt: t.created_at,
    }));
}

function toBudgets(cats: Category[]): Budget[] {
  return cats
    .filter((c) => c.type === 'expense' || c.type === 'both')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ category: c.name, limit: Number(c.monthly_budget) }));
}

function derivePhaseStatus(items: PhaseItem[]): Phase['status'] {
  if (items.length === 0) return 'pending';
  const allPaid = items.every((i) => i.paid);
  const somePaid = items.some((i) => i.paid);
  if (allPaid) return 'completed';
  if (somePaid) return 'in-progress';
  return 'pending';
}

function toPhases(
  dbPhases: TimelinePhase[],
  dbItems: TimelineItem[],
): Phase[] {
  return dbPhases
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => {
      const items: PhaseItem[] = dbItems
        .filter((i) => i.phase_id === p.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({
          id: i.id,
          name: i.name,
          estimatedCost: Number(i.cost),
          paid: i.is_paid,
          paidAmount: i.is_paid ? Number(i.cost) : 0,
          paidDate: i.paid_date,
        }));
      return {
        id: p.id,
        name: p.name,
        targetDate: p.target_date || '',
        status: derivePhaseStatus(items),
        items,
        color: '#94a3b8',
      };
    });
}

function toMotorcycles(goals: Goal[]): Motorcycle[] {
  return goals
    .filter((g) => g.category === 'motorcycle')
    .map((g) => {
      const meta = (g.metadata || {}) as Record<string, unknown>;
      return {
        id: g.id,
        name: g.name,
        price: Number(g.target_amount),
        priceMin: Number(g.target_amount_min ?? g.target_amount),
        priceMax: Number(g.target_amount_max ?? g.target_amount),
        insuranceYear: Number(g.recurring_cost_annual ?? 0),
        type: (meta.type as string) || 'Sport',
        active: g.is_active,
        notes: g.notes || '',
      };
    });
}

function buildSettings(
  profile: { monthly_income?: number; pay_day?: number; emergency_fund?: number; current_balance?: number; theme?: string } | null,
  cats: Category[],
  extra: ExtraSettings,
): AppSettings {
  const expenseCategories = cats
    .filter((c) => c.type === 'expense' || c.type === 'both')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.name);
  const incomeConcepts = cats
    .filter((c) => c.type === 'income' || c.type === 'both')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.name);

  // Profile current_balance takes precedence over localStorage snapshot
  const currentBalance = profile?.current_balance != null && profile.current_balance > 0
    ? Number(profile.current_balance)
    : extra.currentBalance;

  return {
    currentBalance,
    emergencyFund: Number(profile?.emergency_fund ?? DEFAULT_SETTINGS.emergencyFund),
    monthlyIncome: Number(profile?.monthly_income ?? DEFAULT_SETTINGS.monthlyIncome),
    cashbackNet: extra.cashbackNet,
    targetDate: extra.targetDate,
    categories: expenseCategories.length > 0 ? expenseCategories : DEFAULT_SETTINGS.categories,
    incomeConcepts: incomeConcepts.length > 0 ? incomeConcepts : DEFAULT_SETTINGS.incomeConcepts,
    payDay: Number(profile?.pay_day ?? DEFAULT_SETTINGS.payDay),
    cycleMode: extra.cycleMode,
    theme: (profile?.theme as AppSettings['theme']) ?? DEFAULT_SETTINGS.theme,
  };
}

// ─── Provider ───────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, profile, updateProfile } = useAuth();
  const setStorePage = useStore((s) => s.setPage);

  // Raw DB data
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbPhases, setDbPhases] = useState<TimelinePhase[]>([]);
  const [dbPhaseItems, setDbPhaseItems] = useState<TimelineItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Extra settings persisted in localStorage (fields not in DB)
  const [extra, setExtra] = useState<ExtraSettings>(loadExtraSettings);

  // Prevent stale closures
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const dbPhasesRef = useRef(dbPhases);
  dbPhasesRef.current = dbPhases;
  const dbPhaseItemsRef = useRef(dbPhaseItems);
  dbPhaseItemsRef.current = dbPhaseItems;
  const extraRef = useRef(extra);
  extraRef.current = extra;

  // ── Fetch all data on mount / user change ─────────────────────

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setTransactions([]);
      setDbPhases([]);
      setDbPhaseItems([]);
      setGoals([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const uid = user!.id;

      const [catRes, txRes, phaseRes, itemRes, goalRes, goalItemRes, snapRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', uid).order('sort_order'),
        supabase.from('transactions').select('*').eq('user_id', uid).order('transaction_date', { ascending: false }),
        supabase.from('timeline_phases').select('*').eq('user_id', uid).order('sort_order'),
        supabase.from('timeline_items').select('*').eq('user_id', uid).order('sort_order'),
        supabase.from('goals').select('*').eq('user_id', uid),
        supabase.from('goal_items').select('*').eq('user_id', uid).order('sort_order'),
        supabase.from('balance_snapshots').select('*').eq('user_id', uid).order('snapshot_date', { ascending: false }).limit(1),
      ]);

      if (cancelled) return;

      const cats = (catRes.data || []) as Category[];
      const txs = (txRes.data || []) as Transaction[];
      const phases = (phaseRes.data || []) as TimelinePhase[];
      const items = (itemRes.data || []) as TimelineItem[];
      const rawGoals = (goalRes.data || []) as Goal[];
      const rawGoalItems = (goalItemRes.data || []) as GoalItem[];

      // Attach goal items to goals
      const goalsWithItems = rawGoals.map((g) => ({
        ...g,
        items: rawGoalItems.filter((gi) => gi.goal_id === g.id),
      }));

      setCategories(cats);
      setTransactions(txs);
      setDbPhases(phases);
      setDbPhaseItems(items);
      setGoals(goalsWithItems);

      // Update currentBalance from latest snapshot if available
      if (snapRes.data && snapRes.data.length > 0) {
        const latestBalance = Number(snapRes.data[0].balance);
        setExtra((prev) => {
          const next = { ...prev, currentBalance: latestBalance };
          saveExtraSettings(next);
          return next;
        });
      }

      setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [user]);

  // ── Derived legacy data ───────────────────────────────────────

  const catMap = categoryMap(categories);
  const catIdByName = categoryIdByName(categories);

  const expenses = toExpenses(transactions, catMap);
  const incomes = toIncomes(transactions, catMap);
  const budgets = toBudgets(categories);
  const phases = toPhases(dbPhases, dbPhaseItems);
  const motorcycles = toMotorcycles(goals);
  const settings = buildSettings(profile, categories, extra);

  // ── CRUD: Settings ────────────────────────────────────────────

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      // Profile-backed fields
      const profileUpdates: Record<string, unknown> = {};
      if (updates.emergencyFund !== undefined) profileUpdates.emergency_fund = updates.emergencyFund;
      if (updates.monthlyIncome !== undefined) profileUpdates.monthly_income = updates.monthlyIncome;
      if (updates.payDay !== undefined) profileUpdates.pay_day = updates.payDay;
      if (updates.theme !== undefined) profileUpdates.theme = updates.theme;
      if (updates.currentBalance !== undefined) profileUpdates.current_balance = updates.currentBalance;

      if (Object.keys(profileUpdates).length > 0) {
        updateProfile(profileUpdates);
      }

      // Extra (localStorage-backed) fields
      const extraUpdates: Partial<ExtraSettings> = {};
      if (updates.currentBalance !== undefined) extraUpdates.currentBalance = updates.currentBalance;
      if (updates.cashbackNet !== undefined) extraUpdates.cashbackNet = updates.cashbackNet;
      if (updates.targetDate !== undefined) extraUpdates.targetDate = updates.targetDate;
      if (updates.cycleMode !== undefined) extraUpdates.cycleMode = updates.cycleMode;

      if (Object.keys(extraUpdates).length > 0) {
        setExtra((prev) => {
          const next = { ...prev, ...extraUpdates };
          saveExtraSettings(next);
          return next;
        });
      }

      // Persist currentBalance as a balance snapshot
      if (updates.currentBalance !== undefined && user) {
        const today = new Date().toISOString().slice(0, 10);
        supabase
          .from('balance_snapshots')
          .upsert(
            { user_id: user.id, balance: updates.currentBalance, snapshot_date: today },
            { onConflict: 'user_id,snapshot_date' },
          )
          .then();
      }
    },
    [updateProfile, user],
  );

  // ── CRUD: Expenses ────────────────────────────────────────────

  const findOrCreateCategory = useCallback(
    async (name: string, type: 'expense' | 'income' | 'both' = 'expense'): Promise<string | null> => {
      const existing = categoriesRef.current.find(
        (c) => c.name === name && (c.type === type || c.type === 'both'),
      );
      if (existing) return existing.id;

      // Also check by name regardless of type
      const byName = categoriesRef.current.find((c) => c.name === name);
      if (byName) return byName.id;

      if (!user) return null;

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name,
          slug,
          type,
          sort_order: categoriesRef.current.length,
        })
        .select()
        .single();

      if (data) {
        const cat = data as Category;
        setCategories((prev) => [...prev, cat]);
        return cat.id;
      }
      return null;
    },
    [user],
  );

  const addExpense = useCallback(
    async (expense: Omit<Expense, 'id'>) => {
      if (!user) return;
      const categoryId = await findOrCreateCategory(expense.category, 'expense');
      const { data } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          category_id: categoryId,
          amount: expense.amount,
          type: 'expense' as const,
          concept: expense.description,
          transaction_date: expense.date,
          source: 'manual' as const,
        })
        .select()
        .single();
      if (data) {
        setTransactions((prev) => [data as Transaction, ...prev]);
      }
    },
    [user, findOrCreateCategory],
  );

  const addExpenses = useCallback(
    async (items: (Omit<Expense, 'id'> & { id?: string })[]) => {
      if (!user || items.length === 0) return;

      // Pre-resolve all categories
      const catIds = new Map<string, string | null>();
      for (const item of items) {
        if (!catIds.has(item.category)) {
          catIds.set(item.category, await findOrCreateCategory(item.category, 'expense'));
        }
      }

      const rows = items.map((e) => ({
        user_id: user.id,
        category_id: catIds.get(e.category) || null,
        amount: e.amount,
        type: 'expense' as const,
        concept: e.description,
        transaction_date: e.date,
        source: 'manual' as const,
      }));

      const { data } = await supabase.from('transactions').insert(rows).select();
      if (data) {
        setTransactions((prev) => [...(data as Transaction[]), ...prev]);
      }
    },
    [user, findOrCreateCategory],
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>) => {
      if (!user) return;
      const patch: Record<string, unknown> = {};
      if (updates.amount !== undefined) patch.amount = updates.amount;
      if (updates.date !== undefined) patch.transaction_date = updates.date;
      if (updates.description !== undefined) patch.concept = updates.description;
      if (updates.category !== undefined) {
        const catId = await findOrCreateCategory(updates.category, 'expense');
        patch.category_id = catId;
      }
      patch.updated_at = new Date().toISOString();

      const { data } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? (data as Transaction) : t)),
        );
      }
    },
    [user, findOrCreateCategory],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [user],
  );

  // ── CRUD: Incomes ─────────────────────────────────────────────

  const addIncome = useCallback(
    async (income: Omit<Income, 'id'>) => {
      if (!user) return;
      const categoryId = await findOrCreateCategory(income.concept, 'income');
      const { data } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          category_id: categoryId,
          amount: income.amount,
          type: 'income' as const,
          concept: income.description,
          transaction_date: income.date,
          source: 'manual' as const,
        })
        .select()
        .single();
      if (data) {
        setTransactions((prev) => [data as Transaction, ...prev]);
      }
    },
    [user, findOrCreateCategory],
  );

  const addIncomes = useCallback(
    async (items: (Omit<Income, 'id'> & { id?: string })[]) => {
      if (!user || items.length === 0) return;

      const catIds = new Map<string, string | null>();
      for (const item of items) {
        if (!catIds.has(item.concept)) {
          catIds.set(item.concept, await findOrCreateCategory(item.concept, 'income'));
        }
      }

      const rows = items.map((i) => ({
        user_id: user.id,
        category_id: catIds.get(i.concept) || null,
        amount: i.amount,
        type: 'income' as const,
        concept: i.description,
        transaction_date: i.date,
        source: 'manual' as const,
      }));

      const { data } = await supabase.from('transactions').insert(rows).select();
      if (data) {
        setTransactions((prev) => [...(data as Transaction[]), ...prev]);
      }
    },
    [user, findOrCreateCategory],
  );

  const updateIncome = useCallback(
    async (id: string, updates: Partial<Income>) => {
      if (!user) return;
      const patch: Record<string, unknown> = {};
      if (updates.amount !== undefined) patch.amount = updates.amount;
      if (updates.date !== undefined) patch.transaction_date = updates.date;
      if (updates.description !== undefined) patch.concept = updates.description;
      if (updates.concept !== undefined) {
        const catId = await findOrCreateCategory(updates.concept, 'income');
        patch.category_id = catId;
      }
      patch.updated_at = new Date().toISOString();

      const { data } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? (data as Transaction) : t)),
        );
      }
    },
    [user, findOrCreateCategory],
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [user],
  );

  // ── CRUD: Budgets ─────────────────────────────────────────────

  const updateBudget = useCallback(
    async (categoryName: string, limit: number) => {
      if (!user) return;
      const cat = categoriesRef.current.find((c) => c.name === categoryName);
      if (!cat) return;
      const { data } = await supabase
        .from('categories')
        .update({ monthly_budget: limit })
        .eq('id', cat.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? (data as Category) : c)),
        );
      }
    },
    [user],
  );

  const addBudget = useCallback(
    async (budget: Budget) => {
      if (!user) return;
      // Find existing category or create one
      let cat = categoriesRef.current.find((c) => c.name === budget.category);
      if (cat) {
        // Just update the budget
        await updateBudget(budget.category, budget.limit);
        return;
      }
      const slug = budget.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: budget.category,
          slug,
          monthly_budget: budget.limit,
          type: 'expense',
          sort_order: categoriesRef.current.length,
        })
        .select()
        .single();
      if (data) {
        setCategories((prev) => [...prev, data as Category]);
      }
    },
    [user, updateBudget],
  );

  const deleteBudget = useCallback(
    async (categoryName: string) => {
      if (!user) return;
      const cat = categoriesRef.current.find((c) => c.name === categoryName);
      if (!cat) return;
      // Set budget to 0 rather than deleting the category
      const { data } = await supabase
        .from('categories')
        .update({ monthly_budget: 0 })
        .eq('id', cat.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? (data as Category) : c)),
        );
      }
    },
    [user],
  );

  // ── CRUD: Phases ──────────────────────────────────────────────

  const updatePhaseStatus = useCallback(
    async (_phaseId: string, _status: Phase['status']) => {
      // Status is derived from items, so this is a no-op at the DB level.
      // The UI will see the computed status automatically.
    },
    [],
  );

  const togglePhaseItem = useCallback(
    async (phaseId: string, itemId: string, paid: boolean, paidAmount?: number) => {
      if (!user) return;
      const patch: Record<string, unknown> = {
        is_paid: paid,
        paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
      };
      // If paidAmount provided, update cost to reflect actual paid amount
      if (paidAmount !== undefined) {
        patch.cost = paidAmount;
      }
      const { data } = await supabase
        .from('timeline_items')
        .update(patch)
        .eq('id', itemId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setDbPhaseItems((prev) =>
          prev.map((i) => (i.id === itemId ? (data as TimelineItem) : i)),
        );
      }
    },
    [user],
  );

  const updatePhaseItem = useCallback(
    async (phaseId: string, itemId: string, updates: Partial<PhaseItem>) => {
      if (!user) return;
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.estimatedCost !== undefined) patch.cost = updates.estimatedCost;
      if (updates.paid !== undefined) {
        patch.is_paid = updates.paid;
        patch.paid_date = updates.paid ? (updates.paidDate || new Date().toISOString().slice(0, 10)) : null;
      }
      if (updates.paidDate !== undefined) patch.paid_date = updates.paidDate;

      const { data } = await supabase
        .from('timeline_items')
        .update(patch)
        .eq('id', itemId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setDbPhaseItems((prev) =>
          prev.map((i) => (i.id === itemId ? (data as TimelineItem) : i)),
        );
      }
    },
    [user],
  );

  const updatePhase = useCallback(
    async (phaseId: string, updates: Partial<Phase>) => {
      if (!user) return;
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.targetDate !== undefined) patch.target_date = updates.targetDate;

      if (Object.keys(patch).length > 0) {
        const { data } = await supabase
          .from('timeline_phases')
          .update(patch)
          .eq('id', phaseId)
          .eq('user_id', user.id)
          .select()
          .single();
        if (data) {
          setDbPhases((prev) =>
            prev.map((p) => (p.id === phaseId ? (data as TimelinePhase) : p)),
          );
        }
      }

      // If items are provided in the update, replace them
      if (updates.items) {
        for (const item of updates.items) {
          const existing = dbPhaseItemsRef.current.find((i) => i.id === item.id);
          if (existing) {
            await updatePhaseItem(phaseId, item.id, item);
          } else {
            await addPhaseItemInternal(phaseId, item);
          }
        }
      }
    },
    [user],
  );

  const addPhaseItemInternal = useCallback(
    async (phaseId: string, item: Omit<PhaseItem, 'id'> & { id?: string }) => {
      if (!user) return;
      const maxSort = dbPhaseItemsRef.current
        .filter((i) => i.phase_id === phaseId)
        .reduce((max, i) => Math.max(max, i.sort_order), -1);
      const { data } = await supabase
        .from('timeline_items')
        .insert({
          phase_id: phaseId,
          user_id: user.id,
          name: item.name,
          cost: item.estimatedCost,
          is_paid: item.paid,
          paid_date: item.paidDate,
          sort_order: maxSort + 1,
        })
        .select()
        .single();
      if (data) {
        setDbPhaseItems((prev) => [...prev, data as TimelineItem]);
      }
    },
    [user],
  );

  const addPhaseItem = useCallback(
    async (phaseId: string, item: Omit<PhaseItem, 'id'>) => {
      await addPhaseItemInternal(phaseId, item);
    },
    [addPhaseItemInternal],
  );

  const removePhaseItem = useCallback(
    async (phaseId: string, itemId: string) => {
      if (!user) return;
      await supabase.from('timeline_items').delete().eq('id', itemId).eq('user_id', user.id);
      setDbPhaseItems((prev) => prev.filter((i) => i.id !== itemId));
    },
    [user],
  );

  const addPhase = useCallback(
    async (name: string, targetDate?: string) => {
      if (!user) return;
      const maxSort = dbPhasesRef.current.reduce((max, p) => Math.max(max, p.sort_order), -1);
      const { data } = await supabase
        .from('timeline_phases')
        .insert({
          user_id: user.id,
          name,
          target_date: targetDate || null,
          sort_order: maxSort + 1,
        })
        .select()
        .single();
      if (data) setDbPhases((prev) => [...prev, data as TimelinePhase]);
    },
    [user],
  );

  const removePhase = useCallback(
    async (phaseId: string) => {
      if (!user) return;
      await supabase.from('timeline_items').delete().eq('phase_id', phaseId).eq('user_id', user.id);
      await supabase.from('timeline_phases').delete().eq('id', phaseId).eq('user_id', user.id);
      setDbPhaseItems((prev) => prev.filter((i) => i.phase_id !== phaseId));
      setDbPhases((prev) => prev.filter((p) => p.id !== phaseId));
    },
    [user],
  );

  // ── CRUD: Motorcycles (stored as goals with category='motorcycle') ──

  const setActiveMotorcycle = useCallback(
    async (id: string) => {
      if (!user) return;
      // Deactivate all motorcycles first
      const motoGoals = goalsRef.current.filter((g) => g.category === 'motorcycle');
      for (const g of motoGoals) {
        if (g.id !== id && g.is_active) {
          await supabase
            .from('goals')
            .update({ is_active: false })
            .eq('id', g.id)
            .eq('user_id', user.id);
        }
      }
      // Activate the selected one
      await supabase
        .from('goals')
        .update({ is_active: true })
        .eq('id', id)
        .eq('user_id', user.id);

      setGoals((prev) =>
        prev.map((g) => {
          if (g.category !== 'motorcycle') return g;
          return { ...g, is_active: g.id === id };
        }),
      );
    },
    [user],
  );

  const addMotorcycle = useCallback(
    async (moto: Omit<Motorcycle, 'id'>) => {
      if (!user) return;
      // If this one is active, deactivate others first
      if (moto.active) {
        const motoGoals = goalsRef.current.filter((g) => g.category === 'motorcycle' && g.is_active);
        for (const g of motoGoals) {
          await supabase
            .from('goals')
            .update({ is_active: false })
            .eq('id', g.id)
            .eq('user_id', user.id);
        }
      }

      const { data } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: moto.name,
          target_amount: moto.price,
          target_amount_min: moto.priceMin,
          target_amount_max: moto.priceMax,
          recurring_cost_annual: moto.insuranceYear,
          category: 'motorcycle',
          icon: 'bike',
          is_active: moto.active,
          notes: moto.notes,
          metadata: { type: moto.type },
        })
        .select()
        .single();
      if (data) {
        setGoals((prev) => {
          const updated = moto.active
            ? prev.map((g) =>
                g.category === 'motorcycle' ? { ...g, is_active: false } : g,
              )
            : [...prev];
          return moto.active
            ? [...updated, data as Goal]
            : [...prev, data as Goal];
        });
      }
    },
    [user],
  );

  const updateMotorcycle = useCallback(
    async (id: string, updates: Partial<Motorcycle>) => {
      if (!user) return;
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.price !== undefined) patch.target_amount = updates.price;
      if (updates.priceMin !== undefined) patch.target_amount_min = updates.priceMin;
      if (updates.priceMax !== undefined) patch.target_amount_max = updates.priceMax;
      if (updates.insuranceYear !== undefined) patch.recurring_cost_annual = updates.insuranceYear;
      if (updates.notes !== undefined) patch.notes = updates.notes;
      if (updates.active !== undefined) patch.is_active = updates.active;
      if (updates.type !== undefined) {
        // Merge with existing metadata
        const existing = goalsRef.current.find((g) => g.id === id);
        patch.metadata = { ...(existing?.metadata || {}), type: updates.type };
      }

      // If setting active, deactivate others first
      if (updates.active) {
        const motoGoals = goalsRef.current.filter(
          (g) => g.category === 'motorcycle' && g.id !== id && g.is_active,
        );
        for (const g of motoGoals) {
          await supabase
            .from('goals')
            .update({ is_active: false })
            .eq('id', g.id)
            .eq('user_id', user.id);
        }
      }

      const { data } = await supabase
        .from('goals')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setGoals((prev) => {
          let updated = prev.map((g) => (g.id === id ? (data as Goal) : g));
          if (updates.active) {
            updated = updated.map((g) =>
              g.category === 'motorcycle' && g.id !== id ? { ...g, is_active: false } : g,
            );
          }
          return updated;
        });
      }
    },
    [user],
  );

  const deleteMotorcycle = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [user],
  );

  const getActiveMotorcycle = useCallback((): Motorcycle | undefined => {
    return motorcycles.find((m) => m.active);
  }, [motorcycles]);

  // ── Export / Import / Reset ───────────────────────────────────

  const exportData = useCallback((): string => {
    return JSON.stringify(
      {
        settings,
        expenses,
        incomes,
        budgets,
        phases,
        motorcycles,
        exportedAt: new Date().toISOString(),
        version: 3,
      },
      null,
      2,
    );
  }, [settings, expenses, incomes, budgets, phases, motorcycles]);

  const importData = useCallback(
    (json: string): boolean => {
      if (!user) return false;
      try {
        const data = JSON.parse(json);
        const uid = user.id;

        // Run the import asynchronously
        (async () => {
          // Import settings
          if (data.settings) {
            updateSettings(data.settings);
          }

          // Import expenses
          if (data.expenses && Array.isArray(data.expenses)) {
            await addExpenses(data.expenses);
          }

          // Import incomes
          if (data.incomes && Array.isArray(data.incomes)) {
            await addIncomes(data.incomes);
          }

          // Import budgets
          if (data.budgets && Array.isArray(data.budgets)) {
            for (const b of data.budgets) {
              await addBudget(b);
            }
          }

          // Import phases
          if (data.phases && Array.isArray(data.phases)) {
            for (const phase of data.phases as Phase[]) {
              const { data: pData } = await supabase
                .from('timeline_phases')
                .insert({
                  user_id: uid,
                  name: phase.name,
                  target_date: phase.targetDate || null,
                  sort_order: dbPhasesRef.current.length,
                })
                .select()
                .single();
              if (pData) {
                const newPhase = pData as TimelinePhase;
                setDbPhases((prev) => [...prev, newPhase]);

                for (const item of phase.items) {
                  const { data: iData } = await supabase
                    .from('timeline_items')
                    .insert({
                      phase_id: newPhase.id,
                      user_id: uid,
                      name: item.name,
                      cost: item.estimatedCost,
                      is_paid: item.paid,
                      paid_date: item.paidDate,
                      sort_order: 0,
                    })
                    .select()
                    .single();
                  if (iData) {
                    setDbPhaseItems((prev) => [...prev, iData as TimelineItem]);
                  }
                }
              }
            }
          }

          // Import motorcycles
          if (data.motorcycles && Array.isArray(data.motorcycles)) {
            for (const moto of data.motorcycles as Motorcycle[]) {
              await addMotorcycle(moto);
            }
          }
        })();

        return true;
      } catch {
        return false;
      }
    },
    [user, updateSettings, addExpenses, addIncomes, addBudget, addMotorcycle],
  );

  const resetData = useCallback(async () => {
    if (!user) return;
    const uid = user.id;

    // Delete all user transactions
    await supabase.from('transactions').delete().eq('user_id', uid);
    // Delete all timeline items and phases
    await supabase.from('timeline_items').delete().eq('user_id', uid);
    await supabase.from('timeline_phases').delete().eq('user_id', uid);
    // Delete all goals and goal items
    await supabase.from('goal_items').delete().eq('user_id', uid);
    await supabase.from('goals').delete().eq('user_id', uid);
    // Delete balance snapshots
    await supabase.from('balance_snapshots').delete().eq('user_id', uid);

    // Reset profile to defaults
    await updateProfile({
      monthly_income: DEFAULT_SETTINGS.monthlyIncome,
      pay_day: DEFAULT_SETTINGS.payDay,
      emergency_fund: DEFAULT_SETTINGS.emergencyFund,
      theme: DEFAULT_SETTINGS.theme,
    } as Record<string, unknown>);

    // Reset extra settings
    const defaults = defaultExtra();
    saveExtraSettings(defaults);
    setExtra(defaults);

    // Clear local state
    setTransactions([]);
    setDbPhases([]);
    setDbPhaseItems([]);
    setGoals([]);
  }, [user, updateProfile]);

  // ── Context value ─────────────────────────────────────────────

  const value: DataContextType = {
    settings,
    expenses,
    incomes,
    budgets,
    phases,
    motorcycles,
    loading,

    updateSettings,

    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,

    addIncome,
    addIncomes,
    updateIncome,
    deleteIncome,

    updateBudget,
    addBudget,
    deleteBudget,

    updatePhaseStatus,
    togglePhaseItem,
    updatePhaseItem,
    updatePhase,
    addPhaseItem,
    removePhaseItem,
    addPhase,
    removePhase,

    setActiveMotorcycle,
    addMotorcycle,
    updateMotorcycle,
    deleteMotorcycle,
    getActiveMotorcycle,

    setPage: setStorePage as (page: string) => void,

    exportData,
    importData,
    resetData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useAppData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData must be used within a DataProvider');
  return ctx;
}
