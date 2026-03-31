import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PrivacyPolicy } from './PrivacyPolicy';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ open, onClose }: PrivacyPolicyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-2xl bg-th-card border border-th-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto"
              style={{ maxHeight: 'min(90vh, 700px)' }}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header with close button */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-th-card border-b border-th-border rounded-t-2xl flex-shrink-0">
                <span className="text-sm font-semibold text-th-text">Política de Privacidad</span>
                <button
                  onClick={onClose}
                  className="p-1.5 text-th-muted hover:text-th-text hover:bg-th-hover rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto px-6 py-6 flex-1 leading-7">
                <PrivacyPolicy />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
