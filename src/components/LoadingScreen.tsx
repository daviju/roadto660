import { motion } from 'framer-motion';

export function LoadingScreen() {
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
    </div>
  );
}
