import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color?: string;
  glowClass?: string;
}

function AnimatedValue({ value, color }: { value: string; color: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(value);

  const numMatch = value.match(/([\d.,]+)/);
  const numericValue = numMatch ? parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.')) : null;

  useEffect(() => {
    if (!isInView || numericValue === null) {
      setDisplay(value);
      return;
    }

    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericValue * eased;

      const formatted = value.replace(
        /([\d.,]+)/,
        current.toLocaleString('es-ES', {
          minimumFractionDigits: value.includes(',') ? 2 : 0,
          maximumFractionDigits: value.includes(',') ? 2 : 0,
        })
      );
      setDisplay(formatted);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, numericValue]);

  return (
    <p ref={ref} className={`font-mono text-2xl font-semibold ${color}`}>
      {display}
    </p>
  );
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'text-white',
  glowClass = 'card-glow',
}: KPICardProps) {
  return (
    <motion.div
      className={`bg-surface rounded-xl p-5 border border-white/5 ${glowClass}`}
      whileHover={{
        y: -3,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }}
      whileTap={{ scale: 0.985 }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {title}
        </span>
        <motion.div
          className="text-gray-500"
          whileHover={{ rotate: 15, scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {icon}
        </motion.div>
      </div>
      <AnimatedValue value={value} color={color} />
      {subtitle && (
        <motion.p
          className="text-xs text-gray-500 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
