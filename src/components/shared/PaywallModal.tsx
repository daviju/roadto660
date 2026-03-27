import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { scaleFade, buttonTap } from '../../utils/animations';
import { create } from 'zustand';

// Global paywall state
interface PaywallState {
  isOpen: boolean;
  feature: string;
  open: (feature: string) => void;
  close: () => void;
}

export const usePaywall = create<PaywallState>((set) => ({
  isOpen: false,
  feature: '',
  open: (feature) => set({ isOpen: true, feature }),
  close: () => set({ isOpen: false, feature: '' }),
}));

export function PaywallModal() {
  const { isOpen, feature, close } = usePaywall();
  const setPage = useStore((s) => s.setPage);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          className="bg-th-card border border-th-border rounded-2xl p-6 w-full max-w-sm"
          variants={scaleFade}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-accent-amber" />
              <h3 className="text-lg font-bold text-th-text">Funcion PRO</h3>
            </div>
            <button onClick={close} className="text-th-muted hover:text-th-text" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-th-secondary mb-6">
            <strong>{feature}</strong> esta disponible con el plan PRO.
            Desbloquea todas las funciones premium por solo 3,99 EUR/mes.
          </p>

          <div className="space-y-3">
            <motion.button
              onClick={() => { close(); setPage('pricing'); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-purple to-accent-cyan text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              {...buttonTap}
            >
              <Sparkles size={16} />
              Desbloquear con PRO
            </motion.button>
            <button
              onClick={close}
              className="w-full px-4 py-2.5 text-sm text-th-muted hover:text-th-text transition-colors"
            >
              Ahora no
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
