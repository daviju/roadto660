import type { BankParser, RawTransaction, ParseError, ParseResult } from './types';

// ─── Excel serial date → YYYY-MM-DD ──────────────────────────
// Excel epoch: 1900-01-00 with the Lotus bug (1900 treated as leap year)
// Subtract 25569 days to get Unix epoch offset in days.
function excelSerialToISO(serial: number): string {
  const MS_PER_DAY = 86400 * 1000;
  const utcMs = (serial - 25569) * MS_PER_DAY;
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── BIZUM concept cleanup ────────────────────────────────────
// "BIZUM: NOMBRE APELLIDO Descripcion" → cleaned concept + person name
function parseBizum(raw: string): { concept: string; personName: string | null } {
  const match = raw.match(/^BIZUM:\s*(.+)$/i);
  if (!match) return { concept: raw.trim(), personName: null };

  const payload = match[1].trim();
  // Try to extract a person name: typically ALL CAPS words at the start
  const nameMatch = payload.match(/^([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]{2,30})(?:\s+\S.+)?$/);
  if (nameMatch) {
    return {
      concept: `BIZUM: ${payload}`,
      personName: nameMatch[1].trim(),
    };
  }
  return { concept: `BIZUM: ${payload}`, personName: null };
}

// ─── Unicaja categorization rules ────────────────────────────

export function categorizeUnicaja(concept: string, type: 'income' | 'expense'): string {
  const text = concept.toLowerCase().trim();

  // BIZUM → income = devolucion/otros-ingresos, expense = _temporal
  if (text.startsWith('bizum:')) {
    return type === 'income' ? 'devolucion' : '_temporal';
  }

  // ═══ INGRESOS ═══
  if (type === 'income') {
    if (/nómina|nomina|sueldo|salario/.test(text)) return 'nomina';
    if (/cashback/.test(text)) return 'cashback';
    if (/intereses|remuneración|remuneracion/.test(text)) return 'otros-ingresos';
    if (/transferencia recibida/.test(text)) return 'devolucion';
    return 'otros-ingresos';
  }

  // ═══ GASTOS ═══

  // Supermercados
  if (/mercadona|eroski|lidl|bk20603|carrefour|dia |aldi|alcampo|consum|hipercor/.test(text)) return 'supermercado';

  // Restaurantes / Comer fuera
  if (/mcdonald|burger king|taco bell|domino|pizza hut|kebab|sushi|cafeteria|restaurante|pollo|plk|popeyes|bocateria/.test(text)) return 'comer-fuera';

  // Suscripciones
  if (/spotify|netflix|hbo|disney|amazon prime|amazon.*prime|apple\.com|patreon|claude\.ai|anthropic/.test(text)) return 'suscripciones';

  // Combustible
  if (/repsol|cepsa|galp|bp |shell|gasolinera|gasolina|diesel|combustible|petro/.test(text)) return 'combustible';

  // Tabaco/Vaper
  if (/tabaco|expendiduria|expendiduría|estanco|vaper/.test(text)) return 'tabaco-vaper';

  // Vending
  if (/vending|delikia/.test(text)) return 'vending';

  // Farmacia/Salud
  if (/farmacia|parafarmacia|óptica|optica|dentist|clinic|primor|perfumeria|salud/.test(text)) return 'salud';

  // Ropa
  if (/primark|zara|h&m|hm |pull.*bear|bershka|stradivarius|decathlon|sprinter/.test(text)) return 'ropa';

  // Gaming
  if (/steam|playstation|xbox|nintendo|epic games|microsoft.*store|instant gaming/.test(text)) return 'gaming';

  // Seguros
  if (/seguro|mapfre|axa|allianz|zurich|mutua/.test(text)) return 'seguros';

  // Transporte
  if (/renfe|alsa|taxi|uber|cabify|bolt|parking|peaje|autopista/.test(text)) return 'transporte';

  // Compras varias
  if (/amazon(?!.*prime)|aliexpress|ebay|fnac|mediamarkt|corte ingles|el corte/.test(text)) return 'compras';

  return '_temporal';
}

// ─── Header detection ─────────────────────────────────────────

function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] as unknown[];
    if (!row) continue;
    const hasFecha = row.some((c) => /^fecha$/i.test(String(c ?? '').trim()));
    const hasImporte = row.some((c) => /^importe$/i.test(String(c ?? '').trim()));
    if (hasFecha && hasImporte) return i;
  }
  return -1;
}

// ─── Unicaja Parser ───────────────────────────────────────────

export const unicajaParser: BankParser = {
  bankId: 'unicaja',
  bankName: 'Unicaja',
  enabled: true,

  validate(rows: unknown[][]): boolean {
    const limit = Math.min(rows.length, 8);
    for (let i = 0; i < limit; i++) {
      console.log(`[Unicaja] Row ${i}:`, JSON.stringify(rows[i]));
    }
    if (rows.length < 3) return false;

    const headerIdx = findHeaderRow(rows);
    console.log('[Unicaja] Header row index:', headerIdx);
    if (headerIdx === -1) return false;

    // Extra check: data row after header should have a numeric date (Excel serial)
    const dataRow = rows[headerIdx + 1] as unknown[] | undefined;
    if (!dataRow) return true; // No data rows — still valid format

    const headers = rows[headerIdx] as unknown[];
    const fechaCol = headers.findIndex((h) => /^fecha$/i.test(String(h ?? '').trim()));
    if (fechaCol === -1) return false;

    const firstDate = dataRow[fechaCol];
    // Unicaja stores dates as Excel serial numbers (integers around 40000–50000)
    const isSerial = typeof firstDate === 'number' && firstDate > 30000 && firstDate < 60000;
    console.log('[Unicaja] First date cell:', firstDate, 'isSerial:', isSerial);
    return isSerial;
  },

  parse(rows: unknown[][]): ParseResult {
    const transactions: RawTransaction[] = [];
    const errors: ParseError[] = [];

    const headerIdx = findHeaderRow(rows);
    if (headerIdx === -1) {
      errors.push({ row: 0, reason: 'No se encontraron cabeceras (Fecha, Importe)' });
      return { transactions, errors, totalRows: 0 };
    }

    const headers = rows[headerIdx] as unknown[];
    const findCol = (pattern: RegExp) =>
      headers.findIndex((h) => pattern.test(String(h ?? '').trim()));

    const fechaCol = findCol(/^fecha$/i);
    const conceptoCol = findCol(/^concepto$/i);
    const importeCol = findCol(/^importe$/i);

    console.log('[Unicaja] Columns:', { fechaCol, conceptoCol, importeCol });

    if (fechaCol === -1 || importeCol === -1) {
      errors.push({ row: headerIdx + 1, reason: 'No se encontraron las columnas Fecha e Importe' });
      return { transactions, errors, totalRows: 0 };
    }

    const dataStart = headerIdx + 1;
    let totalRows = 0;

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] as unknown[] | null;
      if (!row || row.length < 2) continue;

      const displayRow = i + 1;
      const dateCell = row[fechaCol];
      const conceptoCell = conceptoCol !== -1 ? row[conceptoCol] : null;
      const importeCell = row[importeCol];

      // Skip empty rows
      if (dateCell === null || dateCell === undefined) continue;
      if (importeCell === null || importeCell === undefined) continue;

      totalRows++;

      // Parse date — Unicaja stores as Excel serial number
      let isoDate: string;
      if (typeof dateCell === 'number') {
        isoDate = excelSerialToISO(dateCell);
      } else {
        // Fallback: try DD/MM/YYYY string
        const s = String(dateCell).trim();
        const parts = s.split('/');
        if (parts.length === 3) {
          const [d, m, y] = parts;
          isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          errors.push({ row: displayRow, reason: `Fecha no reconocida: ${s}` });
          continue;
        }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        errors.push({ row: displayRow, reason: `Fecha invalida: ${isoDate}` });
        continue;
      }

      const amount = Number(String(importeCell).replace(',', '.'));
      if (isNaN(amount)) {
        errors.push({ row: displayRow, reason: `Importe no numerico: ${importeCell}` });
        continue;
      }

      const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
      const rawConcept = String(conceptoCell ?? '').trim();
      const { concept } = parseBizum(rawConcept);
      const categorySlug = categorizeUnicaja(rawConcept, type);

      transactions.push({
        transaction_date: isoDate,
        concept,
        original_concept: rawConcept,
        amount: Math.abs(amount),
        type,
        source: 'excel_import',
        categorySlug,
      });
    }

    console.log(`[Unicaja] Transacciones: ${transactions.length}, Errores: ${errors.length}`);
    return { transactions, errors, totalRows };
  },
};
