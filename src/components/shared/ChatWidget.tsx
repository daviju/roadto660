import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bot, Construction } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

export function ChatWidget() {
  const { isPro } = usePlan();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Float button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 rounded-full bg-accent-purple text-white shadow-lg flex items-center justify-center hover:bg-accent-purple/90 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Abrir asesor financiero"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-36 md:bottom-20 right-4 md:right-6 z-50 w-[calc(100%-2rem)] max-w-sm bg-th-card border border-th-border rounded-2xl shadow-xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 200px)', height: '320px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-th-border flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-accent-purple/15 flex items-center justify-center">
                <Bot size={16} className="text-accent-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-th-text">Asesor financiero</p>
                <p className="text-[10px] text-th-muted">
                  {isPro ? 'Plan PRO' : 'Plan gratuito'}
                </p>
              </div>
            </div>

            {/* Maintenance message */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center gap-3">
              <Construction size={32} className="text-th-faint" />
              <p className="text-sm text-th-text font-medium">El asesor financiero está temporalmente fuera de servicio</p>
              <p className="text-xs text-th-muted leading-relaxed">
                Estamos trabajando para activarlo pronto. Mientras tanto, consulta la pestaña de{' '}
                <span className="text-accent-purple font-medium">Consejos</span>{' '}
                para recomendaciones automáticas.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
