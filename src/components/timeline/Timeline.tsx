import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Clock, ChevronDown, Pencil, Trash2, Plus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/format';
import { getPhaseTotal, getPhasePaid, getDaysRemaining } from '../../utils/calculations';
import { staggerContainer, fadeUp, collapseVariants } from '../../utils/animations';

interface EditState {
  itemId: string;
  name: string;
  cost: string;
}

export function Timeline() {
  const { phases, togglePhaseItem, updatePhaseStatus, updatePhaseItem, addPhaseItem, removePhaseItem } = useStore();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(phases[0]?.id ?? null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedPhase(expandedPhase === id ? null : id);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check size={16} className="text-accent-green" />;
      case 'in-progress':
        return <Clock size={16} className="text-accent-amber" />;
      default:
        return <Circle size={16} className="text-gray-500" />;
    }
  };

  const nextStatus = (current: string): 'pending' | 'in-progress' | 'completed' => {
    switch (current) {
      case 'pending': return 'in-progress';
      case 'in-progress': return 'completed';
      default: return 'pending';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'in-progress': return 'En curso';
      default: return 'Pendiente';
    }
  };

  const startEdit = (itemId: string, name: string, cost: number) => {
    setEditing({ itemId, name, cost: cost.toString() });
  };

  const saveEdit = (phaseId: string) => {
    if (!editing) return;
    const cost = parseFloat(editing.cost);
    if (editing.name.trim() && !isNaN(cost) && cost > 0) {
      updatePhaseItem(phaseId, editing.itemId, {
        name: editing.name.trim(),
        estimatedCost: cost,
      });
    }
    setEditing(null);
  };

  const handleAddItem = (phaseId: string) => {
    const cost = parseFloat(newCost);
    if (newName.trim() && !isNaN(cost) && cost > 0) {
      addPhaseItem(phaseId, {
        name: newName.trim(),
        estimatedCost: cost,
        paid: false,
        paidAmount: 0,
        paidDate: null,
      });
      setNewName('');
      setNewCost('');
      setAddingTo(null);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-white">Timeline</h2>
        <p className="text-sm text-gray-500 mt-1">Hoja de ruta hacia la Daytona 660 - Haz clic en el lapiz para editar cualquier item</p>
      </motion.div>

      <div className="relative">
        <motion.div
          className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/5"
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />

        <div className="space-y-4">
          {phases.map((phase, phaseIndex) => {
            const total = getPhaseTotal(phase);
            const paid = getPhasePaid(phase);
            const pct = total > 0 ? paid / total : 0;
            const daysLeft = getDaysRemaining(phase.targetDate);
            const isExpanded = expandedPhase === phase.id;
            const paidItems = phase.items.filter((i) => i.paid).length;

            return (
              <motion.div
                key={phase.id}
                className="relative pl-14"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: phaseIndex * 0.12,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <motion.div
                  className={`absolute left-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                    phase.status === 'in-progress' ? 'pulse-ring' : ''
                  }`}
                  style={{
                    borderColor: phase.color,
                    backgroundColor: phase.status === 'completed' ? phase.color : '#0f1117',
                    color: phase.color,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: phaseIndex * 0.12 + 0.2,
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                  }}
                >
                  {phase.status === 'completed' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <Check size={10} className="text-white" />
                    </motion.div>
                  )}
                </motion.div>

                <motion.div
                  className="bg-surface rounded-xl border border-white/5 overflow-hidden card-glow"
                  whileHover={{ y: -1 }}
                >
                  <motion.button
                    onClick={() => toggleExpand(phase.id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    whileTap={{ scale: 0.995 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: phase.color }} />
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{phase.name}</h3>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePhaseStatus(phase.id, nextStatus(phase.status));
                            }}
                            className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                              phase.status === 'completed'
                                ? 'bg-accent-green/10 text-accent-green'
                                : phase.status === 'in-progress'
                                  ? 'bg-accent-amber/10 text-accent-amber'
                                  : 'bg-white/5 text-gray-400'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {statusIcon(phase.status)}
                            {statusLabel(phase.status)}
                          </motion.button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Objetivo: {formatDate(phase.targetDate)} - {daysLeft} dias restantes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium" style={{ color: phase.color }}>
                          {formatCurrency(paid)} <span className="text-gray-500">/ {formatCurrency(total)}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {paidItems}/{phase.items.length} items - {Math.round(pct * 100)}%
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ChevronDown size={16} className="text-gray-500" />
                      </motion.div>
                    </div>
                  </motion.button>

                  <div className="px-5">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full progress-shimmer"
                        style={{ backgroundColor: phase.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct * 100)}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="p-5 pt-4 space-y-2"
                        variants={collapseVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <AnimatePresence mode="popLayout">
                          {phase.items.map((item, itemIndex) => {
                            const isEditing = editing?.itemId === item.id;

                            return (
                              <motion.div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                  item.paid
                                    ? 'bg-accent-green/5 border-accent-green/20'
                                    : 'bg-white/[0.02] border-white/5'
                                }`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30, scale: 0.95 }}
                                transition={{
                                  delay: itemIndex * 0.04,
                                  duration: 0.3,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                layout
                                whileHover={{ x: 3 }}
                              >
                                {isEditing ? (
                                  <motion.div
                                    className="flex items-center gap-2 w-full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                  >
                                    <input
                                      type="text"
                                      value={editing.name}
                                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                      placeholder="Nombre del item"
                                      className="flex-1 bg-surface-dark border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit(phase.id);
                                        if (e.key === 'Escape') setEditing(null);
                                      }}
                                      autoFocus
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editing.cost}
                                      onChange={(e) => setEditing({ ...editing, cost: e.target.value })}
                                      placeholder="Precio"
                                      className="w-28 bg-surface-dark border border-white/10 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit(phase.id);
                                        if (e.key === 'Escape') setEditing(null);
                                      }}
                                    />
                                    <motion.button onClick={() => saveEdit(phase.id)} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded" whileTap={{ scale: 0.85 }}>
                                      <Check size={14} />
                                    </motion.button>
                                    <motion.button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-white/5 rounded" whileTap={{ scale: 0.85 }}>
                                      <X size={14} />
                                    </motion.button>
                                  </motion.div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-3">
                                      <motion.button
                                        onClick={() => togglePhaseItem(phase.id, item.id, !item.paid)}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                          item.paid
                                            ? 'bg-accent-green border-accent-green'
                                            : 'border-white/20 hover:border-white/40'
                                        }`}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.8 }}
                                      >
                                        <AnimatePresence>
                                          {item.paid && (
                                            <motion.div
                                              initial={{ scale: 0, rotate: -90 }}
                                              animate={{ scale: 1, rotate: 0 }}
                                              exit={{ scale: 0 }}
                                              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                            >
                                              <Check size={12} className="text-white" />
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </motion.button>
                                      <div>
                                        <span className={`text-sm ${item.paid ? 'text-gray-500 line-through' : 'text-white'}`}>
                                          {item.name}
                                        </span>
                                        {item.paid && item.paidDate && (
                                          <p className="text-[10px] text-gray-600">Pagado: {formatDate(item.paidDate)}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm text-gray-400">
                                        {formatCurrency(item.paid ? item.paidAmount : item.estimatedCost)}
                                      </span>
                                      <motion.button
                                        onClick={() => startEdit(item.id, item.name, item.estimatedCost)}
                                        className="p-1.5 text-gray-600 hover:text-white hover:bg-white/5 rounded transition-colors"
                                        whileHover={{ scale: 1.15 }}
                                        whileTap={{ scale: 0.85 }}
                                      >
                                        <Pencil size={13} />
                                      </motion.button>
                                      <motion.button
                                        onClick={() => {
                                          if (confirm(`Eliminar "${item.name}"?`)) {
                                            removePhaseItem(phase.id, item.id);
                                          }
                                        }}
                                        className="p-1.5 text-gray-600 hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                                        whileHover={{ scale: 1.15 }}
                                        whileTap={{ scale: 0.85 }}
                                      >
                                        <Trash2 size={13} />
                                      </motion.button>
                                    </div>
                                  </>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        <AnimatePresence>
                          {addingTo === phase.id ? (
                            <motion.div
                              className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02]"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Nombre del nuevo item"
                                className="flex-1 bg-surface-dark border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddItem(phase.id);
                                  if (e.key === 'Escape') { setAddingTo(null); setNewName(''); setNewCost(''); }
                                }}
                                autoFocus
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={newCost}
                                onChange={(e) => setNewCost(e.target.value)}
                                placeholder="Precio"
                                className="w-28 bg-surface-dark border border-white/10 rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-white/30"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddItem(phase.id);
                                  if (e.key === 'Escape') { setAddingTo(null); setNewName(''); setNewCost(''); }
                                }}
                              />
                              <motion.button onClick={() => handleAddItem(phase.id)} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded" whileTap={{ scale: 0.85 }}>
                                <Check size={14} />
                              </motion.button>
                              <motion.button onClick={() => { setAddingTo(null); setNewName(''); setNewCost(''); }} className="p-1.5 text-gray-400 hover:bg-white/5 rounded" whileTap={{ scale: 0.85 }}>
                                <X size={14} />
                              </motion.button>
                            </motion.div>
                          ) : (
                            <motion.button
                              onClick={() => setAddingTo(phase.id)}
                              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 transition-colors text-sm"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Plus size={14} />
                              Anadir item
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
