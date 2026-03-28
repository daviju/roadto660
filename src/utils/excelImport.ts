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

// ─── Step 6: Insert into Supabase ─────────────────────────────

export async function insertTransactions(
  userId: string,
  transactions: RawTransaction[],
  categoryMap: Map<string, string>,
): Promise<{ inserted: number; failed: number }> {
  if (transactions.length === 0) return { inserted: 0, failed: 0 };

  const records = transactions.map((t) => ({
    user_id: userId,
    amount: t.amount,
    type: t.type,
    concept: t.concept,
    transaction_date: t.transaction_date,
    source: 'excel_import' as const,
    original_concept: t.original_concept,
    category_id: categoryMap.get(t.concept.toLowerCase()) || null,
  }));

  // Insert in batches of 100 to avoid payload limits
  let inserted = 0;
  let failed = 0;
  const BATCH = 100;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      console.error(`[Import] Batch insert error (rows ${i}-${i + batch.length}):`, error);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, failed };
}
