import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Filter, Lock, BarChart3 } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { usePlan } from '../../hooks/usePlan';
import { usePaywall } from '../shared/PaywallModal';
import { formatCurrency, getCurrentMonth, formatMonth } from '../../utils/format';
import { getAvailableBalance, getTotalObjective, getTotalPaid, getExpensesByCategory, getMonthTotalExpenses, getMonthTotalIncome, projectSavingsTimeline } from '../../utils/calculations';
import { staggerContainer, fadeUp } from '../../utils/animations';

function EmptyChart({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="h-[250px] flex flex-col items-center justify-center gap-2 text-center">
      <BarChart3 size={32} className="text-th-faint" />
      <p className="text-sm text-th-muted">{message}</p>
      {sub && <p className="text-xs text-th-faint">{sub}</p>}
    </div>
  );
}

const COLORS = ['#a78bfa', '#34d399', '#fb923c', '#f87171', '#fbbf24', '#22d3ee', '#818cf8', '#f472b6', '#a3e635', '#94a3b8'];

const tooltipStyle = {
  contentStyle: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)' },
  labelStyle: { color: 'var(--text-muted)' },
};

export function Charts() {
  const { settings, phases, expenses, incomes } = useAppData();
  const { hasAdvancedCharts } = usePlan();
  const paywall = usePaywall();
  const currentMonth = getCurrentMonth(settings.payDay, settings.cycleMode);

  // Month selector: specific month or "global"
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const isGlobal = filterMonth === 'global';

  // Available months from expenses + incomes
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) set.add(e.date.substring(0, 7));
    for (const i of incomes) set.add(i.date.substring(0, 7));
    const sorted = [...set].sort().reverse();
    if (!sorted.includes(currentMonth)) sorted.unshift(currentMonth);
    return sorted;
  }, [expenses, incomes, currentMonth]);

  const totalObjective = getTotalObjective(phases);
  const totalPaid = getTotalPaid(phases);
  const available = getAvailableBalance(settings.currentBalance, settings.emergencyFund);
  const totalMonthlyIncome = settings.monthlyIncome + settings.cashbackNet;

  // Category breakdown — filtered by selected month or global
  const byCategory = useMemo(() => {
    if (isGlobal) {
      const result: Record<string, number> = {};
      for (const e of expenses) {
        result[e.category] = (result[e.category] || 0) + e.amount;
      }
      return result;
    }
    return getExpensesByCategory(expenses, filterMonth, settings.payDay, settings.cycleMode);
  }, [expenses, filterMonth, isGlobal, settings.payDay, settings.cycleMode]);

  const pieData = useMemo(() =>
    Object.entries(byCategory).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    [byCategory]
  );
  const barData = useMemo(() => pieData.map((d) => ({ ...d })), [pieData]);

  // Monthly evolution — always shows all available months
  const monthlyData = useMemo(() => {
    const allMonths = [...new Set(
      [...expenses.map((e) => e.date.substring(0, 7)), ...incomes.map((i) => i.date.substring(0, 7))]
    )].sort();
    // Show at most last 12 months for readability
    const sliced = allMonths.slice(-12);
    return sliced.map((m) => ({
      month: formatMonth(m + '-01'),
      ingresos: getMonthTotalIncome(incomes, m, settings.payDay, settings.cycleMode),
      gastos: getMonthTotalExpenses(expenses, m, settings.payDay, settings.cycleMode),
    }));
  }, [expenses, incomes, settings.payDay, settings.cycleMode]);

  const currentMonthExpenses = getMonthTotalExpenses(expenses, currentMonth, settings.payDay, settings.cycleMode);
  const estimatedMonthlySavings = totalMonthlyIncome - (currentMonthExpenses > 0 ? currentMonthExpenses : 507);
  const projectionData = useMemo(() =>
    projectSavingsTimeline(settings.currentBalance, settings.emergencyFund, estimatedMonthlySavings, totalObjective, totalPaid, settings.targetDate)
      .map((p) => ({ ...p, month: formatMonth(p.month + '-01'), objetivo: totalObjective - totalPaid })),
    [settings, totalObjective, totalPaid, estimatedMonthlySavings]
  );

  const requiredMonthly = (() => {
    const remaining = totalObjective - totalPaid - available;
    if (remaining <= 0) return 0;
    const now = new Date(); const target = new Date(settings.targetDate);
    const mths = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
    return remaining / mths;
  })();

  const paceData = [
    { name: 'Ritmo actual', value: estimatedMonthlySavings, fill: estimatedMonthlySavings >= requiredMonthly ? '#34d399' : '#f87171' },
    { name: 'Ritmo necesario', value: requiredMonthly, fill: '#fbbf24' },
  ];

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Graficos</h2>
          <p className="text-sm text-th-muted mt-1">Analisis visual de tus finanzas</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-th-muted" aria-hidden="true" />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            aria-label="Filtrar por periodo"
            className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors"
          >
            <option value="global">Todo el historial</option>
            {months.map((m) => (
              <option key={m} value={m}>{formatMonth(m + '-01')}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow relative overflow-hidden">
        <h3 className="text-sm font-semibold text-th-text mb-4">Proyeccion de ahorro vs objetivo</h3>
        {totalObjective <= 0 || projectionData.length === 0 ? (
          <EmptyChart message="Sin datos de proyeccion" sub="Crea fases con items en el Timeline para ver la proyeccion" />
        ) : (
          <div className={hasAdvancedCharts ? '' : 'blur-sm pointer-events-none select-none'}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} width={40} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="projected" name="Proyectado" stroke="#a78bfa" strokeWidth={2} dot={false} animationDuration={1500} />
                <Line type="monotone" dataKey="required" name="Necesario" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={1500} />
                <Line type="monotone" dataKey="objetivo" name="Objetivo" stroke="#f87171" strokeWidth={1} strokeDasharray="3 3" dot={false} animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-th-muted mt-2">
              A tu ritmo ({formatCurrency(estimatedMonthlySavings)}/mes),{' '}
              {estimatedMonthlySavings >= requiredMonthly ? 'llegaras a tiempo.' : `necesitas ${formatCurrency(requiredMonthly)}/mes.`}
            </p>
          </div>
        )}
        {totalObjective > 0 && projectionData.length > 0 && !hasAdvancedCharts && (
          <button onClick={() => paywall.open('Graficos avanzados')}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-th-card/60">
            <Lock size={24} className="text-accent-purple" />
            <span className="text-sm font-medium text-th-text">Desbloquear con PRO</span>
          </button>
        )}
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow">
          <h3 className="text-sm font-semibold text-th-text mb-4">
            Gastos por categoria {isGlobal ? '(acumulado)' : ''}
          </h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={90} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" name="Gasto" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Sin gastos en este periodo" sub="Anade gastos para ver el desglose" />}
        </motion.div>

        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow">
          <h3 className="text-sm font-semibold text-th-text mb-4">
            Distribucion {isGlobal ? '(acumulado)' : ''}
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" animationDuration={1200}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Sin gastos en este periodo" sub="Anade gastos para ver la distribucion" />}
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow relative overflow-hidden">
        <h3 className="text-sm font-semibold text-th-text mb-4">Evolucion mensual</h3>
        {monthlyData.length === 0 ? (
          <EmptyChart message="Sin datos de evolucion" sub="Registra gastos o ingresos para ver la evolucion mensual" />
        ) : (
          <div className={hasAdvancedCharts ? '' : 'blur-sm pointer-events-none select-none'}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={40} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#34d399" radius={[4, 4, 0, 0]} animationDuration={1200} />
                <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {monthlyData.length > 0 && !hasAdvancedCharts && (
          <button onClick={() => paywall.open('Graficos avanzados')}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-th-card/60">
            <Lock size={24} className="text-accent-purple" />
            <span className="text-sm font-medium text-th-text">Desbloquear con PRO</span>
          </button>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow relative overflow-hidden">
        <h3 className="text-sm font-semibold text-th-text mb-4">Ritmo actual vs necesario</h3>
        <div className={hasAdvancedCharts ? '' : 'blur-sm pointer-events-none select-none'}>
          <div className="grid grid-cols-2 gap-4">
            {paceData.map((d, i) => (
              <motion.div key={d.name} className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>
                <p className="text-xs text-th-muted mb-2">{d.name}</p>
                <p className="font-mono text-2xl md:text-3xl font-bold" style={{ color: d.fill }}>{formatCurrency(d.value)}</p>
                <p className="text-xs text-th-muted mt-1">/mes</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            {paceData.map((d, i) => (
              <div key={d.name} className="flex-1">
                <div className="w-full h-3 bg-th-hover rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full progress-shimmer" style={{ backgroundColor: d.fill }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (d.value / Math.max(...paceData.map((p) => p.value), 1)) * 100)}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.15 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {!hasAdvancedCharts && (
          <button onClick={() => paywall.open('Graficos avanzados')}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-th-card/60">
            <Lock size={24} className="text-accent-purple" />
            <span className="text-sm font-medium text-th-text">Desbloquear con PRO</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
