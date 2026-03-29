import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Target, TrendingUp, Clock, Sparkles, Crown, Lock,
  CheckCircle2, ChevronDown, ChevronUp, Scissors, Zap,
  Plus, Pencil, Trash2, Star, X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { usePlan } from '../../hooks/usePlan';
import { usePaywall } from '../shared/PaywallModal';
import { formatCurrency, formatDate } from '../../utils/format';
import {
  staggerContainer, fadeUp, fadeUpSmall, shimmer, buttonTap,
  collapseVariants, cardHover,
} from '../../utils/animations';
import type { Goal, Transaction } from '../../types';

// ─── Skeleton loader ─────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-th-hover ${className}`} />
  );
}

function GoalsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ─── Scenario type ───────────────────────────────────────────
interface Scenario {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  extraSavingsPerMonth: number;
  newEstimatedMonths: number;
  monthsSaved: number;
}

// ─── Main component ─────────────────────────────────────────
export function Goals() {
  const { user, profile } = useAuth();
  const { isPro, hasSimulatorScenarios } = usePlan();
  const paywall = usePaywall();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  // CRUD state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalIcon, setGoalIcon] = useState('🎯');
  // Add item state
  const [addingItemGoalId, setAddingItemGoalId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');

  // Fetch goals and recent transactions
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [goalsRes, txRes] = await Promise.all([
          supabase
            .from('goals')
            .select('*, items:goal_items(*)')
            .eq('user_id', user.id)
            .order('created_at'),
          supabase
            .from('transactions')
            .select('*, category:categories(*)')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .limit(500),
        ]);
        if (cancelled) return;
        if (goalsRes.data) setGoals(goalsRes.data);
        if (txRes.data) setTransactions(txRes.data);
      } catch (err) {
        console.error('[Goals] fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user]);

  // ─── CRUD handlers ───────────────────────────────────────
  const resetGoalForm = () => {
    setShowGoalForm(false);
    setEditingGoalId(null);
    setGoalName('');
    setGoalDesc('');
    setGoalAmount('');
    setGoalDate('');
    setGoalIcon('🎯');
  };

  const handleSaveGoal = async () => {
    if (!user || !goalName.trim() || !goalAmount) return;
    const payload = {
      name: goalName.trim(),
      description: goalDesc.trim() || null,
      target_amount: parseFloat(goalAmount) || 0,
      target_date: goalDate || null,
      icon: goalIcon,
    };

    if (editingGoalId) {
      const { data } = await supabase
        .from('goals')
        .update(payload)
        .eq('id', editingGoalId)
        .eq('user_id', user.id)
        .select('*, items:goal_items(*)')
        .single();
      if (data) setGoals((prev) => prev.map((g) => (g.id === editingGoalId ? data as Goal : g)));
    } else {
      const { data } = await supabase
        .from('goals')
        .insert({ ...payload, user_id: user.id, is_active: goals.length === 0, category: 'general', metadata: {} })
        .select('*, items:goal_items(*)')
        .single();
      if (data) setGoals((prev) => [...prev, data as Goal]);
    }
    resetGoalForm();
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalDesc(goal.description || '');
    setGoalAmount(goal.target_amount.toString());
    setGoalDate(goal.target_date || '');
    setGoalIcon(goal.icon || '🎯');
    setShowGoalForm(true);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user || !confirm('¿Eliminar esta meta y todos sus items?')) return;
    await supabase.from('goal_items').delete().eq('goal_id', id);
    await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSetActive = async (id: string) => {
    if (!user) return;
    // Deactivate all, activate this one
    await supabase.from('goals').update({ is_active: false }).eq('user_id', user.id);
    await supabase.from('goals').update({ is_active: true }).eq('id', id).eq('user_id', user.id);
    setGoals((prev) => prev.map((g) => ({ ...g, is_active: g.id === id })));
  };

  const handleToggleItem = async (goalId: string, itemId: string, currentPaid: boolean) => {
    if (!user) return;
    const updates: Record<string, unknown> = { is_paid: !currentPaid };
    if (!currentPaid) updates.paid_date = new Date().toISOString().slice(0, 10);
    else updates.paid_date = null;

    const { data } = await supabase
      .from('goal_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    if (data) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, items: (g.items || []).map((i) => (i.id === itemId ? { ...i, ...(data as Record<string, unknown>) } as typeof i : i)) }
            : g
        ),
      );
    }
  };

  const handleAddItem = async (goalId: string) => {
    if (!user || !newItemName.trim() || !newItemCost) return;
    const goal = goals.find((g) => g.id === goalId);
    const sortOrder = goal?.items?.length ?? 0;

    const { data } = await supabase
      .from('goal_items')
      .insert({ goal_id: goalId, user_id: user.id, name: newItemName.trim(), cost: parseFloat(newItemCost) || 0, sort_order: sortOrder })
      .select()
      .single();
    if (data) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, items: [...(g.items || []), data as Goal['items'] extends (infer U)[] | undefined ? U : never] }
            : g
        ),
      );
    }
    setNewItemName('');
    setNewItemCost('');
    setAddingItemGoalId(null);
  };

  const handleDeleteItem = async (goalId: string, itemId: string) => {
    if (!user) return;
    await supabase.from('goal_items').delete().eq('id', itemId);
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, items: (g.items || []).filter((i) => i.id !== itemId) }
          : g
      ),
    );
  };

  // ─── Derived data ────────────────────────────────────────
  const activeGoal = goals.find((g) => g.is_active && !g.is_achieved);
  const completedGoals = goals.filter((g) => g.is_achieved);
  const otherGoals = goals.filter((g) => !g.is_active && !g.is_achieved);

  const monthlyIncome = profile?.monthly_income ?? 0;

  // Calculate monthly expenses average from last 3 months
  const { avgMonthlyExpenses, expensesByCategory } = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        new Date(t.transaction_date) >= threeMonthsAgo
    );
    const totalExpenses = recentExpenses.reduce((s, t) => s + t.amount, 0);
    const months = Math.max(1, Math.min(3, (now.getMonth() - threeMonthsAgo.getMonth() + 12) % 12 || 3));
    const avg = totalExpenses / months;

    // Group by category
    const byCat: Record<string, number> = {};
    for (const t of recentExpenses) {
      const catName = t.category?.name || 'Sin categoria';
      byCat[catName] = (byCat[catName] || 0) + t.amount / months;
    }

    return { avgMonthlyExpenses: avg, expensesByCategory: byCat };
  }, [transactions]);

  const monthlySavings = Math.max(0, monthlyIncome - avgMonthlyExpenses);

  // Calculate goal progress
  const getGoalProgress = (goal: Goal) => {
    const paidItems = (goal.items || []).filter((i) => i.is_paid);
    const totalPaid = paidItems.reduce((s, i) => s + i.cost, 0);
    const progressPct = goal.target_amount > 0 ? Math.min(1, totalPaid / goal.target_amount) : 0;
    return { totalPaid, progressPct };
  };

  // Estimated months to reach goal
  const getEstimatedMonths = (remaining: number, savingsRate: number) => {
    if (savingsRate <= 0) return Infinity;
    return Math.ceil(remaining / savingsRate);
  };

  const getEstimatedDate = (months: number) => {
    if (!isFinite(months)) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d;
  };

  // ─── Scenarios generator ─────────────────────────────────
  const scenarios = useMemo((): Scenario[] => {
    if (!activeGoal) return [];
    const { totalPaid } = getGoalProgress(activeGoal);
    const remaining = Math.max(0, activeGoal.target_amount - totalPaid);
    const baseMonths = getEstimatedMonths(remaining, monthlySavings);

    const sorted = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const result: Scenario[] = [];

    // Scenario 1: Cut top category by 30%
    if (sorted.length > 0) {
      const [cat, amount] = sorted[0];
      const cut = amount * 0.3;
      const newSavings = monthlySavings + cut;
      const newMonths = getEstimatedMonths(remaining, newSavings);
      result.push({
        id: 'cut-top',
        label: `Reducir ${cat} un 30%`,
        icon: <Scissors size={16} aria-hidden="true" />,
        description: `Ahorra ${formatCurrency(cut)}/mes recortando ${cat} de ${formatCurrency(amount)} a ${formatCurrency(amount - cut)}`,
        extraSavingsPerMonth: cut,
        newEstimatedMonths: newMonths,
        monthsSaved: isFinite(baseMonths) ? baseMonths - newMonths : 0,
      });
    }

    // Scenario 2: Cut all categories by 10%
    const totalCut10 = Object.values(expensesByCategory).reduce((s, v) => s + v * 0.1, 0);
    if (totalCut10 > 0) {
      const newSavings = monthlySavings + totalCut10;
      const newMonths = getEstimatedMonths(remaining, newSavings);
      result.push({
        id: 'cut-all-10',
        label: 'Reducir todo un 10%',
        icon: <TrendingUp size={16} aria-hidden="true" />,
        description: `Ahorra ${formatCurrency(totalCut10)}/mes aplicando un recorte del 10% en todas las categorias`,
        extraSavingsPerMonth: totalCut10,
        newEstimatedMonths: newMonths,
        monthsSaved: isFinite(baseMonths) ? baseMonths - newMonths : 0,
      });
    }

    // Scenario 3: Cut top 2 categories by 20%
    if (sorted.length >= 2) {
      const cut = sorted.slice(0, 2).reduce((s, [, a]) => s + a * 0.2, 0);
      const newSavings = monthlySavings + cut;
      const newMonths = getEstimatedMonths(remaining, newSavings);
      result.push({
        id: 'cut-top2-20',
        label: `Recortar las 2 mayores un 20%`,
        icon: <Zap size={16} aria-hidden="true" />,
        description: `Recorta ${sorted[0][0]} y ${sorted[1][0]} un 20%, ahorrando ${formatCurrency(cut)}/mes extra`,
        extraSavingsPerMonth: cut,
        newEstimatedMonths: newMonths,
        monthsSaved: isFinite(baseMonths) ? baseMonths - newMonths : 0,
      });
    }

    // Scenario 4: Aggressive — cut top 3 by 40%
    if (sorted.length >= 3) {
      const cut = sorted.slice(0, 3).reduce((s, [, a]) => s + a * 0.4, 0);
      const newSavings = monthlySavings + cut;
      const newMonths = getEstimatedMonths(remaining, newSavings);
      result.push({
        id: 'aggressive',
        label: 'Modo agresivo',
        icon: <Zap size={16} aria-hidden="true" />,
        description: `Recorta un 40% en ${sorted[0][0]}, ${sorted[1][0]} y ${sorted[2][0]}. Extra: ${formatCurrency(cut)}/mes`,
        extraSavingsPerMonth: cut,
        newEstimatedMonths: newMonths,
        monthsSaved: isFinite(baseMonths) ? baseMonths - newMonths : 0,
      });
    }

    return result;
  }, [activeGoal, monthlySavings, expensesByCategory]);

  // ─── Refs for in-view animations ─────────────────────────
  const progressRef = useRef(null);
  const progressInView = useInView(progressRef, { once: true, margin: '-50px' });

  // ─── Render ──────────────────────────────────────────────
  if (loading) {
    return (
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <GoalsSkeleton />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Metas de ahorro</h2>
          <p className="text-sm text-th-muted mt-1">
            Simula escenarios y alcanza tus objetivos mas rapido
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {!isPro && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-amber/10 text-accent-amber rounded-full font-medium">
              <Crown size={12} aria-hidden="true" />
              Escenarios PRO
            </span>
          )}
          <motion.button
            onClick={() => { resetGoalForm(); setShowGoalForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={14} /> Nueva meta
          </motion.button>
        </div>
      </motion.div>

      {/* Goal creation/edit form */}
      <AnimatePresence>
        {showGoalForm && (
          <motion.div
            variants={fadeUp}
            initial="initial" animate="animate" exit="exit"
            className="bg-th-card rounded-xl p-4 md:p-5 border border-accent-purple/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-th-text">
                {editingGoalId ? 'Editar meta' : 'Nueva meta'}
              </h3>
              <button onClick={resetGoalForm} className="text-th-muted hover:text-th-text"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-th-muted mb-1">Nombre</label>
                <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Ej: Moto nueva"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-th-muted mb-1">Importe objetivo</label>
                <input type="number" min="0" step="1" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-th-muted mb-1">Fecha objetivo (opcional)</label>
                <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-th-muted mb-1">Icono</label>
                <input type="text" value={goalIcon} onChange={(e) => setGoalIcon(e.target.value)}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-th-muted mb-1">Descripción (opcional)</label>
              <input type="text" value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)}
                placeholder="Ej: Yamaha MT-07 2024"
                className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none" />
            </div>
            <div className="flex justify-end gap-2">
              <motion.button onClick={resetGoalForm}
                className="px-3 py-1.5 text-xs text-th-muted hover:text-th-text" whileTap={{ scale: 0.95 }}>
                Cancelar
              </motion.button>
              <motion.button onClick={handleSaveGoal}
                disabled={!goalName.trim() || !goalAmount}
                className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-xs font-medium hover:bg-accent-purple/80 disabled:opacity-50 transition-colors"
                whileTap={{ scale: 0.95 }}>
                {editingGoalId ? 'Guardar cambios' : 'Crear meta'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No goals state */}
      {goals.length === 0 && (
        <motion.div
          variants={fadeUp}
          className="bg-th-card rounded-xl p-8 md:p-12 border border-th-border text-center"
        >
          <motion.div
            className="w-16 h-16 rounded-2xl bg-accent-purple/15 flex items-center justify-center mx-auto mb-4"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          >
            <Target size={28} className="text-accent-purple" aria-hidden="true" />
          </motion.div>
          <h3 className="text-lg font-semibold text-th-text mb-2">
            No tienes metas configuradas
          </h3>
          <p className="text-sm text-th-secondary max-w-md mx-auto mb-4">
            Crea tu primera meta de ahorro y empieza a planificar tus objetivos financieros.
          </p>
          <motion.button
            onClick={() => { resetGoalForm(); setShowGoalForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={14} /> Crear primera meta
          </motion.button>
        </motion.div>
      )}

      {/* Active Goal - Hero section */}
      {activeGoal && (() => {
        const { totalPaid, progressPct } = getGoalProgress(activeGoal);
        const remaining = Math.max(0, activeGoal.target_amount - totalPaid);
        const estimatedMonths = getEstimatedMonths(remaining, monthlySavings);
        const estimatedDate = getEstimatedDate(estimatedMonths);

        return (
          <motion.div
            variants={fadeUp}
            className="bg-th-card rounded-xl p-5 md:p-6 border border-th-border card-glow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center text-lg">
                  {activeGoal.icon || '🎯'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-th-text">{activeGoal.name}</h3>
                  {activeGoal.description && (
                    <p className="text-xs text-th-muted mt-0.5">{activeGoal.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 bg-accent-green/10 text-accent-green rounded-full font-medium">
                  Activa
                </span>
                <button onClick={() => startEditGoal(activeGoal)} className="p-1.5 text-th-muted hover:text-accent-purple transition-colors" aria-label="Editar meta">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDeleteGoal(activeGoal.id)} className="p-1.5 text-th-muted hover:text-accent-red transition-colors" aria-label="Eliminar meta">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div ref={progressRef}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-th-text">Progreso</span>
                <motion.span
                  className="font-mono text-sm text-accent-purple font-semibold"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {Math.round(progressPct * 100)}%
                </motion.span>
              </div>
              <div className="w-full h-4 bg-th-hover rounded-full overflow-hidden mb-3" role="progressbar" aria-valuenow={Math.round(progressPct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de meta: ${Math.round(progressPct * 100)}%`}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={progressInView ? { width: `${Math.min(100, progressPct * 100)}%` } : { width: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    variants={shimmer}
                    initial="initial"
                    animate="animate"
                  />
                </motion.div>
              </div>
              <div className="flex justify-between text-xs text-th-muted">
                <span className="font-mono">{formatCurrency(totalPaid)} acumulado</span>
                <span className="font-mono">{formatCurrency(activeGoal.target_amount)} objetivo</span>
              </div>
            </div>

            {/* KPI row */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={fadeUpSmall} className="bg-th-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-th-muted uppercase tracking-wider mb-1">Falta</p>
                <p className="font-mono text-sm font-semibold text-th-text">
                  {formatCurrency(remaining)}
                </p>
              </motion.div>
              <motion.div variants={fadeUpSmall} className="bg-th-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-th-muted uppercase tracking-wider mb-1">Ahorro/mes</p>
                <p className="font-mono text-sm font-semibold text-accent-green">
                  {formatCurrency(monthlySavings)}
                </p>
              </motion.div>
              <motion.div variants={fadeUpSmall} className="bg-th-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-th-muted uppercase tracking-wider mb-1">Meses restantes</p>
                <p className="font-mono text-sm font-semibold text-accent-cyan">
                  {isFinite(estimatedMonths) ? estimatedMonths : '--'}
                </p>
              </motion.div>
              <motion.div variants={fadeUpSmall} className="bg-th-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-th-muted uppercase tracking-wider mb-1">Fecha estimada</p>
                <p className="font-mono text-sm font-semibold text-accent-amber">
                  {estimatedDate
                    ? estimatedDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                    : '--'}
                </p>
              </motion.div>
            </motion.div>

            {/* Target date comparison */}
            {activeGoal.target_date && estimatedDate && (
              <motion.div
                className="mt-4 flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <Clock size={14} className="text-th-muted" aria-hidden="true" />
                {estimatedDate <= new Date(activeGoal.target_date) ? (
                  <span className="text-sm text-accent-green font-medium">
                    Llegaras a tiempo (objetivo: {formatDate(activeGoal.target_date)})
                  </span>
                ) : (
                  <span className="text-sm text-accent-red font-medium">
                    Con el ritmo actual llegaras tarde (objetivo: {formatDate(activeGoal.target_date)})
                  </span>
                )}
              </motion.div>
            )}

            {/* Goal items breakdown */}
            <div className="mt-5 border-t border-th-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs text-th-muted uppercase tracking-wider">Desglose de items</h4>
                <button
                  onClick={() => { setAddingItemGoalId(addingItemGoalId === activeGoal.id ? null : activeGoal.id); setNewItemName(''); setNewItemCost(''); }}
                  className="text-xs text-accent-purple hover:text-accent-purple/80 flex items-center gap-1"
                >
                  <Plus size={12} /> Añadir item
                </button>
              </div>
              {addingItemGoalId === activeGoal.id && (
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nombre del item" className="flex-1 bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-xs text-th-text focus:border-accent-purple focus:outline-none" />
                  <input type="number" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)}
                    placeholder="Coste" className="w-24 bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-xs text-th-text font-mono focus:border-accent-purple focus:outline-none" />
                  <motion.button onClick={() => handleAddItem(activeGoal.id)}
                    disabled={!newItemName.trim() || !newItemCost}
                    className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-xs disabled:opacity-50" whileTap={{ scale: 0.95 }}>
                    Añadir
                  </motion.button>
                </div>
              )}
              <div className="space-y-2">
                {(activeGoal.items || [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm group">
                      <button
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        onClick={() => handleToggleItem(activeGoal.id, item.id, item.is_paid)}
                      >
                        {item.is_paid ? (
                          <CheckCircle2 size={14} className="text-accent-green" aria-hidden="true" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-th-border" />
                        )}
                        <span className={item.is_paid ? 'text-th-muted line-through' : 'text-th-secondary'}>
                          {item.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs ${item.is_paid ? 'text-accent-green' : 'text-th-text'}`}>
                          {formatCurrency(item.cost)}
                        </span>
                        <button onClick={() => handleDeleteItem(activeGoal.id, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-th-muted hover:text-accent-red transition-all"
                          aria-label={`Eliminar ${item.name}`}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Simulator - Scenarios section */}
      {activeGoal && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <Sparkles size={18} className="text-accent-purple" aria-hidden="true" />
            </motion.div>
            <h3 className="text-lg font-semibold text-th-text">Simulador de escenarios</h3>
            {!isPro && (
              <Lock size={14} className="text-th-muted" aria-hidden="true" />
            )}
          </div>

          {scenarios.length === 0 ? (
            <div className="bg-th-card rounded-xl p-6 border border-th-border text-center">
              <p className="text-sm text-th-muted">
                Necesitas registrar gastos para generar escenarios de ahorro.
              </p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {scenarios.map((scenario, index) => {
                const isLocked = !hasSimulatorScenarios && index > 0;

                return (
                  <motion.div
                    key={scenario.id}
                    variants={fadeUp}
                    className={`bg-th-card rounded-xl p-4 md:p-5 border border-th-border relative overflow-hidden ${
                      isLocked ? 'opacity-60' : ''
                    }`}
                    {...(isLocked ? {} : cardHover)}
                  >
                    {isLocked && (
                      <motion.button
                        className="absolute inset-0 z-10 flex items-center justify-center bg-th-bg/60 backdrop-blur-sm cursor-pointer"
                        onClick={() => paywall.open('Escenarios avanzados del simulador')}
                        aria-label="Desbloquear escenario con plan PRO"
                        {...buttonTap}
                      >
                        <div className="flex items-center gap-2 px-4 py-2 bg-accent-purple/20 text-accent-purple rounded-xl text-sm font-medium">
                          <Crown size={14} />
                          Desbloquear con PRO
                        </div>
                      </motion.button>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-accent-cyan/15 flex items-center justify-center text-accent-cyan">
                        {scenario.icon}
                      </div>
                      <h4 className="text-sm font-semibold text-th-text">{scenario.label}</h4>
                    </div>

                    <p className="text-xs text-th-secondary mb-4 leading-relaxed">
                      {scenario.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-th-bg rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-th-muted uppercase tracking-wider">Nuevo plazo</p>
                        <p className="font-mono text-sm font-semibold text-accent-cyan mt-0.5">
                          {isFinite(scenario.newEstimatedMonths)
                            ? `${scenario.newEstimatedMonths} meses`
                            : '--'}
                        </p>
                      </div>
                      <div className="bg-th-bg rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-th-muted uppercase tracking-wider">Te ahorras</p>
                        <p className="font-mono text-sm font-semibold text-accent-green mt-0.5">
                          {scenario.monthsSaved > 0
                            ? `${scenario.monthsSaved} mes${scenario.monthsSaved !== 1 ? 'es' : ''}`
                            : '--'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-th-border flex items-center justify-between">
                      <span className="text-[10px] text-th-muted uppercase tracking-wider">Extra/mes</span>
                      <span className="font-mono text-sm font-semibold text-accent-purple">
                        +{formatCurrency(scenario.extraSavingsPerMonth)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Other goals */}
      {otherGoals.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="text-lg font-semibold text-th-text mb-4 flex items-center gap-2">
            <Target size={18} className="text-th-muted" aria-hidden="true" />
            Otras metas
          </h3>
          <div className="space-y-3">
            {otherGoals.map((goal) => {
              const { totalPaid, progressPct } = getGoalProgress(goal);
              const isExpanded = expandedGoal === goal.id;

              return (
                <motion.div
                  key={goal.id}
                  className="bg-th-card rounded-xl border border-th-border overflow-hidden"
                  layout
                >
                  <button
                    className="w-full p-4 flex items-center justify-between text-left"
                    onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Meta: ${goal.name}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">{goal.icon || '🎯'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-th-text truncate">{goal.name}</p>
                        <p className="text-xs text-th-muted">
                          {formatCurrency(totalPaid)} / {formatCurrency(goal.target_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-20 h-2 bg-th-hover rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-accent-purple/60"
                          style={{ width: `${Math.min(100, progressPct * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-th-muted">
                        {Math.round(progressPct * 100)}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-th-muted" aria-hidden="true" />
                      ) : (
                        <ChevronDown size={16} className="text-th-muted" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        variants={collapseVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="px-4 pb-4"
                      >
                        {goal.description && (
                          <p className="text-xs text-th-secondary mb-3">{goal.description}</p>
                        )}
                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <button onClick={() => handleSetActive(goal.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-accent-green/10 text-accent-green rounded-lg font-medium hover:bg-accent-green/20 transition-colors">
                            <Star size={10} /> Activar
                          </button>
                          <button onClick={() => startEditGoal(goal)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-th-hover text-th-muted rounded-lg hover:text-th-text transition-colors">
                            <Pencil size={10} /> Editar
                          </button>
                          <button onClick={() => handleDeleteGoal(goal.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-accent-red/10 text-accent-red rounded-lg hover:bg-accent-red/20 transition-colors">
                            <Trash2 size={10} /> Eliminar
                          </button>
                        </div>
                        {/* Items */}
                        <div className="space-y-1.5">
                          {(goal.items || [])
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs group">
                                <button
                                  className="flex items-center gap-2 hover:opacity-80"
                                  onClick={() => handleToggleItem(goal.id, item.id, item.is_paid)}
                                >
                                  {item.is_paid ? (
                                    <CheckCircle2 size={12} className="text-accent-green" aria-hidden="true" />
                                  ) : (
                                    <div className="w-3 h-3 rounded-full border-2 border-th-border" />
                                  )}
                                  <span className={item.is_paid ? 'text-th-muted line-through' : 'text-th-secondary'}>
                                    {item.name}
                                  </span>
                                </button>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-th-text">{formatCurrency(item.cost)}</span>
                                  <button onClick={() => handleDeleteItem(goal.id, item.id)}
                                    className="opacity-0 group-hover:opacity-100 text-th-muted hover:text-accent-red transition-all">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                        {/* Add item */}
                        {addingItemGoalId === goal.id ? (
                          <div className="flex gap-2 mt-2">
                            <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="Nombre" className="flex-1 bg-th-input border border-th-border-strong rounded-lg px-2 py-1 text-[11px] text-th-text focus:border-accent-purple focus:outline-none" />
                            <input type="number" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)}
                              placeholder="€" className="w-20 bg-th-input border border-th-border-strong rounded-lg px-2 py-1 text-[11px] text-th-text font-mono focus:border-accent-purple focus:outline-none" />
                            <button onClick={() => handleAddItem(goal.id)}
                              disabled={!newItemName.trim() || !newItemCost}
                              className="px-2 py-1 bg-accent-purple text-white rounded-lg text-[10px] disabled:opacity-50">
                              OK
                            </button>
                            <button onClick={() => setAddingItemGoalId(null)} className="text-th-muted text-[10px]">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingItemGoalId(goal.id); setNewItemName(''); setNewItemCost(''); }}
                            className="mt-2 text-[10px] text-accent-purple flex items-center gap-1 hover:opacity-80"
                          >
                            <Plus size={10} /> Añadir item
                          </button>
                        )}
                        {goal.target_date && (
                          <p className="text-xs text-th-muted mt-3">
                            Fecha objetivo: {formatDate(goal.target_date)}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="text-lg font-semibold text-th-text mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-accent-green" aria-hidden="true" />
            Metas completadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedGoals.map((goal) => (
              <motion.div
                key={goal.id}
                className="bg-th-card rounded-xl p-4 border border-accent-green/20 bg-accent-green/5"
                {...cardHover}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{goal.icon || '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-th-text truncate">{goal.name}</p>
                    <p className="text-xs text-accent-green">
                      {formatCurrency(goal.target_amount)} completado
                      {goal.achieved_date && ` el ${formatDate(goal.achieved_date)}`}
                    </p>
                  </div>
                  <CheckCircle2 size={20} className="text-accent-green flex-shrink-0" aria-hidden="true" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer tip */}
      <motion.p variants={fadeUp} className="text-xs text-th-muted text-center">
        Los escenarios se calculan con tu media de gastos de los ultimos 3 meses
      </motion.p>
    </motion.div>
  );
}
