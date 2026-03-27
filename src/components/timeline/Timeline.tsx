import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Clock, ChevronDown, Pencil, Trash2, Plus, X } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { formatCurrency, formatDate } from '../../utils/format';
import { getPhaseTotal, getPhasePaid, getDaysRemaining } from '../../utils/calculations';
import { staggerContainer, fadeUp, collapseVariants } from '../../utils/animations';

interface EditState { itemId: string; name: string; cost: string; }

export function Timeline() {
  const { phases, togglePhaseItem, updatePhaseStatus, updatePhaseItem, addPhaseItem, removePhaseItem } = useAppData();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(phases[0]?.id ?? null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check size={16} className="text-accent-green" />;
      case 'in-progress': return <Clock size={16} className="text-accent-amber" />;
      default: return <Circle size={16} className="text-th-muted" />;
    }
  };

  const nextStatus = (current: string): 'pending' | 'in-progress' | 'completed' => {
    switch (current) { case 'pending': return 'in-progress'; case 'in-progress': return 'completed'; default: return 'pending'; }
  };

  const statusLabel = (status: string) => {
    switch (status) { case 'completed': return 'Hecho'; case 'in-progress': return 'En curso'; default: return 'Pendiente'; }
  };

  const saveEdit = (phaseId: string) => {
    if (!editing) return;
    const cost = parseFloat(editing.cost);
    if (editing.name.trim() && !isNaN(cost) && cost > 0) {
      updatePhaseItem(phaseId, editing.itemId, { name: editing.name.trim(), estimatedCost: cost });
    }
    setEditing(null);
  };

  const handleAddItem = (phaseId: string) => {
    const cost = parseFloat(newCost);
    if (newName.trim() && !isNaN(cost) && cost > 0) {
      addPhaseItem(phaseId, { name: newName.trim(), estimatedCost: cost, paid: false, paidAmount: 0, paidDate: null });
      setNewName(''); setNewCost(''); setAddingTo(null);
    }
  };

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-th-text">Timeline</h2>
        <p className="text-sm text-th-muted mt-1">Hoja de ruta - toca el lapiz para editar</p>
      </motion.div>

      <div className="relative">
        <motion.div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-th-border"
          initial={{ scaleY: 0, originY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />

        <div className="space-y-4">
          {phases.map((phase, phaseIndex) => {
            const total = getPhaseTotal(phase);
            const paid = getPhasePaid(phase);
            const pct = total > 0 ? paid / total : 0;
            const daysLeft = getDaysRemaining(phase.targetDate);
            const isExpanded = expandedPhase === phase.id;
            const paidItems = phase.items.filter((i) => i.paid).length;

            return (
              <motion.div key={phase.id} className="relative pl-10 md:pl-14"
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: phaseIndex * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <motion.div
                  className={`absolute left-1.5 md:left-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${phase.status === 'in-progress' ? 'pulse-ring' : ''}`}
                  style={{ borderColor: phase.color, backgroundColor: phase.status === 'completed' ? phase.color : 'var(--bg-main)', color: phase.color }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: phaseIndex * 0.12 + 0.2, type: 'spring', stiffness: 400, damping: 15 }}>
                  {phase.status === 'completed' && <Check size={10} className="text-white" />}
                </motion.div>

                <motion.div className="bg-th-card rounded-xl border border-th-border overflow-hidden card-glow" whileHover={{ y: -1 }}>
                  <motion.button onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                    className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-th-hover-subtle transition-colors text-left"
                    whileTap={{ scale: 0.995 }} aria-expanded={isExpanded} aria-label={`Fase: ${phase.name}`}>
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className="w-1 h-8 md:h-10 rounded-full flex-shrink-0" style={{ backgroundColor: phase.color }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-th-text truncate">{phase.name}</h3>
                          <motion.button onClick={(e) => { e.stopPropagation(); updatePhaseStatus(phase.id, nextStatus(phase.status)); }}
                            className={`text-[10px] md:text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                              phase.status === 'completed' ? 'bg-accent-green/10 text-accent-green' :
                              phase.status === 'in-progress' ? 'bg-accent-amber/10 text-accent-amber' : 'bg-th-hover text-th-secondary'
                            }`} whileTap={{ scale: 0.95 }} aria-label={`Estado: ${statusLabel(phase.status)}`}>
                            {statusIcon(phase.status)} {statusLabel(phase.status)}
                          </motion.button>
                        </div>
                        <p className="text-[10px] md:text-xs text-th-muted mt-0.5">{daysLeft}d restantes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-mono text-sm font-medium" style={{ color: phase.color }}>
                          {formatCurrency(paid)} <span className="text-th-muted">/ {formatCurrency(total)}</span>
                        </p>
                        <p className="text-xs text-th-muted">{paidItems}/{phase.items.length} - {Math.round(pct * 100)}%</p>
                      </div>
                      <span className="sm:hidden font-mono text-xs font-medium" style={{ color: phase.color }}>{Math.round(pct * 100)}%</span>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown size={16} className="text-th-muted" aria-hidden="true" />
                      </motion.div>
                    </div>
                  </motion.button>

                  <div className="px-4 md:px-5">
                    <div className="w-full h-1.5 bg-th-hover rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full progress-shimmer" style={{ backgroundColor: phase.color }}
                        initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct * 100)}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div className="p-3 md:p-5 pt-3 md:pt-4 space-y-2" variants={collapseVariants} initial="initial" animate="animate" exit="exit">
                        <AnimatePresence mode="popLayout">
                          {phase.items.map((item, itemIndex) => {
                            const isEditing = editing?.itemId === item.id;
                            return (
                              <motion.div key={item.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors gap-2 ${
                                  item.paid ? 'bg-accent-green/5 border-accent-green/20' : 'bg-th-hover-subtle border-th-border'
                                }`}
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30, scale: 0.95 }}
                                transition={{ delay: itemIndex * 0.04, duration: 0.3 }} layout>
                                {isEditing ? (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                                    <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                      className="flex-1 bg-th-input border border-th-border-strong rounded px-3 py-1.5 text-sm text-th-text focus:outline-none"
                                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(phase.id); if (e.key === 'Escape') setEditing(null); }} autoFocus />
                                    <input type="number" step="0.01" value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: e.target.value })}
                                      className="w-full sm:w-28 bg-th-input border border-th-border-strong rounded px-3 py-1.5 text-sm text-th-text font-mono focus:outline-none"
                                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(phase.id); if (e.key === 'Escape') setEditing(null); }} />
                                    <div className="flex gap-1 justify-end">
                                      <motion.button onClick={() => saveEdit(phase.id)} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded" whileTap={{ scale: 0.85 }} aria-label="Guardar"><Check size={14} /></motion.button>
                                      <motion.button onClick={() => setEditing(null)} className="p-1.5 text-th-secondary hover:bg-th-hover rounded" whileTap={{ scale: 0.85 }} aria-label="Cancelar"><X size={14} /></motion.button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <motion.button onClick={() => togglePhaseItem(phase.id, item.id, !item.paid)}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                          item.paid ? 'bg-accent-green border-accent-green' : 'border-th-border-strong hover:border-th-secondary'
                                        }`} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                                        aria-label={item.paid ? `Desmarcar ${item.name}` : `Marcar ${item.name} como pagado`}>
                                        <AnimatePresence>
                                          {item.paid && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={12} className="text-white" /></motion.div>}
                                        </AnimatePresence>
                                      </motion.button>
                                      <div className="min-w-0">
                                        <span className={`text-sm ${item.paid ? 'text-th-muted line-through' : 'text-th-text'} block truncate`}>{item.name}</span>
                                        {item.paid && item.paidDate && <p className="text-[10px] text-th-faint">Pagado: {formatDate(item.paidDate)}</p>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-8 sm:ml-0">
                                      <span className="font-mono text-sm text-th-secondary">{formatCurrency(item.paid ? item.paidAmount : item.estimatedCost)}</span>
                                      <motion.button onClick={() => setEditing({ itemId: item.id, name: item.name, cost: item.estimatedCost.toString() })}
                                        className="p-1.5 text-th-faint hover:text-th-text hover:bg-th-hover rounded transition-colors"
                                        whileTap={{ scale: 0.85 }} aria-label={`Editar ${item.name}`}><Pencil size={13} /></motion.button>
                                      <motion.button onClick={() => { if (confirm(`Eliminar "${item.name}"?`)) removePhaseItem(phase.id, item.id); }}
                                        className="p-1.5 text-th-faint hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                                        whileTap={{ scale: 0.85 }} aria-label={`Eliminar ${item.name}`}><Trash2 size={13} /></motion.button>
                                    </div>
                                  </>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        <AnimatePresence>
                          {addingTo === phase.id ? (
                            <motion.div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg border border-dashed border-th-border-strong bg-th-hover-subtle"
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre"
                                className="flex-1 bg-th-input border border-th-border-strong rounded px-3 py-1.5 text-sm text-th-text focus:outline-none"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(phase.id); if (e.key === 'Escape') { setAddingTo(null); setNewName(''); setNewCost(''); } }} autoFocus />
                              <input type="number" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="Precio"
                                className="w-full sm:w-28 bg-th-input border border-th-border-strong rounded px-3 py-1.5 text-sm text-th-text font-mono focus:outline-none"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(phase.id); if (e.key === 'Escape') { setAddingTo(null); setNewName(''); setNewCost(''); } }} />
                              <div className="flex gap-1 justify-end">
                                <motion.button onClick={() => handleAddItem(phase.id)} className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded" whileTap={{ scale: 0.85 }}><Check size={14} /></motion.button>
                                <motion.button onClick={() => { setAddingTo(null); setNewName(''); setNewCost(''); }} className="p-1.5 text-th-secondary hover:bg-th-hover rounded" whileTap={{ scale: 0.85 }}><X size={14} /></motion.button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.button onClick={() => setAddingTo(phase.id)}
                              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-th-border text-th-muted hover:text-th-text hover:border-th-border-strong transition-colors text-sm"
                              whileTap={{ scale: 0.99 }}>
                              <Plus size={14} /> Anadir item
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
