import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot, Send, User } from 'lucide-react';
import { useAppData } from '../../lib/DataProvider';
import { formatCurrency } from '../../utils/format';

// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  type?: 'info' | 'tip' | 'warning' | 'success';
}

interface UserData {
  expenses: { date: string; amount: number; category: string }[];
  incomes: { date: string; amount: number }[];
  budgets: { category: string; limit: number }[];
  settings: {
    currentBalance: number;
    emergencyFund: number;
    monthlyIncome: number;
  };
  motorcycles: { name: string; price: number; active: boolean }[];
}

// ── Suggested questions (chips) ─────────────────────────────────

const SUGGESTIONS = [
  { label: 'Cuando puedo comprar mi meta?', icon: '🎯' },
  { label: 'En que gasto mas?', icon: '📊' },
  { label: 'Como voy este mes?', icon: '📅' },
  { label: 'Cuanto he ahorrado?', icon: '💰' },
  { label: 'Que categorias me paso?', icon: '⚠️' },
];

// ── Helpers ─────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthExpenses(expenses: UserData['expenses'], month: string) {
  return expenses.filter((e) => e.date.startsWith(month));
}

function getMonthIncomes(incomes: UserData['incomes'], month: string) {
  return incomes.filter((i) => i.date.startsWith(month));
}

function getAvgMonthlySavings(data: UserData): number {
  const now = new Date();
  const months: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const inc = getMonthIncomes(data.incomes, m).reduce((s, x) => s + x.amount, 0);
    const exp = getMonthExpenses(data.expenses, m).reduce((s, x) => s + x.amount, 0);
    months.push(inc - exp);
  }
  if (months.length === 0) return data.settings.monthlyIncome * 0.3;
  return months.reduce((a, b) => a + b, 0) / months.length;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + '-01');
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// ── Rule-based engine ───────────────────────────────────────────

function processMessage(input: string, data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  const text = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. When can I buy my goal?
  if (/cuando|puedo comprar|fecha.*meta|llegar|alcanz/.test(text)) {
    return calculateGoalDate(data);
  }

  // 2. What-if: cut spending
  if (/recort|si reduzco|si bajo|si ahorro|que pasa si/.test(text)) {
    return calculateCutScenario(text, data);
  }

  // 3. Where do I spend most?
  if (/gasto mas|gasto más|donde gasto|en que gasto|top.*gasto/.test(text)) {
    return getTopExpenses(data);
  }

  // 4. How am I doing this month?
  if (/como voy|resumen|este mes/.test(text)) {
    return getMonthSummary(data);
  }

  // 5. How much have I saved?
  if (/ahorrado|ahorro total|cuanto tengo|saldo/.test(text)) {
    return getSavingsTotal(data);
  }

  // 6. Which categories am I over budget?
  if (/me paso|presupuesto|excedo|por encima/.test(text)) {
    return getBudgetAlerts(data);
  }

  return {
    text: 'No he entendido tu pregunta. Prueba con:\n\n' +
      '\u2022 Cuando puedo comprar mi meta?\n' +
      '\u2022 En que gasto mas?\n' +
      '\u2022 Como voy este mes?\n' +
      '\u2022 Cuanto he ahorrado?\n' +
      '\u2022 Que categorias me paso?',
    type: 'info',
  };
}

function calculateGoalDate(data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  const activeGoal = data.motorcycles.find((m) => m.active);
  if (!activeGoal) {
    return { text: 'No tienes ninguna meta activa. Ve a Metas y activa una para que pueda calcular.', type: 'info' };
  }

  const avgSaving = getAvgMonthlySavings(data);
  const available = Math.max(0, data.settings.currentBalance - data.settings.emergencyFund);
  const remaining = Math.max(0, activeGoal.price - available);

  if (remaining <= 0) {
    return { text: `Ya tienes suficiente para ${activeGoal.name}! Tienes ${formatCurrency(available)} disponibles y necesitas ${formatCurrency(activeGoal.price)}.`, type: 'success' };
  }

  if (avgSaving <= 0) {
    return { text: `Con tu ritmo actual no estas ahorrando. Necesitas ${formatCurrency(remaining)} mas para ${activeGoal.name}. Intenta recortar gastos.`, type: 'warning' };
  }

  const monthsNeeded = Math.ceil(remaining / avgSaving);
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
  const dateStr = targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return {
    text: `A tu ritmo actual (${formatCurrency(avgSaving)}/mes de ahorro), llegarias a los ${formatCurrency(activeGoal.price)} de ${activeGoal.name} en ${dateStr} (${monthsNeeded} meses).`,
    type: 'info',
  };
}

function calculateCutScenario(input: string, data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  // Try to extract amount
  const amountMatch = input.match(/(\d+)/);
  const cutAmount = amountMatch ? parseInt(amountMatch[1]) : 50;

  const activeGoal = data.motorcycles.find((m) => m.active);
  const avgSaving = getAvgMonthlySavings(data);
  const newSaving = avgSaving + cutAmount;

  let goalPart = '';
  if (activeGoal) {
    const available = Math.max(0, data.settings.currentBalance - data.settings.emergencyFund);
    const remaining = Math.max(0, activeGoal.price - available);
    if (remaining > 0 && newSaving > 0) {
      const monthsBefore = avgSaving > 0 ? Math.ceil(remaining / avgSaving) : Infinity;
      const monthsAfter = Math.ceil(remaining / newSaving);
      const saved = monthsBefore !== Infinity ? monthsBefore - monthsAfter : 0;
      goalPart = saved > 0
        ? ` Llegarias a ${activeGoal.name} ${saved} ${saved === 1 ? 'mes' : 'meses'} antes.`
        : '';
    }
  }

  return {
    text: `Si recortas ${formatCurrency(cutAmount)}/mes, tu ahorro sube de ${formatCurrency(avgSaving)} a ${formatCurrency(newSaving)}/mes.${goalPart}`,
    type: 'tip',
  };
}

function getTopExpenses(data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  const month = getCurrentMonth();
  const monthExp = getMonthExpenses(data.expenses, month);

  if (monthExp.length === 0) {
    return { text: `No hay gastos registrados en ${formatMonth(month)}.`, type: 'info' };
  }

  const byCategory = new Map<string, number>();
  for (const e of monthExp) {
    byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
  }

  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const lines = sorted.map(([cat, amt], i) => `${i + 1}. ${cat}: ${formatCurrency(amt)}`);

  return {
    text: `Tus mayores gastos en ${formatMonth(month)}:\n\n${lines.join('\n')}`,
    type: 'info',
  };
}

function getMonthSummary(data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  const month = getCurrentMonth();
  const monthExp = getMonthExpenses(data.expenses, month);
  const monthInc = getMonthIncomes(data.incomes, month);

  const totalExp = monthExp.reduce((s, e) => s + e.amount, 0);
  const totalInc = monthInc.reduce((s, i) => s + i.amount, 0);
  const balance = totalInc - totalExp;

  const totalBudget = data.budgets.reduce((s, b) => s + b.limit, 0);

  let status: 'info' | 'tip' | 'warning' | 'success' = 'info';
  let statusText = '';
  if (totalBudget > 0) {
    const pct = Math.round((totalExp / totalBudget) * 100);
    if (pct > 100) {
      status = 'warning';
      statusText = `\n\nVas un ${pct - 100}% por encima de tu presupuesto total.`;
    } else {
      status = pct > 80 ? 'tip' : 'success';
      statusText = `\n\nHas usado el ${pct}% de tu presupuesto total.`;
    }
  }

  return {
    text: `Resumen de ${formatMonth(month)}:\n\n` +
      `Ingresos: ${formatCurrency(totalInc)}\n` +
      `Gastos: ${formatCurrency(totalExp)}\n` +
      `Balance: ${formatCurrency(balance)}${statusText}`,
    type: status,
  };
}

function getSavingsTotal(data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  const balance = data.settings.currentBalance;
  const emergency = data.settings.emergencyFund;
  const available = Math.max(0, balance - emergency);

  return {
    text: `Saldo en cuenta: ${formatCurrency(balance)}\n` +
      `Colchon de emergencia: ${formatCurrency(emergency)}\n` +
      `Disponible para metas: ${formatCurrency(available)}`,
    type: available > 0 ? 'success' : 'info',
  };
}

function getBudgetAlerts(data: UserData): { text: string; type: 'info' | 'tip' | 'warning' | 'success' } {
  const month = getCurrentMonth();
  const monthExp = getMonthExpenses(data.expenses, month);

  const byCategory = new Map<string, number>();
  for (const e of monthExp) {
    byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount);
  }

  const overBudget: string[] = [];
  for (const b of data.budgets) {
    if (b.limit <= 0) continue;
    const spent = byCategory.get(b.category) || 0;
    if (spent > b.limit) {
      const pct = Math.round((spent / b.limit) * 100);
      overBudget.push(`${b.category}: ${formatCurrency(spent)} de ${formatCurrency(b.limit)} (${pct}%)`);
    }
  }

  if (overBudget.length === 0) {
    return { text: 'Ninguna categoria esta por encima del presupuesto este mes. Bien!', type: 'success' };
  }

  return {
    text: `Categorias por encima del presupuesto:\n\n${overBudget.map((l) => '\u2022 ' + l).join('\n')}`,
    type: 'warning',
  };
}

// ── UI Colors ───────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  info: 'border-l-accent-purple',
  tip: 'border-l-accent-blue',
  warning: 'border-l-accent-amber',
  success: 'border-l-accent-green',
};

// ── Component ───────────────────────────────────────────────────

export function ChatWidget() {
  const { expenses, incomes, budgets, settings, motorcycles } = useAppData();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'bot', text: 'Hola! Soy tu asesor financiero. Preguntame sobre tus finanzas o elige una opcion:', type: 'info' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  let nextId = useRef(1);

  const userData: UserData = {
    expenses: expenses.map((e) => ({ date: e.date, amount: e.amount, category: e.category })),
    incomes: incomes.map((i) => ({ date: i.date, amount: i.amount })),
    budgets,
    settings: {
      currentBalance: settings.currentBalance,
      emergencyFund: settings.emergencyFund,
      monthlyIncome: settings.monthlyIncome,
    },
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
    const response = processMessage(text, userData);
    const botMsg: ChatMessage = { id: nextId.current++, role: 'bot', text: response.text, type: response.type };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <>
      {/* Float button */}
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

      {/* Chat window */}
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
              <div className="w-8 h-8 rounded-full bg-accent-purple/15 flex items-center justify-center">
                <Bot size={16} className="text-accent-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-th-text">Asesor financiero</p>
                <p className="text-[10px] text-th-muted">Respuestas basadas en tus datos</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-accent-purple/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={12} className="text-accent-purple" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-accent-purple text-white rounded-br-sm'
                        : `bg-th-hover text-th-text rounded-bl-sm border-l-2 ${TYPE_COLORS[msg.type || 'info']}`
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-th-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={12} className="text-th-muted" />
                    </div>
                  )}
                </div>
              ))}

              {/* Suggestion chips — show after bot messages */}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSend(s.label)}
                      className="px-2.5 py-1.5 bg-th-hover border border-th-border rounded-full text-[11px] text-th-secondary hover:text-th-text hover:border-accent-purple/40 transition-colors"
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions — always visible */}
            <div className="px-3 py-2 border-t border-th-border/50 flex gap-1.5 flex-wrap flex-shrink-0">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.label)}
                  className="px-2 py-1 bg-th-hover rounded-md text-[10px] text-th-muted hover:text-th-text transition-colors truncate"
                >
                  {s.icon} {s.label.split('?')[0]}?
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
                placeholder="Pregunta algo..."
                className="flex-1 bg-th-input border border-th-border rounded-lg px-3 py-2 text-xs text-th-text placeholder:text-th-faint focus:border-accent-purple focus:outline-none transition-colors"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-accent-purple text-white disabled:opacity-40 hover:bg-accent-purple/90 transition-colors"
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
