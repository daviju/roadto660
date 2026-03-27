import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Target, TrendingUp, Clock, Sparkles, Crown, Lock,
  CheckCircle2, ChevronDown, ChevronUp, Scissors, Zap,
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

  // Fetch goals and recent transactions
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
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
      if (goalsRes.data) setGoals(goalsRes.data);
      if (txRes.data) setTransactions(txRes.data);
      setLoading(false);
    };

    fetchData();
  }, [user]);

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
        {!isPro && (
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-accent-amber/10 text-accent-amber rounded-full font-medium self-start">
            <Crown size={12} aria-hidden="true" />
            Escenarios PRO
          </span>
        )}
      </motion.div>

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
          <p className="text-sm text-th-secondary max-w-md mx-auto">
            Las metas se gestionan desde la base de datos. Contacta al admin o espera a que se habilite la creacion desde la app.
          </p>
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
              <span className="text-xs px-2.5 py-1 bg-accent-green/10 text-accent-green rounded-full font-medium">
                Activa
              </span>
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
            {activeGoal.items && activeGoal.items.length > 0 && (
              <div className="mt-5 border-t border-th-border pt-4">
                <h4 className="text-xs text-th-muted uppercase tracking-wider mb-3">Desglose de items</h4>
                <div className="space-y-2">
                  {activeGoal.items
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {item.is_paid ? (
                            <CheckCircle2 size={14} className="text-accent-green" aria-hidden="true" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-th-border" />
                          )}
                          <span className={item.is_paid ? 'text-th-muted line-through' : 'text-th-secondary'}>
                            {item.name}
                          </span>
                        </div>
                        <span className={`font-mono text-xs ${item.is_paid ? 'text-accent-green' : 'text-th-text'}`}>
                          {formatCurrency(item.cost)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
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
                        {goal.items && goal.items.length > 0 && (
                          <div className="space-y-1.5">
                            {goal.items
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {item.is_paid ? (
                                      <CheckCircle2 size={12} className="text-accent-green" aria-hidden="true" />
                                    ) : (
                                      <div className="w-3 h-3 rounded-full border-2 border-th-border" />
                                    )}
                                    <span className={item.is_paid ? 'text-th-muted line-through' : 'text-th-secondary'}>
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-th-text">{formatCurrency(item.cost)}</span>
                                </div>
                              ))}
                          </div>
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
