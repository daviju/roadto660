import { useMemo } from 'react';

const SYMBOLS = ['€', '%', '↑', '◎', '▮▯', '≡', '⊕', '◇'];

interface Particle {
  id: number;
  symbol: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

export function FinancialBackground({ subtle = false }: { subtle?: boolean } = {}) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      symbol: SYMBOLS[i % SYMBOLS.length],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 18,
      duration: 18 + Math.random() * 24,
      delay: Math.random() * -30,
      drift: 20 + Math.random() * 40,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      <style>{`
        @keyframes float-y {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(var(--drift)); }
        }
        @keyframes float-x {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(calc(var(--drift) * 0.6)); }
        }
        .fin-particle {
          position: absolute;
          animation: float-y var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .fin-particle-inner {
          animation: float-x calc(var(--dur) * 1.3) ease-in-out infinite;
          animation-delay: calc(var(--delay) * 0.7);
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`fin-particle ${subtle ? 'opacity-[0.03]' : 'opacity-[0.07]'}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            '--dur': `${p.duration}s`,
            '--delay': `${p.delay}s`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        >
          <div className="fin-particle-inner text-th-text font-mono select-none">
            {p.symbol}
          </div>
        </div>
      ))}
    </div>
  );
}
