import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type LoadPhase = 'loading' | 'connecting' | 'slow' | 'error';

function getPhase(elapsed: number): LoadPhase {
  if (elapsed < 3000) return 'loading';
  if (elapsed < 8000) return 'connecting';
  if (elapsed < 15000) return 'slow';
  return 'error';
}

const PHASE_MESSAGES: Record<LoadPhase, string> = {
  loading: 'Cargando...',
  connecting: 'Conectando...',
  slow: 'Esto está tardando más de lo normal...',
  error: 'La carga está tardando demasiado',
};

export function LoadingScreen() {
  const [phase, setPhase] = useState<LoadPhase>('loading');

  useEffect(() => {
    const intervals = [
      setTimeout(() => setPhase('connecting'), 3000),
      setTimeout(() => setPhase('slow'), 8000),
      setTimeout(() => setPhase('error'), 15000),
    ];
    return () => intervals.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-th-bg flex flex-col items-center justify-center gap-8 z-50">
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-5xl">🏍️</span>
        <h1 className="text-3xl font-bold tracking-tight text-th-text">
          Road<span className="text-accent-purple">To</span>
        </h1>
        <p className="text-th-muted text-sm">Tu planificador financiero</p>
      </motion.div>

      {phase !== 'error' ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              className="text-th-faint text-xs"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {PHASE_MESSAGES[phase]}
            </motion.p>
          </AnimatePresence>
        </>
      ) : (
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-th-muted text-sm">{PHASE_MESSAGES.error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="px-4 py-2 bg-th-card text-th-muted border border-th-border rounded-lg text-sm font-medium hover:text-th-text transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
