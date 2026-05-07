import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { FileSpreadsheet, Target, Check, BarChart3 } from 'lucide-react';

// Animates a number from 0 to `target` whenever `active` becomes true.
function useAnimatedPct(active: boolean, target: number, delay: number, duration: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) {
      setVal(0);
      return;
    }
    const controls = animate(0, target, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [active, target, delay, duration]);
  return val;
}

// Premium macOS-style window frame for any mockup screen.
export function MockupFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-[0_30px_80px_-20px_rgba(167,139,250,0.4),0_0_0_1px_rgba(167,139,250,0.1)] overflow-hidden"
      style={{ minHeight: 380 }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-black/40">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 text-[10px] text-white/30 font-mono">roadto.app</span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function BarRow({ label, width, active, delay }: { label: string; width: string; active: boolean; delay: number }) {
  const targetPct = parseFloat(width); // e.g. '80%' -> 80
  const animatedPct = useAnimatedPct(active, targetPct, delay, 1.2);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-[#64748b]">
        <span>{label}</span>
        {/* Always rendered — visible on mobile too */}
        <span className="font-mono tabular-nums">{animatedPct}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)' }}
          initial={{ width: '0%' }}
          animate={active ? { width } : { width: '0%' }}
          transition={{ duration: 1.2, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Step 1: Excel import progress bars ──────────────────────────
// `active` toggles the bar fill; bug 8 — bars animate 0→100% with stagger.
export function MockupImport({ active }: { active: boolean }) {
  const lines: { label: string; width: string }[] = [
    { label: 'Fecha', width: '80%' },
    { label: 'Concepto', width: '95%' },
    { label: 'Importe', width: '70%' },
    { label: 'Categoría', width: '90%' },
  ];
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileSpreadsheet size={16} className="text-[#22d3ee]" />
        <span className="text-xs font-medium text-[#f1f5f9]">extracto-bbva-marzo.xlsx</span>
      </div>
      <div className="space-y-3">
        {lines.map((l, i) => (
          <BarRow key={l.label} label={l.label} width={l.width} active={active} delay={i * 0.2} />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 1.1, duration: 0.4 }}
        className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/30"
      >
        <Check size={14} className="text-[#22d3ee]" />
        <span className="text-xs text-[#f1f5f9]">47 movimientos detectados · 3 duplicados descartados</span>
      </motion.div>
    </div>
  );
}

// ── Step 2: Goal with item checklist ────────────────────────────
export function MockupGoal({ active }: { active: boolean }) {
  const items: { name: string; cost: string; paid: boolean }[] = [
    { name: 'Triumph Daytona 660', cost: '8.495€', paid: true },
    { name: 'Casco Shoei NXR2', cost: '550€', paid: true },
    { name: 'Chaqueta Alpinestars', cost: '320€', paid: false },
    { name: 'Botas + guantes', cost: '280€', paid: false },
  ];
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#a78bfa]" />
          <span className="text-xs font-medium text-[#f1f5f9]">Triumph Daytona 660</span>
        </div>
        <span className="text-[10px] text-[#64748b] font-mono">9.645€</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#64748b]">Progreso</span>
          <motion.span
            className="text-[#a78bfa] font-mono font-semibold"
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.6 }}
          >
            56%
          </motion.span>
        </div>
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)' }}
            initial={{ width: '0%' }}
            animate={active ? { width: '56%' } : { width: '0%' }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {items.map((it, i) => (
          <motion.div
            key={it.name}
            initial={{ opacity: 0, x: -10 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                it.paid ? 'bg-[#22d3ee]/20' : 'bg-white/5'
              }`}
            >
              {it.paid && <Check size={10} className="text-[#22d3ee]" />}
            </div>
            <span className={`text-xs flex-1 ${it.paid ? 'text-[#64748b] line-through' : 'text-[#f1f5f9]'}`}>{it.name}</span>
            <span className="text-[10px] text-[#64748b] font-mono">{it.cost}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Savings projection chart ────────────────────────────
export function MockupProjection({ active }: { active: boolean }) {
  const pathYou = 'M 20 140 Q 80 120 130 95 T 240 50 T 340 25';
  const pathTarget = 'M 20 145 L 340 30';
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#22d3ee]" />
          <span className="text-xs font-medium text-[#f1f5f9]">Proyección de ahorro</span>
        </div>
        <motion.span
          className="text-[10px] text-[#22d3ee] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/30"
          initial={{ scale: 0, opacity: 0 }}
          animate={active ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ delay: 1.6, type: 'spring', stiffness: 400, damping: 18 }}
        >
          Mar 2027
        </motion.span>
      </div>
      <div className="relative h-44 rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <svg viewBox="0 0 360 170" className="w-full h-full" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="360" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
          <line x1="0" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
          <line x1="0" y1="150" x2="360" y2="150" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

          <motion.path
            d={pathTarget}
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={active ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          <motion.path
            d={pathYou}
            fill="none"
            stroke="url(#chartGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={active ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1.4, delay: 0.2, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="340" cy="25" r="4"
            fill="#22d3ee"
            initial={{ scale: 0 }}
            animate={active ? { scale: 1 } : { scale: 0 }}
            transition={{ delay: 1.5, type: 'spring', stiffness: 400, damping: 18 }}
          />
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)' }} />
          <span className="text-[#f1f5f9]">Tu ritmo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-[#64748b]" />
          <span className="text-[#64748b]">Objetivo</span>
        </div>
      </div>
    </div>
  );
}
