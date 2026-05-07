import { useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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

export function ProductSection() {
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const inView1 = useInView(step1Ref, { margin: '-45% 0px -45% 0px', amount: 'some' });
  const inView2 = useInView(step2Ref, { margin: '-45% 0px -45% 0px', amount: 'some' });
  const inView3 = useInView(step3Ref, { margin: '-45% 0px -45% 0px', amount: 'some' });

  // Active step: later steps win when overlapping detection zones.
  const activeIndex = inView3 ? 2 : inView2 ? 1 : 0;
  const isActive = [inView1, inView2, inView3];
  const refs = [step1Ref, step2Ref, step3Ref];

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

        {/* Desktop: sticky mockup + scroll steps. Two columns of equal natural height. */}
        <div className="hidden lg:grid grid-cols-2 gap-16 pb-32">
          {/* Sticky column — mockup centered vertically while user scrolls steps. */}
          <div className="relative">
            <div className="sticky top-1/2 -translate-y-1/2">
              <MockupFrame>
                {/* Bug 6: scale + fade between steps so the change is noticeable */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.08, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {activeIndex === 0 && <MockupImport active={inView1} />}
                    {activeIndex === 1 && <MockupGoal active={inView2} />}
                    {activeIndex === 2 && <MockupProjection active={inView3} />}
                  </motion.div>
                </AnimatePresence>
              </MockupFrame>
            </div>
          </div>

          {/* Steps: top padding so first text-block sits below the heading and matches
              mockup vertical centre; bottom padding so last mockup scrolls down with last step. */}
          <div className="space-y-[60vh] pt-[20vh] pb-[30vh]">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                ref={refs[i]}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30%' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <motion.span
                  animate={isActive[i] ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0.5 }}
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
