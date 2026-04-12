import { useState } from 'react';
import { motion } from 'framer-motion';
import { Columns3, Check, ArrowRight } from 'lucide-react';
import type { ColumnMapping } from '../../lib/excel-parsers/universal-parser';

interface Props {
  headers: string[];
  previewData: string[][];
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

export function ColumnMapper({ headers, previewData, onConfirm, onCancel }: Props) {
  const [dateCol, setDateCol] = useState(-1);
  const [conceptCol, setConceptCol] = useState(-1);
  const [amountCol, setAmountCol] = useState(-1);
  const [detailCol, setDetailCol] = useState(-1);

  const isValid = dateCol >= 0 && amountCol >= 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      dateCol,
      conceptCol: conceptCol >= 0 ? conceptCol : dateCol === 0 ? 1 : 0,
      amountCol,
      detailCol: detailCol >= 0 ? detailCol : null,
      headerRow: 0, // will be adjusted by the caller
    });
  };

  const colOptions = [
    { value: -1, label: 'No usar' },
    ...headers.map((h, i) => ({ value: i, label: h || `Columna ${i + 1}` })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Columns3 size={20} className="text-accent-purple" />
        <h3 className="text-lg font-semibold text-th-text">Mapear columnas</h3>
      </div>

      <p className="text-sm text-th-secondary">
        No se detectaron las columnas automaticamente. Indica que columna corresponde a cada campo:
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-th-muted mb-1">Fecha *</label>
          <select
            value={dateCol}
            onChange={(e) => setDateCol(Number(e.target.value))}
            className="w-full bg-th-input border border-th-border rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none"
          >
            {colOptions.map((o) => <option key={`d${o.value}`} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-th-muted mb-1">Concepto / Descripcion</label>
          <select
            value={conceptCol}
            onChange={(e) => setConceptCol(Number(e.target.value))}
            className="w-full bg-th-input border border-th-border rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none"
          >
            {colOptions.map((o) => <option key={`c${o.value}`} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-th-muted mb-1">Importe *</label>
          <select
            value={amountCol}
            onChange={(e) => setAmountCol(Number(e.target.value))}
            className="w-full bg-th-input border border-th-border rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none"
          >
            {colOptions.map((o) => <option key={`a${o.value}`} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-th-muted mb-1">Detalle adicional (opcional)</label>
          <select
            value={detailCol}
            onChange={(e) => setDetailCol(Number(e.target.value))}
            className="w-full bg-th-input border border-th-border rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:outline-none"
          >
            {colOptions.map((o) => <option key={`dt${o.value}`} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Preview table */}
      {previewData.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-th-border">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-th-hover">
                {headers.map((h, i) => (
                  <th key={i} className={`px-2 py-1.5 text-left text-th-muted font-medium border-b border-th-border ${
                    i === dateCol ? 'bg-accent-purple/10 text-accent-purple' :
                    i === conceptCol ? 'bg-accent-blue/10 text-accent-blue' :
                    i === amountCol ? 'bg-accent-green/10 text-accent-green' :
                    i === detailCol ? 'bg-accent-amber/10 text-accent-amber' : ''
                  }`}>
                    {h || `Col ${i + 1}`}
                    {i === dateCol && <span className="ml-1 text-[8px]">FECHA</span>}
                    {i === conceptCol && <span className="ml-1 text-[8px]">CONCEPTO</span>}
                    {i === amountCol && <span className="ml-1 text-[8px]">IMPORTE</span>}
                    {i === detailCol && <span className="ml-1 text-[8px]">DETALLE</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 4).map((row, ri) => (
                <tr key={ri} className="border-b border-th-border/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-2 py-1 text-th-text truncate max-w-[120px] ${
                      ci === dateCol ? 'bg-accent-purple/5' :
                      ci === conceptCol ? 'bg-accent-blue/5' :
                      ci === amountCol ? 'bg-accent-green/5' :
                      ci === detailCol ? 'bg-accent-amber/5' : ''
                    }`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-1">
        <motion.button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-th-secondary hover:text-th-text transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          Cancelar
        </motion.button>
        <motion.button
          onClick={handleConfirm}
          disabled={!isValid}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80 transition-colors disabled:opacity-50"
          whileHover={isValid ? { scale: 1.02 } : {}}
          whileTap={isValid ? { scale: 0.97 } : {}}
        >
          {isValid ? <><Check size={14} /> Continuar</> : <><ArrowRight size={14} /> Selecciona Fecha e Importe</>}
        </motion.button>
      </div>
    </div>
  );
}
