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

export const bbvaParser: BankParser = {
  bankId: 'bbva',
  bankName: 'BBVA',
  enabled: true,

  validate(rows: unknown[][]): boolean {
    if (rows.length < 6) return false;
    const titulo = String(rows[1]?.[3] ?? '');
    return titulo.includes('ltimos movimientos') || titulo.includes('Últimos movimientos');
  },

  parse(rows: unknown[][]): ParseResult {
    const transactions: RawTransaction[] = [];
    const errors: ParseError[] = [];

    console.log(`[BBVA] Total filas leidas: ${rows.length}`);
    console.log('[BBVA] Fila 4 (cabeceras):', rows[4]);
    if (rows[5]) console.log('[BBVA] Fila 5 (primer dato):', rows[5]);
    if (rows[6]) console.log('[BBVA] Fila 6 (segundo dato):', rows[6]);

    // Data starts at row 5 (0-indexed), row 4 is headers
    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      const displayRow = i + 1; // 1-indexed for user
      if (!row || (row as unknown[]).length < 6) continue;

      const r = row as unknown[];
      const fechaStr = r[2];      // Column C: Fecha movimiento
      const concepto = r[3];       // Column D: Concepto/Comercio
      const movimiento = r[4];     // Column E: Descripción detallada
      const importe = r[5];        // Column F: Importe (already a number)

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
