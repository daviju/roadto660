import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { MockupFrame, MockupImport, MockupGoal, MockupProjection } from './Mockups';

interface Step {
  badge: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
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

function MockupForStep({ step }: { step: number }) {
  if (step === 0) return <MockupImport active />;
  if (step === 1) return <MockupGoal active />;
  return <MockupProjection active />;
}

export function ProductSection() {
  // Track scroll progress through the desktop step container — the active step
  // is then derived from progress, eliminating gaps between useInView regions.
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ['start start', 'end end'],
  });

  // Map progress thirds to step index
  const activeStepMV = useTransform(scrollYProgress, (v) => {
    if (v < 1 / 3) return 0;
    if (v < 2 / 3) return 1;
    return 2;
  });

  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => {
    setCurrentStep(activeStepMV.get());
    return activeStepMV.on('change', (v) => setCurrentStep(v));
  }, [activeStepMV]);

  return (
    <section className="relative px-6">
      <div className="max-w-6xl mx-auto">
        {/* Heading: extra mb so the first mockup never overlaps it */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center pt-32 md:pt-40 mb-16 md:mb-24"
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

        {/* Desktop: sticky mockup + scroll steps. */}
        <div className="hidden lg:grid grid-cols-2 gap-16 pb-32">
          {/* Sticky column — mockup centered vertically while user scrolls steps. */}
          <div className="relative">
            <div className="sticky top-1/2 -translate-y-1/2">
              <MockupFrame>
                {/* Cinematic transition: scale + slight Y + blur, with smooth easing */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.92, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, y: -20, filter: 'blur(8px)' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <MockupForStep step={currentStep} />
                  </motion.div>
                </AnimatePresence>
              </MockupFrame>
            </div>
          </div>

          {/* Steps column — scrollYProgress is calculated against this ref. */}
          <div ref={stepsRef} className="space-y-[60vh] pt-[20vh] pb-[30vh]">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30%' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <motion.span
                  animate={currentStep === i ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0.5 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                  {s.badge}
                </motion.span>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-[#f1f5f9]">{s.title}</h3>
                <p className="text-base text-[#64748b] leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile: inline mockups */}
        <div className="lg:hidden space-y-20 pb-32">
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
