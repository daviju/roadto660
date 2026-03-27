import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Check, Plus, Pencil, Trash2, X, Shield, DollarSign, Calendar } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { formatCurrency } from '../../utils/format';
import {
  getAvailableBalance,
  getTotalPaid,
  getPhaseTotal,
  getRequiredMonthlySavings,
  getEstimatedPurchaseDate,
  getMonthTotalExpenses,
} from '../../utils/calculations';
import { getCurrentMonth } from '../../utils/format';
import { staggerContainer, fadeUp, collapseVariants, scaleFade } from '../../utils/animations';
import type { Motorcycle } from '../../types';

export function Motorcycles() {
  const {
    motorcycles, setActiveMotorcycle, addMotorcycle, updateMotorcycle, deleteMotorcycle,
    phases, settings, expenses,
  } = useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const [form, setForm] = useState({
    name: '', price: '', priceMin: '', priceMax: '',
    insuranceYear: '', type: 'Sport', notes: '',
  });

  const activeMoto = motorcycles.find(m => m.active);
  const currentMonth = getCurrentMonth(settings.payDay, settings.cycleMode);
  const monthExpenses = getMonthTotalExpenses(expenses, currentMonth, settings.payDay, settings.cycleMode);
  const totalMonthlyIncome = settings.monthlyIncome + settings.cashbackNet;
  const estimatedMonthlySavings = totalMonthlyIncome - (monthExpenses > 0 ? monthExpenses : 507);
  const available = getAvailableBalance(settings.currentBalance, settings.emergencyFund);
  const totalPaid = getTotalPaid(phases);

  const fixedCost = phases
    .filter(p => p.id !== 'phase-4')
    .reduce((s, p) => s + getPhaseTotal(p), 0);

  const resetForm = () => {
    setForm({ name: '', price: '', priceMin: '', priceMax: '', insuranceYear: '', type: 'Sport', notes: '' });
  };

  const startEdit = (moto: Motorcycle) => {
    setEditId(moto.id);
    setShowAdd(false);
    setForm({
      name: moto.name,
      price: moto.price.toString(),
      priceMin: moto.priceMin.toString(),
      priceMax: moto.priceMax.toString(),
      insuranceYear: moto.insuranceYear.toString(),
      type: moto.type,
      notes: moto.notes,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      priceMin: parseFloat(form.priceMin) || 0,
      priceMax: parseFloat(form.priceMax) || 0,
      insuranceYear: parseFloat(form.insuranceYear) || 0,
      type: form.type,
      notes: form.notes,
    };
    if (!data.name || data.price <= 0) return;

    if (editId) {
      // Preserve active state when editing
      const existing = motorcycles.find(m => m.id === editId);
      updateMotorcycle(editId, { ...data, active: existing?.active ?? false });
      setEditId(null);
    } else {
      addMotorcycle({ ...data, active: false });
      setShowAdd(false);
    }
    resetForm();
  };

  const cheapestTotal = motorcycles.length > 0
    ? Math.min(...motorcycles.map(m => fixedCost + m.price + m.insuranceYear))
    : 0;

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-th-text">Comparador de motos</h2>
          <p className="text-sm text-th-muted mt-1">Selecciona tu moto y todo se recalcula</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowCompare(!showCompare)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-cyan/15 text-accent-cyan rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-cyan/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            aria-label="Vista comparativa"
          >
            <span className="hidden sm:inline">Vista comparativa</span>
            <span className="sm:hidden">Comparar</span>
          </motion.button>
          <motion.button
            onClick={() => { setShowAdd(!showAdd); setEditId(null); resetForm(); }}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-purple/15 text-accent-purple rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-purple/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            aria-label="Nueva moto"
          >
            <motion.div animate={{ rotate: showAdd ? 45 : 0 }} transition={{ duration: 0.2 }}><Plus size={16} aria-hidden="true" /></motion.div>
            <span className="hidden sm:inline">Nueva moto</span>
          </motion.button>
        </div>
      </motion.div>

      {activeMoto && (
        <motion.div variants={fadeUp} className="bg-gradient-to-r from-accent-purple/10 to-transparent rounded-xl p-4 md:p-5 border border-accent-purple/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center flex-shrink-0"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              >
                <Bike size={20} className="text-accent-purple" aria-hidden="true" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-th-text truncate">{activeMoto.name}</p>
                <p className="text-xs text-th-muted">{activeMoto.type} - Moto activa</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-lg md:text-xl font-bold text-accent-purple">{formatCurrency(activeMoto.price)}</p>
              <p className="text-xs text-th-muted">Seguro: {formatCurrency(activeMoto.insuranceYear)}/ano</p>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {(showAdd || editId) && (
          <motion.form
            onSubmit={handleSubmit}
            className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 overflow-hidden"
            variants={collapseVariants} initial="initial" animate="animate" exit="exit"
          >
            <h3 className="text-sm font-semibold text-th-text">
              {editId ? 'Editar moto' : 'Anadir nueva moto'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="col-span-2">
                <label htmlFor="moto-name" className="block text-xs text-th-muted mb-1.5">Nombre</label>
                <input id="moto-name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Honda CBR650R"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="moto-price" className="block text-xs text-th-muted mb-1.5">Precio</label>
                <input id="moto-price" type="number" step="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="moto-insurance" className="block text-xs text-th-muted mb-1.5">Seguro anual</label>
                <input id="moto-insurance" type="number" step="1" value={form.insuranceYear} onChange={e => setForm({ ...form, insuranceYear: e.target.value })}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="moto-min" className="block text-xs text-th-muted mb-1.5">Precio min</label>
                <input id="moto-min" type="number" step="1" value={form.priceMin} onChange={e => setForm({ ...form, priceMin: e.target.value })}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="moto-max" className="block text-xs text-th-muted mb-1.5">Precio max</label>
                <input id="moto-max" type="number" step="1" value={form.priceMax} onChange={e => setForm({ ...form, priceMax: e.target.value })}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
              <div>
                <label htmlFor="moto-type" className="block text-xs text-th-muted mb-1.5">Tipo</label>
                <select id="moto-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
                  <option value="Sport">Sport</option>
                  <option value="Sport-touring">Sport-touring</option>
                  <option value="Naked">Naked</option>
                  <option value="Adventure">Adventure</option>
                </select>
              </div>
              <div className="col-span-2 lg:col-span-4">
                <label htmlFor="moto-notes" className="block text-xs text-th-muted mb-1.5">Notas</label>
                <input id="moto-notes" type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <motion.button type="button" onClick={() => { setShowAdd(false); setEditId(null); resetForm(); }}
                className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors" whileTap={{ scale: 0.95 }}>
                Cancelar
              </motion.button>
              <motion.button type="submit"
                className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {editId ? 'Guardar cambios' : 'Anadir moto'}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && (
          <motion.div
            className="bg-th-card rounded-xl border border-th-border overflow-x-auto"
            variants={collapseVariants} initial="initial" animate="animate" exit="exit"
          >
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-th-border">
                  <th className="text-left p-3 md:p-4 text-xs text-th-muted font-medium">Moto</th>
                  <th className="text-right p-3 md:p-4 text-xs text-th-muted font-medium">Precio</th>
                  <th className="text-right p-3 md:p-4 text-xs text-th-muted font-medium hidden sm:table-cell">Seguro/ano</th>
                  <th className="text-right p-3 md:p-4 text-xs text-th-muted font-medium hidden md:table-cell">Seguro/mes</th>
                  <th className="text-right p-3 md:p-4 text-xs text-th-muted font-medium">Total plan</th>
                  <th className="text-right p-3 md:p-4 text-xs text-th-muted font-medium hidden sm:table-cell">Fecha est.</th>
                  <th className="text-right p-3 md:p-4 text-xs text-th-muted font-medium">vs barata</th>
                </tr>
              </thead>
              <tbody>
                {motorcycles
                  .slice()
                  .sort((a, b) => (fixedCost + a.price + a.insuranceYear) - (fixedCost + b.price + b.insuranceYear))
                  .map((moto, i) => {
                    const totalPlan = fixedCost + moto.price + moto.insuranceYear;
                    const remaining = Math.max(0, totalPlan - totalPaid - available);
                    const estDate = getEstimatedPurchaseDate(remaining, estimatedMonthlySavings);
                    const diff = totalPlan - cheapestTotal;
                    const diffMonths = estimatedMonthlySavings > 0 ? Math.round(diff / estimatedMonthlySavings) : 0;
                    return (
                      <motion.tr
                        key={moto.id}
                        className={`border-b border-th-border ${moto.active ? 'bg-accent-purple/5' : 'hover:bg-th-hover'}`}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <td className="p-3 md:p-4">
                          <div className="flex items-center gap-2">
                            {moto.active && <div className="w-2 h-2 rounded-full bg-accent-purple flex-shrink-0" />}
                            <span className={`font-medium text-xs sm:text-sm ${moto.active ? 'text-accent-purple' : 'text-th-text'}`}>{moto.name}</span>
                            <span className="text-[10px] text-th-faint hidden sm:inline">{moto.type}</span>
                          </div>
                        </td>
                        <td className="p-3 md:p-4 text-right font-mono text-xs sm:text-sm text-th-text">{formatCurrency(moto.price)}</td>
                        <td className="p-3 md:p-4 text-right font-mono text-xs sm:text-sm text-th-secondary hidden sm:table-cell">{formatCurrency(moto.insuranceYear)}</td>
                        <td className="p-3 md:p-4 text-right font-mono text-xs sm:text-sm text-th-secondary hidden md:table-cell">{formatCurrency(moto.insuranceYear / 12)}</td>
                        <td className="p-3 md:p-4 text-right font-mono text-xs sm:text-sm font-medium text-th-text">{formatCurrency(totalPlan)}</td>
                        <td className="p-3 md:p-4 text-right text-xs text-th-secondary hidden sm:table-cell">
                          {estDate ? estDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="p-3 md:p-4 text-right">
                          {diff === 0 ? (
                            <span className="text-accent-green text-[10px] sm:text-xs font-medium">Mas barata</span>
                          ) : (
                            <span className="text-accent-red text-[10px] sm:text-xs font-mono">+{formatCurrency(diff)} (+{diffMonths}m)</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" variants={staggerContainer}>
        {motorcycles.map((moto, i) => {
          const totalPlan = fixedCost + moto.price + moto.insuranceYear;
          const remaining = Math.max(0, totalPlan - totalPaid - available);
          const estDate = getEstimatedPurchaseDate(remaining, estimatedMonthlySavings);
          const requiredMonthly = getRequiredMonthlySavings(totalPlan, totalPaid, available, settings.targetDate);

          return (
            <motion.div
              key={moto.id}
              variants={fadeUp}
              className={`bg-th-card rounded-xl border overflow-hidden card-glow ${
                moto.active ? 'border-accent-purple/30' : 'border-th-border'
              }`}
              whileHover={{ y: -3 }}
            >
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-th-text truncate">{moto.name}</h3>
                      {moto.active && (
                        <motion.span
                          className="text-[10px] bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full font-medium"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          ACTIVA
                        </motion.span>
                      )}
                    </div>
                    <p className="text-xs text-th-muted mt-0.5">{moto.type}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <motion.button
                      onClick={() => startEdit(moto)}
                      className="p-1.5 text-th-faint hover:text-th-text hover:bg-th-hover rounded transition-colors"
                      whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                      aria-label={`Editar ${moto.name}`}
                    >
                      <Pencil size={13} />
                    </motion.button>
                    {!moto.active && (
                      <motion.button
                        onClick={() => { if (confirm(`Eliminar ${moto.name}?`)) deleteMotorcycle(moto.id); }}
                        className="p-1.5 text-th-faint hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                        aria-label={`Eliminar ${moto.name}`}
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="font-mono text-xl md:text-2xl font-bold text-th-text">{formatCurrency(moto.price)}</p>
                  <p className="text-[10px] text-th-faint font-mono">
                    Rango: {formatCurrency(moto.priceMin)} - {formatCurrency(moto.priceMax)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
                  <div className="bg-th-input rounded-lg p-2 md:p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shield size={12} className="text-accent-amber" aria-hidden="true" />
                      <span className="text-[10px] text-th-muted">Seguro/ano</span>
                    </div>
                    <p className="font-mono text-xs sm:text-sm font-medium text-th-text">{formatCurrency(moto.insuranceYear)}</p>
                    <p className="font-mono text-[10px] text-th-muted">{formatCurrency(moto.insuranceYear / 12)}/mes</p>
                  </div>
                  <div className="bg-th-input rounded-lg p-2 md:p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign size={12} className="text-accent-green" aria-hidden="true" />
                      <span className="text-[10px] text-th-muted">Plan total</span>
                    </div>
                    <p className="font-mono text-xs sm:text-sm font-medium text-th-text">{formatCurrency(totalPlan)}</p>
                    <p className="font-mono text-[10px] text-th-muted">{formatCurrency(requiredMonthly)}/mes</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-th-muted mb-4">
                  <Calendar size={12} aria-hidden="true" />
                  <span>
                    Fecha estimada: {estDate ? estDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>

                {moto.notes && (
                  <p className="text-xs text-th-muted leading-relaxed mb-4 line-clamp-3">{moto.notes}</p>
                )}
              </div>

              <div className="px-4 md:px-5 pb-4 md:pb-5">
                {moto.active ? (
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-purple/10 text-accent-purple text-sm font-medium">
                    <Check size={16} aria-hidden="true" /> Seleccionada
                  </div>
                ) : (
                  <motion.button
                    onClick={() => setActiveMotorcycle(moto.id)}
                    className="w-full py-2.5 rounded-xl bg-th-hover text-th-secondary hover:bg-accent-purple/15 hover:text-accent-purple text-sm font-medium transition-colors"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    aria-label={`Seleccionar ${moto.name} como activa`}
                  >
                    Seleccionar como activa
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
