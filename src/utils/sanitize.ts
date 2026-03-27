// ── Input sanitization against XSS ─────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const ENTITY_RE = /[&<>"']/g;

/** Escape HTML entities to prevent XSS in text content */
export function escapeHtml(str: string): string {
  return str.replace(ENTITY_RE, (ch) => HTML_ENTITIES[ch] || ch);
}

/** Sanitize a text input: trim + escape HTML + limit length */
export function sanitizeText(input: string, maxLength = 500): string {
  return escapeHtml(input.trim()).slice(0, maxLength);
}

/** Sanitize an email: trim + lowercase */
export function sanitizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Sanitize a name: trim + escape HTML + limit */
export function sanitizeName(input: string): string {
  return escapeHtml(input.trim()).slice(0, 100);
}

/** Sanitize a monetary amount string → number or null */
export function sanitizeAmount(input: string): number | null {
  const normalized = input.replace(',', '.').trim();
  const num = parseFloat(normalized);
  if (isNaN(num) || num < 0 || num > 999999.99) return null;
  return Math.round(num * 100) / 100;
}
