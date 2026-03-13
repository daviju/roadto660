export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return formatCurrency(amount);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current month string YYYY-MM.
 * In payday mode, the financial month is labeled by the month where the cycle ends.
 * E.g. with payDay=28: on March 13 → "2026-03" (cycle Feb 28 – Mar 27)
 */
export function getCurrentMonth(payDay?: number, cycleMode?: 'calendar' | 'payday'): string {
  const now = new Date();
  if (cycleMode === 'payday' && payDay) {
    const day = now.getDate();
    if (day >= payDay) {
      // After payday → we're in next month's cycle
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get date range for a given month label.
 * Calendar: 1st to last day.
 * Payday: (payDay of prev month) to (payDay-1 of this month).
 */
export function getMonthDateRange(
  yearMonth: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);

  if (cycleMode === 'payday' && payDay) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const endDay = payDay - 1;
    return {
      start: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`,
      end: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    };
  }

  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
  };
}

/**
 * Get the financial month label for a given date string.
 */
export function getFinancialMonthForDate(
  dateStr: string,
  payDay?: number,
  cycleMode?: 'calendar' | 'payday'
): string {
  if (cycleMode !== 'payday' || !payDay) {
    return dateStr.substring(0, 7);
  }
  const date = new Date(dateStr);
  const day = date.getDate();
  if (day >= payDay) {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
