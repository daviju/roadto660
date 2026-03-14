import { ref, set, onValue } from 'firebase/database';
import { getFirebaseDb } from './db';
import { useStore } from '../store/useStore';
import type { Expense, Income, Budget, Phase, PhaseItem, Motorcycle, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaults';

// ─── Keys that sync between devices ────────────────────────────
const SYNCED_KEYS = [
  'settings',
  'expenses',
  'incomes',
  'budgets',
  'phases',
  'motorcycles',
] as const;

let isRemoteUpdate = false;

// ─── Helpers ───────────────────────────────────────────────────

function ensureArray(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data as Record<string, unknown>);
  return [];
}

function normalizePhaseItem(raw: Record<string, unknown>): PhaseItem {
  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    estimatedCost: (raw.estimatedCost as number) ?? 0,
    paid: (raw.paid as boolean) ?? false,
    paidAmount: (raw.paidAmount as number) ?? 0,
    paidDate: (raw.paidDate as string) || null,
  };
}

function normalizePhase(raw: Record<string, unknown>): Phase {
  return {
    id: (raw.id as string) ?? '',
    name: (raw.name as string) ?? '',
    targetDate: (raw.targetDate as string) ?? '',
    status: (raw.status as Phase['status']) ?? 'pending',
    color: (raw.color as string) ?? '#94a3b8',
    items: ensureArray(raw.items).map((i) =>
      normalizePhaseItem(i as Record<string, unknown>)
    ),
  };
}

function normalizeFirebaseData(data: Record<string, unknown>) {
  const s = (data.settings as Record<string, unknown>) ?? {};
  const fallback = DEFAULT_SETTINGS;

  const settings: AppSettings = {
    currentBalance: (s.currentBalance as number) ?? fallback.currentBalance,
    emergencyFund: (s.emergencyFund as number) ?? fallback.emergencyFund,
    monthlyIncome: (s.monthlyIncome as number) ?? fallback.monthlyIncome,
    cashbackNet: (s.cashbackNet as number) ?? fallback.cashbackNet,
    targetDate: (s.targetDate as string) ?? fallback.targetDate,
    categories:
      ensureArray(s.categories).length > 0
        ? (ensureArray(s.categories) as string[])
        : fallback.categories,
    incomeConcepts:
      ensureArray(s.incomeConcepts).length > 0
        ? (ensureArray(s.incomeConcepts) as string[])
        : fallback.incomeConcepts,
    payDay: (s.payDay as number) ?? fallback.payDay,
    cycleMode: (s.cycleMode as AppSettings['cycleMode']) ?? fallback.cycleMode,
    theme: (s.theme as AppSettings['theme']) ?? fallback.theme,
  };

  return {
    settings,
    expenses: ensureArray(data.expenses) as Expense[],
    incomes: ensureArray(data.incomes) as Income[],
    budgets: ensureArray(data.budgets) as Budget[],
    phases: ensureArray(data.phases).map((p) =>
      normalizePhase(p as Record<string, unknown>)
    ),
    motorcycles: ensureArray(data.motorcycles) as Motorcycle[],
  };
}

/** Build a plain object safe for Firebase (no undefined / null leaves). */
function getSerializableState(state: Record<string, unknown>) {
  const phases = (state.phases as Phase[]).map((p) => ({
    ...p,
    items: p.items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { paidDate, ...rest } = item;
      return paidDate ? { ...rest, paidDate } : rest;
    }),
  }));

  return {
    settings: state.settings,
    expenses: state.expenses,
    incomes: state.incomes,
    budgets: state.budgets,
    phases,
    motorcycles: state.motorcycles,
    lastUpdated: Date.now(),
  };
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Connect to Firebase, load/seed data, and start bidirectional sync.
 * Resolves once the first server snapshot arrives (or after a timeout).
 */
export function initializeSync(): Promise<void> {
  const db = getFirebaseDb();

  // Firebase not configured → app works offline with localStorage
  if (!db) return Promise.resolve();

  return new Promise((resolve) => {
    const rootRef = ref(db, 'roadto660');
    let resolved = false;

    const doResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // ── Persistent real-time listener ──
    onValue(
      rootRef,
      (snapshot) => {
        const remoteData = snapshot.val();

        if (!remoteData) {
          // Firebase empty → push current local data (includes seed on first visit)
          const state = useStore.getState() as unknown as Record<string, unknown>;
          set(rootRef, getSerializableState(state));
          doResolve();
          return;
        }

        // Apply remote data to local store
        isRemoteUpdate = true;
        useStore.setState(normalizeFirebaseData(remoteData as Record<string, unknown>));
        isRemoteUpdate = false;
        doResolve();
      },
      (error) => {
        console.error('Firebase sync error:', error);
        doResolve(); // App still works with localStorage
      }
    );

    // ── Local → Firebase push ──
    useStore.subscribe((state, prevState) => {
      if (isRemoteUpdate) return;
      const changed = SYNCED_KEYS.some(
        (key) =>
          (state as unknown as Record<string, unknown>)[key] !==
          (prevState as unknown as Record<string, unknown>)[key]
      );
      if (!changed) return;
      set(
        ref(db, 'roadto660'),
        getSerializableState(state as unknown as Record<string, unknown>)
      );
    });

    // ── Timeout fallback (offline / slow connection) ──
    setTimeout(doResolve, 3000);
  });
}
