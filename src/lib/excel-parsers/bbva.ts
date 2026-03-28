import type { BankParser, RawTransaction, ParseError, ParseResult } from './types';

// ─── BBVA categorization rules ────────────────────────────────

function categorize(concepto: string, movimiento: string, amount: number, type: string): string {
  const text = (concepto + ' ' + movimiento).toLowerCase().trim();

  // ═══ INGRESOS ═══
  if (type === 'income') {
    if (/nómina|nomina|ntt data/.test(text)) return 'nomina';
    if (/cashback|promoción comercial|promocion comercial/.test(text)) return 'cashback';
    if (/transferencia recibida/.test(text)) return 'devolucion';
    return 'otros-ingresos';
  }

  // ═══ GASTOS ═══

  // Supermercados
  if (/mercadona|eroski|lidl|bk20603|carrefour|dia |aldi|alcampo/.test(text)) return 'supermercado';

  // Restaurantes / Comer fuera
  if (/palacio del pollo|p&p.*jaen|p&p.*rest|taco bell|comidas caseras|plk|popeyes|vips|sushi|bodega del monje|oasis|ehsan|kebab|isturk|telekebab|bombon boss|cafeteria|cafe billar|shooter|museo/.test(text)) return 'comer-fuera';

  // Transferencias — classify by movimiento content
  if (/transferencia realizada/.test(text)) {
    const mov = movimiento.toLowerCase();
    if (/komia|ruina|pa cemento|pa alicatar|barranco|quesitos|manutencion|chikillos|anvorguesa|cena|bolleria|billar|comia/.test(mov)) return 'comer-fuera';
    if (/cebada|gramon/.test(mov)) return 'comer-fuera';
    if (/gasoi|diesel/.test(mov)) return 'combustible';
    if (/epoti/.test(mov)) return 'suscripciones';
    if (/mad blue/.test(mov)) return 'tabaco-vaper';
    if (/colonia/.test(mov)) return 'regalos';
    return '_temporal';
  }

  // Suscripciones
  if (/claude\.ai|claude|anthropic|spotify|netflix|hbo|disney|amazon prime|apple\.com|patreon|blablacar/.test(text)) return 'suscripciones';

  // Retención cashback
  if (/retención|retencion/.test(text)) return 'cashback';

  // Combustible
  if (/repsol|cepsa|galp|bp |shell|gasolinera|planeta|gasolina|diesel|combustible/.test(text)) return 'combustible';

  // Tabaco/Vaper
  if (/tabaco|expendiduria|expendiduría|estanco|vaper|vaperslowcost/.test(text)) return 'tabaco-vaper';

  // Vending
  if (/vending|delikia|xauen/.test(text)) return 'vending';

  // Chuches/Tienda barrio
  if (/paraiso|paloma.*soto|golosinas|helados|alimentacion lucia/.test(text)) return 'vending';

  // Farmacia/Salud/Perfumería
  if (/farmacia|parafarmacia|óptica|optica|dentist|clinic|primor|perfumeria|perfumería/.test(text)) return 'salud';

  // Ropa
  if (/primark|zara|h&m|hm |pull.*bear|bershka|stradivarius|deichmann|decathlon|sprinter/.test(text)) return 'ropa';

  // Gaming
  if (/instant gaming|steam|playstation|xbox|nintendo|epic games|microsoft payments|microsoft\*store/.test(text)) return 'gaming';

  // Seguros
  if (/seguro|bbva seguros|adeudo.*bbva|mapfre|axa|allianz|verti|línea directa/.test(text)) return 'seguros';

  // Transporte
  if (/blablacar|renfe|alsa|cabify|uber|bolt|taxi|parking/.test(text)) return 'transporte';

  // Compras varias
  if (/torrecardenas|multitienda|xiaomi/.test(text)) return 'compras';
  if (/jaen.*plaza/.test(text) && !/rest|plk|p&p/.test(text)) return 'compras';

  // Si nada coincide → temporal
  return '_temporal';
}

// ─── BBVA Parser ──────────────────────────────────────────────

/** Scan first rows for "ltimos movimientos" (accent-safe) in any cell */
function findTitleRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 8);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;
    for (const cell of row as unknown[]) {
      if (cell && String(cell).includes('ltimos movimientos')) return i;
    }
  }
  return -1;
}

/** Find the header row containing "Concepto" or "F.Valor" */
function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;
    for (const cell of row as unknown[]) {
      const s = String(cell ?? '').toLowerCase();
      if (s === 'concepto' || s === 'f.valor') return i;
    }
  }
  return -1;
}

export const bbvaParser: BankParser = {
  bankId: 'bbva',
  bankName: 'BBVA',
  enabled: true,

  validate(rows: unknown[][]): boolean {
    // Debug: log first rows so we can see exactly what SheetJS returns
    const limit = Math.min(rows.length, 6);
    for (let i = 0; i < limit; i++) {
      console.log(`[BBVA] Row ${i}:`, JSON.stringify(rows[i]));
    }

    if (rows.length < 3) return false;
    const titleIdx = findTitleRow(rows);
    console.log('[BBVA] Title row index:', titleIdx);
    return titleIdx !== -1;
  },

  parse(rows: unknown[][]): ParseResult {
    const transactions: RawTransaction[] = [];
    const errors: ParseError[] = [];

    // Dynamically find header row instead of assuming fixed offset
    const headerIdx = findHeaderRow(rows);
    const dataStart = headerIdx !== -1 ? headerIdx + 1 : 5;

    console.log(`[BBVA] Total filas leidas: ${rows.length}`);
    console.log(`[BBVA] Header row: ${headerIdx}, Data starts at: ${dataStart}`);

    // Dynamically find column indices by header name
    const headers = (headerIdx !== -1 ? rows[headerIdx] : []) as unknown[];
    const findCol = (pattern: RegExp) =>
      headers.findIndex((h) => pattern.test(String(h ?? '').trim()));

    const fechaCol = findCol(/^fecha$/i);
    const conceptoCol = findCol(/^concepto$/i);
    const movimientoCol = findCol(/^movimiento$/i);
    const importeCol = findCol(/^importe$/i);

    console.log('[BBVA] Column indices:', { fechaCol, conceptoCol, movimientoCol, importeCol });
    if (rows[dataStart]) console.log('[BBVA] Primer dato:', rows[dataStart]);

    // Need at least fecha and importe to proceed
    if (fechaCol === -1 || importeCol === -1) {
      console.error('[BBVA] Could not find required columns (Fecha, Importe) in headers:', headers);
      errors.push({ row: headerIdx + 1, reason: 'No se encontraron las columnas Fecha e Importe en las cabeceras' });
      return { transactions, errors, totalRows: 0 };
    }

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      const displayRow = i + 1; // 1-indexed for user
      if (!row || (row as unknown[]).length < 3) continue;

      const r = row as unknown[];
      const fechaStr = r[fechaCol];
      const concepto = conceptoCol !== -1 ? r[conceptoCol] : null;
      const movimiento = movimientoCol !== -1 ? r[movimientoCol] : null;
      const importe = r[importeCol];

      // Validate minimum data
      if (!fechaStr || fechaStr === null) {
        errors.push({ row: displayRow, reason: 'Fecha vacia' });
        continue;
      }
      if (importe === null || importe === undefined) {
        errors.push({ row: displayRow, reason: 'Importe vacio' });
        continue;
      }

      // Parse date DD/MM/YYYY
      const dateStr = String(fechaStr);
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) {
        errors.push({ row: displayRow, reason: `Fecha invalida: ${dateStr}` });
        continue;
      }
      const [dia, mes, anio] = dateParts;
      const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
      if (isNaN(fecha.getTime())) {
        errors.push({ row: displayRow, reason: `Fecha invalida: ${dateStr}` });
        continue;
      }

      const amount = Number(importe);
      if (isNaN(amount)) {
        errors.push({ row: displayRow, reason: 'Importe no numerico' });
        continue;
      }

      const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
      const conceptStr = String(concepto ?? '').trim();
      const movimientoStr = String(movimiento ?? '').trim();
      const categorySlug = categorize(conceptStr, movimientoStr, amount, type);

      transactions.push({
        transaction_date: `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`,
        concept: categorySlug === '_temporal' ? movimientoStr || conceptStr : conceptStr,
        original_concept: movimientoStr || conceptStr,
        amount: Math.abs(amount),
        type,
        source: 'excel_import',
      });
    }

    console.log(`[BBVA] Transacciones parseadas: ${transactions.length}, Errores: ${errors.length}`);

    return { transactions, errors, totalRows: Math.max(0, rows.length - 5) };
  },
};
