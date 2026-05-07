import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Filter, Lock, BarChart3 } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { usePlan } from '../../hooks/usePlan';
import { usePaywall } from '../shared/PaywallModal';
import { formatCurrency, getCurrentMonth, formatMonth } from '../../utils/format';
import { getAvailableBalance, getTotalObjective, getTotalPaid, getExpensesByCategory, getMonthTotalExpenses, getMonthTotalIncome } from '../../utils/calculations';
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
  contentStyle: { backgroundColor: '#1e1e2e', border: '1px solid #333', color: '#f1f5f9', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' },
};

export function Charts() {
  const { settings, phases, expenses, incomes, categories: dbCategories } = useAppData();
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

  const catColorMap = useMemo(() => {
    const m = new Map<string, string>();
    dbCategories.forEach((c) => m.set(c.name, c.color));
    return m;
  }, [dbCategories]);

  const pieData = useMemo(() =>
    Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .map(([name, value], i) => ({
        name,
        value,
        color: catColorMap.get(name) || COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value),
    [byCategory, catColorMap]
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

  // ─── Multi-goal projection: cumulative goal thresholds + savings line ─
  const activePhases = useMemo(() => phases.filter((p) => p.isActive), [phases]);

  // Cumulative thresholds: goal i threshold = sum of (target - paid) of goals 0..i
  const cumulativeGoals = useMemo(() => {
    let acc = 0;
    return activePhases.map((p) => {
      const itemSum = p.items.reduce((s, it) => s + it.estimatedCost, 0);
      const target = p.targetAmount > 0 ? Math.max(p.targetAmount, itemSum) : itemSum;
      const paid = p.items.reduce((s, it) => s + (it.paid ? it.paidAmount : 0), 0);
      const remainingForGoal = Math.max(0, target - paid);
      acc += remainingForGoal;
      return { name: p.name, threshold: acc };
    });
  }, [activePhases]);

  // Build month-by-month savings projection (24 months out)
  const projectionData = useMemo(() => {
    const months = 24;
    const data: Record<string, number | string>[] = [];
    const startBal = available;
    for (let i = 0; i <= months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      const point: Record<string, number | string> = {
        month: label,
        ahorro: Math.max(0, startBal + estimatedMonthlySavings * i),
      };
      // Add each goal threshold as a flat horizontal line
      cumulativeGoals.forEach((g, idx) => {
        point[`meta_${idx}`] = g.threshold;
      });
      data.push(point);
    }
    return data;
  }, [available, estimatedMonthlySavings, cumulativeGoals]);

  // Distinct color palette for goal lines
  const GOAL_COLORS = ['#22d3ee', '#fbbf24', '#f87171', '#34d399', '#fb923c', '#f472b6'];

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
        <h3 className="text-sm font-semibold text-th-text mb-4">Proyeccion de ahorro vs metas</h3>
        {cumulativeGoals.length === 0 ? (
          <EmptyChart message="Sin metas activas" sub="Activa al menos una meta para ver la proyeccion" />
        ) : (
          <div className={hasAdvancedCharts ? '' : 'blur-sm pointer-events-none select-none'}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={projectionData} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} width={45} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#f1f5f9' }} />
                <Line
                  type="monotone"
                  dataKey="ahorro"
                  name="Tu ahorro"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={false}
                  animationDuration={1500}
                />
                {cumulativeGoals.map((g, idx) => (
                  <Line
                    key={g.name}
                    type="monotone"
                    dataKey={`meta_${idx}`}
                    name={g.name}
                    stroke={GOAL_COLORS[idx % GOAL_COLORS.length]}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    animationDuration={1200}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="text-xs text-th-muted mt-3 space-y-1">
              {cumulativeGoals.map((g, idx) => {
                if (estimatedMonthlySavings <= 0) {
                  return (
                    <div key={g.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GOAL_COLORS[idx % GOAL_COLORS.length] }} />
                      <span>{g.name}: sin ahorro mensual no se puede estimar</span>
                    </div>
                  );
                }
                const monthsToReach = Math.max(0, Math.ceil((g.threshold - available) / estimatedMonthlySavings));
                const date = new Date();
                date.setMonth(date.getMonth() + monthsToReach);
                const dateLabel = monthsToReach === 0
                  ? 'ya alcanzado'
                  : date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                return (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GOAL_COLORS[idx % GOAL_COLORS.length] }} />
                    <span>{g.name}: {dateLabel} ({formatCurrency(g.threshold)})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {cumulativeGoals.length > 0 && !hasAdvancedCharts && (
          <button onClick={() => paywall.open('Graficos avanzados')}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-th-card/60">
            <Lock size={24} className="text-accent-purple" />
            <span className="text-sm font-medium text-th-text">Desbloquear con PRO</span>
          </button>
        )}
      </motion.div>

      {/* When many categories, stack vertically so the donut keeps its circular shape */}
      <motion.div
        className={
          pieData.length > 10
            ? 'flex flex-col gap-4 md:gap-6'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6'
        }
        variants={staggerContainer}
      >
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow">
          <h3 className="text-sm font-semibold text-th-text mb-4">
            Gastos por categoria {isGlobal ? '(acumulado)' : ''}
          </h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 35)}>
              <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={120} interval={0} tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + '…' : v} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" name="Gasto" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Sin gastos en este periodo" sub="Anade gastos para ver el desglose" />}
        </motion.div>

        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow flex flex-col">
          <h3 className="text-sm font-semibold text-th-text mb-4">
            Distribucion {isGlobal ? '(acumulado)' : ''}
          </h3>
          {pieData.length > 0 ? (
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={1200}
                      stroke="none"
                    >
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom legend — pegada al donut, sin gap excesivo */}
              <div className={`grid ${pieData.length > 10 ? 'grid-cols-3 md:grid-cols-4' : 'grid-cols-2'} gap-x-4 gap-y-1 max-h-32 overflow-y-auto pr-1`}>
                {pieData.map((d) => {
                  const total = pieData.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? (d.value / total) * 100 : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-[11px] min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-th-secondary truncate flex-1">{d.name}</span>
                      <span className="font-mono text-th-text flex-shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
                <Legend wrapperStyle={{ fontSize: '11px', color: '#f1f5f9' }} />
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
