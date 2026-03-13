import { motion } from 'framer-motion';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0f1117] flex flex-col items-center justify-center gap-8 z-50">
      {/* Logo */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-5xl">🏍️</span>
        <h1 className="text-3xl font-bold tracking-tight">
          Road<span className="text-[#a78bfa]">To660</span>
        </h1>
        <p className="text-gray-500 text-sm">Plan de ahorro para la moto</p>
      </motion.div>

      {/* Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-8 h-8 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </motion.div>

      {/* Status text */}
      <motion.p
        className="text-gray-600 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Conectando con Firebase...
      </motion.p>
    </div>
  );
}
