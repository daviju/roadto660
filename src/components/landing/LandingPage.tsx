import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target, BarChart3, Shield, Smartphone, Zap, Crown,
  Check, ArrowRight, Wallet, TrendingUp, FileSpreadsheet,
} from 'lucide-react';
import { Logo } from '../shared/Logo';
import { FinancialBackground } from '../auth/FinancialBackground';
import { STRIPE_PRICES } from '../../lib/stripe-config';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const FEATURES = [
  {
    icon: <Wallet size={24} />,
    title: 'Control total de gastos',
    desc: 'Registra gastos e ingresos, establece presupuestos por categoria y visualiza tu saldo real en tiempo real.',
  },
  {
    icon: <Target size={24} />,
    title: 'Metas de ahorro',
    desc: 'Define objetivos financieros, anade items y sigue tu progreso con simulaciones de escenarios.',
  },
  {
    icon: <FileSpreadsheet size={24} />,
    title: 'Importacion Excel',
    desc: 'Importa extractos de BBVA, Unicaja y CaixaBank. Deteccion automatica de duplicados.',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Graficos avanzados',
    desc: 'Evolucion mensual, distribucion por categorias, proyeccion de ahorro y ritmo vs objetivo.',
  },
  {
    icon: <Smartphone size={24} />,
    title: 'PWA responsive',
    desc: 'Usa RoadTo desde cualquier dispositivo. Instalable como app en tu movil.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Datos seguros',
    desc: 'Tus datos estan protegidos con Supabase, cifrado en transito y en reposo. Tu privacidad es prioritaria.',
  },
];

const FREE_FEATURES = [
  '1 meta de ahorro',
  'Gastos e ingresos',
  'Presupuestos',
  '3 meses de historial',
  '1 importacion Excel (50 mov.)',
  'Chatbot basico (10 msg/dia)',
];

const PRO_FEATURES = [
  'Metas ilimitadas',
  'Historial completo',
  'Importaciones ilimitadas',
  'Graficos avanzados',
  'Escenarios de simulacion',
  'Retos mensuales + puntos',
  'Exportacion de datos',
  'Soporte prioritario',
];

interface Props {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: Props) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-th-bg text-th-text relative overflow-hidden">
      <FinancialBackground />

      {/* ─── Navbar ──────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 py-4 max-w-6xl mx-auto">
        <Logo size="md" />
        <motion.button
          onClick={onLogin}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-xl text-sm font-medium hover:bg-accent-purple/80 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Entrar <ArrowRight size={14} />
        </motion.button>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
            Tus finanzas,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-purple-400">
              bajo control
            </span>
          </h1>
          <p className="text-lg md:text-xl text-th-secondary max-w-2xl mx-auto mb-8">
            Planifica tus metas de ahorro, controla tus gastos e importa tus extractos bancarios.
            Todo en una app rapida, bonita y privada.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={onLogin}
              className="flex items-center gap-2 px-6 py-3 bg-accent-purple text-white rounded-xl text-base font-semibold hover:bg-accent-purple/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap size={18} /> Empezar gratis
            </motion.button>
            <span className="text-sm text-th-muted">Sin tarjeta. Sin compromisos.</span>
          </div>
        </motion.div>
      </section>

      {/* ─── Features ────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-16 md:pb-24">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-center mb-10"
          {...fadeUp}
          viewport={{ once: true }}
          whileInView="animate"
          initial="initial"
        >
          Todo lo que necesitas
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          variants={stagger}
          whileInView="animate"
          initial="initial"
          viewport={{ once: true }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="bg-th-card/60 backdrop-blur-sm rounded-2xl p-6 border border-th-border hover:border-accent-purple/40 transition-colors"
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                hoveredFeature === i ? 'bg-accent-purple/20 text-accent-purple' : 'bg-th-hover text-th-muted'
              }`}>
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-th-text mb-2">{f.title}</h3>
              <p className="text-sm text-th-secondary leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pb-16 md:pb-24">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-center mb-10"
          {...fadeUp}
          viewport={{ once: true }}
          whileInView="animate"
          initial="initial"
        >
          Planes simples y transparentes
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          variants={stagger}
          whileInView="animate"
          initial="initial"
          viewport={{ once: true }}
        >
          {/* FREE */}
          <motion.div variants={fadeUp} className="bg-th-card/60 backdrop-blur-sm rounded-2xl p-6 border border-th-border flex flex-col">
            <span className="text-sm font-semibold text-th-muted uppercase tracking-wider mb-2">Free</span>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold">0€</span>
              <span className="text-th-muted text-sm">/mes</span>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-th-secondary">
                  <Check size={14} className="text-accent-green mt-0.5 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <motion.button
              onClick={onLogin}
              className="w-full py-2.5 border border-th-border rounded-xl text-sm font-medium text-th-text hover:bg-th-hover transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Empezar gratis
            </motion.button>
          </motion.div>

          {/* PRO */}
          <motion.div variants={fadeUp} className="bg-th-card/60 backdrop-blur-sm rounded-2xl p-6 border border-accent-amber/40 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-accent-amber text-white text-xs font-bold rounded-bl-xl flex items-center gap-1">
              <Crown size={10} /> POPULAR
            </div>
            <span className="text-sm font-semibold text-accent-amber uppercase tracking-wider mb-2">Pro</span>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">{STRIPE_PRICES.monthly.amount.toFixed(2).replace('.', ',')}€</span>
              <span className="text-th-muted text-sm">/mes</span>
            </div>
            <p className="text-xs text-th-muted mb-4">
              o {STRIPE_PRICES.annual.amount.toFixed(2).replace('.', ',')}€/ano (-{STRIPE_PRICES.annual.savings}%)
            </p>
            <ul className="space-y-2.5 flex-1 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-th-secondary">
                  <Check size={14} className="text-accent-amber mt-0.5 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <motion.button
              onClick={onLogin}
              className="w-full py-2.5 bg-accent-amber text-white rounded-xl text-sm font-semibold hover:bg-accent-amber/80 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Probar PRO
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pb-16 md:pb-24 text-center">
        <motion.div
          className="bg-gradient-to-r from-accent-purple/10 to-purple-400/10 border border-accent-purple/20 rounded-2xl p-8 md:p-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Empieza hoy, gratis</h2>
          <p className="text-th-secondary mb-6 max-w-lg mx-auto">
            Crea tu cuenta en segundos y empieza a controlar tus finanzas. Sin publicidad, sin venta de datos.
          </p>
          <motion.button
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-purple text-white rounded-xl text-base font-semibold hover:bg-accent-purple/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Crear cuenta gratis <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-th-border py-6 text-center">
        <p className="text-xs text-th-muted">
          RoadTo &copy; {new Date().getFullYear()} &middot; Tu planificador financiero personal
        </p>
      </footer>
    </div>
  );
}
