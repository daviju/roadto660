import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, TrendingUp, Lightbulb, Zap, Target, ShieldAlert, Coins } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { formatCurrency, getCurrentMonth } from '../../utils/format';
import {
  getMonthTotalExpenses,
  getMonthTotalIncome,
  getExpensesByCategory,
  getCategoryExpenses,
  getAvailableBalance,
  getTotalObjective,
  getTotalPaid,
  getRequiredMonthlySavings,
  getMonthExpenses,
} from '../../utils/calculations';
import { staggerContainer, fadeUp } from '../../utils/animations';

interface Tip {
  type: 'danger' | 'warning' | 'info' | 'success';
  icon: React.ReactNode;
  title: string;
  message: string;
}

export function Advice() {
  const { expenses, incomes, budgets, settings, phases } = useAppData();
  const currentMonth = getCurrentMonth(settings.payDay, settings.cycleMode);

  const tips = useMemo((): Tip[] => {
    const result: Tip[] = [];
    const totalMonthlyIncome = settings.monthlyIncome + settings.cashbackNet;
    const monthExpenses = getMonthTotalExpenses(expenses, currentMonth, settings.payDay, settings.cycleMode);
    const monthIncome = getMonthTotalIncome(incomes, currentMonth, settings.payDay, settings.cycleMode);
    const estimatedSavings = totalMonthlyIncome - (monthExpenses > 0 ? monthExpenses : 0);
    const available = getAvailableBalance(settings.currentBalance, settings.emergencyFund);
    const totalObjective = getTotalObjective(phases);
    const totalPaid = getTotalPaid(phases);
    const requiredMonthly = getRequiredMonthlySavings(totalObjective, totalPaid, available, settings.targetDate);

    // 1. Over-budget categories
    for (const budget of budgets) {
      const spent = getCategoryExpenses(expenses, currentMonth, budget.category, settings.payDay, settings.cycleMode);
      if (budget.limit > 0 && spent > budget.limit) {
        const excess = spent - budget.limit;
        result.push({
          type: 'danger',
          icon: <AlertTriangle size={18} aria-hidden="true" />,
          title: `${budget.category}: presupuesto excedido`,
          message: `Has gastado ${formatCurrency(spent)} de ${formatCurrency(budget.limit)} (${formatCurrency(excess)} por encima). Intenta reducir este gasto el resto del mes.`,
        });
      }
    }

    // 2. Risk warnings (>80%)
    for (const budget of budgets) {
      const spent = getCategoryExpenses(expenses, currentMonth, budget.category, settings.payDay, settings.cycleMode);
      const pct = budget.limit > 0 ? spent / budget.limit : 0;
      if (pct >= 0.8 && pct < 1) {
        result.push({
          type: 'warning',
          icon: <ShieldAlert size={18} aria-hidden="true" />,
          title: `${budget.category}: cerca del limite`,
          message: `Llevas ${formatCurrency(spent)} de ${formatCurrency(budget.limit)} (${Math.round(pct * 100)}%). Te quedan ${formatCurrency(budget.limit - spent)}.`,
        });
      }
    }

    // 3. Savings pace analysis
    if (monthExpenses > 0) {
      if (estimatedSavings >= requiredMonthly && requiredMonthly > 0) {
        result.push({
          type: 'success',
          icon: <Target size={18} aria-hidden="true" />,
          title: 'Vas por buen camino',
          message: `Tu ritmo de ahorro (${formatCurrency(estimatedSavings)}/mes) supera lo necesario (${formatCurrency(requiredMonthly)}/mes). Sigue asi!`,
        });
      } else if (requiredMonthly > 0 && estimatedSavings < requiredMonthly) {
        const deficit = requiredMonthly - estimatedSavings;
        result.push({
          type: 'danger',
          icon: <TrendingDown size={18} aria-hidden="true" />,
          title: 'Ritmo de ahorro insuficiente',
          message: `Necesitas ${formatCurrency(requiredMonthly)}/mes pero tu ritmo actual es ${formatCurrency(estimatedSavings)}/mes. Te faltan ${formatCurrency(deficit)}/mes. Revisa tus gastos.`,
        });
      }
    }

    // 4. Previous month comparison
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthExpenses = getMonthTotalExpenses(expenses, prevMonth, settings.payDay, settings.cycleMode);

    if (prevMonthExpenses > 0 && monthExpenses > 0) {
      const diff = monthExpenses - prevMonthExpenses;
      const pctChange = (diff / prevMonthExpenses) * 100;
      if (diff > 0 && pctChange > 10) {
        result.push({
          type: 'warning',
          icon: <TrendingUp size={18} aria-hidden="true" />,
          title: 'Gastos al alza',
          message: `Este mes llevas ${formatCurrency(monthExpenses)}, un ${Math.round(pctChange)}% mas que el mes anterior (${formatCurrency(prevMonthExpenses)}). Revisa en que categorias has gastado mas.`,
        });
      } else if (diff < 0 && Math.abs(pctChange) > 10) {
        result.push({
          type: 'success',
          icon: <TrendingDown size={18} aria-hidden="true" />,
          title: 'Buen control de gastos',
          message: `Este mes llevas ${formatCurrency(monthExpenses)}, un ${Math.round(Math.abs(pctChange))}% menos que el anterior (${formatCurrency(prevMonthExpenses)}). Sigue asi!`,
        });
      }
    }

    // 5. Category trends vs previous month
    const currentByCategory = getExpensesByCategory(expenses, currentMonth, settings.payDay, settings.cycleMode);
    const prevByCategory = getExpensesByCategory(expenses, prevMonth, settings.payDay, settings.cycleMode);
    for (const [cat, currentSpent] of Object.entries(currentByCategory)) {
      const prev = prevByCategory[cat] || 0;
      if (prev > 0 && currentSpent > prev * 1.5 && currentSpent - prev > 20) {
        result.push({
          type: 'info',
          icon: <Lightbulb size={18} aria-hidden="true" />,
          title: `${cat}: aumento significativo`,
          message: `${formatCurrency(currentSpent)} este mes vs ${formatCurrency(prev)} el anterior (+${Math.round(((currentSpent - prev) / prev) * 100)}%). Merece la pena revisarlo.`,
        });
      }
    }

    // 6. Small expenses tracking (<5€)
    const monthExp = getMonthExpenses(expenses, currentMonth, settings.payDay, settings.cycleMode);
    const smallExpenses = monthExp.filter((e) => e.amount < 5);
    const smallTotal = smallExpenses.reduce((s, e) => s + e.amount, 0);
    if (smallExpenses.length >= 5 && smallTotal > 15) {
      result.push({
        type: 'info',
        icon: <Coins size={18} aria-hidden="true" />,
        title: 'Gastos hormiga',
        message: `Tienes ${smallExpenses.length} compras menores de 5€ que suman ${formatCurrency(smallTotal)} este mes. Esos pequenos gastos se acumulan.`,
      });
    }

    // 7. High expense ratio
    if (totalMonthlyIncome > 0 && monthExpenses > 0) {
      const ratio = monthExpenses / totalMonthlyIncome;
      if (ratio > 0.9) {
        result.push({
          type: 'danger',
          icon: <Zap size={18} aria-hidden="true" />,
          title: 'Gastos casi igualan ingresos',
          message: `Tus gastos (${formatCurrency(monthExpenses)}) representan el ${Math.round(ratio * 100)}% de tus ingresos. Margen de ahorro muy bajo.`,
        });
      }
    }

    // 8. No income registered
    if (monthIncome === 0) {
      result.push({
        type: 'info',
        icon: <Lightbulb size={18} aria-hidden="true" />,
        title: 'Sin ingresos registrados',
        message: 'No has registrado ingresos este mes. Registra tu nomina y otros ingresos para un analisis mas preciso.',
      });
    }

    // 9. Emergency fund
    if (settings.emergencyFund > settings.currentBalance) {
      result.push({
        type: 'danger',
        icon: <ShieldAlert size={18} aria-hidden="true" />,
        title: 'Colchon de emergencia en riesgo',
        message: `Tu saldo actual (${formatCurrency(settings.currentBalance)}) es menor que tu colchon de emergencia (${formatCurrency(settings.emergencyFund)}). No tienes margen de ahorro disponible.`,
      });
    }

    // If no tips, add a generic success
    if (result.length === 0) {
      result.push({
        type: 'success',
        icon: <Target size={18} aria-hidden="true" />,
        title: 'Todo en orden',
        message: 'No hay alertas por ahora. Sigue registrando tus gastos e ingresos para obtener consejos personalizados.',
      });
    }

    return result;
  }, [expenses, incomes, budgets, settings, phases, currentMonth]);

  const typeStyles = {
    danger: 'border-accent-red/20 bg-accent-red/5',
    warning: 'border-accent-amber/20 bg-accent-amber/5',
    info: 'border-accent-cyan/20 bg-accent-cyan/5',
    success: 'border-accent-green/20 bg-accent-green/5',
  };

  const iconStyles = {
    danger: 'text-accent-red bg-accent-red/15',
    warning: 'text-accent-amber bg-accent-amber/15',
    info: 'text-accent-cyan bg-accent-cyan/15',
    success: 'text-accent-green bg-accent-green/15',
  };

  const dangerTips = tips.filter((t) => t.type === 'danger');
  const warningTips = tips.filter((t) => t.type === 'warning');
  const infoTips = tips.filter((t) => t.type === 'info');
  const successTips = tips.filter((t) => t.type === 'success');
  const sortedTips = [...dangerTips, ...warningTips, ...infoTips, ...successTips];

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-th-text">Consejos</h2>
        <p className="text-sm text-th-muted mt-1">Analisis automatico de tus finanzas</p>
      </motion.div>

      {/* Summary badges */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {dangerTips.length > 0 && (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-accent-red/10 text-accent-red font-medium">
            {dangerTips.length} alerta{dangerTips.length > 1 ? 's' : ''}
          </span>
        )}
        {warningTips.length > 0 && (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-accent-amber/10 text-accent-amber font-medium">
            {warningTips.length} aviso{warningTips.length > 1 ? 's' : ''}
          </span>
        )}
        {infoTips.length > 0 && (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan font-medium">
            {infoTips.length} sugerencia{infoTips.length > 1 ? 's' : ''}
          </span>
        )}
        {successTips.length > 0 && (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green font-medium">
            {successTips.length} positivo{successTips.length > 1 ? 's' : ''}
          </span>
        )}
      </motion.div>

      {/* Tips */}
      <div className="space-y-3">
        {sortedTips.map((tip, i) => (
          <motion.div
            key={`${tip.type}-${i}`}
            className={`rounded-xl p-4 md:p-5 border ${typeStyles[tip.type]}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex gap-3 md:gap-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconStyles[tip.type]}`}>
                {tip.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-th-text">{tip.title}</h3>
                <p className="text-xs sm:text-sm text-th-secondary mt-1 leading-relaxed">{tip.message}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p variants={fadeUp} className="text-xs text-th-muted text-center">
        Los consejos se actualizan automaticamente con tus datos
      </motion.p>
    </motion.div>
  );
}
