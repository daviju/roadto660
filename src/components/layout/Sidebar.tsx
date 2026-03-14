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
  ArrowLeftRight,
  Lightbulb,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';

const NAV_ITEMS: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { page: 'expenses', label: 'Gastos', icon: Receipt },
  { page: 'income', label: 'Ingresos', icon: Wallet },
  { page: 'budget', label: 'Presupuestos', icon: PieChart },
  { page: 'timeline', label: 'Timeline', icon: Milestone },
  { page: 'charts', label: 'Graficos', icon: BarChart3 },
  { page: 'motorcycles', label: 'Motos', icon: Bike },
  { page: 'advice', label: 'Consejos', icon: Lightbulb },
  { page: 'settings', label: 'Ajustes', icon: Settings },
];

function ThemeToggle() {
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);

  const cycle = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    updateSettings({ theme: next });
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Modo oscuro' : theme === 'light' ? 'Modo claro' : 'Sistema';

  return (
    <motion.button
      onClick={cycle}
      className="flex items-center gap-2 px-3 py-2 text-th-muted hover:text-th-text rounded-lg transition-colors w-full"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Tema actual: ${label}. Clic para cambiar.`}
    >
      <Icon size={16} className="flex-shrink-0" aria-hidden="true" />
      <span className="text-xs whitespace-nowrap overflow-hidden">{label}</span>
    </motion.button>
  );
}

export function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar } = useStore();

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="fixed left-0 top-0 h-full bg-th-card border-r border-th-border flex-col z-50 hidden md:flex"
        animate={{ width: sidebarOpen ? 224 : 64 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        role="navigation"
        aria-label="Navegacion principal"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-th-border">
          <motion.div
            className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Bike size={18} className="text-accent-purple" aria-hidden="true" />
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
                <h1 className="text-sm font-bold text-th-text whitespace-nowrap">RoadTo660</h1>
                <p className="text-[10px] text-th-muted whitespace-nowrap">Daytona 660</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto" aria-label="Paginas">
          {NAV_ITEMS.map(({ page, label, icon: Icon }, index) => {
            const isActive = currentPage === page;
            return (
              <motion.button
                key={page}
                onClick={() => setPage(page)}
                className={`nav-indicator w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative ${
                  isActive
                    ? 'active text-accent-purple font-medium'
                    : 'text-th-secondary hover:text-th-text'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                title={label}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-accent-purple/15"
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={18} className="flex-shrink-0 relative z-10" aria-hidden="true" />
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

        {/* Theme toggle */}
        <div className="px-2 py-1 border-t border-th-border">
          <AnimatePresence>
            {sidebarOpen ? (
              <ThemeToggle />
            ) : (
              <motion.button
                onClick={() => {
                  const theme = useStore.getState().settings.theme;
                  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
                  useStore.getState().updateSettings({ theme: next });
                }}
                className="w-full flex items-center justify-center py-2 text-th-muted hover:text-th-text transition-colors"
                aria-label="Cambiar tema"
              >
                {useStore.getState().settings.theme === 'dark' ? <Moon size={16} /> :
                 useStore.getState().settings.theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse button */}
        <motion.button
          onClick={toggleSidebar}
          className="p-4 border-t border-th-border text-th-muted hover:text-th-text transition-colors flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={sidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
        >
          <motion.div
            animate={{ rotate: sidebarOpen ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </motion.div>
        </motion.button>
      </motion.aside>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden bg-th-card border-t border-th-border z-50 overflow-x-auto no-scrollbar"
        role="navigation"
        aria-label="Navegacion movil"
      >
        <div className="flex justify-start min-w-max px-1 py-1 pb-safe">
          {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
            const isActive = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[60px] rounded-lg transition-colors ${
                  isActive ? 'text-accent-purple' : 'text-th-muted'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="text-[10px] whitespace-nowrap leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
