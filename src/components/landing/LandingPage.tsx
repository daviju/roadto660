import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Target, Shield, Zap, Crown,
  Check, ArrowRight, ArrowDown, Wallet, Bot, Trophy,
  FileSpreadsheet, Calendar, PieChart, CheckCircle2,
} from 'lucide-react';
import { Logo } from '../shared/Logo';
import { STRIPE_PRICES } from '../../lib/stripe-config';

gsap.registerPlugin(ScrollTrigger);

// ── Types ──────────────────────────────────────────────────────

interface Props {
  onLogin: () => void;
}

// ── Counter animation helper ───────────────────────────────────

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 2,
        ease: 'power1.inOut',
        snap: { v: 1 },
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          once: true,
        },
        onUpdate: () => setVal(obj.v),
      });
    });
    return () => ctx.revert();
  }, [target]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Mockup screens ─────────────────────────────────────────────

function MockupImport() {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet size={16} className="text-accent-green" />
        <span className="text-xs font-medium text-[#f1f5f9]">Importando extracto...</span>
      </div>
      {['Fecha', 'Concepto', 'Importe', 'Categoria'].map((h, i) => (
        <div key={h} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          <span className="text-[10px] text-[#94a3b8] flex-1">{h}</span>
          <div className="h-1.5 rounded-full bg-accent-green/30" style={{ width: `${60 + i * 10}%` }} />
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-accent-green">
        <CheckCircle2 size={12} /> 47 movimientos detectados
      </div>
    </div>
  );
}

function MockupExpenses() {
  const cats = [
    { name: 'Comer fuera', pct: 38, color: '#ef4444', amt: '98,20€' },
    { name: 'Supermercado', pct: 26, color: '#f59e0b', amt: '67,50€' },
    { name: 'Suscripciones', pct: 14, color: '#a78bfa', amt: '21,50€' },
    { name: 'Transporte', pct: 12, color: '#06b6d4', amt: '18,00€' },
    { name: 'Otros', pct: 10, color: '#64748b', amt: '15,30€' },
  ];
  return (
    <div className="w-full space-y-2 p-4">
      <div className="flex items-center gap-2 mb-2">
        <PieChart size={16} className="text-accent-purple" />
        <span className="text-xs font-medium text-[#f1f5f9]">Gastos por categoria</span>
      </div>
      {cats.map((c) => (
        <div key={c.name} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
          <span className="text-[#94a3b8] flex-1 truncate">{c.name}</span>
          <span className="text-[#f1f5f9] font-mono">{c.amt}</span>
          <div className="w-16 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MockupGoal() {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-accent-cyan" />
        <span className="text-xs font-medium text-[#f1f5f9]">Carnet de coche</span>
      </div>
      <div className="w-full h-3 bg-[#1e293b] rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan mockup-progress" style={{ width: '0%' }} />
      </div>
      <div className="flex justify-between text-[10px] text-[#94a3b8]">
        <span>25€ de 359€</span>
        <span>7%</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0f172a] rounded-lg p-2">
          <p className="text-[8px] text-[#64748b]">Falta</p>
          <p className="text-[10px] font-mono text-[#f1f5f9]">334€</p>
        </div>
        <div className="bg-[#0f172a] rounded-lg p-2">
          <p className="text-[8px] text-[#64748b]">Plazo</p>
          <p className="text-[10px] font-mono text-accent-cyan">2 meses</p>
        </div>
        <div className="bg-[#0f172a] rounded-lg p-2">
          <p className="text-[8px] text-[#64748b]">Fecha</p>
          <p className="text-[10px] font-mono text-accent-amber">jun 2026</p>
        </div>
      </div>
    </div>
  );
}

// ── Features data ──────────────────────────────────────────────

const FEATURES = [
  { icon: <Wallet size={22} />, title: 'Control total de gastos', desc: 'Registra gastos e ingresos al instante, categoriza y visualiza tu saldo real.' },
  { icon: <Target size={22} />, title: 'Metas con fecha estimada', desc: 'Define objetivos, anade items y simula escenarios para alcanzarlos antes.' },
  { icon: <Bot size={22} />, title: 'Asesor financiero integrado', desc: 'Pregunta por tus gastos, presupuestos y proyecciones en lenguaje natural.' },
  { icon: <FileSpreadsheet size={22} />, title: 'Cualquier banco espanol', desc: 'Importa extractos de BBVA, CaixaBank, Santander, ING y mas. Automatico.' },
  { icon: <Shield size={22} />, title: 'Privacidad total', desc: 'Datos cifrados, sin anuncios, sin venta de informacion. Tu privacidad importa.' },
  { icon: <Trophy size={22} />, title: 'Retos y recompensas', desc: 'Gana puntos por cada accion financiera. Canjea por PRO o desbloquea logros.' },
];

const FREE_LIST = [
  'Control de gastos e ingresos',
  '1 meta de ahorro',
  'Importacion Excel (50 mov.)',
  'Presupuestos por categoria',
  'Gana puntos por acciones',
  'Chatbot (10 msg/dia)',
];

const PRO_LIST = [
  'Todo lo de FREE +',
  'Metas ilimitadas',
  'Simulador de escenarios',
  'Importaciones sin limite',
  'Chatbot ilimitado',
  'Retos mensuales',
  'Historial completo',
  'Exportacion de datos',
];

// ── Steps data ─────────────────────────────────────────────────

const STEPS = [
  { num: 1, title: 'Sube tu extracto', time: '30 seg', icon: <FileSpreadsheet size={20} /> },
  { num: 2, title: 'Elige tu meta', time: '1 click', icon: <Target size={20} /> },
  { num: 3, title: 'Ve cuando la consigues', time: 'Al instante', icon: <Calendar size={20} /> },
];

// ── Main component ─────────────────────────────────────────────

export function LandingPage({ onLogin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [navVisible, setNavVisible] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      // ── Nav reveal on scroll ────────────────────────────────
      ScrollTrigger.create({
        trigger: '.landing-hero',
        start: 'bottom 90%',
        onEnter: () => setNavVisible(true),
        onLeaveBack: () => setNavVisible(false),
      });

      if (prefersReduced) return;

      // ── Hero fade out on scroll ─────────────────────────────
      gsap.to('.hero-content', {
        y: -80,
        opacity: 0,
        scrollTrigger: {
          trigger: '.landing-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // ── Problem stats counter + bars ────────────────────────
      gsap.from('.stat-bar', {
        width: 0,
        duration: 1.2,
        ease: 'power2.out',
        stagger: 0.2,
        scrollTrigger: { trigger: '.problem-section', start: 'top 70%', once: true },
      });

      gsap.from('.stat-text', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.problem-section', start: 'top 70%', once: true },
      });

      // ── Product section: sticky mockup (desktop only) ───────
      if (!isMobile) {
        ScrollTrigger.create({
          trigger: '.product-section',
          start: 'top top',
          end: 'bottom bottom',
          pin: '.product-mockup-wrapper',
          pinSpacing: false,
        });

        // Mockup entrance
        gsap.from('.product-mockup', {
          scale: 0.85,
          rotateY: -8,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.product-section', start: 'top 60%', once: true },
        });

        // Progress bar in goal mockup
        gsap.to('.mockup-progress', {
          width: '65%',
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.product-step-3', start: 'top 70%', once: true },
        });

        // Screen switching based on which step is visible
        const showScreen = (n: number) => {
          document.querySelectorAll('[class^="mockup-screen-"]').forEach((el, i) => {
            (el as HTMLElement).style.display = i === n ? 'block' : 'none';
          });
        };
        ScrollTrigger.create({
          trigger: '.product-step-1',
          start: 'top center',
          end: 'bottom center',
          onEnter: () => showScreen(0),
          onEnterBack: () => showScreen(0),
        });
        ScrollTrigger.create({
          trigger: '.product-step-2',
          start: 'top center',
          end: 'bottom center',
          onEnter: () => showScreen(1),
          onEnterBack: () => showScreen(1),
        });
        ScrollTrigger.create({
          trigger: '.product-step-3',
          start: 'top center',
          end: 'bottom center',
          onEnter: () => showScreen(2),
          onEnterBack: () => showScreen(2),
        });
      }

      // ── Feature cards stagger ───────────────────────────────
      gsap.from('.feature-card', {
        y: 50,
        opacity: 0,
        stagger: 0.08,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.features-grid', start: 'top 80%', once: true },
      });

      // ── Steps line draw ─────────────────────────────────────
      gsap.from('.step-line', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: '.steps-section', start: 'top 70%', once: true },
      });

      gsap.from('.step-item', {
        y: 40,
        opacity: 0,
        stagger: 0.2,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.steps-section', start: 'top 65%', once: true },
      });

      // ── Pricing cards from sides ────────────────────────────
      gsap.from('.price-free', {
        x: -60,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.5)',
        scrollTrigger: { trigger: '.pricing-section', start: 'top 70%', once: true },
      });
      gsap.from('.price-pro', {
        x: 60,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.5)',
        scrollTrigger: { trigger: '.pricing-section', start: 'top 70%', once: true },
      });

      // ── CTA fade in ─────────────────────────────────────────
      gsap.from('.cta-final', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.cta-section', start: 'top 80%', once: true },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const scrollToDiscover = () => {
    document.querySelector('.problem-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="bg-[#0a0b10] text-[#f1f5f9] relative overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ─── Fixed Nav (appears on scroll) ──────────────────── */}
      <AnimatePresence>
        {navVisible && (
          <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0b10]/80 border-b border-white/5"
          >
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
              <Logo size="sm" animated={false} />
              <div className="flex items-center gap-3">
                <button onClick={onLogin} className="text-sm text-[#94a3b8] hover:text-[#f1f5f9] transition-colors hidden sm:block">
                  Iniciar sesion
                </button>
                <button
                  onClick={onLogin}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] text-white rounded-xl text-sm font-medium hover:bg-[#a78bfa]/80 transition-colors"
                >
                  Empezar gratis <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ━━━ SECTION 1: HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="landing-hero relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Radial gradient bg */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(167,139,250,0.12)_0%,_transparent_70%)]" />

        <div className="hero-content relative z-10 text-center px-4 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Logo size="lg" className="justify-center mb-8" />
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Tus metas financieras,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#22d3ee]">
              a tu ritmo.
            </span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-[#94a3b8] max-w-xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Controla gastos, planifica metas y simula escenarios.
            Todo en una app rapida, privada y sin anuncios.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <button
              onClick={onLogin}
              className="group flex items-center gap-2 px-8 py-3.5 bg-[#a78bfa] text-white rounded-2xl text-base font-semibold hover:bg-[#a78bfa]/80 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Zap size={18} /> Empezar gratis
            </button>
            <button
              onClick={scrollToDiscover}
              className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
            >
              Descubrir <ArrowDown size={14} className="animate-bounce" />
            </button>
          </motion.div>

          <motion.p
            className="mt-6 text-xs text-[#475569]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Sin tarjeta. Sin compromisos. Datos seguros.
          </motion.p>
        </div>
      </section>

      {/* ━━━ SECTION 2: PROBLEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="problem-section relative min-h-screen flex items-center py-20 md:py-32">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 stat-text">
            Sabes en que se te va el dinero?
          </h2>

          <div className="space-y-10">
            {[
              { pct: 67, text: 'de los jovenes espanoles no sabe cuanto gasta al mes en comida fuera de casa.' },
              { pct: 43, text: 'nunca ha calculado cuanto puede ahorrar cada mes.' },
              { pct: 12, text: 'tiene un plan financiero real.' },
            ].map((s) => (
              <div key={s.pct} className="stat-text text-left">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#22d3ee]">
                    <AnimatedCounter target={s.pct} suffix="%" />
                  </span>
                  <p className="text-sm md:text-base text-[#94a3b8] leading-relaxed">{s.text}</p>
                </div>
                <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div className="stat-bar h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee]" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-16 text-lg text-[#94a3b8] stat-text">
            RoadTo te da el control que necesitas.
          </p>
        </div>
      </section>

      {/* ━━━ SECTION 3: PRODUCT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="product-section relative" style={{ minHeight: '250vh' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="md:flex md:gap-12">
            {/* Sticky mockup (left side on desktop) */}
            <div className="product-mockup-wrapper hidden md:flex md:w-1/2 md:sticky md:top-0 md:h-screen items-center justify-center">
              <div className="product-mockup w-full max-w-[280px] mx-auto" style={{ perspective: '1000px' }}>
                <div className="bg-[#111827] rounded-2xl border border-[#1e293b] shadow-2xl shadow-[#a78bfa]/5 overflow-hidden">
                  {/* Phone top bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b]">
                    <Logo size="sm" animated={false} />
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
                    </div>
                  </div>
                  {/* Screen content — changes with scroll */}
                  <div className="min-h-[200px] relative">
                    <div className="mockup-screen-1" style={{ display: 'block' }}>
                      <MockupImport />
                    </div>
                    <div className="mockup-screen-2" style={{ display: 'none' }}>
                      <MockupExpenses />
                    </div>
                    <div className="mockup-screen-3" style={{ display: 'none' }}>
                      <MockupGoal />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature steps (right side, scrollable) */}
            <div className="md:w-1/2 space-y-0">
              {/* Step 1 */}
              <div className="product-step-1 min-h-[50vh] md:min-h-[80vh] flex items-center py-12">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center text-accent-green">
                      <FileSpreadsheet size={20} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-accent-green">Paso 1</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Sube tu extracto bancario</h3>
                  <p className="text-[#94a3b8] leading-relaxed mb-6 md:mb-0">
                    Arrastra un Excel de cualquier banco espanol. RoadTo detecta automaticamente
                    las columnas, filtra duplicados y categoriza tus movimientos.
                  </p>
                  <div className="md:hidden bg-[#111827] rounded-xl border border-[#1e293b] overflow-hidden max-w-[260px] mx-auto">
                    <MockupImport />
                  </div>
                </div>
              </div>
              {/* Step 2 */}
              <div className="product-step-2 min-h-[50vh] md:min-h-[80vh] flex items-center py-12">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center text-accent-purple">
                      <PieChart size={20} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-accent-purple">Paso 2</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Ve exactamente donde va tu dinero</h3>
                  <p className="text-[#94a3b8] leading-relaxed mb-6 md:mb-0">
                    Graficos de distribucion por categorias, evolucion mensual y comparativas.
                    Establece presupuestos y recibe alertas cuando te acerques al limite.
                  </p>
                  <div className="md:hidden bg-[#111827] rounded-xl border border-[#1e293b] overflow-hidden max-w-[260px] mx-auto">
                    <MockupExpenses />
                  </div>
                </div>
              </div>
              {/* Step 3 */}
              <div className="product-step-3 min-h-[50vh] md:min-h-[80vh] flex items-center py-12">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 flex items-center justify-center text-accent-cyan">
                      <Target size={20} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-accent-cyan">Paso 3</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Calcula cuando alcanzas tu meta</h3>
                  <p className="text-[#94a3b8] leading-relaxed mb-6 md:mb-0">
                    Define tu objetivo, anade los items que necesitas comprar y RoadTo te dice
                    exactamente cuando llegaras. Simula recortes y acelera el plazo.
                  </p>
                  <div className="md:hidden bg-[#111827] rounded-xl border border-[#1e293b] overflow-hidden max-w-[260px] mx-auto">
                    <MockupGoal />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 4: FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">
            Todo lo que necesitas
          </h2>
          <p className="text-center text-[#94a3b8] mb-14 max-w-xl mx-auto">
            Herramientas pensadas para que entiendas, controles y mejores tus finanzas.
          </p>

          <div className="features-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="feature-card group bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#1e293b] hover:border-[#a78bfa]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#a78bfa]/5 cursor-default"
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${
                  hoveredFeature === i ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'bg-[#1e293b] text-[#64748b]'
                }`}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-2">{f.title}</h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 5: HOW IT WORKS ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="steps-section relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-16">
            Como funciona
          </h2>

          {/* Desktop: horizontal steps */}
          <div className="hidden md:block relative">
            {/* Connecting line */}
            <div className="absolute top-8 left-[16%] right-[16%] h-0.5 bg-[#1e293b]">
              <div className="step-line h-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee]" />
            </div>

            <div className="grid grid-cols-3 gap-8 relative">
              {STEPS.map((step) => (
                <div key={step.num} className="step-item text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a78bfa]/20 to-[#22d3ee]/20 border border-[#a78bfa]/30 flex items-center justify-center mx-auto mb-5 text-[#a78bfa]">
                    {step.icon}
                  </div>
                  <h3 className="text-base font-semibold text-[#f1f5f9] mb-2">{step.title}</h3>
                  <span className="inline-block text-[10px] font-mono px-2.5 py-1 bg-[#a78bfa]/10 text-[#a78bfa] rounded-full">
                    {step.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical steps */}
          <div className="md:hidden space-y-8">
            {STEPS.map((step) => (
              <div key={step.num} className="step-item flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a78bfa]/20 to-[#22d3ee]/20 border border-[#a78bfa]/30 flex items-center justify-center flex-shrink-0 text-[#a78bfa]">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">{step.title}</h3>
                  <span className="text-[10px] font-mono text-[#a78bfa]">{step.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 6: PRICING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pricing-section relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">
            Planes simples y transparentes
          </h2>
          <p className="text-center text-[#94a3b8] mb-14">
            Empieza gratis. Pasa a PRO cuando quieras mas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* FREE */}
            <div className="price-free bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-[#1e293b] flex flex-col">
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-widest mb-3">Free</span>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">0€</span>
                <span className="text-[#64748b] text-sm">/mes</span>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {FREE_LIST.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#94a3b8]">
                    <Check size={14} className="text-accent-green mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onLogin}
                className="w-full py-3 border border-[#1e293b] rounded-xl text-sm font-medium text-[#f1f5f9] hover:bg-[#1e293b] transition-colors"
              >
                Empezar gratis
              </button>
            </div>

            {/* PRO */}
            <div className="price-pro relative bg-[#111827]/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 flex flex-col overflow-hidden pro-card">
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-2xl p-px overflow-hidden -z-10">
                <div className="absolute inset-[-2px] rounded-2xl bg-[conic-gradient(from_var(--angle),#a78bfa,#22d3ee,#a78bfa)] animate-border-spin opacity-60" />
                <div className="absolute inset-[1px] rounded-[15px] bg-[#111827]" />
              </div>

              <div className="absolute top-0 right-0 px-3 py-1.5 bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] text-white text-[10px] font-bold rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                <Crown size={10} /> Recomendado
              </div>

              <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-widest mb-3">Pro</span>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-bold">{STRIPE_PRICES.monthly.amount.toFixed(2).replace('.', ',')}€</span>
                <span className="text-[#64748b] text-sm">/mes</span>
              </div>
              <p className="text-xs text-[#64748b] mb-6">
                o {STRIPE_PRICES.annual.amount.toFixed(2).replace('.', ',')}€/ano (-{STRIPE_PRICES.annual.savings}%)
              </p>
              <ul className="space-y-3 flex-1 mb-8">
                {PRO_LIST.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#94a3b8]">
                    <Check size={14} className="text-[#a78bfa] mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onLogin}
                className="w-full py-3 bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                Probar PRO
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SECTION 7: CTA FINAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="cta-section relative py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="cta-final">
            <div className="bg-gradient-to-br from-[#a78bfa]/10 to-[#22d3ee]/10 border border-[#a78bfa]/20 rounded-3xl p-8 md:p-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Tu primera meta financiera
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#22d3ee]">
                  empieza con un click.
                </span>
              </h2>
              <p className="text-[#94a3b8] mb-8 max-w-md mx-auto">
                Crea tu cuenta en segundos y toma el control de tus finanzas.
                Sin publicidad, sin venta de datos.
              </p>
              <button
                onClick={onLogin}
                className="group inline-flex items-center gap-2 px-8 py-3.5 bg-[#a78bfa] text-white rounded-2xl text-base font-semibold hover:bg-[#a78bfa]/80 transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                Crear cuenta gratis <ArrowRight size={18} />
              </button>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-[#64748b]">
                <span className="flex items-center gap-1.5"><Check size={12} className="text-accent-green" /> Sin tarjeta</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-accent-green" /> 30 segundos</span>
                <span className="flex items-center gap-1.5"><Check size={12} className="text-accent-green" /> Datos seguros</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-[#1e293b] py-8 text-center">
        <p className="text-xs text-[#475569]">
          RoadTo &copy; {new Date().getFullYear()} &middot; Tu planificador financiero personal
        </p>
      </footer>

      {/* ─── Global styles ──────────────────────────────────── */}
      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-spin {
          to { --angle: 360deg; }
        }
        .animate-border-spin {
          animation: border-spin 4s linear infinite;
          background: conic-gradient(from var(--angle), #a78bfa, #22d3ee, #a78bfa);
        }
      `}</style>
    </div>
  );
}
