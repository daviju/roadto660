import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate, todayISO, getCurrentMonth } from '../../utils/format';
import { getMonthIncome, getMonthTotalIncome } from '../../utils/calculations';
import { staggerContainer, fadeUp, listItem, collapseVariants } from '../../utils/animations';

export function Income() {
  const { incomes, addIncome, updateIncome, deleteIncome, settings } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth(settings.payDay, settings.cycleMode));

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState(settings.incomeConcepts[0]);
  const [description, setDescription] = useState('');

  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editConcept, setEditConcept] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    addIncome({ date, amount: parseFloat(amount), concept, description });
    setAmount(''); setDescription(''); setShowForm(false);
  };

  const startEdit = (id: string) => {
    const income = incomes.find((i) => i.id === id);
    if (!income) return;
    setEditingId(id); setEditDate(income.date); setEditAmount(income.amount.toString());
    setEditConcept(income.concept); setEditDescription(income.description);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateIncome(editingId, { date: editDate, amount: parseFloat(editAmount), concept: editConcept, description: editDescription });
    setEditingId(null);
  };

  const monthIncomes = getMonthIncome(incomes, filterMonth, settings.payDay, settings.cycleMode);
  const totalMonth = getMonthTotalIncome(incomes, filterMonth, settings.payDay, settings.cycleMode);
  const months = [...new Set(incomes.map((i) => i.date.substring(0, 7)))].sort().reverse();
  if (!months.includes(filterMonth)) months.unshift(filterMonth);

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Ingresos</h2>
          <p className="text-sm text-th-muted mt-1">Registro de ingresos mensuales</p>
        </div>
        <motion.button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-green/15 text-accent-green rounded-xl text-sm font-medium hover:bg-accent-green/25 transition-colors"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Nuevo ingreso">
          <motion.div animate={{ rotate: showForm ? 45 : 0 }} transition={{ duration: 0.2 }}><Plus size={16} aria-hidden="true" /></motion.div>
          <span className="hidden sm:inline">Nuevo ingreso</span>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form onSubmit={handleSubmit} className="bg-th-card rounded-xl p-5 border border-th-border space-y-4 overflow-hidden"
            variants={collapseVariants} initial="initial" animate="animate" exit="exit">
            <h3 className="text-sm font-semibold text-th-text">Registrar ingreso</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="inc-date" className="block text-xs text-th-muted mb-1.5">Fecha del movimiento</label>
                <input id="inc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-green focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="inc-amount" className="block text-xs text-th-muted mb-1.5">Importe</label>
                <input id="inc-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-green focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="inc-concept" className="block text-xs text-th-muted mb-1.5">Concepto</label>
                <select id="inc-concept" value={concept} onChange={(e) => setConcept(e.target.value)}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-green focus:outline-none transition-colors">
                  {settings.incomeConcepts.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="inc-desc" className="block text-xs text-th-muted mb-1.5">Descripcion</label>
                <input id="inc-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion opcional"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-green focus:outline-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <motion.button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors" whileTap={{ scale: 0.95 }}>Cancelar</motion.button>
              <motion.button type="submit" className="px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:bg-accent-green/80 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Guardar</motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4" variants={staggerContainer}>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow-green" whileHover={{ y: -2 }}>
          <p className="text-xs text-th-muted uppercase tracking-wider mb-1">Total mes</p>
          <p className="font-mono text-2xl font-bold text-accent-green">{formatCurrency(totalMonth)}</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <p className="text-xs text-th-muted uppercase tracking-wider mb-1">Ingresos esperados</p>
          <p className="font-mono text-2xl font-bold text-th-text">{formatCurrency(settings.monthlyIncome + settings.cashbackNet)}</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-th-border card-glow" whileHover={{ y: -2 }}>
          <p className="text-xs text-th-muted uppercase tracking-wider mb-1">Registros este mes</p>
          <p className="font-mono text-2xl font-bold text-th-text">{monthIncomes.length}</p>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filtrar por mes"
          className="bg-th-card border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-green focus:outline-none transition-colors">
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </motion.div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {monthIncomes.length === 0 ? (
            <motion.div key="empty" className="bg-th-card rounded-xl p-8 border border-th-border text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-th-muted text-sm">No hay ingresos registrados este mes</p>
            </motion.div>
          ) : (
            monthIncomes.sort((a, b) => b.date.localeCompare(a.date)).map((income) => (
              <motion.div key={income.id} className="bg-th-card rounded-xl p-3 md:p-4 border border-th-border card-glow-green"
                variants={listItem} initial="initial" animate="animate" exit="exit" layout>
                {editingId === income.id ? (
                  <motion.div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3 items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:outline-none" />
                    <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text font-mono focus:outline-none" />
                    <select value={editConcept} onChange={(e) => setEditConcept(e.target.value)} className="bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:outline-none">
                      {settings.incomeConcepts.map((c) => <option key={c} value={c}>{c}</option>)}
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
                      <span className="text-xs text-th-muted font-mono w-20 hidden sm:block">{formatDate(income.date)}</span>
                      <span className="text-[10px] sm:text-xs bg-accent-green/10 px-2 py-0.5 rounded text-accent-green flex-shrink-0">{income.concept}</span>
                      <span className="text-sm text-th-secondary truncate">{income.description || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      <span className="font-mono text-sm font-medium text-accent-green">+{formatCurrency(income.amount)}</span>
                      <motion.button onClick={() => startEdit(income.id)} className="p-1.5 text-th-muted hover:text-th-text hover:bg-th-hover rounded-lg transition-colors"
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-label="Editar ingreso"><Edit3 size={14} /></motion.button>
                      <motion.button onClick={() => deleteIncome(income.id)} className="p-1.5 text-th-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-label="Eliminar ingreso"><Trash2 size={14} /></motion.button>
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
