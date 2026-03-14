import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Search, Edit3, Trash2, Check, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate, getCurrentMonth } from '../../utils/format';
import { getMonthExpenses, getMonthIncome } from '../../utils/calculations';
import { staggerContainer, fadeUp, listItem } from '../../utils/animations';
import type { Movement } from '../../types';

export function Movements() {
  const { expenses, incomes, settings, updateExpense, deleteExpense, updateIncome, deleteIncome } = useStore();
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth(settings.payDay, settings.cycleMode));
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Build month options
  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.date.substring(0, 7)));
    incomes.forEach((i) => set.add(i.date.substring(0, 7)));
    set.add(filterMonth);
    return [...set].sort().reverse();
  }, [expenses, incomes, filterMonth]);

  // Build unified movements list
  const movements = useMemo((): Movement[] => {
    const monthExpenses = getMonthExpenses(expenses, filterMonth, settings.payDay, settings.cycleMode);
    const monthIncomes = getMonthIncome(incomes, filterMonth, settings.payDay, settings.cycleMode);

    const all: Movement[] = [
      ...monthExpenses.map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        category: e.category,
        amount: e.amount,
        type: 'expense' as const,
      })),
      ...monthIncomes.map((i) => ({
        id: i.id,
        date: i.date,
        description: i.description || i.concept,
        category: i.concept,
        amount: i.amount,
        type: 'income' as const,
      })),
    ];

    return all
      .filter((m) => {
        if (filterType !== 'all' && m.type !== filterType) return false;
        if (filterCategory && m.category !== filterCategory) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          return m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  }, [expenses, incomes, filterMonth, filterType, filterCategory, searchText, settings]);

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    movements.forEach((m) => cats.add(m.category));
    return [...cats].sort();
  }, [movements]);

  // Totals
  const totalIncome = movements.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalExpense = movements.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const balance = totalIncome - totalExpense;

  const startEdit = (m: Movement) => {
    setEditingId(m.id);
    setEditAmount(m.amount.toString());
    setEditDesc(m.description);
  };

  const saveEdit = (m: Movement) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (m.type === 'expense') {
      updateExpense(m.id, { amount, description: editDesc });
    } else {
      updateIncome(m.id, { amount, description: editDesc });
    }
    setEditingId(null);
  };

  const handleDelete = (m: Movement) => {
    if (!confirm(`Eliminar "${m.description}"?`)) return;
    if (m.type === 'expense') deleteExpense(m.id);
    else deleteIncome(m.id);
  };

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-th-text">Movimientos</h2>
        <p className="text-sm text-th-muted mt-1">Vista unificada de gastos e ingresos</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div className="grid grid-cols-3 gap-2 md:gap-4" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-3 md:p-5 border border-th-border card-glow-green" whileHover={{ y: -2 }}>
          <p className="text-[10px] md:text-xs text-th-muted uppercase tracking-wider mb-1">Ingresos</p>
          <p className="font-mono text-base md:text-2xl font-bold text-accent-green">{formatCurrency(totalIncome)}</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-3 md:p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <p className="text-[10px] md:text-xs text-th-muted uppercase tracking-wider mb-1">Gastos</p>
          <p className="font-mono text-base md:text-2xl font-bold text-accent-red">{formatCurrency(totalExpense)}</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-3 md:p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <p className="text-[10px] md:text-xs text-th-muted uppercase tracking-wider mb-1">Balance</p>
          <p className={`font-mono text-base md:text-2xl font-bold ${balance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {formatCurrency(balance)}
          </p>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2 md:gap-3">
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filtrar por mes"
          className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | 'expense' | 'income')} aria-label="Filtrar por tipo"
          className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
          <option value="all">Todos</option>
          <option value="expense">Gastos</option>
          <option value="income">Ingresos</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filtrar por categoria"
          className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
          <option value="">Todas categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative flex-1 min-w-[150px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" aria-hidden="true" />
          <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-th-card border border-th-border-strong rounded-lg pl-8 pr-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors"
            aria-label="Buscar movimientos" />
        </div>
      </motion.div>

      {/* Movements list */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {movements.length === 0 ? (
            <motion.div key="empty" className="bg-th-card rounded-xl p-8 border border-th-border text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-th-muted text-sm">No hay movimientos para este periodo</p>
            </motion.div>
          ) : (
            movements.map((m) => (
              <motion.div
                key={m.id}
                className={`bg-th-card rounded-lg p-2.5 md:p-3 border transition-colors ${
                  m.type === 'income' ? 'border-accent-green/10' : 'border-th-border'
                }`}
                variants={listItem} initial="initial" animate="animate" exit="exit" layout
              >
                {editingId === m.id ? (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                      className="flex-1 bg-th-input border border-th-border-strong rounded px-3 py-1.5 text-sm text-th-text focus:outline-none"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(m); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus />
                    <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full sm:w-28 bg-th-input border border-th-border-strong rounded px-3 py-1.5 text-sm text-th-text font-mono focus:outline-none"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(m); if (e.key === 'Escape') setEditingId(null); }} />
                    <div className="flex gap-1 justify-end">
                      <motion.button onClick={() => saveEdit(m)} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded" whileTap={{ scale: 0.85 }} aria-label="Guardar"><Check size={14} /></motion.button>
                      <motion.button onClick={() => setEditingId(null)} className="p-1.5 text-th-secondary hover:bg-th-hover rounded" whileTap={{ scale: 0.85 }} aria-label="Cancelar"><X size={14} /></motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        m.type === 'income' ? 'bg-accent-green/15' : 'bg-accent-red/15'
                      }`}>
                        {m.type === 'income'
                          ? <ArrowUpRight size={12} className="text-accent-green" aria-hidden="true" />
                          : <ArrowDownRight size={12} className="text-accent-red" aria-hidden="true" />
                        }
                      </div>
                      <span className="text-xs text-th-muted font-mono w-16 hidden sm:block flex-shrink-0">{formatDate(m.date)}</span>
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        m.type === 'income' ? 'bg-accent-green/10 text-accent-green' : 'bg-th-hover text-th-muted'
                      }`}>{m.category}</span>
                      <span className="text-sm text-th-secondary truncate">{m.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                      <span className={`font-mono text-sm font-medium ${
                        m.type === 'income' ? 'text-accent-green' : 'text-th-text'
                      }`}>
                        {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                      </span>
                      <motion.button onClick={() => startEdit(m)}
                        className="p-1 text-th-faint hover:text-th-text hover:bg-th-hover rounded transition-colors"
                        whileTap={{ scale: 0.85 }} aria-label="Editar movimiento">
                        <Edit3 size={13} />
                      </motion.button>
                      <motion.button onClick={() => handleDelete(m)}
                        className="p-1 text-th-faint hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                        whileTap={{ scale: 0.85 }} aria-label="Eliminar movimiento">
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {movements.length > 0 && (
        <motion.p variants={fadeUp} className="text-xs text-th-muted text-center">
          {movements.length} movimiento{movements.length !== 1 ? 's' : ''} encontrado{movements.length !== 1 ? 's' : ''}
        </motion.p>
      )}
    </motion.div>
  );
}
