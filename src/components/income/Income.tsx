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
    setAmount('');
    setDescription('');
    setShowForm(false);
  };

  const startEdit = (id: string) => {
    const income = incomes.find((i) => i.id === id);
    if (!income) return;
    setEditingId(id);
    setEditDate(income.date);
    setEditAmount(income.amount.toString());
    setEditConcept(income.concept);
    setEditDescription(income.description);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateIncome(editingId, {
      date: editDate,
      amount: parseFloat(editAmount),
      concept: editConcept,
      description: editDescription,
    });
    setEditingId(null);
  };

  const monthIncomes = getMonthIncome(incomes, filterMonth, settings.payDay, settings.cycleMode);
  const totalMonth = getMonthTotalIncome(incomes, filterMonth, settings.payDay, settings.cycleMode);

  const months = [...new Set(incomes.map((i) => i.date.substring(0, 7)))].sort().reverse();
  if (!months.includes(filterMonth)) months.unshift(filterMonth);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Ingresos</h2>
          <p className="text-sm text-gray-500 mt-1">Registro de ingresos mensuales</p>
        </div>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-green/15 text-accent-green rounded-xl text-sm font-medium hover:bg-accent-green/25 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div animate={{ rotate: showForm ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={16} />
          </motion.div>
          Nuevo ingreso
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            className="bg-surface rounded-xl p-5 border border-white/5 space-y-4 overflow-hidden"
            variants={collapseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h3 className="text-sm font-semibold text-white">Registrar ingreso</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-green focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Importe</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-accent-green focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Concepto</label>
                <select
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-green focus:outline-none transition-colors"
                >
                  {settings.incomeConcepts.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Descripcion</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion opcional"
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-green focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <motion.button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                Cancelar
              </motion.button>
              <motion.button
                type="submit"
                className="px-4 py-2 bg-accent-green text-surface-dark rounded-lg text-sm font-medium hover:bg-accent-green/80 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Guardar
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Summary */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={staggerContainer}
      >
        <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow-green" whileHover={{ y: -2 }}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total mes</p>
          <p className="font-mono text-2xl font-bold text-accent-green">
            {formatCurrency(totalMonth)}
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow" whileHover={{ y: -2 }}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ingresos esperados</p>
          <p className="font-mono text-2xl font-bold text-white">
            {formatCurrency(settings.monthlyIncome + settings.cashbackNet)}
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-surface rounded-xl p-5 border border-white/5 card-glow" whileHover={{ y: -2 }}>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Registros este mes</p>
          <p className="font-mono text-2xl font-bold text-white">{monthIncomes.length}</p>
        </motion.div>
      </motion.div>

      {/* Filter */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-accent-green focus:outline-none transition-colors"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </motion.div>

      {/* Income List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {monthIncomes.length === 0 ? (
            <motion.div
              key="empty"
              className="bg-surface rounded-xl p-8 border border-white/5 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-gray-500 text-sm">No hay ingresos registrados este mes</p>
            </motion.div>
          ) : (
            monthIncomes
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((income) => (
                <motion.div
                  key={income.id}
                  className="bg-surface rounded-xl p-4 border border-white/5 card-glow-green"
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                >
                  {editingId === income.id ? (
                    <motion.div
                      className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-surface-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
                      <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-surface-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none" />
                      <select value={editConcept} onChange={(e) => setEditConcept(e.target.value)} className="bg-surface-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                        {settings.incomeConcepts.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="bg-surface-dark border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
                      <div className="flex gap-1 justify-end">
                        <motion.button onClick={saveEdit} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded-lg" whileTap={{ scale: 0.85 }}>
                          <Check size={16} />
                        </motion.button>
                        <motion.button onClick={() => setEditingId(null)} className="p-1.5 text-gray-500 hover:bg-white/5 rounded-lg" whileTap={{ scale: 0.85 }}>
                          <X size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 font-mono w-20">{formatDate(income.date)}</span>
                        <span className="text-xs bg-accent-green/10 px-2 py-0.5 rounded text-accent-green">{income.concept}</span>
                        <span className="text-sm text-gray-300">{income.description || '-'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-medium text-accent-green">+{formatCurrency(income.amount)}</span>
                        <motion.button onClick={() => startEdit(income.id)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}>
                          <Edit3 size={14} />
                        </motion.button>
                        <motion.button onClick={() => deleteIncome(income.id)} className="p-1.5 text-gray-500 hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors" whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}>
                          <Trash2 size={14} />
                        </motion.button>
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
