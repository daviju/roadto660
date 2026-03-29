import { type ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { FinancialBackground } from '../auth/FinancialBackground';
import { useStore } from '../../store/useStore';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function Layout({ children }: { children: ReactNode }) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-th-bg text-th-text relative">
      <FinancialBackground subtle />
      <a href="#main-content" className="skip-to-content">
        Saltar al contenido
      </a>
      <Sidebar />
      <motion.main
        id="main-content"
        className="min-h-screen"
        style={{
          paddingBottom: isMobile ? 72 : 0,
          marginLeft: isMobile ? 0 : (sidebarOpen ? 224 : 64),
        }}
        animate={{
          marginLeft: isMobile ? 0 : (sidebarOpen ? 224 : 64),
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:px-6 md:py-6">{children}</div>
      </motion.main>
    </div>
  );
}
