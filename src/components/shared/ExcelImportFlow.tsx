import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, X, Check, AlertTriangle,
  Loader2, Building2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from './Toast';
import { BANK_LIST } from '../../lib/excel-parsers';
import {
  buildImportSummary,
  insertTransactions,
  type ImportSummary,
} from '../../utils/excelImport';
import { scaleFade, buttonTap } from '../../utils/animations';

type FlowStep = 'bank' | 'parsing' | 'summary' | 'inserting';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ExcelImportFlow({ open, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<FlowStep>('bank');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guard: prevent backdrop close while the native file picker is open
  const [pickingFile, setPickingFile] = useState(false);

  const reset = () => {
    setStep('bank');
    setSelectedBank(null);
    setSummary(null);
    setError(null);
    setPickingFile(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBackdropClick = () => {
    // Don't close during file picking, parsing, or inserting
    if (pickingFile || step === 'parsing' || step === 'inserting') return;
    handleClose();
  };

  // ─── Step 1: Bank selected → open file picker ───────────
  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId);
    setError(null);
    setPickingFile(true);
    // Small delay so React can flush the state update before the native dialog opens
    setTimeout(() => {
      console.log('[ExcelImport] Opening file picker for bank:', bankId);
      fileRef.current?.click();
    }, 150);
  };

  // ─── Step 2: File selected → parse + dedup ──────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickingFile(false);
    const file = e.target.files?.[0];
    console.log('[ExcelImport] onChange fired. File:', file?.name, 'Size:', file?.size, 'Bank:', selectedBank);

    if (!file) {
      // User cancelled the file picker
      console.log('[ExcelImport] No file selected (user cancelled)');
      return;
    }

    if (!selectedBank || !user) {
      console.error('[ExcelImport] Missing selectedBank or user', { selectedBank, user: !!user });
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Formato no soportado. Sube un archivo Excel (.xlsx)');
      return;
    }

    console.log('[ExcelImport] Starting parse...');
    setStep('parsing');
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      console.log('[ExcelImport] ArrayBuffer read, size:', buffer.byteLength);
      const result = await buildImportSummary(selectedBank, buffer, user.id);
      console.log('[ExcelImport] Summary built:', {
        total: result.all.length,
        new: result.newOnes.length,
        dupes: result.duplicates.length,
        errors: result.errors.length,
      });
      setSummary(result);
      setStep('summary');

      if (result.errors.length > 0) {
        toast.warning(`Se omitieron ${result.errors.length} filas con datos incompletos o fechas invalidas.`);
      }
    } catch (err) {
      console.error('[ExcelImport] Parse error:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo leer el archivo. Comprueba que no esta danado.';
      setError(msg);
      setStep('bank');
      toast.error(msg);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [selectedBank, user, toast]);

  // ─── Step 3: User confirms → insert ─────────────────────
  const handleConfirmInsert = async () => {
    if (!summary || !user) return;

    const newCount = summary.newOnes.length;
    if (newCount === 0) {
      toast.info('Todos los registros ya estan en tu cuenta. No se ha importado nada.');
      handleClose();
      return;
    }

    setStep('inserting');

    try {
      // insertTransactions now handles category creation internally
      const { inserted, failed } = await insertTransactions(user.id, summary.newOnes);

      if (failed === 0) {
        const dupeMsg = summary.duplicates.length > 0
          ? ` ${summary.duplicates.length} duplicados descartados.`
          : '';
        toast.success(`Importacion completada: ${inserted} registros importados.${dupeMsg}`);
      } else if (inserted > 0) {
        toast.warning(`Se importaron ${inserted} de ${inserted + failed} registros. ${failed} no se pudieron guardar.`);
      } else {
        toast.error('Error al importar: no se pudieron guardar los registros.');
      }

      onComplete?.();
      handleClose();
    } catch (err) {
      console.error('[ExcelImport] Insert error:', err);
      toast.error('Error de conexion. Comprueba tu internet e intentalo de nuevo.');
      setStep('summary'); // Let them retry
    }
  };

  if (!open) return null;

  const newExpenses = summary?.newOnes.filter((t) => t.type === 'expense').length ?? 0;
  const newIncomes = summary?.newOnes.filter((t) => t.type === 'income').length ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      >
        <motion.div
          className="bg-th-card rounded-2xl p-5 md:p-6 border border-th-border-strong max-w-md w-full space-y-4"
          variants={scaleFade}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Bank Selector ──────────────────────────────── */}
          {step === 'bank' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-th-text flex items-center gap-2">
                  <Upload size={20} className="text-accent-purple" />
                  Importar Excel
                </h3>
                <button onClick={handleClose} className="text-th-muted hover:text-th-text transition-colors">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-th-secondary">
                ¿De que banco es tu extracto?
              </p>

              <div className="grid grid-cols-3 gap-2">
                {BANK_LIST.map((bank) => (
                  <motion.button
                    key={bank.id}
                    onClick={() => bank.enabled && handleBankSelect(bank.id)}
                    disabled={!bank.enabled || pickingFile}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                      bank.enabled
                        ? 'border-th-border hover:border-accent-purple hover:bg-accent-purple/5 text-th-text cursor-pointer'
                        : 'border-th-border/50 text-th-faint cursor-not-allowed opacity-50'
                    } ${selectedBank === bank.id ? 'border-accent-purple bg-accent-purple/10' : ''}`}
                    {...(bank.enabled ? buttonTap : {})}
                  >
                    <Building2 size={20} className={bank.enabled ? 'text-accent-purple' : 'text-th-faint'} />
                    {bank.name}
                    {!bank.enabled && <span className="text-[9px] text-th-faint">Proximamente</span>}
                  </motion.button>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-xs text-accent-red">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <p className="text-[11px] text-th-faint text-center">
                Solo soportamos BBVA por ahora. Mas bancos proximamente.
              </p>
            </>
          )}

          {/* ─── Parsing spinner ────────────────────────────── */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="text-accent-purple animate-spin" />
              <p className="text-sm text-th-secondary">Analizando archivo...</p>
            </div>
          )}

          {/* ─── Summary ────────────────────────────────────── */}
          {step === 'summary' && summary && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-th-text flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-accent-green" />
                  Resumen de importacion
                </h3>
                <button onClick={handleClose} className="text-th-muted hover:text-th-text transition-colors">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-th-secondary">
                Se encontraron <strong className="text-th-text">{summary.all.length}</strong> movimientos en el archivo:
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-th-secondary flex items-center gap-1.5">
                    <Check size={12} className="text-accent-green" /> Gastos nuevos
                  </span>
                  <span className="font-mono text-accent-red">{newExpenses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-th-secondary flex items-center gap-1.5">
                    <Check size={12} className="text-accent-green" /> Ingresos nuevos
                  </span>
                  <span className="font-mono text-accent-green">{newIncomes}</span>
                </div>
                {summary.duplicates.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-th-muted flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-accent-amber" /> Duplicados descartados
                    </span>
                    <span className="font-mono text-th-muted">{summary.duplicates.length}</span>
                  </div>
                )}
                {summary.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-accent-red flex items-center gap-1.5">
                        <X size={12} /> Errores
                      </span>
                      <span className="font-mono text-accent-red">{summary.errors.length}</span>
                    </div>
                    <div className="text-xs text-th-muted space-y-0.5 max-h-20 overflow-y-auto">
                      {summary.errors.slice(0, 5).map((err, i) => (
                        <p key={i}>Fila {err.row}: {err.reason}</p>
                      ))}
                      {summary.errors.length > 5 && <p>...y {summary.errors.length - 5} mas</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <motion.button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={handleConfirmInsert}
                  disabled={summary.newOnes.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:bg-accent-green/80 transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Check size={14} />
                  {summary.newOnes.length > 0
                    ? `Importar ${summary.newOnes.length} registros`
                    : 'Todo duplicado'}
                </motion.button>
              </div>
            </>
          )}

          {/* ─── Inserting spinner ──────────────────────────── */}
          {step === 'inserting' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="text-accent-green animate-spin" />
              <p className="text-sm text-th-secondary">Importando registros...</p>
            </div>
          )}

          {/* Hidden file input — INSIDE the stopPropagation div so closing
              the native file picker doesn't fire a click on the backdrop */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
