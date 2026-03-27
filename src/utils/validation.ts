// ── Input validation utilities ─────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Email: RFC 5322 simplified + trimmed + lowered
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(raw: string): ValidationResult {
  const email = raw.trim().toLowerCase();
  if (!email) return { valid: false, error: 'El email es obligatorio' };
  if (!EMAIL_RE.test(email)) return { valid: false, error: 'El formato del email no es valido' };
  return { valid: true };
}

// Password requirements
export interface PasswordCheck {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  notEmail: boolean;
}

export function checkPassword(password: string, email?: string): PasswordCheck {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
    notEmail: !email || password.toLowerCase() !== email.trim().toLowerCase(),
  };
}

export function isPasswordValid(check: PasswordCheck): boolean {
  return Object.values(check).every(Boolean);
}

export function validatePassword(password: string, email?: string): ValidationResult {
  const check = checkPassword(password, email);
  if (!password) return { valid: false, error: 'La contrasena es obligatoria' };
  if (!check.minLength) return { valid: false, error: 'Minimo 8 caracteres' };
  if (!check.hasUpper) return { valid: false, error: 'Debe contener al menos 1 mayuscula' };
  if (!check.hasLower) return { valid: false, error: 'Debe contener al menos 1 minuscula' };
  if (!check.hasNumber) return { valid: false, error: 'Debe contener al menos 1 numero' };
  if (!check.hasSpecial) return { valid: false, error: 'Debe contener al menos 1 caracter especial' };
  if (!check.notEmail) return { valid: false, error: 'La contrasena no puede ser igual al email' };
  return { valid: true };
}

export function validateConfirmPassword(password: string, confirm: string): ValidationResult {
  if (!confirm) return { valid: false, error: 'Confirma tu contrasena' };
  if (password !== confirm) return { valid: false, error: 'Las contrasenas no coinciden' };
  return { valid: true };
}

// Name validation
const NAME_RE = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/;

export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: 'El nombre es obligatorio' };
  if (trimmed.length < 2) return { valid: false, error: 'Minimo 2 caracteres' };
  if (trimmed.length > 100) return { valid: false, error: 'Maximo 100 caracteres' };
  if (!NAME_RE.test(trimmed)) return { valid: false, error: 'Solo letras, espacios, guiones y apostrofes' };
  return { valid: true };
}

// Amount validation
export function validateAmount(value: string): ValidationResult {
  if (!value) return { valid: false, error: 'El importe es obligatorio' };
  const normalized = value.replace(',', '.');
  const num = parseFloat(normalized);
  if (isNaN(num)) return { valid: false, error: 'Importe no valido' };
  if (num < 0) return { valid: false, error: 'El importe no puede ser negativo' };
  if (num > 999999.99) return { valid: false, error: 'Importe maximo: 999.999,99' };
  return { valid: true };
}

// Date validation
export function validateDate(value: string, allowFuture = false): ValidationResult {
  if (!value) return { valid: false, error: 'La fecha es obligatoria' };
  const date = new Date(value);
  if (isNaN(date.getTime())) return { valid: false, error: 'Fecha no valida' };
  if (!allowFuture && date > new Date()) return { valid: false, error: 'La fecha no puede ser futura' };
  return { valid: true };
}

// Free text (concepts, notes)
export function validateText(value: string, maxLen = 500): ValidationResult {
  if (value.length > maxLen) return { valid: false, error: `Maximo ${maxLen} caracteres` };
  return { valid: true };
}

// Password strength for visual indicator (0-4)
export function getPasswordStrength(check: PasswordCheck): number {
  const passed = Object.values(check).filter(Boolean).length;
  if (passed <= 2) return 0;
  if (passed <= 3) return 1;
  if (passed <= 4) return 2;
  if (passed <= 5) return 3;
  return 4;
}

export const STRENGTH_LABELS = ['Muy debil', 'Debil', 'Aceptable', 'Buena', 'Fuerte'];
export const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-500'];

// Auth error translation
const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email o contrasena incorrectos',
  'User already registered': 'Ya existe una cuenta con este email',
  'Email not confirmed': 'Revisa tu email para confirmar tu cuenta',
  'Too many requests': 'Demasiados intentos. Espera unos minutos',
  'Password should be at least 6 characters': 'La contrasena debe tener al menos 8 caracteres',
  'Signup requires a valid password': 'Introduce una contrasena valida',
  'Unable to validate email address: invalid format': 'El formato del email no es valido',
};

export function translateAuthError(msg: string): string {
  for (const [key, translation] of Object.entries(AUTH_ERROR_MAP)) {
    if (msg.includes(key)) return translation;
  }
  return 'Ha ocurrido un error. Intentalo de nuevo.';
}
