import type { RawTransaction, ParseError, ParseResult } from './types';

// ─── Column mapping ──────────────────────────────────────────────

export interface ColumnMapping {
  dateCol: number;
  conceptCol: number;
  amountCol: number;
  detailCol: number | null; // optional secondary concept/movimiento column
  headerRow: number;
}

// ─── Date parsing ────────────────────────────────────────────────

function excelSerialToISO(serial: number): string {
  const MS_PER_DAY = 86400 * 1000;
  const utcMs = (serial - 25569) * MS_PER_DAY;
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(cell: unknown): string | null {
  // Excel serial number
  if (typeof cell === 'number' && cell > 30000 && cell < 60000) {
    return excelSerialToISO(cell);
  }

  const s = String(cell ?? '').trim();
  if (!s) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

// ─── Amount parsing ──────────────────────────────────────────────

function parseAmount(cell: unknown): number | null {
  if (typeof cell === 'number') return cell;

  let s = String(cell ?? '').trim();
  if (!s) return null;

  // Remove currency symbols/suffixes
  s = s.replace(/EUR|€|\$|USD/gi, '').trim();

  // Handle parentheses as negative: (123.45) → -123.45
  const parenMatch = s.match(/^\((.+)\)$/);
  if (parenMatch) s = '-' + parenMatch[1];

  // Detect decimal format: "1.234,56" (EU) vs "1,234.56" (US)
  // EU format: last separator is comma
  if (/\d\.\d{3},\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) {
    // Simple comma decimal: "123,45"
    s = s.replace(',', '.');
  }
  // US format or already clean: "1,234.56" → "1234.56"
  s = s.replace(/,/g, '');

  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

// ─── Auto-detect columns ────────────────────────────────────────

const DATE_PATTERNS = /^(fecha|date|f\.?\s*valor|f\.?\s*operaci[oó]n|data|fecha\s+valor|fecha\s+operaci[oó]n)$/i;
const CONCEPT_PATTERNS = /^(concepto|descripci[oó]n|description|concept|detalle|movimiento|observaciones|referencia|comercio)$/i;
const AMOUNT_PATTERNS = /^(importe|amount|cantidad|monto|valor|saldo\s*mov|cargo|abono|d[eé]bito|cr[eé]dito)$/i;
const DETAIL_PATTERNS = /^(movimiento|observaciones|detalle|informaci[oó]n\s*adicional|referencia|concepto\s*ampliado|mas\s*datos)$/i;

export function autoDetectColumns(rows: unknown[][]): ColumnMapping | null {
  const limit = Math.min(rows.length, 15);

  for (let i = 0; i < limit; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length < 2) continue;

    let dateCol = -1;
    let conceptCol = -1;
    let amountCol = -1;
    let detailCol: number | null = null;

    for (let j = 0; j < row.length; j++) {
      const header = String(row[j] ?? '').trim();
      if (!header) continue;

      if (dateCol === -1 && DATE_PATTERNS.test(header)) dateCol = j;
      else if (amountCol === -1 && AMOUNT_PATTERNS.test(header)) amountCol = j;
      else if (conceptCol === -1 && CONCEPT_PATTERNS.test(header)) conceptCol = j;
      else if (detailCol === null && DETAIL_PATTERNS.test(header)) detailCol = j;
    }

    // Need at least date + amount
    if (dateCol !== -1 && amountCol !== -1) {
      // If no concept column found, try to pick the first text-like column that isn't date or amount
      if (conceptCol === -1) {
        for (let j = 0; j < row.length; j++) {
          if (j !== dateCol && j !== amountCol) {
            conceptCol = j;
            break;
          }
        }
      }

      return { dateCol, conceptCol, amountCol, detailCol, headerRow: i };
    }
  }

  return null;
}

// ─── Universal categorization ────────────────────────────────────
// Merged rules from all bank parsers into one function.
// Uses localStorage overrides for user learning.

const LS_OVERRIDES_KEY = 'roadto660-category-overrides';

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveOverride(conceptPattern: string, slug: string): void {
  const overrides = loadOverrides();
  overrides[conceptPattern.toLowerCase().trim()] = slug;
  localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(overrides));
}

function universalCategorize(concept: string, detail: string, type: 'income' | 'expense'): string {
  const text = (concept + ' ' + detail).toLowerCase().trim();

  // 1. Check user overrides first
  const overrides = loadOverrides();
  for (const [pattern, slug] of Object.entries(overrides)) {
    if (text.includes(pattern)) return slug;
  }

  // 2. Income rules
  if (type === 'income') {
    if (/n[oó]mina|nomina|ntt data|sueldo|salario/.test(text)) return 'nomina';
    if (/cashback|promoci[oó]n comercial|promocion comercial/.test(text)) return 'cashback';
    if (/intereses|remuneraci[oó]n|remuneracion/.test(text)) return 'otros-ingresos';
    if (/transferencia recibida|bizum recibido/.test(text)) return 'devolucion';
    return 'otros-ingresos';
  }

  // 3. Expense rules (merged from BBVA, Unicaja, CaixaBank)

  // Bizum
  if (/bizum enviado|bizum pagado|bizum a /.test(text)) return '_temporal';

  // Supermercados
  if (/mercadona|eroski|lidl|carrefour|dia |aldi|alcampo|consum|hipercor|minimarket/.test(text)) return 'supermercado';

  // Restaurantes / Comer fuera
  if (/mcdonald|burger king|taco bell|domino|pizza|kebab|sushi|cafeteria|restaurante|pollo|plk|popeyes|bocateria|vips|bodega|oasis|bomber|cafeter[ií]a|palacio del pollo|comidas caseras|croissant|la favorita|p&p/.test(text)) return 'comer-fuera';

  // Chuches / Tienda barrio
  if (/chucherias|paraiso|paloma.*soto|golosinas|helados|alimentacion lucia/.test(text)) return 'vending';

  // Transferencias — classify by detail content
  if (/transferencia realizada/.test(text)) {
    const det = detail.toLowerCase();
    if (/komia|ruina|pa cemento|pa alicatar|barranco|quesitos|manutencion|chikillos|anvorguesa|cena|bolleria|billar|comia|cebada|gramon/.test(det)) return 'comer-fuera';
    if (/gasoi|diesel/.test(det)) return 'combustible';
    if (/epoti/.test(det)) return 'suscripciones';
    if (/mad blue/.test(det)) return 'tabaco-vaper';
    if (/colonia/.test(det)) return 'regalos';
    return '_temporal';
  }

  // Suscripciones
  if (/claude\.ai|claude|anthropic|spotify|netflix|hbo|disney|amazon prime|apple\.com|patreon|blablacar|google storage|youtube premium|crunchyroll/.test(text)) return 'suscripciones';

  // Cashback / Retención
  if (/retenci[oó]n|retencion/.test(text)) return 'cashback';

  // Combustible
  if (/repsol|cepsa|galp|bp |shell|gasolinera|gasolina|diesel|combustible|fuel|petro/.test(text)) return 'combustible';

  // Tabaco/Vaper
  if (/tabaco|expendidur[ií]a|estanco|vaper|vaperslowcost/.test(text)) return 'tabaco-vaper';

  // Vending
  if (/vending|delikia|xauen/.test(text)) return 'vending';

  // Farmacia/Salud
  if (/farmacia|parafarmacia|[oó]ptica|optica|dentist|clinic|primor|perfumeria|perfumer[ií]a|salud/.test(text)) return 'salud';

  // Ropa
  if (/primark|zara|h&m|hm |pull.*bear|bershka|stradivarius|deichmann|decathlon|sprinter/.test(text)) return 'ropa';

  // Gaming
  if (/instant gaming|steam|playstation|xbox|nintendo|epic games|microsoft.*store|microsoft payments/.test(text)) return 'gaming';

  // Seguros
  if (/seguro|bbva seguros|mapfre|axa|allianz|verti|l[ií]nea directa|mutua|zurich|mediator/.test(text)) return 'seguros';

  // Transporte
  if (/blablacar|renfe|alsa|cabify|uber|bolt|taxi|parking|peaje|autopista/.test(text)) return 'transporte';

  // Compras varias
  if (/amazon(?!.*prime)|aliexpress|ebay|fnac|mediamarkt|corte ingles|el corte|xiaomi|torrecardenas|multitienda/.test(text)) return 'compras';

  // Regalos
  if (/regalo|gift/.test(text)) return 'regalos';

  return '_temporal';
}

// ─── Universal parse ─────────────────────────────────────────────

export function universalParse(rows: unknown[][], mapping: ColumnMapping): ParseResult {
  const transactions: RawTransaction[] = [];
  const errors: ParseError[] = [];

  const dataStart = mapping.headerRow + 1;
  let totalRows = 0;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] as unknown[] | null;
    if (!row || row.length < 2) continue;

    const displayRow = i + 1;
    const dateCell = row[mapping.dateCol];
    const conceptCell = mapping.conceptCol >= 0 ? row[mapping.conceptCol] : null;
    const amountCell = row[mapping.amountCol];
    const detailCell = mapping.detailCol !== null ? row[mapping.detailCol] : null;

    // Skip empty rows
    if (dateCell === null || dateCell === undefined) continue;
    if (amountCell === null || amountCell === undefined) continue;

    totalRows++;

    // Parse date
    const isoDate = parseDate(dateCell);
    if (!isoDate) {
      errors.push({ row: displayRow, reason: `Fecha no reconocida: ${dateCell}` });
      continue;
    }

    // Validate date is reasonable (1990-2040)
    const year = parseInt(isoDate.substring(0, 4));
    if (year < 1990 || year > 2040) {
      errors.push({ row: displayRow, reason: `Fecha fuera de rango: ${isoDate}` });
      continue;
    }

    // Parse amount
    const amount = parseAmount(amountCell);
    if (amount === null) {
      errors.push({ row: displayRow, reason: `Importe no numerico: ${amountCell}` });
      continue;
    }

    // Skip zero amounts
    if (amount === 0) continue;

    const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
    const concept = String(conceptCell ?? '').trim();
    const detail = String(detailCell ?? '').trim();
    const categorySlug = universalCategorize(concept, detail, type);

    transactions.push({
      transaction_date: isoDate,
      concept: categorySlug === '_temporal' ? (detail || concept) : concept,
      original_concept: detail || concept,
      amount: Math.abs(amount),
      type,
      source: 'excel_import',
      categorySlug,
    });
  }

  return { transactions, errors, totalRows };
}

// ─── Get preview rows for ColumnMapper UI ────────────────────────

export function getPreviewRows(rows: unknown[][], maxRows = 5): { headers: string[]; data: string[][] } {
  if (rows.length === 0) return { headers: [], data: [] };

  // Find the likely header row (first row with multiple non-empty cells)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] as unknown[];
    if (!row) continue;
    const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
    if (nonEmpty >= 2) {
      headerIdx = i;
      break;
    }
  }

  const headerRow = rows[headerIdx] as unknown[];
  const headers = headerRow.map((c) => String(c ?? ''));

  const data: string[][] = [];
  for (let i = headerIdx + 1; i < Math.min(rows.length, headerIdx + 1 + maxRows); i++) {
    const row = rows[i] as unknown[];
    if (!row) continue;
    data.push(row.map((c) => String(c ?? '')));
  }

  return { headers, data };
}
