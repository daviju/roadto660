import { motion, useInView } from 'framer-motion';
import { useRef, useMemo } from 'react';
import { Target, Wallet, TrendingUp, Calendar, Gauge, ArrowUpRight, ArrowDownRight, Bike, ArrowRight, Flame, Star, Clock, Trophy, CheckCircle2, Lock } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { useAuth } from '../../lib/auth';
import { useChallenges } from '../../hooks/useChallenges';
import { usePaywall } from '../shared/PaywallModal';
import { KPICard } from './KPICard';
import { PhaseProgress } from './PhaseProgress';
import { getAvailableBalance, getTotalObjective, getTotalPaid, getDaysRemaining, getRequiredMonthlySavings, getMonthTotalExpenses, getMonthTotalIncome } from '../../utils/calculations';
import { formatCurrency, formatPercent, getCurrentMonth, todayISO } from '../../utils/format';
import { staggerContainer, fadeUp } from '../../utils/animations';

export function Dashboard() {
  const { settings, phases, expenses, incomes, budgets, motorcycles, setPage } = useAppData();
  const { profile } = useAuth();
  const { challenges, hasChallenges } = useChallenges();
  const paywall = usePaywall();
  const currentMonth = getCurrentMonth(settings.payDay, settings.cycleMode);

  const activeMoto = motorcycles.find(m => m.active);
  const totalObjective = getTotalObjective(phases);
  const totalPaid = getTotalPaid(phases);
  const available = getAvailableBalance(settings.currentBalance, settings.emergencyFund);
  const progress = available + totalPaid;
  const progressPct = totalObjective > 0 ? progress / totalObjective : 0;

  const daysLeft = getDaysRemaining(settings.targetDate);
  const requiredMonthly = getRequiredMonthlySavings(totalObjective, totalPaid, available, settings.targetDate);

  const monthExpenses = getMonthTotalExpenses(expenses, currentMonth, settings.payDay, settings.cycleMode);
  const monthIncome = getMonthTotalIncome(incomes, currentMonth, settings.payDay, settings.cycleMode);
  const monthSavings = monthIncome - monthExpenses;
  const totalMonthlyIncome = settings.monthlyIncome + settings.cashbackNet;

  const isOnTrack = monthSavings >= 0 ? (totalMonthlyIncome - monthExpenses) >= requiredMonthly : false;

  // Daily widget data
  const today = todayISO();
  const todayData = useMemo(() => {
    const todayExpenses = expenses.filter((e) => e.date === today);
    const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const todayCount = todayExpenses.length;
    return { todayTotal, todayCount };
  }, [expenses, today]);

  // Budget alerts — categories near or over budget
  const budgetAlerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    const alerts: { category: string; spent: number; limit: number; pct: number }[] = [];
    for (const b of budgets) {
      if (b.limit <= 0) continue;
      const spent = expenses
        .filter((e) => e.category === b.category && e.date.startsWith(currentMonth))
        .reduce((s, e) => s + e.amount, 0);
      const pct = spent / b.limit;
      if (pct >= 0.8) alerts.push({ category: b.category, spent, limit: b.limit, pct });
    }
    return alerts.sort((a, b) => b.pct - a.pct);
  }, [expenses, budgets, currentMonth]);

  const progressRef = useRef(null);
  const progressInView = useInView(progressRef, { once: true, margin: '-50px' });

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Dashboard</h2>
          <p className="text-sm text-th-muted mt-1">Tu progreso hacia la {activeMoto?.name || 'moto'}</p>
        </div>
        {activeMoto && (
          <motion.button
            onClick={() => setPage('motorcycles')}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple/10 text-accent-purple rounded-xl text-sm font-medium hover:bg-accent-purple/20 transition-colors"
            whileHover={{ scale: 1.03, x: 3 }}
            whileTap={{ scale: 0.97 }}
            aria-label={`Ver ${activeMoto.name}`}
          >
            <Bike size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{activeMoto.name} - {formatCurrency(activeMoto.price)}</span>
            <span className="sm:hidden">{formatCurrency(activeMoto.price)}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </motion.button>
        )}
      </motion.div>

      {/* Global Progress Bar */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 md:p-6 border border-th-border card-glow" ref={progressRef}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-th-text">Progreso global</span>
          <motion.span className="font-mono text-sm text-accent-purple font-semibold"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}>
            {formatPercent(progressPct)}
          </motion.span>
        </div>
        <div className="w-full h-4 bg-th-hover rounded-full overflow-hidden mb-3">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-accent-purple to-purple-400 progress-shimmer"
            initial={{ width: 0 }}
            animate={progressInView ? { width: `${Math.min(100, progressPct * 100)}%` } : { width: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }} />
        </div>
        <div className="flex justify-between text-xs text-th-muted">
          <span className="font-mono">{formatCurrency(progress)} acumulado</span>
          <span className="font-mono">{formatCurrency(totalObjective)} objetivo</span>
        </div>
        <motion.div className="mt-4 flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.4 }}>
          {isOnTrack ? (
            <>
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                <ArrowUpRight size={16} className="text-accent-green" aria-hidden="true" />
              </motion.div>
              <span className="text-sm text-accent-green font-medium">Vas por buen camino</span>
            </>
          ) : (
            <>
              <motion.div animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                <ArrowDownRight size={16} className="text-accent-red" aria-hidden="true" />
              </motion.div>
              <span className="text-sm text-accent-red font-medium">Necesitas ahorrar mas para llegar a tiempo</span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* KPI Grid */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" variants={staggerContainer}>
        <motion.div variants={fadeUp}>
          <KPICard title="Saldo disponible" value={formatCurrency(available)}
            subtitle={`Total: ${formatCurrency(settings.currentBalance)}`}
            icon={<Wallet size={18} />} color="text-accent-green" glowClass="card-glow-green" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <KPICard title="Ahorro mes"
            value={formatCurrency(monthIncome > 0 ? monthSavings : totalMonthlyIncome - monthExpenses)}
            subtitle={`Gastos: ${formatCurrency(monthExpenses)}`}
            icon={<TrendingUp size={18} />}
            color={(monthIncome > 0 ? monthSavings : totalMonthlyIncome - monthExpenses) >= 0 ? 'text-accent-green' : 'text-accent-red'}
            glowClass={(monthIncome > 0 ? monthSavings : totalMonthlyIncome - monthExpenses) >= 0 ? 'card-glow-green' : 'card-glow-red'} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <KPICard title="Dias restantes" value={`${daysLeft}`}
            subtitle={`Obj: ${new Date(settings.targetDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`}
            icon={<Calendar size={18} />} color="text-accent-cyan" glowClass="card-glow-cyan" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <KPICard title="Ritmo necesario" value={formatCurrency(requiredMonthly)}
            subtitle="ahorro/mes"
            icon={<Gauge size={18} />} color="text-accent-amber" glowClass="card-glow-amber" />
        </motion.div>
      </motion.div>

      {/* Daily widget + Budget alerts */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4" variants={staggerContainer}>
        {/* Cuanto llevo hoy */}
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-accent-cyan" />
            <h4 className="text-xs text-th-muted uppercase tracking-wider">Cuanto llevo hoy</h4>
          </div>
          <p className="font-mono text-3xl font-bold text-th-text">{formatCurrency(todayData.todayTotal)}</p>
          <p className="text-xs text-th-muted mt-1">
            {todayData.todayCount === 0
              ? 'Sin gastos registrados hoy'
              : `${todayData.todayCount} gasto${todayData.todayCount > 1 ? 's' : ''} registrado${todayData.todayCount > 1 ? 's' : ''}`}
          </p>
        </motion.div>

        {/* Budget alerts */}
        {budgetAlerts.length > 0 && (
          <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
            <h4 className="text-xs text-th-muted uppercase tracking-wider mb-3">Alertas de presupuesto</h4>
            <div className="space-y-2.5">
              {budgetAlerts.slice(0, 3).map((a) => (
                <div key={a.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-th-secondary truncate">{a.category}</span>
                    <span className={`font-mono text-xs ${a.pct >= 1 ? 'text-accent-red' : 'text-accent-amber'}`}>
                      {formatCurrency(a.spent)} / {formatCurrency(a.limit)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-th-hover rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${a.pct >= 1 ? 'bg-accent-red' : 'bg-accent-amber'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, a.pct * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Phase Progress */}
      <motion.div variants={fadeUp}>
        <h3 className="text-lg font-semibold text-th-text mb-4 flex items-center gap-2">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
            <Target size={18} className="text-accent-purple" aria-hidden="true" />
          </motion.div>
          Fases del plan
        </h3>
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4" variants={staggerContainer}>
          {phases.map((phase) => (
            <motion.div key={phase.id} variants={fadeUp}>
              <PhaseProgress phase={phase} />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <h4 className="text-xs text-th-muted uppercase tracking-wider mb-3">Resumen mensual</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-th-secondary">Ingresos esperados</span>
              <span className="font-mono text-accent-green">{formatCurrency(totalMonthlyIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-th-secondary">Gastos variables</span>
              <span className="font-mono text-accent-red">{formatCurrency(monthExpenses)}</span>
            </div>
            <div className="border-t border-th-border pt-2 flex justify-between text-sm font-medium">
              <span className="text-th-text">Ahorro estimado</span>
              <span className="font-mono text-accent-green">{formatCurrency(totalMonthlyIncome - monthExpenses)}</span>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <h4 className="text-xs text-th-muted uppercase tracking-wider mb-3">Falta por ahorrar</h4>
          <p className="font-mono text-3xl font-bold text-th-text">{formatCurrency(Math.max(0, totalObjective - progress))}</p>
          <p className="text-xs text-th-muted mt-2">de {formatCurrency(totalObjective)} total</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <h4 className="text-xs text-th-muted uppercase tracking-wider mb-3">Items pagados</h4>
          <p className="font-mono text-3xl font-bold text-th-text">
            {phases.reduce((s, p) => s + p.items.filter((i) => i.paid).length, 0)}
            <span className="text-lg text-th-muted">/{phases.reduce((s, p) => s + p.items.length, 0)}</span>
          </p>
          <p className="text-xs text-th-muted mt-2">Pagado: {formatCurrency(totalPaid)}</p>
        </motion.div>
      </motion.div>

      {/* Monthly Challenges */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-th-text flex items-center gap-2">
            <Trophy size={16} className="text-accent-amber" />
            Retos del mes
          </h3>
          {hasChallenges && challenges.length > 0 && (
            <span className="text-xs text-th-muted">
              {challenges.filter((c) => c.is_completed).length}/{challenges.length} completados
            </span>
          )}
        </div>
        {hasChallenges ? (
          challenges.length > 0 ? (
            <div className="space-y-3">
              {challenges.map((ch) => (
                <div
                  key={ch.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    ch.is_completed
                      ? 'border-accent-green/20 bg-accent-green/5'
                      : 'border-th-border bg-th-hover/50'
                  }`}
                >
                  <div className={`mt-0.5 ${ch.is_completed ? 'text-accent-green' : 'text-th-muted'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${ch.is_completed ? 'text-accent-green line-through' : 'text-th-text'}`}>
                      {ch.title}
                    </p>
                    <p className="text-xs text-th-muted mt-0.5">{ch.description}</p>
                  </div>
                  <span className="text-xs font-mono text-accent-amber flex-shrink-0">
                    +{ch.points_reward}pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-th-muted text-center py-4">Cargando retos...</p>
          )
        ) : (
          <>
            <div className="blur-sm pointer-events-none select-none space-y-3">
              {['Dia sin gastar', 'Reduce tu mayor gasto', 'Dentro del presupuesto'].map((t) => (
                <div key={t} className="flex items-start gap-3 p-3 rounded-lg border border-th-border bg-th-hover/50">
                  <CheckCircle2 size={16} className="text-th-muted mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-th-text">{t}</p>
                    <p className="text-xs text-th-muted mt-0.5">Completa este reto para ganar puntos</p>
                  </div>
                  <span className="text-xs font-mono text-accent-amber">+50pts</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => paywall.open('Retos mensuales')}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-th-card/60"
            >
              <Lock size={24} className="text-accent-purple" />
              <span className="text-sm font-medium text-th-text">Desbloquear con PRO</span>
            </button>
          </>
        )}
      </motion.div>

      {/* Gamification */}
      {profile && (profile.points > 0 || profile.streak_days > 0) && (
        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          {profile.points > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-accent-amber/10 border border-accent-amber/20 rounded-xl">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              >
                <Star size={16} className="text-accent-amber" />
              </motion.div>
              <span className="text-sm font-semibold text-accent-amber">{profile.points.toLocaleString('es-ES')}</span>
              <span className="text-xs text-th-muted">puntos</span>
            </div>
          )}
          {profile.streak_days > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              >
                <Flame size={16} className="text-orange-500" />
              </motion.div>
              <span className="text-sm font-semibold text-orange-500">{profile.streak_days}</span>
              <span className="text-xs text-th-muted">{profile.streak_days === 1 ? 'dia seguido' : 'dias seguidos'}</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
