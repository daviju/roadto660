import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Download, Upload, RotateCcw, Plus, X, Cloud, FileSpreadsheet, Check, AlertTriangle, LogOut, Shield, Trash2, UserX, ExternalLink, Mail, Send, Pencil } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { useAuth } from '../../lib/auth';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { useToast } from '../shared/Toast';
import { formatCurrency } from '../../utils/format';
import { staggerContainer, fadeUp, scaleFade } from '../../utils/animations';
import { ExcelImportFlow } from '../shared/ExcelImportFlow';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';

export function Settings() {
  const { settings, updateSettings, exportData, importData, resetData, setPage, categories: dbCategories, addCategory: addCategoryDb, updateCategory: updateCategoryDb, deleteCategory: deleteCategoryDb } = useAppData();
  const { profile, session, signOut } = useAuth();
  const cachedTheme = useStore((s) => s.cachedTheme);
  const setCachedTheme = useStore((s) => s.setCachedTheme);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExcelImport, setShowExcelImport] = useState(false);

  const [balance, setBalance] = useState(settings.currentBalance.toString());
  const [emergency, setEmergency] = useState(settings.emergencyFund.toString());
  const [income, setIncome] = useState(settings.monthlyIncome.toString());
  const [cashback, setCashback] = useState(settings.cashbackNet.toString());
  const [targetDate, setTargetDate] = useState(settings.targetDate);
  const [newConcept, setNewConcept] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [pendingImportJson, setPendingImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [payDayInput, setPayDayInput] = useState(settings.payDay.toString());
  const [cycleModeInput, setCycleModeInput] = useState(settings.cycleMode);

  // (Excel import handled by ExcelImportFlow component)

  // Privacy modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // RGPD
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Category management
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('#a78bfa');
  const [editCatIcon, setEditCatIcon] = useState('circle');
  const [editCatType, setEditCatType] = useState<'expense' | 'income' | 'both'>('expense');
  const [editCatBudget, setEditCatBudget] = useState('0');
  const [showAddCategory, setShowAddCategory] = useState(false);


  const handleSave = async () => {
    await updateSettings({
      currentBalance: parseFloat(balance) || 0,
      emergencyFund: parseFloat(emergency) || 0,
      monthlyIncome: parseFloat(income) || 0,
      cashbackNet: parseFloat(cashback) || 0,
      targetDate,
      payDay: Math.max(1, Math.min(31, parseInt(payDayInput) || 28)),
      cycleMode: cycleModeInput,
    });
    toast.success('Cambios guardados correctamente');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    try {
      const json = exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadto-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Datos exportados correctamente');
    } catch {
      toast.error('Error al exportar los datos');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPendingImportJson(text);
      setShowConfirmImport(true);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    const success = importData(pendingImportJson);
    setImportMsg(success ? 'Datos importados correctamente' : 'Importacion no soportada en modo multi-usuario');
    setTimeout(() => setImportMsg(''), 3000);
    setShowConfirmImport(false);
    setPendingImportJson('');
  };

  // (Excel import logic moved to ExcelImportFlow component)

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR' || !session?.access_token) return;
    setDeleteLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al eliminar la cuenta');
        setDeleteLoading(false);
        return;
      }
      toast.info('Tu cuenta ha sido eliminada');
      await signOut();
    } catch {
      toast.error('Error de conexion al eliminar la cuenta');
      setDeleteLoading(false);
    }
  };

  const handleReset = async () => {
    await resetData();
    setBalance('0');
    setEmergency('0');
    setIncome('0');
    setCashback('0');
    setPayDayInput('28');
    setCycleModeInput('calendar');
    setShowConfirmReset(false);
  };

  const handleSaveCategory = async () => {
    const name = editCatName.trim();
    if (!name) return;
    if (editingCatId) {
      await updateCategoryDb(editingCatId, { name, color: editCatColor, icon: editCatIcon, type: editCatType, monthly_budget: parseFloat(editCatBudget) || 0 });
      toast.success('Categoría actualizada');
    } else {
      const created = await addCategoryDb({ name, color: editCatColor, icon: editCatIcon, type: editCatType, monthly_budget: parseFloat(editCatBudget) || 0 });
      if (created) toast.success(`Categoría "${name}" creada`);
      else { toast.error('Error al crear categoría'); return; }
    }
    setEditingCatId(null);
    setShowAddCategory(false);
    setEditCatName('');
    setEditCatColor('#a78bfa');
    setEditCatIcon('circle');
    setEditCatType('expense');
    setEditCatBudget('0');
  };

  const startEditCategory = (cat: { id: string; name: string; color: string; icon: string; type: 'expense' | 'income' | 'both'; monthly_budget: number }) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
    setEditCatIcon(cat.icon);
    setEditCatType(cat.type);
    setEditCatBudget(cat.monthly_budget.toString());
    setShowAddCategory(true);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Las transacciones asociadas quedarán sin categoría.`)) return;
    await deleteCategoryDb(id);
    toast.success(`Categoría "${name}" eliminada`);
  };

  const addConcept = async () => {
    if (!newConcept.trim()) return;
    if (settings.incomeConcepts.includes(newConcept.trim())) return;
    const name = newConcept.trim();
    await updateSettings({ incomeConcepts: [...settings.incomeConcepts, name] });
    setNewConcept('');
    toast.success(`Concepto "${name}" añadido`);
  };

  const removeConcept = async (c: string) => {
    await updateSettings({ incomeConcepts: settings.incomeConcepts.filter((x) => x !== c) });
  };

  const handleThemeChange = async (theme: 'dark' | 'light' | 'system') => {
    setCachedTheme(theme); // immediate visual
    await updateSettings({ theme });
  };

  const handleSendReportNow = () => {
    toast.info('Los informes por email se activarán próximamente');
  };

  return (
    <>
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-th-text">Ajustes</h2>
        <p className="text-sm text-th-muted mt-1">Configuracion general de la aplicacion</p>
      </motion.div>

      {/* Account */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple font-bold">
              {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-th-text">{profile?.full_name || profile?.email}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  profile?.plan === 'pro' ? 'bg-accent-amber/15 text-accent-amber' : 'bg-th-hover text-th-muted'
                }`}>
                  {profile?.plan?.toUpperCase() || 'FREE'}
                </span>
                {profile?.role === 'admin' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-accent-purple/15 text-accent-purple flex items-center gap-1">
                    <Shield size={10} /> Admin
                  </span>
                )}
                {profile?.plan !== 'pro' && (
                  <motion.button
                    onClick={() => setPage('pricing')}
                    className="text-xs px-2 py-0.5 rounded bg-accent-purple/15 text-accent-purple font-medium hover:bg-accent-purple/25 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    Ver planes PRO
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          <motion.button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-th-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={14} /> Cerrar sesion
          </motion.button>
        </div>
      </motion.div>

      {/* Theme */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-3 card-glow">
        <h3 className="text-sm font-semibold text-th-text">Apariencia</h3>
        <div className="flex gap-2 flex-wrap">
          {([
            { value: 'dark' as const, label: 'Oscuro' },
            { value: 'light' as const, label: 'Claro' },
            { value: 'system' as const, label: 'Sistema' },
          ]).map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => handleThemeChange(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cachedTheme === opt.value
                  ? 'bg-accent-purple text-white'
                  : 'bg-th-hover text-th-secondary hover:text-th-text'
              }`}
              whileTap={{ scale: 0.95 }}
              aria-pressed={cachedTheme === opt.value}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Financial Settings */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 card-glow">
        <h3 className="text-sm font-semibold text-th-text">Datos financieros</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label htmlFor="set-balance" className="block text-xs text-th-muted mb-1.5">Saldo actual en cuenta</label>
            <input id="set-balance" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="set-emergency" className="block text-xs text-th-muted mb-1.5">Colchon emergencia</label>
            <input id="set-emergency" type="number" step="0.01" min="0" value={emergency} onChange={(e) => setEmergency(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="set-income" className="block text-xs text-th-muted mb-1.5">Nomina mensual</label>
            <input id="set-income" type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="set-cashback" className="block text-xs text-th-muted mb-1.5">Cashback neto/mes</label>
            <input id="set-cashback" type="number" step="0.01" value={cashback} onChange={(e) => setCashback(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="set-target" className="block text-xs text-th-muted mb-1.5">Fecha objetivo</label>
            <input id="set-target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="set-payday" className="block text-xs text-th-muted mb-1.5">Dia de cobro</label>
            <input id="set-payday" type="number" min="1" max="31" value={payDayInput} onChange={(e) => setPayDayInput(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="set-cycle" className="block text-xs text-th-muted mb-1.5">Ciclo mensual</label>
            <select id="set-cycle" value={cycleModeInput} onChange={(e) => setCycleModeInput(e.target.value as 'calendar' | 'payday')}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors">
              <option value="payday">Dia de cobro</option>
              <option value="calendar">Calendario (1-30)</option>
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-th-muted">
              Ingreso total:{' '}
              <span className="font-mono text-accent-green">
                {formatCurrency((parseFloat(income) || 0) + (parseFloat(cashback) || 0))}
              </span>
              /mes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Save size={14} /> Guardar cambios
          </motion.button>
          <AnimatePresence>
            {saved && (
              <motion.span className="text-accent-green text-sm font-medium"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                Guardado!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 card-glow">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-th-text">Gestionar categorías</h3>
          <motion.button
            onClick={() => { setEditingCatId(null); setEditCatName(''); setEditCatColor('#a78bfa'); setEditCatIcon('circle'); setEditCatType('expense'); setEditCatBudget('0'); setShowAddCategory(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple/15 text-accent-purple rounded-lg text-xs font-medium hover:bg-accent-purple/25 transition-colors"
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={12} /> Nueva categoría
          </motion.button>
        </div>

        {/* Add/Edit form */}
        <AnimatePresence>
          {showAddCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-th-hover rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-th-muted mb-1">Nombre</label>
                    <input type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                      placeholder="Ej: Supermercado"
                      className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-th-muted mb-1">Tipo</label>
                    <select value={editCatType} onChange={(e) => setEditCatType(e.target.value as 'expense' | 'income' | 'both')}
                      className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none">
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-th-muted mb-1">Color</label>
                    <input type="color" value={editCatColor} onChange={(e) => setEditCatColor(e.target.value)}
                      className="w-full h-8 rounded-lg cursor-pointer border border-th-border" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-th-muted mb-1">Icono</label>
                    <input type="text" value={editCatIcon} onChange={(e) => setEditCatIcon(e.target.value)}
                      placeholder="circle"
                      className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text focus:border-accent-purple focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-th-muted mb-1">Presupuesto</label>
                    <input type="number" min="0" step="1" value={editCatBudget} onChange={(e) => setEditCatBudget(e.target.value)}
                      className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-1.5 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <motion.button onClick={() => setShowAddCategory(false)}
                    className="px-3 py-1.5 text-xs text-th-muted hover:text-th-text transition-colors" whileTap={{ scale: 0.95 }}>
                    Cancelar
                  </motion.button>
                  <motion.button onClick={handleSaveCategory}
                    className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-xs font-medium hover:bg-accent-purple/80 transition-colors"
                    whileTap={{ scale: 0.95 }}>
                    {editingCatId ? 'Guardar cambios' : 'Crear categoría'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category list */}
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          <AnimatePresence>
            {dbCategories.map((cat) => (
              <motion.div key={cat.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-th-hover/50 group"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                layout
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-th-text flex-1 truncate">{cat.name}</span>
                <span className="text-[10px] text-th-muted px-1.5 py-0.5 bg-th-hover rounded">
                  {cat.type === 'expense' ? 'Gasto' : cat.type === 'income' ? 'Ingreso' : 'Ambos'}
                </span>
                {cat.monthly_budget > 0 && (
                  <span className="text-[10px] text-th-muted font-mono">{cat.monthly_budget}€</span>
                )}
                <motion.button onClick={() => startEditCategory(cat)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-th-muted hover:text-accent-purple transition-all"
                  whileTap={{ scale: 0.8 }} aria-label={`Editar ${cat.name}`}>
                  <Pencil size={12} />
                </motion.button>
                <motion.button onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-th-muted hover:text-accent-red transition-all"
                  whileTap={{ scale: 0.8 }} aria-label={`Eliminar ${cat.name}`}>
                  <Trash2 size={12} />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
          {dbCategories.length === 0 && (
            <p className="text-xs text-th-muted text-center py-4">No hay categorías. Crea la primera.</p>
          )}
        </div>
      </motion.div>

      {/* Income Concepts */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 card-glow-green">
        <h3 className="text-sm font-semibold text-th-text">Conceptos de ingreso</h3>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {settings.incomeConcepts.map((c) => (
              <motion.span key={c}
                className="flex items-center gap-1.5 text-xs bg-accent-green/10 px-3 py-1.5 rounded-lg text-accent-green"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                layout>
                {c}
                <motion.button onClick={() => removeConcept(c)}
                  className="text-accent-green/50 hover:text-accent-red transition-colors"
                  whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                  aria-label={`Eliminar concepto ${c}`}>
                  <X size={12} />
                </motion.button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <input type="text" value={newConcept} onChange={(e) => setNewConcept(e.target.value)}
            placeholder="Nuevo concepto" onKeyDown={(e) => e.key === 'Enter' && addConcept()}
            className="flex-1 bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-green focus:outline-none transition-colors" />
          <motion.button onClick={addConcept}
            className="px-3 py-2 bg-th-hover text-th-secondary rounded-lg hover:text-th-text transition-colors"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
            <Plus size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Supabase sync status */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow">
        <div className="flex items-center gap-3">
          <Cloud size={16} className="text-accent-green" />
          <div>
            <p className="text-sm font-medium text-th-text">Supabase conectado</p>
            <p className="text-xs text-th-muted">Los datos se sincronizan en la nube en tiempo real</p>
          </div>
        </div>
      </motion.div>

      {/* Import/Export */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 card-glow">
        <h3 className="text-sm font-semibold text-th-text">Datos</h3>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <motion.button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-cyan/15 text-accent-cyan rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-cyan/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Download size={14} /> Exportar JSON
          </motion.button>
          <motion.button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-amber/15 text-accent-amber rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-amber/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Upload size={14} /> Importar JSON
          </motion.button>
          <motion.button onClick={() => setShowExcelImport(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-green/15 text-accent-green rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-green/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <FileSpreadsheet size={14} /> Importar Excel
          </motion.button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          <motion.button onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-red/15 text-accent-red rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-red/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <RotateCcw size={14} /> Reset
          </motion.button>
        </div>
        <AnimatePresence>
          {importMsg && (
            <motion.p
              className={`text-sm ${importMsg.includes('Error') ? 'text-accent-red' : 'text-accent-green'}`}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {importMsg}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Excel Import Flow */}
      <ExcelImportFlow
        open={showExcelImport}
        onClose={() => setShowExcelImport(false)}
      />

      {/* Confirm Reset Modal */}
      <AnimatePresence>
        {showConfirmReset && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowConfirmReset(false)}>
            <motion.div
              className="bg-th-card rounded-xl p-5 md:p-6 border border-th-border-strong max-w-sm w-full space-y-4"
              variants={scaleFade} initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-th-text">Confirmar reset</h3>
              <p className="text-sm text-th-secondary">
                Esto eliminara todos los gastos, ingresos, fases y categorias de tu cuenta en Supabase. Los datos no se pueden recuperar.
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
                  whileTap={{ scale: 0.95 }}>
                  Cancelar
                </motion.button>
                <motion.button onClick={handleReset}
                  className="px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-medium hover:bg-accent-red/80 transition-colors"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  Resetear todo
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Reports (PRO) */}
      {profile?.plan === 'pro' && (
        <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 card-glow">
          <h3 className="text-sm font-semibold text-th-text flex items-center gap-2">
            <Mail size={14} className="text-accent-purple" /> Informes por email
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile?.email_reports_enabled ?? false}
                onChange={() => {
                  // email reports — coming soon
                }}
                className="w-4 h-4 rounded border-th-border text-accent-purple focus:ring-accent-purple/30 bg-th-input"
                disabled
              />
              <span className="text-sm text-th-secondary">Recibir informes periodicos</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={profile?.email_reports_frequency || 'monthly'}
              onChange={() => {}}
              className="bg-th-input border border-th-border rounded-lg px-3 py-1.5 text-sm text-th-text"
              disabled
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="biannual">Semestral</option>
              <option value="annual">Anual</option>
            </select>
            <motion.button
              onClick={handleSendReportNow}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent-purple/15 text-accent-purple rounded-lg text-xs font-medium hover:bg-accent-purple/25 transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              <Send size={12} />
              Enviar informe ahora
              <span className="px-1.5 py-0.5 bg-accent-amber/20 text-accent-amber rounded text-[10px] font-semibold">Próximamente</span>
            </motion.button>
          </div>
          {profile?.email_reports_last_sent && (
            <p className="text-xs text-th-muted">
              Ultimo informe: {new Date(profile.email_reports_last_sent).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </motion.div>
      )}

      {/* Legal / RGPD */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-3 card-glow">
        <h3 className="text-sm font-semibold text-th-text">Privacidad y datos</h3>
        <div className="flex flex-wrap gap-2">
          <motion.button onClick={() => setShowPrivacyModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-accent-purple/15 text-accent-purple rounded-lg text-xs font-medium hover:bg-accent-purple/25 transition-colors"
            whileTap={{ scale: 0.97 }}>
            <ExternalLink size={12} /> Politica de privacidad
          </motion.button>
          <motion.button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-accent-cyan/15 text-accent-cyan rounded-lg text-xs font-medium hover:bg-accent-cyan/25 transition-colors"
            whileTap={{ scale: 0.97 }}>
            <Download size={12} /> Exportar mis datos (RGPD)
          </motion.button>
        </div>
      </motion.div>

      {/* Zona de peligro */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-accent-red/20 space-y-3">
        <h3 className="text-sm font-semibold text-accent-red flex items-center gap-2">
          <UserX size={14} /> Zona de peligro
        </h3>
        <p className="text-xs text-th-secondary">
          Esta accion es irreversible. Se borraran todos tus datos permanentemente.
        </p>
        <motion.button onClick={() => setShowDeleteAccount(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent-red/15 text-accent-red rounded-lg text-xs font-medium hover:bg-accent-red/25 transition-colors"
          whileTap={{ scale: 0.97 }}>
          <Trash2 size={12} /> Eliminar cuenta
        </motion.button>
      </motion.div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteAccount && (
          <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(''); }}>
            <motion.div
              className="bg-th-card rounded-xl p-5 md:p-6 border border-accent-red/30 max-w-sm w-full space-y-4"
              variants={scaleFade} initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-red/15 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-accent-red" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-th-text">Eliminar cuenta</h3>
                  <p className="text-xs text-th-muted">Esta accion es irreversible</p>
                </div>
              </div>
              <p className="text-sm text-th-secondary">
                Se eliminaran <strong className="text-th-text">todos tus datos</strong>: gastos, ingresos, fases, categorias y configuracion. Tu cuenta sera borrada permanentemente.
              </p>
              <div>
                <label className="block text-xs text-th-muted mb-2">
                  Escribe <span className="font-mono font-bold text-accent-red">ELIMINAR</span> para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-red focus:outline-none transition-colors"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <motion.button
                  onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(''); }}
                  className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
                  whileTap={{ scale: 0.95 }}>
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'ELIMINAR' || deleteLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-red/80 transition-colors"
                  whileHover={{ scale: deleteConfirmText === 'ELIMINAR' ? 1.02 : 1 }}
                  whileTap={{ scale: 0.97 }}>
                  {deleteLoading ? 'Eliminando...' : 'Eliminar cuenta'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Import Modal */}
      <AnimatePresence>
        {showConfirmImport && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowConfirmImport(false)}>
            <motion.div
              className="bg-th-card rounded-xl p-5 md:p-6 border border-th-border-strong max-w-sm w-full space-y-4"
              variants={scaleFade} initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-th-text">Confirmar importacion</h3>
              <p className="text-sm text-th-secondary">
                Los datos del archivo JSON se anadiran a tu cuenta actual en Supabase.
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button onClick={() => setShowConfirmImport(false)}
                  className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
                  whileTap={{ scale: 0.95 }}>
                  Cancelar
                </motion.button>
                <motion.button onClick={handleConfirmImport}
                  className="px-4 py-2 bg-accent-amber text-white rounded-lg text-sm font-medium hover:bg-accent-amber/80 transition-colors"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  Importar datos
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    <PrivacyPolicyModal open={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </>
  );
}

