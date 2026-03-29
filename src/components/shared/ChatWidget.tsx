import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User, Construction } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { usePlan } from '../../hooks/usePlan';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

let msgId = 0;

// Whether the chat advisor edge function is configured
// We detect this on first send attempt; -1 = unknown, false = unavailable, true = ok
let advisorAvailable: boolean | null = null;

export function ChatWidget() {
  const { session } = useAuth();
  const { isPro } = usePlan();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(advisorAvailable === false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !session?.access_token) return;

    const userMsg: Message = { id: ++msgId, role: 'user', content: input.trim() };
    setMessages((prev) => [...prev.slice(-18), userMsg]); // Keep last 20
    setInput('');
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (res.status === 404 || res.status === 503 || res.status === 502) {
        advisorAvailable = false;
        setUnavailable(true);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        // Check for configuration errors (missing API key, function not deployed)
        if (res.status >= 500 || data?.error?.toLowerCase().includes('api') || data?.error?.toLowerCase().includes('key')) {
          advisorAvailable = false;
          setUnavailable(true);
          return;
        }
        const botMsg: Message = { id: ++msgId, role: 'assistant', content: data.error || 'Error al procesar tu pregunta.' };
        setMessages((prev) => [...prev.slice(-18), botMsg]);
      } else {
        advisorAvailable = true;
        const botMsg: Message = { id: ++msgId, role: 'assistant', content: data.reply };
        setMessages((prev) => [...prev.slice(-18), botMsg]);
      }
    } catch {
      advisorAvailable = false;
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

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
            style={{ maxHeight: 'calc(100vh - 200px)', height: '480px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-th-border flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-accent-purple/15 flex items-center justify-center">
                <Bot size={16} className="text-accent-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-th-text">Asesor financiero</p>
                <p className="text-[10px] text-th-muted">
                  {isPro ? 'Mensajes ilimitados' : '5 mensajes/dia (gratis)'}
                </p>
              </div>
            </div>

            {unavailable ? (
              /* Maintenance message */
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center gap-3">
                <Construction size={32} className="text-th-faint" />
                <p className="text-sm text-th-text font-medium">El asesor financiero esta temporalmente fuera de servicio</p>
                <p className="text-xs text-th-muted leading-relaxed">
                  Estamos trabajando para activarlo pronto. Mientras tanto, consulta la pestana de{' '}
                  <span className="text-accent-purple font-medium">Consejos</span>{' '}
                  para recomendaciones automaticas.
                </p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot size={32} className="text-th-faint mx-auto mb-2" />
                      <p className="text-xs text-th-muted">
                        Preguntame sobre tus finanzas, metas o presupuestos
                      </p>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-accent-purple/15 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot size={12} className="text-accent-purple" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-accent-purple text-white rounded-br-md'
                            : 'bg-th-hover text-th-text rounded-bl-md'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-accent-cyan/15 flex items-center justify-center flex-shrink-0 mt-1">
                          <User size={12} className="text-accent-cyan" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-accent-purple/15 flex items-center justify-center flex-shrink-0">
                        <Bot size={12} className="text-accent-purple" />
                      </div>
                      <div className="bg-th-hover px-3 py-2 rounded-xl rounded-bl-md">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-th-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-th-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-th-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-3 py-2 border-t border-th-border flex gap-2 flex-shrink-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    placeholder="Escribe tu pregunta..."
                    maxLength={500}
                    className="flex-1 bg-th-input border border-th-border rounded-lg px-3 py-2 text-sm text-th-text focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/30 transition-colors"
                    disabled={loading}
                  />
                  <motion.button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="p-2 bg-accent-purple text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-purple/90 transition-colors"
                    whileTap={{ scale: 0.9 }}
                    aria-label="Enviar mensaje"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
