import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const SIZES = {
  sm: { text: 'text-xl', icon: 24 },
  md: { text: 'text-3xl', icon: 32 },
  lg: { text: 'text-5xl', icon: 48 },
};

export function Logo({ size = 'md', animated = true, className = '' }: LogoProps) {
  const s = SIZES[size];
  const Wrapper = animated ? motion.div : 'div';

  return (
    <Wrapper
      className={`flex items-center gap-2 select-none ${className}`}
      {...(animated ? { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } } : {})}
    >
      {/* Icon mark */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Road/path shape */}
        <rect width="48" height="48" rx="12" fill="url(#logo-grad)" />
        <path
          d="M12 34 L20 16 L24 24 L28 14 L36 34"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="36" cy="14" r="4" fill="#22d3ee" />
        <path
          d="M33 14 L36 10 L39 14"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      <span className={`${s.text} font-extrabold tracking-tight`}>
        <span className="text-accent-purple">Road</span>
        <span className="text-[#22d3ee]">To</span>
      </span>
    </Wrapper>
  );
}
