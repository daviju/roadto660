export function categorize(
  concepto: string,
  movimiento: string,
  importe: number
): { categoria: string | null; tipo: 'ingreso' | 'gasto' } {
  const texto = (concepto + ' ' + movimiento).toLowerCase();

  // INGRESOS
  if (importe > 0) {
    if (/n[oó]mina/.test(texto)) return { categoria: 'Nomina', tipo: 'ingreso' };
    if (/cashback|promoci[oó]n comercial/.test(texto)) return { categoria: 'Cashback', tipo: 'ingreso' };
    if (/transferencia recibida/.test(texto)) return { categoria: 'Devolucion', tipo: 'ingreso' };
    return { categoria: 'Otros', tipo: 'ingreso' };
  }

  // GASTOS
  if (/mercadona|eroski|lidl|carrefour|dia |aldi|alcampo/.test(texto))
    return { categoria: 'Supermercado', tipo: 'gasto' };

  if (/burger|mcdonald|kfc|telepizza|dominos|popeyes|plk|taco bell|subway|vips|foster|kebab|restaurante|rest |cafeter[ií]a|bar |pub |cervecer[ií]a|asador|mes[oó]n|taberna|palacio del pollo|comidas caseras|p&p |sushi/.test(texto))
    return { categoria: 'Comer fuera', tipo: 'gasto' };

  if (/claude\.ai|spotify|netflix|hbo|disney|amazon prime|apple\.com|google storage|youtube premium|patreon|crunchyroll/.test(texto))
    return { categoria: 'Suscripciones', tipo: 'gasto' };

  if (/repsol|cepsa|galp|bp |shell|gasolinera|gasolina|diesel|combustible|fuel/.test(texto))
    return { categoria: 'Combustible', tipo: 'gasto' };

  if (/tabaco|expendidur[ií]a|estanco|vaper|vaperslowcost/.test(texto))
    return { categoria: 'Tabaco/Vaper', tipo: 'gasto' };

  if (/vending|delikia|xauen/.test(texto))
    return { categoria: 'Vending', tipo: 'gasto' };

  if (/farmacia|parafarmacia|[oó]ptica|dentist|clinic/.test(texto))
    return { categoria: 'Salud', tipo: 'gasto' };

  if (/primark|zara|hm |h&m|pull.*bear|bershka|stradivarius|deichmann|decathlon|sprinter/.test(texto))
    return { categoria: 'Ropa', tipo: 'gasto' };

  if (/instant gaming|steam|playstation|xbox|nintendo|epic games|microsoft payments|microsoft\*store/.test(texto))
    return { categoria: 'Gaming', tipo: 'gasto' };

  if (/blablacar|renfe|alsa|cabify|uber|bolt|taxi|parking|aparca|peaje/.test(texto))
    return { categoria: 'Transporte', tipo: 'gasto' };

  if (/seguro|bbva seguros|mapfre|axa|allianz|verti|l[ií]nea directa|mutua/.test(texto))
    return { categoria: 'Seguros', tipo: 'gasto' };

  if (/retenci[oó]n/.test(texto))
    return { categoria: 'Cashback', tipo: 'gasto' };

  if (texto.includes('transferencia realizada'))
    return { categoria: 'Comer fuera', tipo: 'gasto' };

  return { categoria: null, tipo: 'gasto' };
}
