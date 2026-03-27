import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Target, Wallet, TrendingUp, Calendar, Gauge, ArrowUpRight, ArrowDownRight, Bike, ArrowRight, Flame, Star } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { useAuth } from '../../lib/auth';
import { KPICard } from './KPICard';
import { PhaseProgress } from './PhaseProgress';
import { getAvailableBalance, getTotalObjective, getTotalPaid, getDaysRemaining, getRequiredMonthlySavings, getMonthTotalExpenses, getMonthTotalIncome } from '../../utils/calculations';
import { formatCurrency, formatPercent, getCurrentMonth } from '../../utils/format';
import { staggerContainer, fadeUp } from '../../utils/animations';

export function Dashboard() {
  const { settings, phases, expenses, incomes, motorcycles, setPage } = useAppData();
  const { profile } = useAuth();
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
