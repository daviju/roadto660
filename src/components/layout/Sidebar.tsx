import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PieChart,
  Milestone,
  BarChart3,
  Settings,
  ChevronLeft,
  Bike,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';

const NAV_ITEMS: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'expenses', label: 'Gastos', icon: Receipt },
  { page: 'income', label: 'Ingresos', icon: Wallet },
  { page: 'budget', label: 'Presupuestos', icon: PieChart },
  { page: 'timeline', label: 'Timeline', icon: Milestone },
  { page: 'charts', label: 'Graficos', icon: BarChart3 },
  { page: 'motorcycles', label: 'Motos', icon: Bike },
  { page: 'settings', label: 'Ajustes', icon: Settings },
];

export function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar } = useStore();

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full bg-surface border-r border-white/5 flex flex-col z-50"
      animate={{ width: sidebarOpen ? 224 : 64 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <motion.div
          className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0"
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Bike size={18} className="text-accent-purple" />
        </motion.div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="text-sm font-bold text-white whitespace-nowrap">RoadTo660</h1>
              <p className="text-[10px] text-gray-500 whitespace-nowrap">Daytona 660</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map(({ page, label, icon: Icon }, index) => {
          const isActive = currentPage === page;
          return (
            <motion.button
              key={page}
              onClick={() => setPage(page)}
              className={`nav-indicator w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative ${
                isActive
                  ? 'active text-accent-purple font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              title={label}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-accent-purple/15"
                  layoutId="nav-active"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={18} className="flex-shrink-0 relative z-10" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    className="whitespace-nowrap relative z-10"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Collapse button */}
      <motion.button
        onClick={toggleSidebar}
        className="p-4 border-t border-white/5 text-gray-500 hover:text-white transition-colors flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          animate={{ rotate: sidebarOpen ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ChevronLeft size={18} />
        </motion.div>
      </motion.button>
    </motion.aside>
  );
}
