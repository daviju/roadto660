import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency, getCurrentMonth, formatMonth } from '../../utils/format';
import {
  getAvailableBalance,
  getTotalObjective,
  getTotalPaid,
  getExpensesByCategory,
  getMonthTotalExpenses,
  getMonthTotalIncome,
  projectSavingsTimeline,
} from '../../utils/calculations';
import { staggerContainer, fadeUp } from '../../utils/animations';

const COLORS = [
  '#a78bfa', '#34d399', '#fb923c', '#f87171', '#fbbf24',
  '#22d3ee', '#818cf8', '#f472b6', '#a3e635', '#94a3b8',
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#181b23',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#fff',
  },
  labelStyle: { color: '#9ca3af' },
};

export function Charts() {
  const { settings, phases, expenses, incomes } = useStore();
  const currentMonth = getCurrentMonth(settings.payDay, settings.cycleMode);

  const totalObjective = getTotalObjective(phases);
  const totalPaid = getTotalPaid(phases);
  const available = getAvailableBalance(settings.currentBalance, settings.emergencyFund);
  const totalMonthlyIncome = settings.monthlyIncome + settings.cashbackNet;

  const byCategory = getExpensesByCategory(expenses, currentMonth, settings.payDay, settings.cycleMode);
  const pieData = useMemo(
    () =>
      Object.entries(byCategory)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    [byCategory]
  );
  const barData = useMemo(() => pieData.map((d) => ({ ...d })), [pieData]);

  const monthlyData = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.map((m) => {
      const exp = getMonthTotalExpenses(expenses, m, settings.payDay, settings.cycleMode);
      const inc = getMonthTotalIncome(incomes, m, settings.payDay, settings.cycleMode);
      return {
        month: formatMonth(m + '-01'),
        ingresos: inc,
        gastos: exp,
        ahorro: inc - exp,
      };
    });
  }, [expenses, incomes]);

  const currentMonthExpenses = getMonthTotalExpenses(expenses, currentMonth, settings.payDay, settings.cycleMode);
  const estimatedMonthlySavings = totalMonthlyIncome - (currentMonthExpenses > 0 ? currentMonthExpenses : 507);
  const projectionData = useMemo(
    () =>
      projectSavingsTimeline(
        settings.currentBalance,
        settings.emergencyFund,
        estimatedMonthlySavings,
        totalObjective,
        totalPaid,
        settings.targetDate
      ).map((p) => ({
        ...p,
        month: formatMonth(p.month + '-01'),
        objetivo: totalObjective - totalPaid,
      })),
    [settings, totalObjective, totalPaid, estimatedMonthlySavings]
  );

  const requiredMonthly = (() => {
    const remaining = totalObjective - totalPaid - available;
    if (remaining <= 0) return 0;
    const now = new Date();
    const target = new Date(settings.targetDate);
    const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
    return remaining / months;
  })();

  const paceData = [
    { name: 'Ritmo actual', value: estimatedMonthlySavings, fill: estimatedMonthlySavings >= requiredMonthly ? '#34d399' : '#f87171' },
    { name: 'Ritmo necesario', value: requiredMonthly, fill: '#fbbf24' },
  ];

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-white">Graficos</h2>
        <p className="text-sm text-gray-500 mt-1">Analisis visual de tus finanzas</p>
      </motion.div>

      {/* Projection Chart */}
      <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow">
        <h3 className="text-sm font-semibold text-white mb-4">Proyeccion de ahorro vs objetivo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="projected" name="Proyectado" stroke="#a78bfa" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-out" />
            <Line type="monotone" dataKey="required" name="Necesario" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={1500} animationEasing="ease-out" />
            <Line type="monotone" dataKey="objetivo" name="Objetivo total" stroke="#f87171" strokeWidth={1} strokeDasharray="3 3" dot={false} animationDuration={1500} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
        <motion.p
          className="text-xs text-gray-500 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          A tu ritmo actual ({formatCurrency(estimatedMonthlySavings)}/mes),{' '}
          {estimatedMonthlySavings >= requiredMonthly
            ? 'llegaras a tiempo al objetivo.'
            : `necesitas ahorrar ${formatCurrency(requiredMonthly)}/mes para llegar a tiempo.`}
        </motion.p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={staggerContainer}
      >
        {/* Bar Chart */}
        <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow">
          <h3 className="text-sm font-semibold text-white mb-4">Gastos por categoria (este mes)</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${v}EUR`} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={100} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" name="Gasto" radius={[0, 4, 4, 0]} animationDuration={1200} animationEasing="ease-out">
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
              Sin datos este mes
            </div>
          )}
        </motion.div>

        {/* Pie Chart */}
        <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow">
          <h3 className="text-sm font-semibold text-white mb-4">Distribucion de gastos</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
              Sin datos este mes
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Monthly Evolution */}
      <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow">
        <h3 className="text-sm font-semibold text-white mb-4">Evolucion mensual</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${v}EUR`} />
            <Tooltip {...tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#34d399" radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out" />
            <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pace Comparison */}
      <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow">
        <h3 className="text-sm font-semibold text-white mb-4">Ritmo actual vs necesario</h3>
        <div className="grid grid-cols-2 gap-4">
          {paceData.map((d, i) => (
            <motion.div
              key={d.name}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
            >
              <p className="text-xs text-gray-500 mb-2">{d.name}</p>
              <p className="font-mono text-3xl font-bold" style={{ color: d.fill }}>
                {formatCurrency(d.value)}
              </p>
              <p className="text-xs text-gray-500 mt-1">/mes</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {paceData.map((d, i) => (
            <div key={d.name} className="flex-1">
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full progress-shimmer"
                  style={{ backgroundColor: d.fill }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (d.value / Math.max(...paceData.map((p) => p.value), 1)) * 100)}%`,
                  }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.15 }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
