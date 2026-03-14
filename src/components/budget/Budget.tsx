import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, getCurrentMonth } from '../../utils/format';
import { getCategoryExpenses } from '../../utils/calculations';
import { staggerContainer, fadeUp, collapseVariants } from '../../utils/animations';

export function Budget() {
  const { budgets, updateBudget, addBudget, deleteBudget, expenses, settings } = useStore();
  const currentMonth = getCurrentMonth(settings.payDay, settings.cycleMode);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce(
    (s, b) => s + getCategoryExpenses(expenses, currentMonth, b.category, settings.payDay, settings.cycleMode), 0
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || !newLimit) return;
    if (budgets.some((b) => b.category === newCategory.trim())) return;
    addBudget({ category: newCategory.trim(), limit: parseFloat(newLimit) });
    setNewCategory(''); setNewLimit(''); setShowAdd(false);
  };

  const summaryRef = useRef(null);
  const summaryInView = useInView(summaryRef, { once: true, margin: '-50px' });

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Presupuestos</h2>
          <p className="text-sm text-th-muted mt-1">Control de gasto por categoria</p>
        </div>
        <motion.button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-amber/15 text-accent-amber rounded-xl text-sm font-medium hover:bg-accent-amber/25 transition-colors"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Nueva categoria">
          <motion.div animate={{ rotate: showAdd ? 45 : 0 }} transition={{ duration: 0.2 }}><Plus size={16} aria-hidden="true" /></motion.div>
          <span className="hidden sm:inline">Nueva categoria</span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <motion.form onSubmit={handleAdd}
            className="bg-th-card rounded-xl p-5 border border-th-border flex flex-col sm:flex-row items-stretch sm:items-end gap-3 overflow-hidden"
            variants={collapseVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex-1">
              <label htmlFor="bud-cat" className="block text-xs text-th-muted mb-1.5">Categoria</label>
              <input id="bud-cat" type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nombre"
                className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-amber focus:outline-none transition-colors" />
            </div>
            <div className="w-full sm:w-32">
              <label htmlFor="bud-limit" className="block text-xs text-th-muted mb-1.5">Limite</label>
              <input id="bud-limit" type="number" step="0.01" min="0" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} placeholder="0"
                className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-amber focus:outline-none transition-colors" />
            </div>
            <motion.button type="submit" className="px-4 py-2 bg-accent-amber text-white rounded-lg text-sm font-medium" whileTap={{ scale: 0.97 }}>Guardar</motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div ref={summaryRef} variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-th-text font-medium">Gasto total vs presupuesto</span>
          <span className="text-sm font-mono">
            <span className={totalSpent > totalBudget ? 'text-accent-red' : 'text-accent-green'}>{formatCurrency(totalSpent)}</span>
            <span className="text-th-muted"> / {formatCurrency(totalBudget)}</span>
          </span>
        </div>
        <div className="w-full h-3 bg-th-hover rounded-full overflow-hidden" role="progressbar"
          aria-valuenow={Math.round(totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className={`h-full rounded-full progress-shimmer ${
            totalBudget > 0 && totalSpent / totalBudget > 1 ? 'bg-accent-red' :
            totalBudget > 0 && totalSpent / totalBudget > 0.8 ? 'bg-accent-amber' : 'bg-accent-green'
          }`} initial={{ width: 0 }}
            animate={summaryInView ? { width: `${Math.min(100, totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%` } : { width: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
        </div>
      </motion.div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {budgets.map((budget, index) => (
            <BudgetItem key={budget.category} budget={budget} index={index} expenses={expenses}
              currentMonth={currentMonth} updateBudget={updateBudget} deleteBudget={deleteBudget} settings={settings} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function BudgetItem({ budget, index, expenses, currentMonth, updateBudget, deleteBudget, settings }: {
  budget: { category: string; limit: number }; index: number; expenses: any[]; currentMonth: string;
  updateBudget: (cat: string, limit: number) => void; deleteBudget: (cat: string) => void; settings: any;
}) {
  const spent = getCategoryExpenses(expenses, currentMonth, budget.category, settings.payDay, settings.cycleMode);
  const pct = budget.limit > 0 ? spent / budget.limit : spent > 0 ? 1 : 0;
  const isOver = pct >= 1;
  const isWarning = pct >= 0.8 && !isOver;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div ref={ref}
      className={`bg-th-card rounded-xl p-4 md:p-5 border transition-colors ${
        isOver ? 'border-accent-red/30 card-glow-red' : isWarning ? 'border-accent-amber/30 card-glow-amber' : 'border-th-border card-glow'
      }`}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      layout whileHover={{ y: -2 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-th-text">{budget.category}</span>
          <AnimatePresence>
            {isOver && (
              <motion.span className="flex items-center gap-1 text-xs text-accent-red bg-accent-red/10 px-2 py-0.5 rounded"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <AlertTriangle size={12} aria-hidden="true" /> Excedido
              </motion.span>
            )}
            {isWarning && (
              <motion.span className="flex items-center gap-1 text-xs text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <AlertTriangle size={12} aria-hidden="true" /> Cerca
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">
            <span className={isOver ? 'text-accent-red' : isWarning ? 'text-accent-amber' : 'text-th-text'}>{formatCurrency(spent)}</span>
            <span className="text-th-muted"> / </span>
            <input type="number" step="1" min="0" value={budget.limit}
              onChange={(e) => updateBudget(budget.category, parseFloat(e.target.value) || 0)}
              className="w-16 md:w-20 bg-transparent border-b border-th-border-strong text-right text-sm text-th-secondary font-mono focus:border-accent-amber focus:text-th-text focus:outline-none transition-colors"
              aria-label={`Limite para ${budget.category}`} />
          </span>
          <motion.button onClick={() => deleteBudget(budget.category)}
            className="p-1.5 text-th-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-label={`Eliminar ${budget.category}`}>
            <Trash2 size={14} />
          </motion.button>
        </div>
      </div>
      <div className="w-full h-2 bg-th-hover rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full progress-shimmer ${isOver ? 'bg-accent-red' : isWarning ? 'bg-accent-amber' : 'bg-accent-green'}`}
          initial={{ width: 0 }} animate={isInView ? { width: `${Math.min(100, pct * 100)}%` } : { width: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 + index * 0.05 }} />
      </div>
      {budget.limit > 0 && (
        <div className="flex justify-between mt-2 text-xs text-th-muted">
          <span>{Math.round(pct * 100)}% usado</span>
          <span>{isOver ? `${formatCurrency(spent - budget.limit)} excedido` : `${formatCurrency(budget.limit - spent)} restante`}</span>
        </div>
      )}
    </motion.div>
  );
}
