import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { useStore } from '../../store/useStore';

export function Layout({ children }: { children: ReactNode }) {
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-surface-dark text-white">
      <Sidebar />
      <motion.main
        className="min-h-screen"
        animate={{ marginLeft: sidebarOpen ? 224 : 64 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </motion.main>
    </div>
  );
}
