import * as XLSX from 'xlsx';
import {
  autoDetectColumns,
  universalParse,
  getPreviewRows,
  type ColumnMapping,
} from '../lib/excel-parsers';
import type { RawTransaction, ParseResult, ParseError } from '../lib/excel-parsers';
import { supabase } from '../lib/supabase';

// ─── Public types ─────────────────────────────────────────────

export type { RawTransaction, ParseError, ColumnMapping };

export interface ImportSummary {
  all: RawTransaction[];
  newOnes: RawTransaction[];
  duplicates: RawTransaction[];
  errors: ParseError[];
  totalRows: number;
  skippedRows: number;
}

export interface ReadFileResult {
  rows: unknown[][];
  autoMapping: ColumnMapping | null;
  preview: { headers: string[]; data: string[][] };
}

// ─── Step 1: Read Excel/CSV into raw rows ─────────────────────

export function readExcelFile(buffer: ArrayBuffer, filename: string): ReadFileResult {
  const ext = filename.split('.').pop()?.toLowerCase();
  const isCsv = ext === 'csv';

  const workbook = isCsv
    ? XLSX.read(buffer, { type: 'array', raw: true, FS: ';' })
    : XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  // If CSV with semicolons produced single-cell rows, retry with comma separator
  if (isCsv && rows.length > 0 && (rows[0] as unknown[]).length <= 1) {
    const wb2 = XLSX.read(buffer, { type: 'array', raw: true });
    const s2 = wb2.Sheets[wb2.SheetNames[0]];
    const rows2: unknown[][] = XLSX.utils.sheet_to_json(s2, { header: 1, defval: null, raw: true });
    if (rows2.length > 0 && (rows2[0] as unknown[]).length > 1) {
      const autoMapping = autoDetectColumns(rows2);
      const preview = getPreviewRows(rows2);
      console.log('[Import] CSV re-read with comma separator, auto-mapping:', autoMapping);
      return { rows: rows2, autoMapping, preview };
    }
  }

  const autoMapping = autoDetectColumns(rows);
  const preview = getPreviewRows(rows);
  console.log(`[Import] Read ${rows.length} rows, auto-mapping:`, autoMapping);

  return { rows, autoMapping, preview };
}

// ─── Step 2: Parse with mapping ───────────────────────────────

export function parseWithMapping(rows: unknown[][], mapping: ColumnMapping): ParseResult {
  return universalParse(rows, mapping);
}

// ─── Step 3: Duplicate detection against Supabase ─────────────

export async function checkDuplicates(
  userId: string,
  transactions: RawTransaction[],
): Promise<{ newOnes: RawTransaction[]; duplicates: RawTransaction[] }> {
  const { data: existing, error } = await supabase
    .from('transactions')
    .select('transaction_date, amount, concept')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching existing transactions for dedup:', error);
    return { newOnes: transactions, duplicates: [] };
  }

  const existingSet = new Set(
    (existing || []).map(
      (t: { transaction_date: string; amount: number; concept: string }) =>
        `${t.transaction_date}|${Number(t.amount).toFixed(2)}|${(t.concept || '').trim().toLowerCase()}`
    ),
  );

  const newOnes: RawTransaction[] = [];
  const duplicates: RawTransaction[] = [];

  for (const t of transactions) {
    const key = `${t.transaction_date}|${t.amount.toFixed(2)}|${t.concept.trim().toLowerCase()}`;
    if (existingSet.has(key)) {
      duplicates.push(t);
    } else {
      newOnes.push(t);
    }
  }

  return { newOnes, duplicates };
}

// ─── Step 4: Build full ImportSummary (parse + dedup) ─────────

export async function buildImportSummary(
  rows: unknown[][],
  mapping: ColumnMapping,
  userId: string,
): Promise<ImportSummary> {
  const result = parseWithMapping(rows, mapping);
  console.log(`[Import] Parsed: ${result.transactions.length}, Errors: ${result.errors.length}`);

  if (result.transactions.length === 0 && result.errors.length === 0) {
    throw new Error('El archivo no contiene movimientos. Comprueba que has seleccionado las columnas correctas.');
  }

  const { newOnes, duplicates } = await checkDuplicates(userId, result.transactions);
  console.log(`[Import] New: ${newOnes.length}, Duplicates: ${duplicates.length}`);

  return {
    all: result.transactions,
    newOnes,
    duplicates,
    errors: result.errors,
    totalRows: result.totalRows,
    skippedRows: result.errors.length,
  };
}

// ─── Default category metadata (color/icon) for auto-creation ─

const CATEGORY_DEFAULTS: Record<string, { name: string; color: string; icon: string; type: 'expense' | 'income' }> = {
  'supermercado':   { name: 'Supermercado',    color: '#34d399', icon: 'shopping-cart', type: 'expense' },
  'comer-fuera':    { name: 'Comer fuera',     color: '#fbbf24', icon: 'utensils',      type: 'expense' },
  'suscripciones':  { name: 'Suscripciones',   color: '#60a5fa', icon: 'credit-card',   type: 'expense' },
  'combustible':    { name: 'Combustible',      color: '#fb923c', icon: 'fuel',           type: 'expense' },
  'tabaco-vaper':   { name: 'Tabaco/Vaper',    color: '#f87171', icon: 'cigarette',      type: 'expense' },
  'vending':        { name: 'Vending',          color: '#ef4444', icon: 'coffee',         type: 'expense' },
  'salud':          { name: 'Salud',            color: '#34d399', icon: 'heart-pulse',    type: 'expense' },
  'ropa':           { name: 'Ropa',             color: '#a78bfa', icon: 'shirt',          type: 'expense' },
  'compras':        { name: 'Compras',          color: '#a78bfa', icon: 'shopping-bag',   type: 'expense' },
  'gaming':         { name: 'Gaming',           color: '#8b5cf6', icon: 'gamepad-2',      type: 'expense' },
  'regalos':        { name: 'Regalos',          color: '#c084fc', icon: 'gift',           type: 'expense' },
  'transporte':     { name: 'Transporte',       color: '#fb923c', icon: 'car',            type: 'expense' },
  'seguros':        { name: 'Seguros',          color: '#94a3b8', icon: 'shield',         type: 'expense' },
  'cashback':       { name: 'Cashback',         color: '#60a5fa', icon: 'coins',          type: 'income' },
  'nomina':         { name: 'Nomina',           color: '#34d399', icon: 'banknote',       type: 'income' },
  'devolucion':     { name: 'Devolucion',       color: '#fbbf24', icon: 'undo-2',         type: 'income' },
  'otros-ingresos': { name: 'Otros ingresos',   color: '#94a3b8', icon: 'circle',         type: 'income' },
};

// ─── Step 5: Ensure categories exist, then insert ─────────────

export async function insertTransactions(
  userId: string,
  transactions: RawTransaction[],
): Promise<{ inserted: number; failed: number }> {
  if (transactions.length === 0) return { inserted: 0, failed: 0 };

  // 1. Collect unique category slugs (excluding _temporal)
  const neededSlugs = new Set<string>();
  for (const t of transactions) {
    if (t.categorySlug && t.categorySlug !== '_temporal') {
      neededSlugs.add(t.categorySlug);
    }
  }

  // 2. Fetch existing categories
  const { data: existingCats, error: catFetchErr } = await supabase
    .from('categories')
    .select('id, slug')
    .eq('user_id', userId);

  if (catFetchErr) console.error('[Insert] Error fetching categories:', catFetchErr);

  const catMap = new Map<string, string>();
  (existingCats || []).forEach((c: { id: string; slug: string }) => {
    catMap.set(c.slug, c.id);
  });

  // 3. Create missing categories
  const missingSlugs = [...neededSlugs].filter((s) => !catMap.has(s));
  if (missingSlugs.length > 0) {
    const sortBase = (existingCats || []).length;
    const toCreate = missingSlugs.map((slug, i) => {
      const defaults = CATEGORY_DEFAULTS[slug];
      return {
        user_id: userId,
        name: defaults?.name ?? slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        slug,
        color: defaults?.color ?? '#94a3b8',
        icon: defaults?.icon ?? 'circle',
        type: defaults?.type ?? 'expense',
        monthly_budget: 0,
        sort_order: sortBase + i,
      };
    });

    const { data: created, error: createErr } = await supabase
      .from('categories')
      .insert(toCreate)
      .select('id, slug');

    if (createErr) {
      console.error('[Insert] Error creating categories:', createErr);
    } else {
      (created || []).forEach((c: { id: string; slug: string }) => {
        catMap.set(c.slug, c.id);
      });
    }
  }

  // 4. Build transaction records
  const records = transactions.map((t) => ({
    user_id: userId,
    amount: t.amount,
    type: t.type,
    concept: t.concept,
    transaction_date: t.transaction_date,
    source: 'excel_import' as const,
    original_concept: t.original_concept,
    category_id: (t.categorySlug && t.categorySlug !== '_temporal')
      ? catMap.get(t.categorySlug) ?? null
      : null,
  }));

  // 5. Insert in batches
  let inserted = 0;
  let failed = 0;
  const BATCH = 100;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    try {
      const { data, error } = await supabase.from('transactions').insert(batch).select('id');
      if (error) {
        console.error('[Insert] Supabase error:', error);
        failed += batch.length;
      } else {
        inserted += (data?.length ?? batch.length);
      }
    } catch (err) {
      console.error('[Insert] Exception:', err);
      failed += batch.length;
    }
  }

  return { inserted, failed };
}
