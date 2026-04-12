import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, X, Check, AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useAppData } from '../../lib/DataProvider';
import { usePlan } from '../../hooks/usePlan';
import { usePaywall } from './PaywallModal';
import { useToast } from './Toast';
import { ColumnMapper } from './ColumnMapper';
import {
  readExcelFile,
  buildImportSummary,
  insertTransactions,
  type ImportSummary,
  type ColumnMapping,
} from '../../utils/excelImport';
import { scaleFade, buttonTap } from '../../utils/animations';

type FlowStep = 'upload' | 'mapping' | 'parsing' | 'summary' | 'inserting';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ExcelImportFlow({ open, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const { expenses, settings, updateSettings } = useAppData();
  const { maxExcelImports, maxMovementsPerImport } = usePlan();
  const paywall = usePaywall();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<FlowStep>('upload');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickingFile, setPickingFile] = useState(false);

  // For column mapping fallback
  const [rawRows, setRawRows] = useState<unknown[][] | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<string[][]>([]);

  const reset = () => {
    setStep('upload');
    setSummary(null);
    setError(null);
    setPickingFile(false);
    setRawRows(null);
    setPreviewHeaders([]);
    setPreviewData([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBackdropClick = () => {
    if (pickingFile || step === 'parsing' || step === 'inserting') return;
    handleClose();
  };

  // ─── Open file picker ────────────────────────────────────
  const handleUploadClick = () => {
    // Check import limit for free users
    const hasExistingImport = expenses.some((e) => e.source === 'excel_import');
    if (maxExcelImports === 1 && hasExistingImport) {
      paywall.open('Importaciones ilimitadas');
      return;
    }
    setError(null);
    setPickingFile(true);
    setTimeout(() => fileRef.current?.click(), 150);
  };

  // ─── Process file after auto-detect or manual mapping ────
  const processWithMapping = useCallback(async (rows: unknown[][], mapping: ColumnMapping) => {
    if (!user) return;
    setStep('parsing');

    try {
      const result = await buildImportSummary(rows, mapping, user.id);

      // Check movement-per-import limit
      if (result.newOnes.length > maxMovementsPerImport) {
        paywall.open('Importar mas de 50 movimientos por archivo');
        setStep('upload');
        return;
      }

      setSummary(result);
      setStep('summary');

      if (result.errors.length > 0) {
        toast.warning(`Se omitieron ${result.errors.length} filas con datos incompletos.`);
      }
    } catch (err) {
      console.error('[ExcelImport] Parse error:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo procesar el archivo.';
      setError(msg);
      setStep('upload');
      toast.error(msg);
    }
  }, [user, maxMovementsPerImport, paywall, toast]);

  // ─── File selected → read + auto-detect ──────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPickingFile(false);
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      toast.error('Formato no soportado. Sube un archivo .xlsx, .xls o .csv');
      return;
    }

    setStep('parsing');
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const { rows, autoMapping, preview } = readExcelFile(buffer, file.name);

      if (rows.length < 2) {
        throw new Error('El archivo esta vacio o no contiene datos suficientes.');
      }

      if (autoMapping) {
        // Auto-detected! Parse directly
        console.log('[ExcelImport] Auto-detected columns:', autoMapping);
        await processWithMapping(rows, autoMapping);
      } else {
        // Need manual mapping
        console.log('[ExcelImport] Could not auto-detect columns, showing mapper');
        setRawRows(rows);
        setPreviewHeaders(preview.headers);
        setPreviewData(preview.data);
        setStep('mapping');
      }
    } catch (err) {
      console.error('[ExcelImport] Read error:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo leer el archivo.';
      setError(msg);
      setStep('upload');
      toast.error(msg);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [user, toast, processWithMapping]);

  // ─── Manual mapping confirmed ────────────────────────────
  const handleMappingConfirm = useCallback(async (mapping: ColumnMapping) => {
    if (!rawRows) return;
    // Adjust headerRow: the ColumnMapper passes 0 as placeholder,
    // but we need to find the actual header row from the preview
    // The preview was built from the raw rows, so headerRow 0 = first row with content
    // We need to find it in the raw data
    let headerRow = 0;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i] as unknown[];
      if (!row) continue;
      const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
      if (nonEmpty >= 2) {
        headerRow = i;
        break;
      }
    }
    const finalMapping = { ...mapping, headerRow };
    await processWithMapping(rawRows, finalMapping);
  }, [rawRows, processWithMapping]);

  // ─── Confirm insert ──────────────────────────────────────
  const handleConfirmInsert = async () => {
    if (!summary || !user) return;

    if (summary.newOnes.length === 0) {
      toast.info('Todos los registros ya estan en tu cuenta.');
      handleClose();
      return;
    }

    setStep('inserting');

    try {
      const { inserted, failed } = await insertTransactions(user.id, summary.newOnes);

      if (failed === 0) {
        const dupeMsg = summary.duplicates.length > 0
          ? ` ${summary.duplicates.length} duplicados descartados.`
          : '';
        toast.success(`Importacion completada: ${inserted} registros importados.${dupeMsg}`);
      } else if (inserted > 0) {
        toast.warning(`Se importaron ${inserted} de ${inserted + failed}. ${failed} fallaron.`);
      } else {
        toast.error('Error al importar: no se pudieron guardar los registros.');
      }

      // Update balance with imported transactions
      if (inserted > 0) {
        const totalExpenses = summary.newOnes
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);
        const totalIncome = summary.newOnes
          .filter((t) => t.type === 'income')
          .reduce((s, t) => s + t.amount, 0);
        const balanceDelta = totalIncome - totalExpenses;
        await updateSettings({ currentBalance: settings.currentBalance + balanceDelta });

        // Award points for Excel import (fire-and-forget)
        try {
          await supabase.from('point_events').insert({ user_id: user.id, points: 50, reason: 'Importar Excel' });
          const { data: profileData } = await supabase.from('profiles').select('points').eq('id', user.id).single();
          if (profileData) {
            await supabase.from('profiles').update({ points: (profileData.points || 0) + 50 }).eq('id', user.id);
          }
        } catch { /* non-critical */ }
      }

      onComplete?.();
      handleClose();
    } catch (err) {
      console.error('[ExcelImport] Insert error:', err);
      toast.error('Error de conexion. Intentalo de nuevo.');
      setStep('summary');
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
          className="bg-th-card rounded-2xl p-5 md:p-6 border border-th-border-strong max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto"
          variants={scaleFade}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Upload step ───────────────────────────────── */}
          {step === 'upload' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-th-text flex items-center gap-2">
                  <Upload size={20} className="text-accent-purple" />
                  Importar movimientos
                </h3>
                <button onClick={handleClose} className="text-th-muted hover:text-th-text transition-colors">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-th-secondary">
                Sube el extracto de tu banco en Excel (.xlsx, .xls) o CSV. Se detectaran las columnas automaticamente.
              </p>

              <motion.button
                onClick={handleUploadClick}
                disabled={pickingFile}
                className="w-full flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-th-border hover:border-accent-purple hover:bg-accent-purple/5 transition-colors cursor-pointer"
                {...buttonTap}
              >
                <FileSpreadsheet size={36} className="text-accent-purple" />
                <span className="text-sm font-medium text-th-text">Seleccionar archivo</span>
                <span className="text-[11px] text-th-muted">Compatible con cualquier banco</span>
              </motion.button>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-xs text-accent-red">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <p className="text-[11px] text-th-faint text-center">
                Funciona con BBVA, Unicaja, CaixaBank, Santander, ING y cualquier otro banco.
                Si no se detectan las columnas, podras mapearlas manualmente.
              </p>
            </>
          )}

          {/* ─── Column Mapping step ───────────────────────── */}
          {step === 'mapping' && (
            <ColumnMapper
              headers={previewHeaders}
              previewData={previewData}
              onConfirm={handleMappingConfirm}
              onCancel={handleClose}
            />
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
                Se encontraron <strong className="text-th-text">{summary.all.length}</strong> movimientos:
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

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
