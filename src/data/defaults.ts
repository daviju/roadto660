import type { AppSettings, Budget, Phase, Expense, Income, Motorcycle } from '../types';

// ─── Category Colors ─────────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  'Supermercado': '#34d399',
  'Comer fuera': '#fbbf24',
  'Suscripciones': '#60a5fa',
  'Combustible': '#fb923c',
  'Tabaco/Vaper': '#f87171',
  'Vending': '#ef4444',
  'Chuches/Tienda': '#ef4444',
  'Salud': '#34d399',
  'Ropa': '#a78bfa',
  'Compras': '#a78bfa',
  'Gaming': '#8b5cf6',
  'Regalos': '#c084fc',
  'Transporte': '#fb923c',
  'Seguros': '#94a3b8',
  'Carnet coche': '#fb923c',
  'Gastos coche': '#fb923c',
  'Equipacion moto': '#a78bfa',
  'Moto/Seguro': '#a78bfa',
  'Otros': '#94a3b8',
};

// ─── Default Categories ──────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  'Supermercado', 'Comer fuera', 'Suscripciones', 'Combustible',
  'Tabaco/Vaper', 'Vending', 'Chuches/Tienda', 'Salud', 'Ropa',
  'Compras', 'Gaming', 'Regalos', 'Transporte', 'Seguros',
  'Carnet coche', 'Gastos coche', 'Equipacion moto', 'Moto/Seguro', 'Otros',
];

export const DEFAULT_INCOME_CONCEPTS = ['Nomina', 'Cashback', 'Devolucion', 'Otros'];

// ─── Default Settings ────────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  currentBalance: 5017.18,
  emergencyFund: 2000,
  monthlyIncome: 1382,
  cashbackNet: 35.10,
  targetDate: '2027-01-31',
  categories: DEFAULT_CATEGORIES,
  incomeConcepts: DEFAULT_INCOME_CONCEPTS,
  payDay: 28,
  cycleMode: 'payday',
};

// ─── Default Budgets ─────────────────────────────────────────────
export const DEFAULT_BUDGETS: Budget[] = [
  { category: 'Supermercado', limit: 250 },
  { category: 'Comer fuera', limit: 30 },
  { category: 'Suscripciones', limit: 22 },
  { category: 'Combustible', limit: 80 },
  { category: 'Ropa', limit: 25 },
  { category: 'Salud', limit: 15 },
  { category: 'Tabaco/Vaper', limit: 0 },
  { category: 'Vending', limit: 0 },
  { category: 'Chuches/Tienda', limit: 5 },
  { category: 'Gaming', limit: 0 },
];

// ─── Default Motorcycles ─────────────────────────────────────────
export const DEFAULT_MOTORCYCLES: Motorcycle[] = [
  {
    id: 'moto-daytona',
    name: 'Triumph Daytona 660',
    price: 8250,
    priceMin: 8000,
    priceMax: 8500,
    insuranceYear: 570,
    type: 'Sport',
    active: true,
    notes: 'La favorita. Motor triple 660cc, sonido brutal, posicion intermedia. Referencia del segmento A2.',
  },
  {
    id: 'moto-zx4rr',
    name: 'Kawasaki ZX-4RR',
    price: 9100,
    priceMin: 8800,
    priceMax: 9400,
    insuranceYear: 620,
    type: 'Sport',
    active: false,
    notes: '4 cilindros en linea, sube de vueltas como una moto de carreras. Emocionante pero cara y menos practica.',
  },
  {
    id: 'moto-r7',
    name: 'Yamaha R7',
    price: 8700,
    priceMin: 8400,
    priceMax: 9000,
    insuranceYear: 550,
    type: 'Sport',
    active: false,
    notes: 'Bicilindrica CP2, ligera y divertida. Muy buen chasis. Posicion bastante deportiva.',
  },
  {
    id: 'moto-ninja650',
    name: 'Kawasaki Ninja 650',
    price: 7500,
    priceMin: 7000,
    priceMax: 8000,
    insuranceYear: 480,
    type: 'Sport-touring',
    active: false,
    notes: 'La opcion comoda y economica. Seguro mas barato entre las carenadas, muy polivalente.',
  },
  {
    id: 'moto-mt07',
    name: 'Yamaha MT-07',
    price: 7600,
    priceMin: 7200,
    priceMax: 8000,
    insuranceYear: 450,
    type: 'Naked',
    active: false,
    notes: 'Naked referencia A2. Seguro mas barato de todas. Motor CP2 divertidisimo. Muy polivalente.',
  },
  {
    id: 'moto-rs660',
    name: 'Aprilia RS 660',
    price: 10200,
    priceMin: 9500,
    priceMax: 10800,
    insuranceYear: 650,
    type: 'Sport',
    active: false,
    notes: 'La mas cara y exclusiva. Motor bicilindrico potente, electronica de nivel superior. Diseno italiano.',
  },
  {
    id: 'moto-zontes',
    name: 'Zontes 703RR',
    price: 7300,
    priceMin: 6900,
    priceMax: 7600,
    insuranceYear: 420,
    type: 'Sport',
    active: false,
    notes: 'Tricilindrica china 699cc, 95CV. Relacion calidad/precio bestial: Brembo, Marzocchi, Michelin, TFT 6.75", keyless, punos calefactables. 5 anos de garantia. PVP oficial 7.688EUR. Promo seguro gratis NO aplica a novel de 22.',
  },
];

// ─── Default Phases (Phase 4 uses active moto) ───────────────────
function buildPhase4(moto: Motorcycle): Phase {
  return {
    id: 'phase-4',
    name: moto.name,
    targetDate: '2027-01-31',
    status: 'pending',
    color: '#a78bfa',
    items: [
      { id: 'moto-purchase', name: moto.name, estimatedCost: moto.price, paid: false, paidAmount: 0, paidDate: null },
      { id: 'moto-insurance', name: `Seguro ${moto.name} (novel)`, estimatedCost: moto.insuranceYear, paid: false, paidAmount: 0, paidDate: null },
    ],
  };
}

export function getDefaultPhases(activeMoto?: Motorcycle): Phase[] {
  const moto = activeMoto || DEFAULT_MOTORCYCLES.find(m => m.active) || DEFAULT_MOTORCYCLES[0];
  return [
    {
      id: 'phase-1',
      name: 'Carnet de coche B',
      targetDate: '2026-05-31',
      status: 'pending',
      color: '#22d3ee',
      items: [
        { id: 'p1-1', name: 'Practicas de conducir (24EUR x 15)', estimatedCost: 360, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p1-2', name: 'Tasas DGT (teorico + practico)', estimatedCost: 93, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p1-3', name: 'Psicotecnico', estimatedCost: 35, paid: false, paidAmount: 0, paidDate: null },
      ],
    },
    {
      id: 'phase-2',
      name: 'Poner el coche en marcha',
      targetDate: '2026-07-31',
      status: 'pending',
      color: '#fb923c',
      items: [
        { id: 'p2-1', name: 'Seguro coche novel', estimatedCost: 650, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p2-2', name: 'Transferencia/cambio nombre', estimatedCost: 170, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p2-3', name: 'ITV', estimatedCost: 45, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p2-4', name: 'Impuesto de circulacion', estimatedCost: 70, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p2-5', name: 'Arreglos y mantenimiento', estimatedCost: 575, paid: false, paidAmount: 0, paidDate: null },
      ],
    },
    {
      id: 'phase-3',
      name: 'Equipacion moto',
      targetDate: '2026-10-31',
      status: 'pending',
      color: '#34d399',
      items: [
        { id: 'p3-1', name: 'Botas Alpinestars Faster 4 Drystar', estimatedCost: 210, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p3-2', name: 'Casco', estimatedCost: 360, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p3-3', name: 'Chaqueta Alpinestars Crosshill', estimatedCost: 260, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p3-4', name: 'Guantes', estimatedCost: 60, paid: false, paidAmount: 0, paidDate: null },
        { id: 'p3-5', name: 'Pantalon Quarter Mile Milano EVO', estimatedCost: 110, paid: false, paidAmount: 0, paidDate: null },
      ],
    },
    buildPhase4(moto),
  ];
}

export const DEFAULT_PHASES: Phase[] = getDefaultPhases();

// ─── Seed Expenses ───────────────────────────────────────────────
export const SEED_EXPENSES: Expense[] = [
  // ── ENERO 2026 ──
  { id: 's-e-0102a', date: '2026-01-02', amount: 20.00, category: 'Regalos', description: 'Colonia (regalo)' },
  { id: 's-e-0105a', date: '2026-01-05', amount: 18.00, category: 'Suscripciones', description: 'Claude.ai Pro' },
  { id: 's-e-0105b', date: '2026-01-05', amount: 3.50, category: 'Suscripciones', description: 'Spotify (Epoti)' },
  { id: 's-e-0105c', date: '2026-01-05', amount: 0.99, category: 'Transporte', description: 'Blablacar' },
  { id: 's-e-0105d', date: '2026-01-05', amount: 11.40, category: 'Compras', description: 'Centro Comercial Torrecardenas (Almeria)' },
  { id: 's-e-0105e', date: '2026-01-05', amount: 2.25, category: 'Comer fuera', description: 'Bombon Boss Torrecardenas (Almeria)' },
  { id: 's-e-0107a', date: '2026-01-07', amount: 115.85, category: 'Comer fuera', description: 'Restaurante Sushi Lin' },
  { id: 's-e-0107b', date: '2026-01-07', amount: 6.95, category: 'Tabaco/Vaper', description: 'Tabacos Expendiduria 1' },
  { id: 's-e-0109a', date: '2026-01-09', amount: 15.50, category: 'Comer fuera', description: 'Comida colega (Komia)' },
  { id: 's-e-0109b', date: '2026-01-09', amount: 4.99, category: 'Ropa', description: 'Deichmann Almeria' },
  { id: 's-e-0109c', date: '2026-01-09', amount: 5.30, category: 'Compras', description: 'Multitienda bazar' },
  { id: 's-e-0112a', date: '2026-01-12', amount: 13.46, category: 'Supermercado', description: 'Eroski City Mancha Real' },
  { id: 's-e-0112b', date: '2026-01-12', amount: 11.00, category: 'Comer fuera', description: 'P&P Jaen Plaza' },
  { id: 's-e-0112c', date: '2026-01-12', amount: 5.20, category: 'Salud', description: 'Farmacia Castillo Aparici' },
  { id: 's-e-0112d', date: '2026-01-12', amount: 15.47, category: 'Supermercado', description: 'Lidl Jaen' },
  { id: 's-e-0116a', date: '2026-01-16', amount: 1.85, category: 'Chuches/Tienda', description: 'Paraiso 12 (chuches)' },
  { id: 's-e-0119a', date: '2026-01-19', amount: 152.54, category: 'Supermercado', description: 'Mercadona Mancha Real' },
  { id: 's-e-0119b', date: '2026-01-19', amount: 0.99, category: 'Suscripciones', description: 'Apple.com/bill (iCloud)' },
  { id: 's-e-0119c', date: '2026-01-19', amount: 6.00, category: 'Ropa', description: 'Primark Jaen' },
  { id: 's-e-0126a', date: '2026-01-26', amount: 11.00, category: 'Comer fuera', description: 'Bar Barranco (Jaen)' },
  { id: 's-e-0126b', date: '2026-01-26', amount: 18.00, category: 'Comer fuera', description: 'El Palacio del Pollo' },
  { id: 's-e-0126c', date: '2026-01-26', amount: 52.75, category: 'Comer fuera', description: 'Jaen 3 Jaen Plaza (comida grupal, colegas devolvieron 21,20EUR)' },
  { id: 's-e-0127a', date: '2026-01-27', amount: 35.28, category: 'Supermercado', description: 'Eroski City Mancha Real' },
  // ── FEBRERO 2026 ──
  { id: 's-e-0202a', date: '2026-02-02', amount: 6.79, category: 'Combustible', description: 'Gasolinera Es la Planeta' },
  { id: 's-e-0202b', date: '2026-02-02', amount: 9.96, category: 'Comer fuera', description: 'Taco Bell' },
  { id: 's-e-0202c', date: '2026-02-02', amount: 15.19, category: 'Comer fuera', description: 'Comidas Caseras (comida preparada para llevar)' },
  { id: 's-e-0202d', date: '2026-02-02', amount: 10.50, category: 'Seguros', description: 'Seguro medico BBVA (cancelado despues)' },
  { id: 's-e-0202e', date: '2026-02-02', amount: 3.50, category: 'Suscripciones', description: 'Spotify (Epoti)' },
  { id: 's-e-0203a', date: '2026-02-03', amount: 36.72, category: 'Supermercado', description: 'Eroski City Mancha Real' },
  { id: 's-e-0205a', date: '2026-02-05', amount: 18.10, category: 'Comer fuera', description: 'El Palacio del Pollo' },
  { id: 's-e-0205b', date: '2026-02-05', amount: 18.00, category: 'Suscripciones', description: 'Claude.ai Pro' },
  { id: 's-e-0206a', date: '2026-02-06', amount: 4.30, category: 'Chuches/Tienda', description: 'Paloma el Soto (chuches)' },
  { id: 's-e-0206b', date: '2026-02-06', amount: 14.00, category: 'Tabaco/Vaper', description: 'Liquido vaper (Mad Blue)' },
  { id: 's-e-0206c', date: '2026-02-06', amount: 137.98, category: 'Regalos', description: 'Xiaomi movil (regalo para mi madre, NO gasto personal)' },
  { id: 's-e-0209a', date: '2026-02-09', amount: 16.27, category: 'Supermercado', description: 'Lidl Jaen' },
  { id: 's-e-0209b', date: '2026-02-09', amount: 7.50, category: 'Comer fuera', description: 'P&P Jaen Plaza' },
  { id: 's-e-0209c', date: '2026-02-09', amount: 203.80, category: 'Supermercado', description: 'Mercadona Mancha Real' },
  { id: 's-e-0209d', date: '2026-02-09', amount: 6.00, category: 'Comer fuera', description: 'Ehsan Ali Bibi (kebab)' },
  { id: 's-e-0211a', date: '2026-02-11', amount: 1.21, category: 'Gaming', description: 'Patreon mod Assetto Corsa (pago UNICO)' },
  { id: 's-e-0212a', date: '2026-02-12', amount: 11.20, category: 'Comer fuera', description: 'Comida colega (Komia)' },
  { id: 's-e-0212b', date: '2026-02-12', amount: 31.20, category: 'Comer fuera', description: 'Desayuno/comida oficina Granada (Manutencion pa los chikillos)' },
  { id: 's-e-0212c', date: '2026-02-12', amount: 7.00, category: 'Comer fuera', description: 'La Bodega del Monje' },
  { id: 's-e-0213a', date: '2026-02-13', amount: 14.91, category: 'Comer fuera', description: 'Comida colegas (Quesitos)' },
  { id: 's-e-0213b', date: '2026-02-13', amount: 1.05, category: 'Vending', description: 'Delikia SP (vending)' },
  { id: 's-e-0213c', date: '2026-02-13', amount: 1.85, category: 'Vending', description: 'Delikia SP (vending)' },
  { id: 's-e-0216a', date: '2026-02-16', amount: 8.00, category: 'Comer fuera', description: 'Ehsan Ali Bibi (kebab)' },
  { id: 's-e-0216b', date: '2026-02-16', amount: 1.85, category: 'Vending', description: 'Delikia SP (vending)' },
  { id: 's-e-0216c', date: '2026-02-16', amount: 9.20, category: 'Comer fuera', description: 'P&P Jaen Plaza' },
  { id: 's-e-0216d', date: '2026-02-16', amount: 126.48, category: 'Supermercado', description: 'Mercadona Mancha Real' },
  { id: 's-e-0216e', date: '2026-02-16', amount: 15.00, category: 'Comer fuera', description: 'PLK Popeyes Jaen Plaza' },
  { id: 's-e-0217a', date: '2026-02-17', amount: 8.00, category: 'Comer fuera', description: 'Cafeteria Pub El Museo' },
  { id: 's-e-0218a', date: '2026-02-18', amount: 7.40, category: 'Comer fuera', description: 'Comidas Caseras (comida para llevar)' },
  { id: 's-e-0218b', date: '2026-02-18', amount: 0.99, category: 'Suscripciones', description: 'Apple.com/bill (iCloud)' },
  { id: 's-e-0219a', date: '2026-02-19', amount: 13.52, category: 'Salud', description: 'Farmacia Castillo Aparici' },
  { id: 's-e-0219b', date: '2026-02-19', amount: 29.99, category: 'Gaming', description: 'Microsoft Payments (Game Pass o juego, puntual)' },
  { id: 's-e-0223a', date: '2026-02-23', amount: 3.60, category: 'Chuches/Tienda', description: 'Golosinas y Helados' },
  { id: 's-e-0223b', date: '2026-02-23', amount: 5.00, category: 'Comer fuera', description: 'Ehsan Ali Bibi (kebab)' },
  { id: 's-e-0223c', date: '2026-02-23', amount: 3.00, category: 'Comer fuera', description: 'Cerveza colegas (Cebada)' },
  { id: 's-e-0223d', date: '2026-02-23', amount: 5.00, category: 'Combustible', description: 'Gasoil viaje Granada (Gasoi)' },
  { id: 's-e-0223e', date: '2026-02-23', amount: 5.60, category: 'Comer fuera', description: 'Bar Restaurante Oasis 2' },
  { id: 's-e-0223f', date: '2026-02-23', amount: 8.00, category: 'Comer fuera', description: 'Comida colegas (Comia)' },
  { id: 's-e-0223g', date: '2026-02-23', amount: 3.00, category: 'Comer fuera', description: 'Cerveza colegas (Cebada de Gramon)' },
  { id: 's-e-0223h', date: '2026-02-23', amount: 0.99, category: 'Gaming', description: 'Microsoft Store (puntual)' },
  { id: 's-e-0224a', date: '2026-02-24', amount: 1.95, category: 'Supermercado', description: 'Mercadona CC Jaen Plaza' },
  { id: 's-e-0224b', date: '2026-02-24', amount: 1.85, category: 'Chuches/Tienda', description: 'Paraiso 12 (chuches)' },
  { id: 's-e-0224c', date: '2026-02-24', amount: 1.10, category: 'Vending', description: 'Xauen Vending' },
  { id: 's-e-0224d', date: '2026-02-24', amount: 18.70, category: 'Comer fuera', description: 'VIPS Jaen Plaza' },
  { id: 's-e-0225a', date: '2026-02-25', amount: 18.10, category: 'Comer fuera', description: 'El Palacio del Pollo' },
  { id: 's-e-0226a', date: '2026-02-26', amount: 16.18, category: 'Salud', description: 'Farmacia Castillo Aparici' },
  { id: 's-e-0226b', date: '2026-02-26', amount: 15.41, category: 'Supermercado', description: 'Eroski City Mancha Real' },
  { id: 's-e-0226c', date: '2026-02-26', amount: 0.70, category: 'Vending', description: 'Xauen Vending' },
  { id: 's-e-0227a', date: '2026-02-27', amount: 7.89, category: 'Gaming', description: 'Instant Gaming (Ghost Recon rebajas, puntual)' },
  // ── MARZO 2026 ──
  { id: 's-e-0302a', date: '2026-03-02', amount: 5.39, category: 'Chuches/Tienda', description: 'Paloma el Soto (chuches)' },
  { id: 's-e-0302b', date: '2026-03-02', amount: 17.28, category: 'Comer fuera', description: 'PLK Popeyes Jaen Plaza' },
  { id: 's-e-0302c', date: '2026-03-02', amount: 10.50, category: 'Seguros', description: 'Seguro medico BBVA (cobro indebido, devuelto el 11/03)' },
  { id: 's-e-0303a', date: '2026-03-03', amount: 3.50, category: 'Suscripciones', description: 'Spotify (Epoti)' },
  { id: 's-e-0304a', date: '2026-03-04', amount: 47.99, category: 'Gaming', description: 'Instant Gaming (Ride 6, compra PUNTUAL)' },
  { id: 's-e-0304b', date: '2026-03-04', amount: 7.42, category: 'Comer fuera', description: 'Comidas Caseras (comida para llevar)' },
  { id: 's-e-0304c', date: '2026-03-04', amount: 27.74, category: 'Supermercado', description: 'Eroski City Mancha Real' },
  { id: 's-e-0305a', date: '2026-03-05', amount: 18.00, category: 'Suscripciones', description: 'Claude.ai Pro' },
  { id: 's-e-0306a', date: '2026-03-06', amount: 4.00, category: 'Chuches/Tienda', description: 'Alimentacion Lucia (tienda barrio)' },
  { id: 's-e-0309a', date: '2026-03-09', amount: 27.30, category: 'Comer fuera', description: 'Comida colegas (Pa alicatar)' },
  { id: 's-e-0309b', date: '2026-03-09', amount: 22.90, category: 'Tabaco/Vaper', description: 'Vaperslowcost' },
  { id: 's-e-0309c', date: '2026-03-09', amount: 4.20, category: 'Comer fuera', description: 'P&P Jaen Plaza' },
  { id: 's-e-0309d', date: '2026-03-09', amount: 28.00, category: 'Comer fuera', description: 'Comida colegas (Ruina)' },
  { id: 's-e-0309e', date: '2026-03-09', amount: 233.49, category: 'Supermercado', description: 'Mercadona Mancha Real' },
  { id: 's-e-0309f', date: '2026-03-09', amount: 10.00, category: 'Comer fuera', description: 'Comida colegas (Pa cemento)' },
];

// ─── Seed Incomes ────────────────────────────────────────────────
export const SEED_INCOMES: Income[] = [
  // ── ENERO 2026 ──
  { id: 's-i-0105a', date: '2026-01-05', amount: 43.33, concept: 'Cashback', description: 'Cashback promocion banco' },
  { id: 's-i-0105b', date: '2026-01-05', amount: -8.23, concept: 'Cashback', description: 'Retencion cashback' },
  { id: 's-i-0126a', date: '2026-01-26', amount: 6.05, concept: 'Devolucion', description: 'Devolucion colegas (Diesel para el ford focus)' },
  { id: 's-i-0126b', date: '2026-01-26', amount: 15.15, concept: 'Devolucion', description: 'Devolucion colegas (Anvorguesa)' },
  { id: 's-i-0127a', date: '2026-01-27', amount: 1383.71, concept: 'Nomina', description: 'Nomina NTT Data Spain' },
  // ── FEBRERO 2026 ──
  { id: 's-i-0203a', date: '2026-02-03', amount: 43.33, concept: 'Cashback', description: 'Cashback promocion banco' },
  { id: 's-i-0203b', date: '2026-02-03', amount: -8.23, concept: 'Cashback', description: 'Retencion cashback' },
  { id: 's-i-0225a', date: '2026-02-25', amount: 1380.66, concept: 'Nomina', description: 'Nomina NTT Data Spain' },
  // ── MARZO 2026 ──
  { id: 's-i-0303a', date: '2026-03-03', amount: 43.33, concept: 'Cashback', description: 'Cashback promocion banco' },
  { id: 's-i-0303b', date: '2026-03-03', amount: -8.23, concept: 'Cashback', description: 'Retencion cashback' },
  { id: 's-i-0311a', date: '2026-03-11', amount: 10.50, concept: 'Devolucion', description: 'Devolucion seguro medico (cobro indebido marzo)' },
];
