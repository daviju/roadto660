import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Download, Upload, RotateCcw, Plus, X, Cloud, CloudOff, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/format';
import { staggerContainer, fadeUp, scaleFade, collapseVariants } from '../../utils/animations';
import { isFirebaseConfigured } from '../../firebase/config';
import { parseExcelFile, movementsToRecords } from '../../utils/excelImport';
import type { ImportSummary } from '../../utils/excelImport';

export function Settings() {
  const { settings, updateSettings, exportData, importData, resetData, expenses, incomes, addExpenses, addIncomes } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [balance, setBalance] = useState(settings.currentBalance.toString());
  const [emergency, setEmergency] = useState(settings.emergencyFund.toString());
  const [income, setIncome] = useState(settings.monthlyIncome.toString());
  const [cashback, setCashback] = useState(settings.cashbackNet.toString());
  const [targetDate, setTargetDate] = useState(settings.targetDate);
  const [newCategory, setNewCategory] = useState('');
  const [newConcept, setNewConcept] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [pendingImportJson, setPendingImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [payDayInput, setPayDayInput] = useState(settings.payDay.toString());
  const [cycleModeInput, setCycleModeInput] = useState(settings.cycleMode);
  const firebaseActive = isFirebaseConfigured();

  // Excel import state
  const [excelSummary, setExcelSummary] = useState<ImportSummary | null>(null);
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelMsg, setExcelMsg] = useState('');

  const handleSave = () => {
    updateSettings({
      currentBalance: parseFloat(balance) || 0,
      emergencyFund: parseFloat(emergency) || 0,
      monthlyIncome: parseFloat(income) || 0,
      cashbackNet: parseFloat(cashback) || 0,
      targetDate,
      payDay: Math.max(1, Math.min(31, parseInt(payDayInput) || 28)),
      cycleMode: cycleModeInput,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadto660-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    setImportMsg(success ? 'Datos importados y sincronizados' : 'Error al importar los datos');
    setTimeout(() => setImportMsg(''), 3000);
    setShowConfirmImport(false);
    setPendingImportJson('');
  };

  const handleExcelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const summary = parseExcelFile(buffer, expenses, incomes);
        setExcelSummary(summary);
      } catch {
        setExcelMsg('Error al leer el archivo Excel');
        setTimeout(() => setExcelMsg(''), 3000);
      }
    };
    reader.readAsArrayBuffer(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleConfirmExcel = () => {
    if (!excelSummary) return;
    setExcelImporting(true);
    const { expenses: newExp, incomes: newInc } = movementsToRecords(excelSummary.movements);
    if (newExp.length > 0) addExpenses(newExp);
    if (newInc.length > 0) addIncomes(newInc);
    setExcelMsg(`Importados: ${newExp.length} gastos, ${newInc.length} ingresos`);
    setExcelSummary(null);
    setExcelImporting(false);
    setTimeout(() => setExcelMsg(''), 4000);
  };

  const handleReset = () => {
    resetData();
    const defs = useStore.getState().settings;
    setBalance(defs.currentBalance.toString());
    setEmergency(defs.emergencyFund.toString());
    setIncome(defs.monthlyIncome.toString());
    setCashback(defs.cashbackNet.toString());
    setTargetDate(defs.targetDate);
    setPayDayInput(defs.payDay.toString());
    setCycleModeInput(defs.cycleMode);
    setShowConfirmReset(false);
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (settings.categories.includes(newCategory.trim())) return;
    updateSettings({ categories: [...settings.categories, newCategory.trim()] });
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    updateSettings({ categories: settings.categories.filter((c) => c !== cat) });
  };

  const addConcept = () => {
    if (!newConcept.trim()) return;
    if (settings.incomeConcepts.includes(newConcept.trim())) return;
    updateSettings({ incomeConcepts: [...settings.incomeConcepts, newConcept.trim()] });
    setNewConcept('');
  };

  const removeConcept = (c: string) => {
    updateSettings({ incomeConcepts: settings.incomeConcepts.filter((x) => x !== c) });
  };

  const handleThemeChange = (theme: 'dark' | 'light' | 'system') => {
    updateSettings({ theme });
  };

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-th-text">Ajustes</h2>
        <p className="text-sm text-th-muted mt-1">Configuracion general de la aplicacion</p>
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
                settings.theme === opt.value
                  ? 'bg-accent-purple text-white'
                  : 'bg-th-hover text-th-secondary hover:text-th-text'
              }`}
              whileTap={{ scale: 0.95 }}
              aria-label={`Tema ${opt.label}`}
              aria-pressed={settings.theme === opt.value}
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
            <label htmlFor="set-balance" className="block text-xs text-th-muted mb-1.5">Saldo actual</label>
            <input id="set-balance" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text font-mono focus:border-accent-purple focus:outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="set-emergency" className="block text-xs text-th-muted mb-1.5">Colchon emergencia</label>
            <input id="set-emergency" type="number" step="0.01" value={emergency} onChange={(e) => setEmergency(e.target.value)}
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
          <div>
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
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} aria-label="Guardar cambios">
            <Save size={14} aria-hidden="true" /> Guardar cambios
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
        <h3 className="text-sm font-semibold text-th-text">Categorias de gasto</h3>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {settings.categories.map((cat) => (
              <motion.span key={cat}
                className="flex items-center gap-1.5 text-xs bg-th-hover px-3 py-1.5 rounded-lg text-th-secondary"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                layout transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                {cat}
                <motion.button onClick={() => removeCategory(cat)}
                  className="text-th-muted hover:text-accent-red transition-colors"
                  whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                  aria-label={`Eliminar categoria ${cat}`}>
                  <X size={12} />
                </motion.button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex gap-2">
          <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nueva categoria" onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            className="flex-1 bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none transition-colors"
            aria-label="Nueva categoria" />
          <motion.button onClick={addCategory}
            className="px-3 py-2 bg-th-hover text-th-secondary rounded-lg hover:text-th-text hover:bg-th-hover transition-colors"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} aria-label="Anadir categoria">
            <Plus size={16} />
          </motion.button>
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
                layout transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
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
            className="flex-1 bg-th-input border border-th-border-strong rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-green focus:outline-none transition-colors"
            aria-label="Nuevo concepto" />
          <motion.button onClick={addConcept}
            className="px-3 py-2 bg-th-hover text-th-secondary rounded-lg hover:text-th-text hover:bg-th-hover transition-colors"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} aria-label="Anadir concepto">
            <Plus size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Sync status */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border card-glow">
        <div className="flex items-center gap-3">
          {firebaseActive ? (
            <>
              <Cloud size={16} className="text-accent-green" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-th-text">Firebase conectado</p>
                <p className="text-xs text-th-muted">Los datos se sincronizan en tiempo real entre dispositivos</p>
              </div>
            </>
          ) : (
            <>
              <CloudOff size={16} className="text-th-muted" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-th-text">Solo almacenamiento local</p>
                <p className="text-xs text-th-muted">Configura Firebase en src/firebase/config.ts para sincronizar</p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Import/Export */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 md:p-5 border border-th-border space-y-4 card-glow">
        <h3 className="text-sm font-semibold text-th-text">Datos</h3>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <motion.button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-cyan/15 text-accent-cyan rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-cyan/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Exportar JSON">
            <Download size={14} aria-hidden="true" /> Exportar JSON
          </motion.button>
          <motion.button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-amber/15 text-accent-amber rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-amber/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Importar JSON">
            <Upload size={14} aria-hidden="true" /> Importar JSON
          </motion.button>
          <motion.button onClick={() => excelInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-green/15 text-accent-green rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-green/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Importar Excel bancario">
            <FileSpreadsheet size={14} aria-hidden="true" /> Importar Excel
          </motion.button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelSelect} className="hidden" />
          <motion.button onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-accent-red/15 text-accent-red rounded-xl text-xs sm:text-sm font-medium hover:bg-accent-red/25 transition-colors"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} aria-label="Resetear datos">
            <RotateCcw size={14} aria-hidden="true" /> Reset
          </motion.button>
        </div>
        <AnimatePresence>
          {(importMsg || excelMsg) && (
            <motion.p
              className={`text-sm ${(importMsg || excelMsg).includes('Error') ? 'text-accent-red' : 'text-accent-green'}`}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {importMsg || excelMsg}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Excel Import Summary Modal */}
      <AnimatePresence>
        {excelSummary && (
          <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setExcelSummary(null)}>
            <motion.div
              className="bg-th-card rounded-xl p-5 md:p-6 border border-th-border-strong max-w-md w-full space-y-4"
              variants={scaleFade} initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-th-text flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-accent-green" aria-hidden="true" />
                Resumen de importacion
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-th-secondary">Total movimientos</span>
                  <span className="font-mono text-th-text">{excelSummary.movements.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-th-secondary">Nuevos gastos</span>
                  <span className="font-mono text-accent-red">{excelSummary.newExpenses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-th-secondary">Nuevos ingresos</span>
                  <span className="font-mono text-accent-green">{excelSummary.newIncomes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-th-secondary">Duplicados (omitidos)</span>
                  <span className="font-mono text-th-muted">{excelSummary.duplicates}</span>
                </div>
                {excelSummary.uncategorized > 0 && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-accent-amber flex items-center gap-1">
                      <AlertTriangle size={12} aria-hidden="true" /> Sin categorizar
                    </span>
                    <span className="font-mono text-accent-amber">{excelSummary.uncategorized}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <motion.button onClick={() => setExcelSummary(null)}
                  className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
                  whileTap={{ scale: 0.95 }}>
                  Cancelar
                </motion.button>
                <motion.button onClick={handleConfirmExcel} disabled={excelImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:bg-accent-green/80 transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Check size={14} aria-hidden="true" /> Importar {excelSummary.newExpenses + excelSummary.newIncomes} registros
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                Esto eliminara todos los gastos, ingresos y configuraciones personalizadas
                {firebaseActive ? ' en todos los dispositivos' : ''}.
                Los datos no se pueden recuperar.
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
                Esto reemplazara todos los datos actuales con el archivo seleccionado
                {firebaseActive ? ' y se sincronizara con todos los dispositivos' : ''}.
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
  );
}
