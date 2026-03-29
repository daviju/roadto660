import type { BankParser, RawTransaction, ParseError, ParseResult } from './types';

// ─── Amount parsing: "-18,68EUR" → -18.68 ────────────────────

export function parseCaixaBankAmount(raw: string): number {
  // Remove currency suffix (EUR, €, etc.), normalize comma decimal
  const cleaned = String(raw).trim().replace(/EUR|€/gi, '').replace(',', '.').trim();
  return parseFloat(cleaned);
}

// ─── CaixaBank categorization rules ──────────────────────────

function categorizeCaixaBank(concept: string, type: 'income' | 'expense'): string {
  const text = concept.toLowerCase().trim();

  // ═══ INGRESOS ═══
  if (type === 'income') {
    if (/nómina|nomina|sueldo|salario/.test(text)) return 'nomina';
    if (/cashback|devolución de cargo|devolucion de cargo/.test(text)) return 'cashback';
    if (/transferencia recibida|bizum recibido/.test(text)) return 'devolucion';
    if (/intereses/.test(text)) return 'otros-ingresos';
    return 'otros-ingresos';
  }

  // ═══ GASTOS ═══

  // Bizum pagado
  if (/bizum enviado|bizum pagado|bizum a /.test(text)) return '_temporal';

  // Supermercados
  if (/mercadona|eroski|lidl|carrefour|dia |aldi|alcampo|consum|hipercor/.test(text)) return 'supermercado';

  // Restaurantes
  if (/mcdonald|burger king|taco bell|domino|pizza|kebab|sushi|cafeteria|restaurante|plk|popeyes/.test(text)) return 'comer-fuera';

  // Suscripciones
  if (/spotify|netflix|hbo|disney|amazon prime|apple\.com|patreon|claude\.ai|anthropic/.test(text)) return 'suscripciones';

  // Combustible
  if (/repsol|cepsa|galp|bp |shell|gasolinera|gasolina|diesel|combustible/.test(text)) return 'combustible';

  // Tabaco/Vaper
  if (/tabaco|expendiduria|expendiduría|estanco|vaper/.test(text)) return 'tabaco-vaper';

  // Vending
  if (/vending|delikia/.test(text)) return 'vending';

  // Farmacia/Salud
  if (/farmacia|parafarmacia|óptica|optica|dentist|clinic|primor|perfumeria/.test(text)) return 'salud';

  // Ropa
  if (/primark|zara|h&m|pull.*bear|bershka|stradivarius|decathlon|sprinter/.test(text)) return 'ropa';

  // Gaming
  if (/steam|playstation|xbox|nintendo|epic games|microsoft.*store|instant gaming/.test(text)) return 'gaming';

  // Seguros
  if (/seguro|mapfre|axa|allianz|zurich|mutua|mediator/.test(text)) return 'seguros';

  // Transporte
  if (/renfe|alsa|taxi|uber|cabify|bolt|parking|peaje|autopista/.test(text)) return 'transporte';

  // Compras varias
  if (/amazon(?!.*prime)|aliexpress|ebay|fnac|mediamarkt|corte ingles|el corte/.test(text)) return 'compras';

  return '_temporal';
}

// ─── CaixaBank Parser ─────────────────────────────────────────
// CaixaBank exports CSV with semicolons, no BOM, UTF-8 or latin-1.
// Typical headers: Fecha;Concepto;Importe;Divisa;Saldo (or similar)
// But XLSX.read can also parse CSV via sheet_to_json.

function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] as unknown[];
    if (!row) continue;
    const hasFecha = row.some((c) => /^fecha$/i.test(String(c ?? '').trim()));
    const hasConcepto = row.some((c) => /^concepto$/i.test(String(c ?? '').trim()));
    if (hasFecha && hasConcepto) return i;
  }
  return -1;
}

export const caixabankParser: BankParser = {
  bankId: 'caixabank',
  bankName: 'CaixaBank',
  enabled: true,

  validate(rows: unknown[][]): boolean {
    const limit = Math.min(rows.length, 8);
    for (let i = 0; i < limit; i++) {
      console.log(`[CaixaBank] Row ${i}:`, JSON.stringify(rows[i]));
    }
    if (rows.length < 2) return false;
    const headerIdx = findHeaderRow(rows);
    console.log('[CaixaBank] Header row index:', headerIdx);
    return headerIdx !== -1;
  },

  parse(rows: unknown[][]): ParseResult {
    const transactions: RawTransaction[] = [];
    const errors: ParseError[] = [];

    const headerIdx = findHeaderRow(rows);
    if (headerIdx === -1) {
      errors.push({ row: 0, reason: 'No se encontraron cabeceras (Fecha, Concepto)' });
      return { transactions, errors, totalRows: 0 };
    }

    const headers = rows[headerIdx] as unknown[];
    const findCol = (pattern: RegExp) =>
      headers.findIndex((h) => pattern.test(String(h ?? '').trim()));

    const fechaCol = findCol(/^fecha$/i);
    const conceptoCol = findCol(/^concepto$/i);
    const importeCol = findCol(/^importe$/i);

    console.log('[CaixaBank] Columns:', { fechaCol, conceptoCol, importeCol });

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
      const conceptCell = conceptoCol !== -1 ? row[conceptoCol] : null;
      const importeCell = row[importeCol];

      if (dateCell === null || dateCell === undefined) continue;
      if (importeCell === null || importeCell === undefined) continue;

      totalRows++;

      // Parse date: CaixaBank uses DD/MM/YYYY strings
      const dateStr = String(dateCell).trim();
      let isoDate: string;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/');
        isoDate = `${y}-${m}-${d}`;
      } else if (typeof dateCell === 'number') {
        // Excel serial fallback
        const MS_PER_DAY = 86400 * 1000;
        const dt = new Date((dateCell - 25569) * MS_PER_DAY);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dt.getUTCDate()).padStart(2, '0');
        isoDate = `${y}-${m}-${day}`;
      } else {
        errors.push({ row: displayRow, reason: `Fecha no reconocida: ${dateStr}` });
        continue;
      }

      const amount = parseCaixaBankAmount(String(importeCell));
      if (isNaN(amount)) {
        errors.push({ row: displayRow, reason: `Importe no numerico: ${importeCell}` });
        continue;
      }

      const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
      const concept = String(conceptCell ?? '').trim();
      const categorySlug = categorizeCaixaBank(concept, type);

      transactions.push({
        transaction_date: isoDate,
        concept,
        original_concept: concept,
        amount: Math.abs(amount),
        type,
        source: 'excel_import',
        categorySlug,
      });
    }

    console.log(`[CaixaBank] Transacciones: ${transactions.length}, Errores: ${errors.length}`);
    return { transactions, errors, totalRows };
  },
};
