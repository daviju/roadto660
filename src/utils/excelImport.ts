import * as XLSX from 'xlsx';
import { categorize } from './categorize';
import { generateId, todayISO } from './format';
import type { Expense, Income } from '../types';

export interface ParsedMovement {
  date: string;
  concepto: string;
  movimiento: string;
  importe: number;
  disponible: number;
  categoria: string | null;
  tipo: 'ingreso' | 'gasto';
  isDuplicate: boolean;
}

export interface ImportSummary {
  movements: ParsedMovement[];
  newExpenses: number;
  newIncomes: number;
  duplicates: number;
  uncategorized: number;
}

function parseSpanishDate(dateStr: string): string {
  if (!dateStr) return todayISO();
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Try parsing as Date object (Excel serial number)
  if (typeof dateStr === 'number') {
    const date = XLSX.SSF.parse_date_code(dateStr as number);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  return todayISO();
}

export function parseExcelFile(
  buffer: ArrayBuffer,
  existingExpenses: Expense[],
  existingIncomes: Income[]
): ImportSummary {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    raw: false,
  });

  // Find the header row (contains "Concepto" or "F.Valor")
  let headerIdx = 3; // Default: row 4 (0-indexed 3)
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (row && row.some((cell) => String(cell).toLowerCase().includes('concepto'))) {
      headerIdx = i;
      break;
    }
  }

  const dataRows = rows.slice(headerIdx + 1);
  const movements: ParsedMovement[] = [];

  // Build a set of existing movement signatures for duplicate detection
  const existingKeys = new Set<string>();
  for (const e of existingExpenses) {
    existingKeys.add(`${e.date}|${e.amount.toFixed(2)}|${e.description}`);
  }
  for (const i of existingIncomes) {
    existingKeys.add(`${i.date}|${Math.abs(i.amount).toFixed(2)}|${i.description}`);
  }

  for (const row of dataRows) {
    if (!row || row.length < 6) continue;

    // Columns: [empty/idx, F.Valor, Fecha, Concepto, Movimiento, Importe, Divisa, Disponible, ...]
    const fechaRaw = String(row[2] ?? row[1] ?? '');
    const concepto = String(row[3] ?? '');
    const movimiento = String(row[4] ?? '');
    const importeRaw = row[5];

    if (!fechaRaw || !importeRaw) continue;

    const date = parseSpanishDate(fechaRaw);
    let importe = typeof importeRaw === 'number'
      ? importeRaw
      : parseFloat(String(importeRaw).replace(/\./g, '').replace(',', '.'));

    if (isNaN(importe)) continue;

    const { categoria, tipo } = categorize(concepto, movimiento, importe);

    const absAmount = Math.abs(importe);
    const desc = movimiento || concepto;
    const key = `${date}|${absAmount.toFixed(2)}|${desc}`;
    const isDuplicate = existingKeys.has(key);

    movements.push({
      date,
      concepto,
      movimiento,
      importe,
      disponible: typeof row[7] === 'number' ? row[7] : parseFloat(String(row[7] ?? '0').replace(/\./g, '').replace(',', '.')) || 0,
      categoria,
      tipo,
      isDuplicate,
    });
  }

  return {
    movements,
    newExpenses: movements.filter((m) => m.tipo === 'gasto' && !m.isDuplicate).length,
    newIncomes: movements.filter((m) => m.tipo === 'ingreso' && !m.isDuplicate).length,
    duplicates: movements.filter((m) => m.isDuplicate).length,
    uncategorized: movements.filter((m) => !m.categoria && !m.isDuplicate).length,
  };
}

export function movementsToRecords(
  movements: ParsedMovement[]
): { expenses: Expense[]; incomes: Income[] } {
  const expenses: Expense[] = [];
  const incomes: Income[] = [];
  const now = todayISO();

  for (const m of movements) {
    if (m.isDuplicate) continue;

    const desc = m.movimiento || m.concepto;

    if (m.tipo === 'gasto') {
      expenses.push({
        id: generateId(),
        date: m.date,
        amount: Math.abs(m.importe),
        category: m.categoria || `_temp_${desc.substring(0, 30)}`,
        description: desc,
        createdAt: now,
      });
    } else {
      incomes.push({
        id: generateId(),
        date: m.date,
        amount: m.importe,
        concept: m.categoria || 'Otros',
        description: desc,
        createdAt: now,
      });
    }
  }

  return { expenses, incomes };
}
