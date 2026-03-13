import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import type { Phase } from '../../types';
import { getPhaseTotal, getPhasePaid } from '../../utils/calculations';
import { formatCurrency } from '../../utils/format';

interface PhaseProgressProps {
  phase: Phase;
}

export function PhaseProgress({ phase }: PhaseProgressProps) {
  const total = getPhaseTotal(phase);
  const paid = getPhasePaid(phase);
  const pct = total > 0 ? paid / total : 0;
  const paidItems = phase.items.filter((i) => i.paid).length;
  const totalItems = phase.items.length;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="bg-surface rounded-xl p-4 border border-white/5 card-glow"
      whileHover={{
        y: -2,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: phase.color }}
            animate={
              phase.status === 'in-progress'
                ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut',
            }}
          />
          <span className="text-sm font-medium text-white">{phase.name}</span>
        </div>
        <span className="text-xs text-gray-500">
          {paidItems}/{totalItems} items
        </span>
      </div>

      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full progress-shimmer"
          style={{ backgroundColor: phase.color }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${Math.min(100, pct * 100)}%` } : { width: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>

      <div className="flex justify-between text-xs">
        <span className="font-mono" style={{ color: phase.color }}>
          {formatCurrency(paid)}
        </span>
        <span className="text-gray-500 font-mono">{formatCurrency(total)}</span>
      </div>
    </motion.div>
  );
}
