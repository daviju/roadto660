import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 3;

const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle2; bg: string; border: string; text: string; defaultDuration: number }> = {
  success: { icon: CheckCircle2, bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', defaultDuration: 5000 },
  error:   { icon: AlertCircle,  bg: 'bg-red-500/10',   border: 'border-red-500/30',   text: 'text-red-400',   defaultDuration: 8000 },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', defaultDuration: 8000 },
  info:    { icon: Info,          bg: 'bg-blue-500/10',  border: 'border-blue-500/30',  text: 'text-blue-400',  defaultDuration: 5000 },
};

let toastId = 0;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg max-w-sm ${config.bg} ${config.border}`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${config.text}`} />
      <p className="text-sm text-th-text flex-1 leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-th-muted hover:text-th-text transition-colors p-0.5"
        aria-label="Cerrar notificacion"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    const finalDuration = duration ?? TOAST_CONFIG[type].defaultDuration;

    setToasts((prev) => {
      const next = [...prev, { id, type, message, duration: finalDuration }];
      // Keep only MAX_TOASTS
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    setTimeout(() => dismiss(id), finalDuration);
  }, [dismiss]);

  const toast = {
    success: (msg: string, d?: number) => addToast('success', msg, d),
    error: (msg: string, d?: number) => addToast('error', msg, d),
    warning: (msg: string, d?: number) => addToast('warning', msg, d),
    info: (msg: string, d?: number) => addToast('info', msg, d),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container - top right */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
