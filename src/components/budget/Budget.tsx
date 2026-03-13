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
    (s, b) => s + getCategoryExpenses(expenses, currentMonth, b.category, settings.payDay, settings.cycleMode),
    0
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || !newLimit) return;
    if (budgets.some((b) => b.category === newCategory.trim())) return;
    addBudget({ category: newCategory.trim(), limit: parseFloat(newLimit) });
    setNewCategory('');
    setNewLimit('');
    setShowAdd(false);
  };

  const summaryRef = useRef(null);
  const summaryInView = useInView(summaryRef, { once: true, margin: '-50px' });

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Presupuestos</h2>
          <p className="text-sm text-gray-500 mt-1">Control de gasto por categoria</p>
        </div>
        <motion.button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-amber/15 text-accent-amber rounded-xl text-sm font-medium hover:bg-accent-amber/25 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div animate={{ rotate: showAdd ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={16} />
          </motion.div>
          Nueva categoria
        </motion.button>
      </motion.div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            onSubmit={handleAdd}
            className="bg-surface rounded-xl p-5 border border-white/5 flex items-end gap-4 overflow-hidden"
            variants={collapseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1.5">Categoria</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nombre de la categoria"
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-amber focus:outline-none transition-colors"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-gray-500 mb-1.5">Limite mensual</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-accent-amber focus:outline-none transition-colors"
              />
            </div>
            <motion.button
              type="submit"
              className="px-4 py-2 bg-accent-amber text-surface-dark rounded-lg text-sm font-medium hover:bg-accent-amber/80 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Guardar
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Summary Bar */}
      <motion.div
        ref={summaryRef}
        variants={fadeUp}
        className="bg-surface rounded-xl p-5 border border-white/5 card-glow"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white font-medium">Gasto total vs presupuesto</span>
          <span className="text-sm font-mono">
            <span className={totalSpent > totalBudget ? 'text-accent-red' : 'text-accent-green'}>
              {formatCurrency(totalSpent)}
            </span>
            <span className="text-gray-500"> / {formatCurrency(totalBudget)}</span>
          </span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full progress-shimmer ${
              totalBudget > 0 && totalSpent / totalBudget > 1
                ? 'bg-accent-red'
                : totalBudget > 0 && totalSpent / totalBudget > 0.8
                  ? 'bg-accent-amber'
                  : 'bg-accent-green'
            }`}
            initial={{ width: 0 }}
            animate={summaryInView ? {
              width: `${Math.min(100, totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%`
            } : { width: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </div>
      </motion.div>

      {/* Budget Items */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {budgets.map((budget, index) => (
            <BudgetItem
              key={budget.category}
              budget={budget}
              index={index}
              expenses={expenses}
              currentMonth={currentMonth}
              updateBudget={updateBudget}
              deleteBudget={deleteBudget}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function BudgetItem({
  budget,
  index,
  expenses,
  currentMonth,
  updateBudget,
  deleteBudget,
}: {
  budget: { category: string; limit: number };
  index: number;
  expenses: any[];
  currentMonth: string;
  updateBudget: (cat: string, limit: number) => void;
  deleteBudget: (cat: string) => void;
}) {
  const spent = getCategoryExpenses(expenses, currentMonth, budget.category);
  const pct = budget.limit > 0 ? spent / budget.limit : spent > 0 ? 1 : 0;
  const isOver = pct >= 1;
  const isWarning = pct >= 0.8 && !isOver;

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      className={`bg-surface rounded-xl p-5 border transition-colors ${
        isOver
          ? 'border-accent-red/30 card-glow-red'
          : isWarning
            ? 'border-accent-amber/30 card-glow-amber'
            : 'border-white/5 card-glow'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      layout
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{budget.category}</span>
          <AnimatePresence>
            {isOver && (
              <motion.span
                className="flex items-center gap-1 text-xs text-accent-red bg-accent-red/10 px-2 py-0.5 rounded"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 2 }}
                >
                  <AlertTriangle size={12} />
                </motion.div>
                Excedido
              </motion.span>
            )}
            {isWarning && (
              <motion.span
                className="flex items-center gap-1 text-xs text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <AlertTriangle size={12} />
                Cerca del limite
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono">
            <span className={isOver ? 'text-accent-red' : isWarning ? 'text-accent-amber' : 'text-white'}>
              {formatCurrency(spent)}
            </span>
            <span className="text-gray-500"> / </span>
            <input
              type="number"
              step="1"
              min="0"
              value={budget.limit}
              onChange={(e) => updateBudget(budget.category, parseFloat(e.target.value) || 0)}
              className="w-20 bg-transparent border-b border-white/10 text-right text-sm text-gray-400 font-mono focus:border-accent-amber focus:text-white focus:outline-none transition-colors"
            />
            <span className="text-gray-500 text-xs ml-0.5">EUR</span>
          </span>
          <motion.button
            onClick={() => deleteBudget(budget.category)}
            className="p-1.5 text-gray-500 hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
          >
            <Trash2 size={14} />
          </motion.button>
        </div>
      </div>

      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full progress-shimmer ${
            isOver ? 'bg-accent-red' : isWarning ? 'bg-accent-amber' : 'bg-accent-green'
          }`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${Math.min(100, pct * 100)}%` } : { width: 0 }}
          transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.15 + index * 0.05,
          }}
        />
      </div>

      {budget.limit > 0 && (
        <motion.div
          className="flex justify-between mt-2 text-xs text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + index * 0.05 }}
        >
          <span>{Math.round(pct * 100)}% usado</span>
          <span>
            {isOver
              ? `${formatCurrency(spent - budget.limit)} excedido`
              : `${formatCurrency(budget.limit - spent)} restante`}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
