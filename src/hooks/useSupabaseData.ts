import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Transaction, Category, Goal, GoalItem, TimelinePhase, TimelineItem, Achievement, PointEvent } from '../types';

// ─── Categories ──────────────────────────────────────────────────

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order');
    if (data) setCategories(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addCategory = async (cat: Partial<Category>) => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .insert({ ...cat, user_id: user.id })
      .select()
      .single();
    if (data) setCategories((prev) => [...prev, data]);
    return data;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { data } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (data) setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory, refetch: fetch };
}

// ─── Transactions ────────────────────────────────────────────────

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(1000);
    if (data) setTransactions(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addTransaction = async (tx: Partial<Transaction>) => {
    if (!user) return null;
    const { data } = await supabase
      .from('transactions')
      .insert({ ...tx, user_id: user.id })
      .select('*, category:categories(*)')
      .single();
    if (data) setTransactions((prev) => [data, ...prev]);
    return data;
  };

  const addTransactions = async (txs: Partial<Transaction>[]) => {
    if (!user || txs.length === 0) return;
    const rows = txs.map((tx) => ({ ...tx, user_id: user.id }));
    const { data } = await supabase
      .from('transactions')
      .insert(rows)
      .select('*, category:categories(*)');
    if (data) setTransactions((prev) => [...data, ...prev]);
    return data;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const { data } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();
    if (data) setTransactions((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return { transactions, loading, addTransaction, addTransactions, updateTransaction, deleteTransaction, refetch: fetch };
}

// ─── Goals ───────────────────────────────────────────────────────

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('goals')
      .select('*, items:goal_items(*)')
      .eq('user_id', user.id)
      .order('created_at');
    if (data) setGoals(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addGoal = async (goal: Partial<Goal>) => {
    if (!user) return null;
    const { data } = await supabase
      .from('goals')
      .insert({ ...goal, user_id: user.id })
      .select()
      .single();
    if (data) setGoals((prev) => [...prev, { ...data, items: [] }]);
    return data;
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const { data } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (data) setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...data } : g)));
  };

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const addGoalItem = async (goalId: string, item: Partial<GoalItem>) => {
    if (!user) return;
    const { data } = await supabase
      .from('goal_items')
      .insert({ ...item, goal_id: goalId, user_id: user.id })
      .select()
      .single();
    if (data) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId ? { ...g, items: [...(g.items || []), data] } : g
        )
      );
    }
  };

  const updateGoalItem = async (itemId: string, updates: Partial<GoalItem>) => {
    const { data } = await supabase
      .from('goal_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (data) {
      setGoals((prev) =>
        prev.map((g) => ({
          ...g,
          items: (g.items || []).map((i) => (i.id === itemId ? data : i)),
        }))
      );
    }
  };

  const deleteGoalItem = async (itemId: string) => {
    await supabase.from('goal_items').delete().eq('id', itemId);
    setGoals((prev) =>
      prev.map((g) => ({
        ...g,
        items: (g.items || []).filter((i) => i.id !== itemId),
      }))
    );
  };

  return { goals, loading, addGoal, updateGoal, deleteGoal, addGoalItem, updateGoalItem, deleteGoalItem, refetch: fetch };
}

// ─── Timeline ────────────────────────────────────────────────────

export function useTimeline() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<TimelinePhase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('timeline_phases')
      .select('*, items:timeline_items(*)')
      .eq('user_id', user.id)
      .order('sort_order');
    if (data) setPhases(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addPhase = async (phase: Partial<TimelinePhase>) => {
    if (!user) return null;
    const { data } = await supabase
      .from('timeline_phases')
      .insert({ ...phase, user_id: user.id })
      .select()
      .single();
    if (data) setPhases((prev) => [...prev, { ...data, items: [] }]);
    return data;
  };

  const updatePhase = async (id: string, updates: Partial<TimelinePhase>) => {
    const { data } = await supabase
      .from('timeline_phases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (data) setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const deletePhase = async (id: string) => {
    await supabase.from('timeline_phases').delete().eq('id', id);
    setPhases((prev) => prev.filter((p) => p.id !== id));
  };

  const addTimelineItem = async (phaseId: string, item: Partial<TimelineItem>) => {
    if (!user) return;
    const { data } = await supabase
      .from('timeline_items')
      .insert({ ...item, phase_id: phaseId, user_id: user.id })
      .select()
      .single();
    if (data) {
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId ? { ...p, items: [...(p.items || []), data] } : p
        )
      );
    }
  };

  const updateTimelineItem = async (itemId: string, updates: Partial<TimelineItem>) => {
    const { data } = await supabase
      .from('timeline_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (data) {
      setPhases((prev) =>
        prev.map((p) => ({
          ...p,
          items: (p.items || []).map((i) => (i.id === itemId ? data : i)),
        }))
      );
    }
  };

  const deleteTimelineItem = async (itemId: string) => {
    await supabase.from('timeline_items').delete().eq('id', itemId);
    setPhases((prev) =>
      prev.map((p) => ({
        ...p,
        items: (p.items || []).filter((i) => i.id !== itemId),
      }))
    );
  };

  return { phases, loading, addPhase, updatePhase, deletePhase, addTimelineItem, updateTimelineItem, deleteTimelineItem, refetch: fetch };
}

// ─── Achievements & Points ───────────────────────────────────────

export function useGamification() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pointEvents, setPointEvents] = useState<PointEvent[]>([]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const [achRes, ptRes] = await Promise.all([
      supabase.from('achievements').select('*').eq('user_id', user.id),
      supabase.from('point_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (achRes.data) setAchievements(achRes.data);
    if (ptRes.data) setPointEvents(ptRes.data);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const unlockAchievement = async (key: string) => {
    if (!user) return;
    const exists = achievements.find((a) => a.achievement_key === key);
    if (exists) return;
    const { data } = await supabase
      .from('achievements')
      .insert({ user_id: user.id, achievement_key: key })
      .select()
      .single();
    if (data) setAchievements((prev) => [...prev, data]);
  };

  const addPoints = async (points: number, reason: string) => {
    if (!user) return;
    await supabase.from('point_events').insert({ user_id: user.id, points, reason });
    await supabase
      .from('profiles')
      .update({ points: (achievements.length > 0 ? undefined : 0) })
      .eq('id', user.id);
    // Simplified: profile points updated via RPC or trigger in production
    fetch();
  };

  return { achievements, pointEvents, unlockAchievement, addPoints, refetch: fetch };
}
