import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TIMEOUT_MS = 10_000;

export function LoadingScreen() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

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
          Road<span className="text-accent-purple">To660</span>
        </h1>
        <p className="text-th-muted text-sm">Tu planificador financiero</p>
      </motion.div>

      {!timedOut ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
          </motion.div>

          <motion.p
            className="text-th-faint text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Cargando...
          </motion.p>
        </>
      ) : (
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-th-muted text-sm">
            La carga está tardando más de lo esperado
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={handleLogout}
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
