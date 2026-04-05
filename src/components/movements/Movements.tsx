import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Search, Edit3, Trash2, Check, X, ChevronDown, Lock } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { usePlan } from '../../hooks/usePlan';
import { usePaywall } from '../shared/PaywallModal';
import { useToast } from '../shared/Toast';
import { formatCurrency, formatDate, getCurrentMonth } from '../../utils/format';
import { getMonthExpenses, getMonthIncome } from '../../utils/calculations';
import { staggerContainer, fadeUp, listItem } from '../../utils/animations';
import type { Movement } from '../../types';

export function Movements() {
  const { expenses, incomes, settings, updateExpense, deleteExpense, updateIncome, deleteIncome } = useAppData();
  const { maxHistoryMonths } = usePlan();
  const paywall = usePaywall();
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth(settings.payDay, settings.cycleMode));
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const { toast } = useToast();

  // Build month options (limited to maxHistoryMonths for free users)
  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.date.substring(0, 7)));
    incomes.forEach((i) => set.add(i.date.substring(0, 7)));
    set.add(filterMonth);
    const sorted = [...set].sort().reverse();
    if (maxHistoryMonths === Infinity) return sorted;
    return sorted.slice(0, maxHistoryMonths);
  }, [expenses, incomes, filterMonth, maxHistoryMonths]);

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
        createdAt: e.createdAt,
        source: e.source,
        originalConcept: e.originalConcept,
      })),
      ...monthIncomes.map((i) => ({
        id: i.id,
        date: i.date,
        description: i.description || i.concept,
        category: i.concept,
        amount: i.amount,
        type: 'income' as const,
        createdAt: i.createdAt,
        source: i.source,
        originalConcept: i.originalConcept,
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
    if (m.type === 'expense') deleteExpense(m.id);
    else deleteIncome(m.id);
    setExpandedId(null);
    toast.success(`"${m.description}" eliminado`);
  };

  const toggleExpand = (id: string) => {
    if (editingId) return;
    setExpandedId(expandedId === id ? null : id);
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
        {maxHistoryMonths !== Infinity && (
          <button onClick={() => paywall.open('Historial completo')} className="flex items-center gap-1 text-xs text-accent-purple hover:underline">
            <Lock size={10} /> Ver mas meses
          </button>
        )}
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
                  <div>
                    {/* Collapsed row — click to expand */}
                    <button
                      onClick={() => toggleExpand(m.id)}
                      className="w-full flex items-center justify-between gap-2 text-left"
                    >
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
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`font-mono text-sm font-medium ${
                          m.type === 'income' ? 'text-accent-green' : 'text-th-text'
                        }`}>
                          {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                        </span>
                        <motion.div
                          animate={{ rotate: expandedId === m.id ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-th-faint"
                        >
                          <ChevronDown size={14} />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded detail panel */}
                    <AnimatePresence>
                      {expandedId === m.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-th-border space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-th-muted">Categoria:</span>
                                <span className="ml-2 text-th-text">{m.category}</span>
                              </div>
                              <div>
                                <span className="text-th-muted">Fecha:</span>
                                <span className="ml-2 text-th-text font-mono">{formatDate(m.date)}</span>
                              </div>
                              {m.createdAt && (
                                <div>
                                  <span className="text-th-muted">Registrado:</span>
                                  <span className="ml-2 text-th-text font-mono">{formatDate(m.createdAt)}</span>
                                </div>
                              )}
                              {m.source && (
                                <div>
                                  <span className="text-th-muted">Origen:</span>
                                  <span className="ml-2 text-th-text">{m.source === 'excel_import' ? 'Importado de Excel' : 'Manual'}</span>
                                </div>
                              )}
                              {m.originalConcept && m.originalConcept !== m.description && (
                                <div className="col-span-2">
                                  <span className="text-th-muted">Concepto original:</span>
                                  <span className="ml-2 text-th-text">"{m.originalConcept}"</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <motion.button
                                onClick={(e) => { e.stopPropagation(); startEdit(m); setExpandedId(null); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-th-hover text-th-secondary rounded-lg hover:text-th-text transition-colors"
                                whileTap={{ scale: 0.95 }}
                              >
                                <Edit3 size={12} /> Editar
                              </motion.button>
                              <motion.button
                                onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red/10 text-accent-red rounded-lg hover:bg-accent-red/20 transition-colors"
                                whileTap={{ scale: 0.95 }}
                              >
                                <Trash2 size={12} /> Eliminar
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
