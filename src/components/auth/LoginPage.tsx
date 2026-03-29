import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Chrome, Eye, EyeOff, User, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../shared/Toast';
import { Logo } from '../shared/Logo';
import { FinancialBackground } from './FinancialBackground';
import { buttonTap } from '../../utils/animations';
import {
  validateEmail, validatePassword, validateConfirmPassword, validateName,
  checkPassword, isPasswordValid, getPasswordStrength,
  STRENGTH_LABELS, STRENGTH_COLORS, translateAuthError,
} from '../../utils/validation';
import { sanitizeEmail, sanitizeName } from '../../utils/sanitize';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';

type Mode = 'login' | 'register';

// Slide animation for form switch
const formVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    rotateY: direction > 0 ? 15 : -15,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotateY: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    rotateY: direction > 0 ? -15 : 15,
    transition: { duration: 0.25 },
  }),
};

// Field error component
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      className="flex items-center gap-1 mt-1 text-xs text-red-400"
    >
      <AlertCircle size={12} className="flex-shrink-0" />
      <span>{error}</span>
    </motion.div>
  );
}

// Password requirement checklist
function PasswordChecklist({ password, email }: { password: string; email: string }) {
  const checks = checkPassword(password, email);
  const items = [
    { key: 'minLength', label: 'Minimo 8 caracteres', ok: checks.minLength },
    { key: 'hasUpper', label: '1 letra mayuscula', ok: checks.hasUpper },
    { key: 'hasLower', label: '1 letra minuscula', ok: checks.hasLower },
    { key: 'hasNumber', label: '1 numero', ok: checks.hasNumber },
    { key: 'hasSpecial', label: '1 caracter especial (!@#$...)', ok: checks.hasSpecial },
    { key: 'notEmail', label: 'Diferente al email', ok: checks.notEmail },
  ];

  const strength = getPasswordStrength(checks);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-2"
    >
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= strength ? STRENGTH_COLORS[strength] : 'bg-th-border'
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-th-muted">{STRENGTH_LABELS[strength]}</p>

      {/* Requirement items */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 text-[11px]">
            {item.ok ? (
              <Check size={10} className="text-green-400 flex-shrink-0" />
            ) : (
              <X size={10} className="text-th-muted flex-shrink-0" />
            )}
            <span className={item.ok ? 'text-green-400 line-through' : 'text-th-muted'}>{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithMagicLink } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [direction, setDirection] = useState(0);

  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Touched state for validation-on-blur
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const firstErrorRef = useRef<HTMLInputElement>(null);

  const touch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  // Validations
  const emailValidation = touched.email ? validateEmail(email) : { valid: true };
  const nameValidation = touched.name ? validateName(name) : { valid: true };
  const passwordChecks = checkPassword(password, email);
  const passwordValid = isPasswordValid(passwordChecks);
  const passwordValidation = touched.password ? validatePassword(password, email) : { valid: true };
  const confirmValidation = touched.confirmPassword ? validateConfirmPassword(password, confirmPassword) : { valid: true };

  const canSubmitLogin = email.trim() && password;
  const canSubmitRegister = email.trim() && passwordValid && confirmPassword === password && name.trim().length >= 2 && privacyAccepted;

  const switchMode = (newMode: Mode) => {
    setDirection(newMode === 'register' ? 1 : -1);
    setMode(newMode);
    setTouched({});
    setMagicLinkSent(false);
  };

  // Reset magic link state on email change
  useEffect(() => { setMagicLinkSent(false); }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = sanitizeEmail(email);

    if (mode === 'register') {
      // Full validation
      const emailV = validateEmail(cleanEmail);
      const nameV = validateName(name);
      const passV = validatePassword(password, cleanEmail);
      const confV = validateConfirmPassword(password, confirmPassword);

      setTouched({ email: true, name: true, password: true, confirmPassword: true });

      if (!emailV.valid || !nameV.valid || !passV.valid || !confV.valid) {
        firstErrorRef.current?.focus();
        return;
      }
      if (!privacyAccepted) {
        toast.warning('Debes aceptar la politica de privacidad para continuar');
        return;
      }
    } else {
      const emailV = validateEmail(cleanEmail);
      setTouched({ email: true, password: true });
      if (!emailV.valid) return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await signUpWithEmail(cleanEmail, password, sanitizeName(name));
        if (error) {
          toast.error(translateAuthError(error));
        } else {
          toast.success('Cuenta creada. Revisa tu email para confirmar.');
        }
      } else {
        const { error } = await signInWithEmail(cleanEmail, password);
        if (error) {
          toast.error(translateAuthError(error));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const cleanEmail = sanitizeEmail(email);
    const emailV = validateEmail(cleanEmail);
    setTouched({ email: true });
    if (!emailV.valid) return;

    setLoading(true);
    try {
      const { error } = await signInWithMagicLink(cleanEmail);
      if (error) {
        toast.error(translateAuthError(error));
      } else {
        setMagicLinkSent(true);
        toast.success('Enlace enviado a tu email. Revisa tu bandeja de entrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-4 relative overflow-hidden">
      <FinancialBackground />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-th-muted text-sm">Tus metas financieras, a tu ritmo</p>
        </div>

        {/* Card */}
        <div className="bg-th-card/80 backdrop-blur-md border border-th-border rounded-2xl p-6 space-y-5">
          {/* Google button */}
          <motion.button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            {...buttonTap}
            aria-label="Continuar con Google"
          >
            <Chrome size={20} />
            Continuar con Google
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-th-border" />
            <span className="text-th-muted text-xs">o con email</span>
            <div className="flex-1 h-px bg-th-border" />
          </div>

          {/* Mode tabs */}
          <div className="flex bg-th-hover rounded-xl p-1">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all relative ${
                  mode === m ? 'text-th-text' : 'text-th-muted hover:text-th-secondary'
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 bg-th-card rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{m === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}</span>
              </button>
            ))}
          </div>

          {/* Animated form area */}
          <div className="relative overflow-hidden" style={{ perspective: '800px' }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.form
                key={mode}
                custom={direction}
                variants={formVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
              >
                {/* Name (register only) */}
                {mode === 'register' && (
                  <div>
                    <label htmlFor="name" className="block text-sm text-th-secondary mb-1.5">Nombre</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                      <input
                        ref={!nameValidation.valid ? firstErrorRef : undefined}
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (touched.name) touch('name'); }}
                        onBlur={() => touch('name')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-th-input border rounded-xl text-th-text text-sm focus:ring-1 transition-colors ${
                          touched.name && !nameValidation.valid
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                            : 'border-th-border focus:border-accent-purple focus:ring-accent-purple/30'
                        }`}
                        placeholder="Tu nombre"
                        maxLength={100}
                        autoComplete="name"
                      />
                      {touched.name && nameValidation.valid && name.length >= 2 && (
                        <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
                      )}
                    </div>
                    <AnimatePresence>
                      {touched.name && !nameValidation.valid && <FieldError error={nameValidation.error} />}
                    </AnimatePresence>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm text-th-secondary mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                    <input
                      ref={!emailValidation.valid ? firstErrorRef : undefined}
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (touched.email) touch('email'); }}
                      onBlur={() => touch('email')}
                      className={`w-full pl-10 pr-10 py-2.5 bg-th-input border rounded-xl text-th-text text-sm focus:ring-1 transition-colors ${
                        touched.email && !emailValidation.valid
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-th-border focus:border-accent-purple focus:ring-accent-purple/30'
                      }`}
                      placeholder="tu@email.com"
                      maxLength={100}
                      autoComplete="email"
                    />
                    {touched.email && emailValidation.valid && email.trim() && (
                      <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
                    )}
                    {touched.email && !emailValidation.valid && (
                      <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
                    )}
                  </div>
                  <AnimatePresence>
                    {touched.email && !emailValidation.valid && <FieldError error={emailValidation.error} />}
                  </AnimatePresence>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-sm text-th-secondary">Contrasena</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleMagicLink}
                        className="text-xs text-accent-purple hover:underline"
                      >
                        Olvide mi contrasena
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (touched.password) touch('password'); }}
                      onBlur={() => touch('password')}
                      className={`w-full pl-10 pr-10 py-2.5 bg-th-input border rounded-xl text-th-text text-sm focus:ring-1 transition-colors ${
                        touched.password && !passwordValidation.valid
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-th-border focus:border-accent-purple focus:ring-accent-purple/30'
                      }`}
                      placeholder="••••••••"
                      maxLength={72}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-th-muted hover:text-th-text transition-colors"
                      aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {mode === 'register' && password.length > 0 && (
                      <PasswordChecklist password={password} email={email} />
                    )}
                    {mode === 'login' && touched.password && !password && (
                      <FieldError error="La contrasena es obligatoria" />
                    )}
                  </AnimatePresence>
                </div>

                {/* Confirm Password (register only) */}
                {mode === 'register' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm text-th-secondary mb-1.5">Confirmar contrasena</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                      <input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (touched.confirmPassword) touch('confirmPassword'); }}
                        onBlur={() => touch('confirmPassword')}
                        className={`w-full pl-10 pr-10 py-2.5 bg-th-input border rounded-xl text-th-text text-sm focus:ring-1 transition-colors ${
                          touched.confirmPassword && !confirmValidation.valid
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                            : 'border-th-border focus:border-accent-purple focus:ring-accent-purple/30'
                        }`}
                        placeholder="••••••••"
                        maxLength={72}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-th-muted hover:text-th-text transition-colors"
                        aria-label={showConfirm ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <AnimatePresence>
                      {touched.confirmPassword && !confirmValidation.valid && (
                        <FieldError error={confirmValidation.error} />
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Privacy checkbox (register only) */}
                {mode === 'register' && (
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-th-border text-accent-purple focus:ring-accent-purple/30 bg-th-input"
                    />
                    <span className="text-xs text-th-muted leading-relaxed">
                      He leido y acepto la{' '}
                      <button
                        type="button"
                        className="text-accent-purple hover:underline"
                        onClick={() => setShowPrivacyModal(true)}
                      >
                        politica de privacidad
                      </button>
                    </span>
                  </label>
                )}

                {/* Magic link success */}
                <AnimatePresence>
                  {magicLinkSent && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-accent-green text-sm bg-accent-green/10 px-3 py-2 rounded-lg text-center"
                    >
                      Enlace de acceso enviado a tu email
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={loading || (mode === 'register' ? !canSubmitRegister : !canSubmitLogin)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-purple text-white font-medium rounded-xl hover:bg-accent-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  {...buttonTap}
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>
          </div>

          {/* Magic link / mode toggles */}
          <div className="flex flex-col items-center gap-2 text-sm">
            {mode === 'login' && (
              <button
                onClick={handleMagicLink}
                disabled={loading}
                className="text-th-muted hover:text-th-text text-xs"
              >
                Enviar enlace de acceso por email
              </button>
            )}
          </div>
        </div>

        <p className="text-th-faint text-xs text-center mt-6">
          Pago seguro con Stripe &middot; Tus datos estan protegidos
        </p>
      </motion.div>

      <PrivacyPolicyModal open={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
}
