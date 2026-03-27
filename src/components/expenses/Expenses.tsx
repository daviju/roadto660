import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, Check, Filter } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { formatCurrency, formatDate, todayISO, getCurrentMonth } from '../../utils/format';
import { getMonthExpenses, getExpensesByCategory } from '../../utils/calculations';
import { staggerContainer, fadeUp, listItem, collapseVariants } from '../../utils/animations';

export function Expenses() {
  const { expenses, addExpense, updateExpense, deleteExpense, settings } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth(settings.payDay, settings.cycleMode));

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(settings.categories[0]);
  const [description, setDescription] = useState('');

  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    addExpense({ date, amount: parseFloat(amount), category, description });
    setAmount(''); setDescription(''); setShowForm(false);
  };

  const startEdit = (id: string) => {
    const expense = expenses.find((e) => e.id === id);
    if (!expense) return;
    setEditingId(id);
    setEditDate(expense.date);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditDescription(expense.description);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateExpense(editingId, { date: editDate, amount: parseFloat(editAmount), category: editCategory, description: editDescription });
    setEditingId(null);
  };

  const monthExpenses = getMonthExpenses(expenses, filterMonth, settings.payDay, settings.cycleMode);
  const filtered = filterCategory === 'all' ? monthExpenses : monthExpenses.filter((e) => e.category === filterCategory);
  const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = getExpensesByCategory(expenses, filterMonth, settings.payDay, settings.cycleMode);

  const months = [...new Set(expenses.map((e) => e.date.substring(0, 7)))].sort().reverse();
  if (!months.includes(filterMonth)) months.unshift(filterMonth);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Gastos</h2>
          <p className="text-sm text-th-muted mt-1">Registro y seguimiento de gastos</p>
        </div>
        <motion.button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple/15 text-accent-purple rounded-xl text-sm font-medium hover:bg-accent-purple/25 transition-colors"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Nuevo gasto">
          <motion.div animate={{ rotate: showForm ? 45 : 0 }} transition={{ duration: 0.2 }}><Plus size={16} aria-hidden="true" /></motion.div>
          <span className="hidden sm:inline">Nuevo gasto</span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={handleSubmit} className="bg-th-card rounded-xl p-5 border border-th-border space-y-4 overflow-hidden"
            variants={collapseVariants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-sm font-semibold text-th-text">Registrar gasto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="exp-date" className="block text-xs text-th-muted mb-1.5">Fecha del movimiento</label>
                <input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="exp-amount" className="block text-xs text-th-muted mb-1.5">Importe</label>
                <input id="exp-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="exp-cat" className="block text-xs text-th-muted mb-1.5">Categoria</label>
                <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
                  {settings.categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exp-desc" className="block text-xs text-th-muted mb-1.5">Descripcion</label>
                <input id="exp-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion opcional"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <motion.button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors" whileTap={{ scale: 0.95 }}>Cancelar</motion.button>
              <motion.button type="submit" className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Guardar</motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow-red">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-th-text">Total del mes</h3>
          <p className="font-mono text-xl font-bold text-accent-red">{formatCurrency(totalMonth)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, total], i) => (
            <motion.span key={cat} className="text-xs bg-th-hover px-3 py-1.5 rounded-lg text-th-secondary"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              {cat}: <span className="font-mono text-th-text">{formatCurrency(total)}</span>
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
        <Filter size={14} className="text-th-muted" aria-hidden="true" />
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filtrar por mes"
          className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filtrar por categoria"
          className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
          <option value="all">Todas las categorias</option>
          {settings.categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </motion.div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" className="bg-th-card rounded-xl p-8 border border-th-border text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-th-muted text-sm">No hay gastos registrados este mes</p>
            </motion.div>
          ) : (
            filtered.sort((a, b) => b.date.localeCompare(a.date)).map((expense) => (
              <motion.div key={expense.id} className="bg-th-card rounded-xl p-3 md:p-4 border border-th-border card-glow"
                variants={listItem} initial="initial" animate="animate" exit="exit" layout>
                {editingId === expense.id ? (
                  <motion.div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3 items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:outline-none" />
                    <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text font-mono focus:outline-none" />
                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:outline-none">
                      {settings.categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:outline-none" />
                    <div className="flex gap-1 justify-end">
                      <motion.button onClick={saveEdit} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded-lg" whileTap={{ scale: 0.85 }} aria-label="Guardar"><Check size={16} /></motion.button>
                      <motion.button onClick={() => setEditingId(null)} className="p-1.5 text-th-muted hover:bg-th-hover rounded-lg" whileTap={{ scale: 0.85 }} aria-label="Cancelar"><X size={16} /></motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                      <span className="text-xs text-th-muted font-mono w-20 flex-shrink-0 hidden sm:block">{formatDate(expense.date)}</span>
                      <span className="text-[10px] sm:text-xs bg-th-hover px-2 py-0.5 rounded text-th-secondary flex-shrink-0">{expense.category}</span>
                      <span className="text-sm text-th-secondary truncate">{expense.description || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      <span className="font-mono text-sm font-medium text-accent-red">-{formatCurrency(expense.amount)}</span>
                      <motion.button onClick={() => startEdit(expense.id)} className="p-1.5 text-th-muted hover:text-th-text hover:bg-th-hover rounded-lg transition-colors"
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-label="Editar gasto"><Edit3 size={14} /></motion.button>
                      <motion.button onClick={() => deleteExpense(expense.id)} className="p-1.5 text-th-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-label="Eliminar gasto"><Trash2 size={14} /></motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
