import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Chrome } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fadeUp, buttonTap } from '../../utils/animations';

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithMagicLink } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'magic') {
        const { error: err } = await signInWithMagicLink(email);
        if (err) setError(err);
        else setSuccess('Enlace enviado a tu email. Revisa tu bandeja de entrada.');
      } else if (mode === 'register') {
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        const { error: err } = await signUpWithEmail(email, password);
        if (err) setError(err);
        else setSuccess('Cuenta creada. Revisa tu email para confirmar.');
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-purple/20 mb-4"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <span className="text-3xl">🏍️</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-th-text">
            Road<span className="text-accent-purple">To660</span>
          </h1>
          <p className="text-th-muted text-sm mt-2">
            Tu planificador financiero para alcanzar tus metas
          </p>
        </div>

        {/* Card */}
        <div className="bg-th-card border border-th-border rounded-2xl p-6 space-y-5">
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
            <span className="text-th-muted text-xs">o</span>
            <div className="flex-1 h-px bg-th-border" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-th-secondary mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-th-input border border-th-border rounded-xl text-th-text text-sm focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/30 transition-colors"
                  placeholder="tu@email.com"
                  required
                  maxLength={100}
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'magic' && (
              <div>
                <label htmlFor="password" className="block text-sm text-th-secondary mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-th-input border border-th-border rounded-xl text-th-text text-sm focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/30 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    maxLength={72}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                </div>
              </div>
            )}

            {error && (
              <motion.p
                className="text-accent-red text-sm bg-accent-red/10 px-3 py-2 rounded-lg"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            {success && (
              <motion.p
                className="text-accent-green text-sm bg-accent-green/10 px-3 py-2 rounded-lg"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {success}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-purple text-white font-medium rounded-xl hover:bg-accent-purple/90 transition-colors disabled:opacity-50"
              {...buttonTap}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Iniciar sesion' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Mode toggles */}
          <div className="flex flex-col items-center gap-2 text-sm">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
                  className="text-accent-purple hover:underline"
                >
                  No tengo cuenta, registrarme
                </button>
                <button
                  onClick={() => { setMode('magic'); setError(null); setSuccess(null); }}
                  className="text-th-muted hover:text-th-text"
                >
                  Enviar enlace de acceso por email
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="text-accent-purple hover:underline"
              >
                Ya tengo cuenta, iniciar sesion
              </button>
            )}
            {mode === 'magic' && (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="text-accent-purple hover:underline"
              >
                Volver al login con contraseña
              </button>
            )}
          </div>
        </div>

        <p className="text-th-faint text-xs text-center mt-6">
          Al registrarte, aceptas nuestra politica de privacidad y los terminos de uso.
        </p>
      </motion.div>
    </div>
  );
}
