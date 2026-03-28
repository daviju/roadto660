import * as XLSX from 'xlsx';
import { bankParsers } from '../lib/excel-parsers';
import type { RawTransaction, ParseResult, ParseError } from '../lib/excel-parsers';
import { supabase } from '../lib/supabase';

// ─── Public types ─────────────────────────────────────────────

export type { RawTransaction, ParseError };

export interface ImportSummary {
  bankId: string;
  all: RawTransaction[];
  newOnes: RawTransaction[];
  duplicates: RawTransaction[];
  errors: ParseError[];
  totalRows: number;
  skippedRows: number;
}

// ─── Step 1: Read Excel into raw rows ─────────────────────────

export function readExcelRows(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,     // array of arrays, not objects
    defval: null,  // empty cells as null
    raw: true,     // keep numbers as numbers
  });
  return rows;
}

// ─── Step 2: Validate format matches bank ─────────────────────

export function validateBankFormat(bankId: string, rows: unknown[][]): boolean {
  const parser = bankParsers[bankId];
  if (!parser) return false;
  return parser.validate(rows);
}

// ─── Step 3: Parse rows into transactions ─────────────────────

export function parseBank(bankId: string, rows: unknown[][]): ParseResult {
  const parser = bankParsers[bankId];
  if (!parser) {
    return { transactions: [], errors: [{ row: 0, reason: `Parser no encontrado para ${bankId}` }], totalRows: 0 };
  }
  return parser.parse(rows);
}

// ─── Step 4: Duplicate detection against Supabase ─────────────

export async function checkDuplicates(
  userId: string,
  transactions: RawTransaction[],
): Promise<{ newOnes: RawTransaction[]; duplicates: RawTransaction[] }> {
  // Fetch existing transactions for this user
  const { data: existing, error } = await supabase
    .from('transactions')
    .select('transaction_date, amount, concept')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching existing transactions for dedup:', error);
    // If we can't check, treat all as new (safer than blocking import)
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

// ─── Step 5: Build full ImportSummary (parse + dedup) ─────────

export async function buildImportSummary(
  bankId: string,
  buffer: ArrayBuffer,
  userId: string,
): Promise<ImportSummary> {
  // 1. Read
  const rows = readExcelRows(buffer);
  console.log(`[Import] Total filas leidas del archivo: ${rows.length}`);

  // 2. Validate
  if (!validateBankFormat(bankId, rows)) {
    throw new Error(
      `Este archivo no parece ser un extracto de ${bankParsers[bankId]?.bankName ?? bankId}. ` +
      'Comprueba que has seleccionado el banco correcto y que el archivo es el Excel de movimientos descargado desde tu banca online.'
    );
  }

  // 3. Parse
  const result = parseBank(bankId, rows);
  console.log(`[Import] Parseadas: ${result.transactions.length}, Errores: ${result.errors.length}`);

  if (result.transactions.length === 0 && result.errors.length === 0) {
    throw new Error('El archivo no contiene movimientos. Comprueba que has descargado el extracto correcto.');
  }

  // 4. Dedup
  const { newOnes, duplicates } = await checkDuplicates(userId, result.transactions);
  console.log(`[Import] Nuevos: ${newOnes.length}, Duplicados: ${duplicates.length}`);

  return {
    bankId,
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

// ─── Step 6: Ensure categories exist, then insert ─────────────

export async function insertTransactions(
  userId: string,
  transactions: RawTransaction[],
): Promise<{ inserted: number; failed: number }> {
  if (transactions.length === 0) return { inserted: 0, failed: 0 };

  console.log('[Insert] Starting insert, transactions:', transactions.length, 'User:', userId);

  // 1. Collect all unique category slugs needed (excluding _temporal)
  const neededSlugs = new Set<string>();
  for (const t of transactions) {
    if (t.categorySlug && t.categorySlug !== '_temporal') {
      neededSlugs.add(t.categorySlug);
    }
  }
  console.log('[Insert] Category slugs needed:', [...neededSlugs]);

  // 2. Fetch existing categories for this user
  const { data: existingCats, error: catFetchErr } = await supabase
    .from('categories')
    .select('id, slug')
    .eq('user_id', userId);

  if (catFetchErr) {
    console.error('[Insert] Error fetching categories:', catFetchErr);
  }

  const catMap = new Map<string, string>();
  (existingCats || []).forEach((c: { id: string; slug: string }) => {
    catMap.set(c.slug, c.id);
  });
  console.log('[Insert] Existing categories:', [...catMap.keys()]);

  // 3. Create missing categories on the fly
  const missingSlugs = [...neededSlugs].filter((s) => !catMap.has(s));
  if (missingSlugs.length > 0) {
    console.log('[Insert] Creating missing categories:', missingSlugs);
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
      console.log('[Insert] Categories after creation:', [...catMap.keys()]);
    }
  }

  // 4. Build transaction records with proper category_id
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
  const totalBatches = Math.ceil(records.length / BATCH);

  for (let i = 0; i < records.length; i += BATCH) {
    const batchNum = Math.floor(i / BATCH) + 1;
    const batch = records.slice(i, i + BATCH);
    console.log(`[Insert] Inserting batch ${batchNum} of ${totalBatches} (${batch.length} records)`);

    try {
      const { data, error } = await supabase.from('transactions').insert(batch).select('id');
      console.log(`[Insert] Batch ${batchNum} result:`, { inserted: data?.length ?? 0, error: error?.message ?? null });

      if (error) {
        console.error(`[Insert] Supabase error in batch ${batchNum}:`, error);
        failed += batch.length;
      } else {
        inserted += (data?.length ?? batch.length);
      }
    } catch (err) {
      console.error(`[Insert] Exception in batch ${batchNum}:`, err);
      failed += batch.length;
    }
  }

  console.log(`[Insert] Done. Inserted: ${inserted}, Failed: ${failed}`);
  return { inserted, failed };
}
