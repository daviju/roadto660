import { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  animate,
  useReducedMotion,
} from 'framer-motion';
import {
  Target, Shield, Crown, Check, ArrowRight, ChevronDown,
  Wallet, Bot, Trophy, FileSpreadsheet, Building2, BarChart3,
  TrendingUp, Sparkles,
} from 'lucide-react';
import { Logo } from '../shared/Logo';
import { STRIPE_PRICES } from '../../lib/stripe-config';

interface Props {
  onLogin: () => void;
}

// ── Animated counter (counts to target when in view) ─────────────

function AnimatedCounter({ target, suffix = '%' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [val, setVal] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setVal(target); return; }
    const controls = animate(0, target, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, reduced]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Shimmer button (CTA principal) ───────────────────────────────

function ShimmerButton({
  children,
  onClick,
  className = '',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  size?: 'md' | 'lg';
}) {
  const sizes = {
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden rounded-xl font-semibold text-white shadow-[0_8px_30px_rgba(167,139,250,0.35)] ${sizes[size]} ${className}`}
      style={{
        background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
      }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
        }}
        animate={{ translateX: ['100%', '200%'] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}

// ── Mockup frame (macOS-style window) ─────────────────────────────

function MockupFrame({ children }: { children: React.ReactNode }) {
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

// ── Mockup contents ─────────────────────────────────────────────

function MockupImport({ active }: { active: boolean }) {
  const lines = [
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
          <div key={l.label} className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-[#64748b]">
              <span>{l.label}</span>
              <span className="font-mono">100%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)' }}
                initial={{ width: 0 }}
                animate={active ? { width: l.width } : { width: 0 }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/30"
      >
        <Check size={14} className="text-[#22d3ee]" />
        <span className="text-xs text-[#f1f5f9]">47 movimientos detectados · 3 duplicados descartados</span>
      </motion.div>
    </div>
  );
}

function MockupGoal({ active }: { active: boolean }) {
  const items = [
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
            initial={{ width: 0 }}
            animate={active ? { width: '56%' } : { width: 0 }}
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

function MockupProjection({ active }: { active: boolean }) {
  // SVG line chart with stroke-dashoffset draw animation
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
          {/* Grid */}
          <line x1="0" y1="50" x2="360" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
          <line x1="0" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
          <line x1="0" y1="150" x2="360" y2="150" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

          {/* Target line (dashed) */}
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
          {/* Your pace line */}
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
          {/* End dot */}
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

// ── Sticky product section with mockup that swaps content ─────────

const STEPS = [
  {
    badge: '30 segundos',
    title: 'Sube tu extracto bancario',
    description:
      'Arrastra un Excel de cualquier banco español. RoadTo detecta automáticamente las columnas, filtra duplicados y categoriza tus movimientos.',
  },
  {
    badge: '1 click',
    title: 'Crea y elige tu meta',
    description:
      'Define tu objetivo: una moto, un viaje, un fondo de emergencia. Añade los items que necesitas y RoadTo calcula el plan.',
  },
  {
    badge: 'Al instante',
    title: 'Ve cuándo la consigues',
    description:
      'Proyección en tiempo real. Simula escenarios: ¿qué pasa si recortas en comer fuera? ¿Y si ahorras 100€ más al mes?',
  },
];

function ProductSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const inView1 = useInView(step1Ref, { margin: '-45% 0px -45% 0px', amount: 'some' });
  const inView2 = useInView(step2Ref, { margin: '-45% 0px -45% 0px', amount: 'some' });
  const inView3 = useInView(step3Ref, { margin: '-45% 0px -45% 0px', amount: 'some' });

  // Active step (later ones win)
  const activeIndex = inView3 ? 2 : inView2 ? 1 : 0;

  return (
    <section ref={sectionRef} className="relative py-32 md:py-40 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#f1f5f9]">
            De extracto a plan{' '}
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              en 3 pasos
            </span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-[#64748b] max-w-2xl mx-auto">
            Sin hojas de cálculo manuales, sin apuntar gastos a mano. RoadTo lo hace por ti.
          </p>
        </motion.div>

        {/* Desktop: sticky mockup + scroll steps. Two columns of equal natural height. */}
        <div className="hidden lg:grid grid-cols-2 gap-16">
          {/* Sticky column — mockup centered vertically while user scrolls steps */}
          <div className="relative">
            <div className="sticky top-1/2 -translate-y-1/2">
              <MockupFrame>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {activeIndex === 0 && <MockupImport active={inView1} />}
                    {activeIndex === 1 && <MockupGoal active={inView2} />}
                    {activeIndex === 2 && <MockupProjection active={inView3} />}
                  </motion.div>
                </AnimatePresence>
              </MockupFrame>
            </div>
          </div>

          <div className="space-y-[60vh] py-[20vh]">
            {STEPS.map((s, i) => {
              const ref = [step1Ref, step2Ref, step3Ref][i];
              const isActive = [inView1, inView2, inView3][i];
              return (
                <motion.div
                  key={s.title}
                  ref={ref}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30%' }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <motion.span
                    animate={isActive ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0.5 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                    {s.badge}
                  </motion.span>
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-[#f1f5f9]">{s.title}</h3>
                  <p className="text-base text-[#64748b] leading-relaxed">{s.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: inline mockups */}
        <div className="lg:hidden space-y-20">
          {STEPS.map((s, i) => {
            const Mockup = [MockupImport, MockupGoal, MockupProjection][i];
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                  {s.badge}
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-[#f1f5f9]">{s.title}</h3>
                <p className="text-base text-[#64748b] leading-relaxed">{s.description}</p>
                <MockupFrame>
                  <Mockup active={true} />
                </MockupFrame>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Custom cursor ────────────────────────────────────────────────

function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { damping: 25, stiffness: 300, mass: 0.5 });
  const sy = useSpring(y, { damping: 25, stiffness: 300, mass: 0.5 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const move = (e: MouseEvent) => {
      x.set(e.clientX - 12);
      y.set(e.clientY - 12);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [x, y, reduced]);

  if (reduced) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[9999] w-6 h-6 rounded-full border border-[#a78bfa]/50 mix-blend-screen hidden md:block"
      style={{ x: sx, y: sy, background: 'radial-gradient(circle, rgba(167,139,250,0.15), transparent 70%)' }}
    />
  );
}

// ── Main landing ──────────────────────────────────────────────────

export function LandingPage({ onLogin }: Props) {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Hero parallax
  const heroY = useTransform(scrollY, [0, 800], [0, -400]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  // Navbar appearance
  const navOpacity = useTransform(scrollY, [80, 240], [0, 1]);
  const navY = useTransform(scrollY, [80, 240], [-20, 0]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#f1f5f9] font-sans antialiased">
      <CustomCursor />

      <style>{`
        html { scroll-behavior: smooth; }
        .pro-card {
          border: 1px solid rgba(167, 139, 250, 0.25);
          box-shadow: 0 0 0 rgba(167, 139, 250, 0);
          transition: border-color 300ms ease-out, box-shadow 300ms ease-out, transform 300ms ease-out;
        }
        .pro-card:hover {
          border-color: rgba(167, 139, 250, 0.55);
          box-shadow: 0 0 40px rgba(167, 139, 250, 0.18);
        }
        .feature-card {
          transition: transform 200ms ease-out, border-color 200ms ease-out, box-shadow 200ms ease-out;
        }
      `}</style>

      {/* ─── Fixed Navbar ─────────────────────────────────────── */}
      <motion.header
        style={{ opacity: navOpacity, y: navY }}
        className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between"
          style={{ background: 'rgba(5,5,7,0.8)' }}>
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onLogin}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="hidden sm:block text-sm text-[#94a3b8] hover:text-[#f1f5f9] transition-colors px-4 py-2"
            >
              Iniciar sesión
            </motion.button>
            <ShimmerButton onClick={onLogin}>
              Empezar gratis <ArrowRight size={14} />
            </ShimmerButton>
          </div>
        </div>
      </motion.header>

      {/* ─── 1. HERO ──────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      >
        {/* Radial gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(167,139,250,0.08) 0%, rgba(34,211,238,0.03) 35%, transparent 70%)',
          }}
        />
        {/* Subtle noise grid */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <motion.div
          style={reduced ? undefined : { y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
            className="flex justify-center mb-8"
          >
            <Logo size="lg" animated={false} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.04em] leading-[1.05]"
          >
            Tus metas financieras,
            <br />
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              a tu ritmo.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed"
          >
            Controla tus gastos, planifica tu ahorro y alcanza tus objetivos con un plan claro.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center"
          >
            <ShimmerButton onClick={onLogin} size="lg">
              Empezar gratis <ArrowRight size={16} />
            </ShimmerButton>
            <motion.button
              onClick={() => scrollToSection('product')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-7 py-4 rounded-xl text-sm font-semibold border border-white/15 text-[#f1f5f9] hover:border-white/30 hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              Descubrir <ChevronDown size={14} />
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-12 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-[#64748b]"
          >
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#a78bfa]" /> Sin tarjeta</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#a78bfa]" /> Gratis</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-[#a78bfa]" /> Datos seguros</span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.button
          onClick={() => scrollToSection('problem')}
          aria-label="Bajar"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#64748b] hover:text-[#f1f5f9] transition-colors"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <ChevronDown size={28} />
        </motion.button>
      </section>

      {/* ─── 2. PROBLEM ────────────────────────────────────────── */}
      <section id="problem" className="relative min-h-screen flex items-center px-6 py-24">
        <div className="max-w-5xl mx-auto w-full">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-center mb-4"
          >
            ¿Sabes en qué se te va{' '}
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              el dinero?
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-[#64748b] text-center max-w-2xl mx-auto mb-16 md:mb-24"
          >
            La mayoría de jóvenes no lleva un control real. Estos números lo dejan claro.
          </motion.p>

          <div className="space-y-10 md:space-y-12 max-w-3xl mx-auto">
            {[
              { value: 67, label: 'de los jóvenes no sabe cuánto gasta al mes' },
              { value: 43, label: 'nunca ha calculado cuánto puede ahorrar' },
              { value: 12, label: 'tiene un plan financiero real' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
              >
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-5xl md:text-7xl font-bold tracking-tight tabular-nums"
                    style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <AnimatedCounter target={stat.value} />
                  </span>
                  <span className="text-base md:text-xl text-[#94a3b8] flex-1">{stat.label}</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)' }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${stat.value}%` }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 1.5, delay: i * 0.2 + 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. PRODUCT (sticky mockup) ─────────────────────────── */}
      <div id="product">
        <ProductSection />
      </div>

      {/* ─── 4. FEATURES ────────────────────────────────────────── */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Todo lo que{' '}
              <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                necesitas
              </span>
            </h2>
            <p className="mt-4 text-base md:text-lg text-[#64748b] max-w-2xl mx-auto">
              Una herramienta para entender tu dinero, planificar tus metas y ahorrar de verdad.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {[
              {
                icon: <BarChart3 size={20} />,
                title: 'Control inteligente',
                desc: 'Categoriza tus gastos automáticamente. Ve dónde se te va cada euro mes a mes.',
              },
              {
                icon: <Target size={20} />,
                title: 'Metas con fecha estimada',
                desc: 'Define lo que quieres y cuándo lo necesitas. RoadTo calcula tu plan mes a mes.',
              },
              {
                icon: <Bot size={20} />,
                title: 'Asesor financiero',
                desc: 'Pregúntale lo que quieras: "¿cuándo compro mi moto?". Te responde con tus datos.',
              },
              {
                icon: <Building2 size={20} />,
                title: 'Cualquier banco español',
                desc: 'Sube tu Excel de BBVA, Unicaja, CaixaBank, Cajamar... detectamos las columnas automáticamente.',
              },
              {
                icon: <Shield size={20} />,
                title: 'Tus datos son tuyos',
                desc: 'Cifrado, RGPD, sin anuncios. Exporta o elimina tus datos cuando quieras.',
              },
              {
                icon: <Trophy size={20} />,
                title: 'Retos y recompensas',
                desc: 'Gana puntos por registrar gastos y cumplir presupuestos. Canjéalos por meses de PRO.',
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="feature-card relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-[#a78bfa]/40 hover:shadow-[0_0_40px_-10px_rgba(167,139,250,0.4)]"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-white"
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#f1f5f9] mb-2">{f.title}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS — timeline ─────────────────────────── */}
      <HowItWorksSection />

      {/* ─── 6. PRICING ─────────────────────────────────────────── */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Empieza gratis,{' '}
              <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                crece con PRO
              </span>
            </h2>
            <p className="mt-4 text-base md:text-lg text-[#64748b]">Sin compromisos. Cancela cuando quieras.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FREE */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 18 }}
              whileHover={{ y: -3 }}
              className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 transition-colors hover:border-white/15"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-[#64748b] font-semibold">Free</span>
                <Wallet size={20} className="text-[#64748b]" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-bold tracking-tight">0€</span>
                <span className="text-[#64748b]">/ mes</span>
              </div>
              <p className="text-sm text-[#64748b] mb-6">Para empezar a controlar tus gastos.</p>

              <ul className="space-y-3 mb-8">
                {[
                  'Control de gastos e ingresos',
                  '1 meta de ahorro',
                  'Importación Excel (50 mov.)',
                  'Presupuestos por categoría',
                  'Gana puntos por acciones',
                  'Chatbot (10 msg/día)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#cbd5e1]">
                    <Check size={16} className="text-[#22d3ee] mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.button
                onClick={onLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-semibold border border-white/15 text-[#f1f5f9] hover:border-white/30 hover:bg-white/5 transition-colors"
              >
                Empezar gratis
              </motion.button>
            </motion.div>

            {/* PRO */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 18, delay: 0.1 }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="pro-card relative rounded-3xl bg-[#0a0a0f] p-8"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)' }}
                >
                  Recomendado
                </span>
                <Crown size={20} className="text-[#a78bfa]" />
              </div>
              <div className="flex items-baseline gap-2 mb-1 mt-2">
                <span className="text-5xl font-bold tracking-tight">
                  {STRIPE_PRICES.monthly.amount.toFixed(2).replace('.', ',')}€
                </span>
                <span className="text-[#64748b]">/ mes</span>
              </div>
              <p className="text-sm text-[#a78bfa] mb-6">
                o {STRIPE_PRICES.annual.amount.toFixed(2).replace('.', ',')}€/año (-{STRIPE_PRICES.annual.savings}%)
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  ['Todo lo de FREE +', true],
                  ['Metas ilimitadas', false],
                  ['Simulador de escenarios', false],
                  ['Importaciones sin límite', false],
                  ['Chatbot ilimitado', false],
                  ['Retos mensuales', false],
                  ['Historial completo', false],
                  ['Exportación de datos', false],
                ].map(([f, isHeader]) => (
                  <li key={f as string} className={`flex items-start gap-2.5 text-sm ${isHeader ? 'text-[#f1f5f9] font-semibold' : 'text-[#cbd5e1]'}`}>
                    <Check size={16} className="text-[#a78bfa] mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <ShimmerButton onClick={onLogin} className="w-full justify-center">
                <span className="w-full text-center">Probar PRO</span>
              </ShimmerButton>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 7. CTA FINAL + FOOTER ─────────────────────────────── */}
      <section className="relative py-32 md:py-40 px-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(167,139,250,0.06) 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <FinalHeading />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-col items-center gap-5"
          >
            <ShimmerButton onClick={onLogin} size="lg">
              Crear mi cuenta gratis <ArrowRight size={16} />
            </ShimmerButton>
            <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5"><Check size={12} className="text-[#a78bfa]" /> Sin tarjeta</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-[#a78bfa]" /> 30 segundos</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-[#a78bfa]" /> Datos seguros</span>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-xs text-[#64748b]">
        RoadTo © 2026 · <a className="hover:text-[#f1f5f9] transition-colors" href="#">Política de privacidad</a> ·{' '}
        <a className="hover:text-[#f1f5f9] transition-colors" href="#">Contacto</a>
      </footer>
    </div>
  );
}

// ── Final CTA heading with word-by-word reveal ───────────────────

function FinalHeading() {
  const words = 'Tu primera meta financiera empieza con un click.'.split(' ');
  return (
    <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="inline-block mr-3"
        >
          {w === 'click.' ? (
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {w}
            </span>
          ) : (
            w
          )}
        </motion.span>
      ))}
    </h2>
  );
}

// ── How it works — timeline section ──────────────────────────────

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3, margin: '0px 0px -10% 0px' });

  const steps = [
    { icon: <FileSpreadsheet size={20} />, title: 'Sube tu extracto', badge: '30 seg' },
    { icon: <Target size={20} />, title: 'Crea y elige tu meta', badge: '1 click' },
    { icon: <TrendingUp size={20} />, title: 'Ve cuándo la consigues', badge: 'Al instante' },
  ];

  return (
    <section ref={ref} className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Cómo{' '}
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              funciona
            </span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-[#64748b]">Tres pasos. Sin manual de instrucciones.</p>
        </motion.div>

        {/* Desktop horizontal timeline */}
        <div className="hidden md:block relative">
          <div className="relative grid grid-cols-3 gap-6">
            {/* Connecting line — drawn behind the icons */}
            <svg
              className="absolute top-8 left-0 right-0 w-full pointer-events-none"
              height="3"
              style={{ zIndex: 0 }}
              preserveAspectRatio="none"
              viewBox="0 0 100 3"
            >
              <motion.line
                x1="16.66" y1="1.5" x2="83.33" y2="1.5"
                stroke="url(#lineGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>

            {steps.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                {/* Icon — solid bg so line doesn't show through */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4 + i * 0.6,
                    type: 'spring',
                    stiffness: 220,
                    damping: 18,
                  }}
                  className="relative w-16 h-16 rounded-full flex items-center justify-center bg-[#050507] border-2 border-[#a78bfa]/40 text-[#a78bfa]"
                  style={{ zIndex: 2, boxShadow: '0 0 0 6px #050507, 0 0 30px rgba(167,139,250,0.3)' }}
                >
                  <div
                    className="absolute inset-0 rounded-full opacity-30"
                    style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)' }}
                  />
                  <span className="relative z-10 text-[#f1f5f9]">{s.icon}</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.7 + i * 0.6 }}
                  className="mt-6 space-y-2"
                >
                  <h3 className="text-base font-semibold text-[#f1f5f9]">{s.title}</h3>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : { scale: 0 }}
                    transition={{ delay: 0.9 + i * 0.6, type: 'spring', stiffness: 400, damping: 18 }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30"
                  >
                    <Sparkles size={9} />
                    {s.badge}
                  </motion.span>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile vertical timeline */}
        <div className="md:hidden relative space-y-10 pl-12">
          <div className="absolute left-5 top-2 bottom-2 w-0.5"
            style={{ background: 'linear-gradient(180deg, #a78bfa, #22d3ee)' }}
          />
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="relative"
            >
              <div
                className="absolute -left-12 top-0 w-10 h-10 rounded-full flex items-center justify-center bg-[#050507] border-2 border-[#a78bfa]/40 text-[#a78bfa]"
                style={{ zIndex: 2 }}
              >
                {s.icon}
              </div>
              <h3 className="text-base font-semibold text-[#f1f5f9]">{s.title}</h3>
              <span className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30">
                <Sparkles size={9} />
                {s.badge}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
