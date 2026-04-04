import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot, Send, User } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { formatCurrency } from '../../utils/format';
import type { Category } from '../../types';

// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  type?: 'info' | 'tip' | 'warning' | 'success';
}

interface Period {
  start: Date;
  end: Date;
  label: string;
}

interface FinData {
  expenses: { date: string; amount: number; category: string }[];
  incomes: { date: string; amount: number }[];
  budgets: { category: string; limit: number }[];
  categories: Category[];
  settings: { currentBalance: number; emergencyFund: number; monthlyIncome: number };
  motorcycles: { name: string; price: number; active: boolean }[];
}

// ── Chips ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Cuando compro mi meta?',
  'Resumen del mes',
  'Donde gasto mas?',
  'Como va mi ahorro?',
  'Comparar meses',
  'Presupuestos',
];

// ── Period detection ────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

function detectPeriod(text: string): Period | null {
  const lower = text.toLowerCase();
  const now = new Date();

  for (const [name, month] of Object.entries(MONTH_NAMES)) {
    if (lower.includes(name)) {
      const year = month > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59),
        label: `${name} ${year}`,
      };
    }
  }

  if (/este mes|mes actual/.test(lower)) {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: 'este mes' };
  }

  if (/mes pasado|mes anterior|ultimo mes|último mes/.test(lower)) {
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59), label: 'el mes pasado' };
  }

  if (/primer trimestre|q1|enero.*marzo/.test(lower)) {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 2, 31, 23, 59, 59), label: 'Q1 ' + now.getFullYear() };
  }
  if (/segundo trimestre|q2|abril.*junio/.test(lower)) {
    return { start: new Date(now.getFullYear(), 3, 1), end: new Date(now.getFullYear(), 5, 30, 23, 59, 59), label: 'Q2 ' + now.getFullYear() };
  }
  if (/tercer trimestre|q3|julio.*septiembre/.test(lower)) {
    return { start: new Date(now.getFullYear(), 6, 1), end: new Date(now.getFullYear(), 8, 30, 23, 59, 59), label: 'Q3 ' + now.getFullYear() };
  }
  if (/cuarto trimestre|q4|octubre.*diciembre/.test(lower)) {
    return { start: new Date(now.getFullYear(), 9, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59), label: 'Q4 ' + now.getFullYear() };
  }

  const lastN = lower.match(/(?:ultimos?|últimos?)\s+(\d+)\s+mes/);
  if (lastN) {
    const n = parseInt(lastN[1]);
    return { start: new Date(now.getFullYear(), now.getMonth() - n, 1), end: now, label: `los ultimos ${n} meses` };
  }

  if (/este a[nñ]o|2026/.test(lower)) {
    return { start: new Date(now.getFullYear(), 0, 1), end: now, label: 'este ano' };
  }

  if (/global|todo|siempre|total|general|historial/.test(lower)) {
    return { start: new Date(2020, 0, 1), end: now, label: 'todo el historial' };
  }

  return null;
}

// ── Category detection ──────────────────────────────────────────

function detectCategory(text: string, categories: Category[]): Category | null {
  const lower = text.toLowerCase();
  for (const cat of categories) {
    if (lower.includes(cat.name.toLowerCase())) return cat;
    if (cat.slug && lower.includes(cat.slug.replace(/-/g, ' '))) return cat;
  }
  const aliases: [RegExp, string][] = [
    [/comer|restaur|comida fuera/, 'comer-fuera'],
    [/super|mercadona|eroski|compra/, 'supermercado'],
    [/suscrip|netflix|spotify|hbo/, 'suscripciones'],
    [/tabaco|vaper/, 'tabaco-vaper'],
    [/gaming|juego|steam|playstation/, 'gaming'],
    [/gasolina|combustible|gasoil/, 'gasolina'],
    [/transporte|bus|metro|tren/, 'transporte'],
  ];
  for (const [re, slug] of aliases) {
    if (re.test(lower)) {
      const match = categories.find((c) => c.slug === slug);
      if (match) return match;
    }
  }
  return null;
}

// ── Data filters ────────────────────────────────────────────────

function filterByPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  return items.filter((item) => {
    const d = new Date(item.date);
    return d >= period.start && d <= period.end;
  });
}

function defaultPeriod(): Period {
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, label: 'este mes' };
}

// ── Calculation helpers ─────────────────────────────────────────

function getAvgMonthlySavings(data: FinData): number {
  const now = new Date();
  const vals: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const inc = data.incomes.filter((x) => x.date.startsWith(m)).reduce((s, x) => s + x.amount, 0);
    const exp = data.expenses.filter((x) => x.date.startsWith(m)).reduce((s, x) => s + x.amount, 0);
    if (inc > 0 || exp > 0) vals.push(inc - exp);
  }
  if (vals.length === 0) return data.settings.monthlyIncome * 0.3;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function groupByCategory(expenses: { amount: number; category: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of expenses) m.set(e.category, (m.get(e.category) || 0) + e.amount);
  return m;
}

// ── Response functions ──────────────────────────────────────────

type Resp = { text: string; type: 'info' | 'tip' | 'warning' | 'success' };

function goalProjection(data: FinData): Resp {
  const goal = data.motorcycles.find((m) => m.active);
  if (!goal) return { text: 'No tienes ninguna meta activa. Ve a Metas y activa una para que pueda calcular.', type: 'info' };

  const avg = getAvgMonthlySavings(data);
  const available = Math.max(0, data.settings.currentBalance - data.settings.emergencyFund);
  const remaining = Math.max(0, goal.price - available);

  if (remaining <= 0) {
    return { text: `Ya tienes suficiente para ${goal.name}. Tienes ${formatCurrency(available)} disponibles y necesitas ${formatCurrency(goal.price)}.`, type: 'success' };
  }
  if (avg <= 0) {
    return { text: `Con tu ritmo actual no estas ahorrando. Necesitas ${formatCurrency(remaining)} mas para ${goal.name}.`, type: 'warning' };
  }

  const months = Math.ceil(remaining / avg);
  const target = new Date();
  target.setMonth(target.getMonth() + months);
  const dateStr = target.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return {
    text: `A tu ritmo actual (${formatCurrency(avg)}/mes), llegarias a los ${formatCurrency(goal.price)} de ${goal.name} en ${dateStr} (${months} meses).\n\nTe faltan ${formatCurrency(remaining)}. Tienes ${formatCurrency(available)} disponibles.`,
    type: 'info',
  };
}

function goalRemaining(data: FinData): Resp {
  const goal = data.motorcycles.find((m) => m.active);
  if (!goal) return { text: 'No tienes ninguna meta activa.', type: 'info' };

  const available = Math.max(0, data.settings.currentBalance - data.settings.emergencyFund);
  const remaining = Math.max(0, goal.price - available);
  const pct = goal.price > 0 ? Math.round((available / goal.price) * 100) : 0;

  return {
    text: `Meta: ${goal.name} (${formatCurrency(goal.price)})\nAhorrado: ${formatCurrency(available)} (${pct}%)\nFalta: ${formatCurrency(remaining)}`,
    type: remaining <= 0 ? 'success' : 'info',
  };
}

function cutScenario(input: string, data: FinData): Resp {
  const amountMatch = input.match(/(\d+)/);
  const cut = amountMatch ? parseInt(amountMatch[1]) : 50;
  const avg = getAvgMonthlySavings(data);
  const newAvg = avg + cut;

  const goal = data.motorcycles.find((m) => m.active);
  let goalPart = '';
  if (goal) {
    const available = Math.max(0, data.settings.currentBalance - data.settings.emergencyFund);
    const remaining = Math.max(0, goal.price - available);
    if (remaining > 0 && newAvg > 0) {
      const before = avg > 0 ? Math.ceil(remaining / avg) : Infinity;
      const after = Math.ceil(remaining / newAvg);
      const saved = before !== Infinity ? before - after : 0;
      if (saved > 0) goalPart = `\nLlegarias a ${goal.name} ${saved} ${saved === 1 ? 'mes' : 'meses'} antes.`;
    }
  }

  return {
    text: `Si recortas ${formatCurrency(cut)}/mes, tu ahorro pasa de ${formatCurrency(avg)} a ${formatCurrency(newAvg)}/mes.${goalPart}`,
    type: 'tip',
  };
}

function periodSummary(data: FinData, period: Period): Resp {
  const exp = filterByPeriod(data.expenses, period);
  const inc = filterByPeriod(data.incomes, period);
  const totalExp = exp.reduce((s, e) => s + e.amount, 0);
  const totalInc = inc.reduce((s, i) => s + i.amount, 0);
  const balance = totalInc - totalExp;
  const savingsRate = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;

  const budgetTotal = data.budgets.reduce((s, b) => s + b.limit, 0);
  let budgetLine = '';
  if (budgetTotal > 0) {
    const pct = Math.round((totalExp / budgetTotal) * 100);
    budgetLine = pct > 100
      ? `\nPresupuesto: ${pct - 100}% por encima`
      : `\nPresupuesto: ${pct}% usado`;
  }

  const type: Resp['type'] = balance >= 0 ? 'success' : 'warning';

  return {
    text: `Resumen de ${period.label}:\n\nIngresos: ${formatCurrency(totalInc)}\nGastos: ${formatCurrency(totalExp)}\nBalance: ${formatCurrency(balance)} (tasa de ahorro: ${savingsRate}%)${budgetLine}`,
    type,
  };
}

function topExpenses(data: FinData, period: Period, specificCat: Category | null): Resp {
  const exp = filterByPeriod(data.expenses, period);

  if (specificCat) {
    const catExp = exp.filter((e) => e.category === specificCat.name);
    const total = catExp.reduce((s, e) => s + e.amount, 0);
    if (total === 0) return { text: `No hay gastos en ${specificCat.name} en ${period.label}.`, type: 'info' };
    return { text: `Gasto en ${specificCat.name} en ${period.label}: ${formatCurrency(total)} (${catExp.length} transacciones)`, type: 'info' };
  }

  if (exp.length === 0) return { text: `No hay gastos registrados en ${period.label}.`, type: 'info' };

  const byCat = groupByCategory(exp);
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = exp.reduce((s, e) => s + e.amount, 0);
  const lines = sorted.map(([cat, amt], i) => {
    const pct = Math.round((amt / total) * 100);
    return `${i + 1}. ${cat}: ${formatCurrency(amt)} (${pct}%)`;
  });

  return { text: `Top gastos en ${period.label}:\n\n${lines.join('\n')}\n\nTotal: ${formatCurrency(total)}`, type: 'info' };
}

function savingsSummary(data: FinData, period: Period | null): Resp {
  if (!period) {
    const balance = data.settings.currentBalance;
    const emergency = data.settings.emergencyFund;
    const available = Math.max(0, balance - emergency);
    const avg = getAvgMonthlySavings(data);

    return {
      text: `Saldo en cuenta: ${formatCurrency(balance)}\nColchon de emergencia: ${formatCurrency(emergency)}\nDisponible para metas: ${formatCurrency(available)}\nAhorro medio mensual: ${formatCurrency(avg)}/mes`,
      type: available > 0 ? 'success' : 'info',
    };
  }

  const exp = filterByPeriod(data.expenses, period);
  const inc = filterByPeriod(data.incomes, period);
  const totalExp = exp.reduce((s, e) => s + e.amount, 0);
  const totalInc = inc.reduce((s, i) => s + i.amount, 0);
  const saved = totalInc - totalExp;
  const rate = totalInc > 0 ? Math.round((saved / totalInc) * 100) : 0;

  return {
    text: `Ahorro en ${period.label}: ${formatCurrency(saved)}\nTasa de ahorro: ${rate}%\nIngresos: ${formatCurrency(totalInc)}\nGastos: ${formatCurrency(totalExp)}`,
    type: saved >= 0 ? 'success' : 'warning',
  };
}

function budgetAlerts(data: FinData, period: Period): Resp {
  const exp = filterByPeriod(data.expenses, period);
  const byCat = groupByCategory(exp);
  const over: string[] = [];
  const under: string[] = [];

  for (const b of data.budgets) {
    if (b.limit <= 0) continue;
    const spent = byCat.get(b.category) || 0;
    const pct = Math.round((spent / b.limit) * 100);
    if (spent > b.limit) {
      over.push(`${b.category}: ${formatCurrency(spent)} / ${formatCurrency(b.limit)} (${pct}%)`);
    } else {
      under.push(`${b.category}: ${formatCurrency(spent)} / ${formatCurrency(b.limit)} (${pct}%)`);
    }
  }

  if (over.length === 0 && under.length === 0) {
    return { text: 'No hay presupuestos configurados. Puedes crearlos en Ajustes.', type: 'info' };
  }
  if (over.length === 0) {
    return { text: `Todos los presupuestos van bien en ${period.label}.\n\n${under.join('\n')}`, type: 'success' };
  }

  let text = `Categorias por encima del presupuesto en ${period.label}:\n\n${over.join('\n')}`;
  if (under.length > 0) text += `\n\nDentro de presupuesto:\n${under.join('\n')}`;

  return { text, type: 'warning' };
}

function comparePeriods(data: FinData, text: string): Resp {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  // Try to find two months in text
  const foundMonths: { name: string; idx: number }[] = [];
  for (const [name, idx] of Object.entries(MONTH_NAMES)) {
    if (text.toLowerCase().includes(name)) foundMonths.push({ name, idx });
  }

  let p1: Period, p2: Period;

  if (foundMonths.length >= 2) {
    const [a, b] = foundMonths;
    const yearA = a.idx > curMonth ? curYear - 1 : curYear;
    const yearB = b.idx > curMonth ? curYear - 1 : curYear;
    p1 = { start: new Date(yearA, a.idx, 1), end: new Date(yearA, a.idx + 1, 0, 23, 59, 59), label: a.name };
    p2 = { start: new Date(yearB, b.idx, 1), end: new Date(yearB, b.idx + 1, 0, 23, 59, 59), label: b.name };
  } else {
    // Default: this month vs last month
    const prevM = curMonth === 0 ? 11 : curMonth - 1;
    const prevY = curMonth === 0 ? curYear - 1 : curYear;
    const curName = Object.entries(MONTH_NAMES).find(([, v]) => v === curMonth)?.[0] || 'este mes';
    const prevName = Object.entries(MONTH_NAMES).find(([, v]) => v === prevM)?.[0] || 'mes pasado';
    p1 = { start: new Date(prevY, prevM, 1), end: new Date(prevY, prevM + 1, 0, 23, 59, 59), label: prevName };
    p2 = { start: new Date(curYear, curMonth, 1), end: now, label: curName };
  }

  const exp1 = filterByPeriod(data.expenses, p1).reduce((s, e) => s + e.amount, 0);
  const exp2 = filterByPeriod(data.expenses, p2).reduce((s, e) => s + e.amount, 0);
  const inc1 = filterByPeriod(data.incomes, p1).reduce((s, i) => s + i.amount, 0);
  const inc2 = filterByPeriod(data.incomes, p2).reduce((s, i) => s + i.amount, 0);
  const sav1 = inc1 - exp1;
  const sav2 = inc2 - exp2;
  const diff = exp2 - exp1;
  const dir = diff > 0 ? 'mas' : 'menos';
  const pct = exp1 > 0 ? Math.abs(Math.round((diff / exp1) * 100)) : 0;

  return {
    text: `Comparacion ${p1.label} vs ${p2.label}:\n\n${p1.label}:\n  Gastos: ${formatCurrency(exp1)}\n  Ingresos: ${formatCurrency(inc1)}\n  Ahorro: ${formatCurrency(sav1)}\n\n${p2.label}:\n  Gastos: ${formatCurrency(exp2)}\n  Ingresos: ${formatCurrency(inc2)}\n  Ahorro: ${formatCurrency(sav2)}\n\nGastaste ${formatCurrency(Math.abs(diff))} ${dir} (${pct}%)`,
    type: diff <= 0 ? 'success' : 'tip',
  };
}

// ── Main router ─────────────────────────────────────────────────

function processMessage(input: string, data: FinData): Resp {
  const norm = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Goals & projections
  if (/cuando.*meta|cuando.*compro|cuando llego|fecha.*meta|plazo/.test(norm)) {
    return goalProjection(data);
  }
  if (/cuanto.*falta|me falta|falta para/.test(norm)) {
    return goalRemaining(data);
  }
  if (/recort|si reduzco|si bajo|si ahorro|que pasa si/.test(norm)) {
    return cutScenario(norm, data);
  }

  // Comparisons
  if (/compar|vs|versus|mas o menos|mas que|menos que|evolucion/.test(norm)) {
    return comparePeriods(data, norm);
  }

  // Detect period and category for context-aware responses
  const period = detectPeriod(norm);
  const cat = detectCategory(norm, data.categories);

  // Expense queries
  if (/gasto mas|donde gasto|en que gasto|top.*gasto|cuanto.*gast|se me va/.test(norm)) {
    return topExpenses(data, period || defaultPeriod(), cat);
  }

  // Period summary
  if (/como voy|resumen|como fue|como va/.test(norm)) {
    return periodSummary(data, period || defaultPeriod());
  }

  // Savings
  if (/ahorr|cuanto tengo|saldo|tasa.*ahorro/.test(norm)) {
    return savingsSummary(data, period);
  }

  // Budgets
  if (/me paso|presupuesto|excedo|por encima|voy bien/.test(norm)) {
    return budgetAlerts(data, period || defaultPeriod());
  }

  // If we detect a period but no clear intent, give a summary
  if (period) {
    return periodSummary(data, period);
  }

  // If we detect a category but no clear intent, give category spending
  if (cat) {
    return topExpenses(data, defaultPeriod(), cat);
  }

  return {
    text: 'No he entendido tu pregunta. Puedes preguntar cosas como:\n\n' +
      '- Cuando puedo comprar mi meta?\n' +
      '- Resumen de marzo\n' +
      '- En que gasto mas?\n' +
      '- Como va mi ahorro?\n' +
      '- Compara enero con febrero\n' +
      '- Presupuestos',
    type: 'info',
  };
}

// ── UI ──────────────────────────────────────────────────────────

const TYPE_BORDER: Record<string, string> = {
  info: 'border-l-accent-purple',
  tip: 'border-l-accent-blue',
  warning: 'border-l-accent-amber',
  success: 'border-l-accent-green',
};

export function ChatWidget() {
  const { expenses, incomes, budgets, settings, motorcycles, categories } = useAppData();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'bot', text: 'Hola, soy tu asesor financiero. Preguntame sobre tus finanzas o elige una opcion.', type: 'info' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const finData: FinData = {
    expenses: expenses.map((e) => ({ date: e.date, amount: e.amount, category: e.category })),
    incomes: incomes.map((i) => ({ date: i.date, amount: i.amount })),
    budgets,
    categories,
    settings: { currentBalance: settings.currentBalance, emergencyFund: settings.emergencyFund, monthlyIncome: settings.monthlyIncome },
    motorcycles: motorcycles.map((m) => ({ name: m.name, price: m.price, active: m.active })),
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: nextId.current++, role: 'user', text: text.trim() };
    const response = processMessage(text, finData);
    const botMsg: ChatMessage = { id: nextId.current++, role: 'bot', text: response.text, type: response.type };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 rounded-full bg-accent-purple text-white shadow-lg flex items-center justify-center hover:bg-accent-purple/90 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? 'Cerrar asesor' : 'Abrir asesor financiero'}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-36 md:bottom-20 right-4 md:right-6 z-50 w-[calc(100%-2rem)] max-w-sm bg-th-card border border-th-border rounded-2xl shadow-xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 200px)', height: '480px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-th-border flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-accent-purple/15 flex items-center justify-center">
                <Bot size={14} className="text-accent-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-th-text">Asesor financiero</p>
                <p className="text-[10px] text-th-muted">Respuestas basadas en tus datos</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="w-5 h-5 rounded-full bg-accent-purple/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={10} className="text-accent-purple" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-accent-purple text-white rounded-br-sm'
                        : `bg-th-hover text-th-text rounded-bl-sm border-l-2 ${TYPE_BORDER[msg.type || 'info']}`
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-5 h-5 rounded-full bg-th-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={10} className="text-th-muted" />
                    </div>
                  )}
                </div>
              ))}

              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1.5 bg-th-hover border border-th-border rounded-full text-[11px] text-th-secondary hover:text-th-text hover:border-accent-purple/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div className="px-3 py-1.5 border-t border-th-border/40 flex gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-2 py-1 bg-th-hover rounded-md text-[10px] text-th-muted hover:text-th-text transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-th-border flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
                placeholder="Pregunta sobre tus finanzas..."
                className="flex-1 bg-th-input border border-th-border rounded-lg px-3 py-1.5 text-xs text-th-text placeholder:text-th-faint focus:border-accent-purple focus:outline-none transition-colors"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg bg-accent-purple text-white disabled:opacity-40 hover:bg-accent-purple/90 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
