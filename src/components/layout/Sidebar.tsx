import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, Wallet, PieChart, Milestone,
  BarChart3, Settings, ChevronLeft, ArrowLeftRight, Lightbulb,
  Sun, Moon, Monitor, Target, Crown, LogOut, ShieldCheck, Flame,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../lib/auth';
import { Logo } from '../shared/Logo';
import type { Page } from '../../types';

interface NavItem {
  page: Page;
  label: string;
  icon: typeof LayoutDashboard;
  moduleKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { page: 'expenses', label: 'Gastos', icon: Receipt, moduleKey: 'module_expenses' },
  { page: 'income', label: 'Ingresos', icon: Wallet, moduleKey: 'module_income' },
  { page: 'budget', label: 'Presupuestos', icon: PieChart, moduleKey: 'module_budgets' },
  { page: 'timeline', label: 'Timeline', icon: Milestone, moduleKey: 'module_timeline' },
  { page: 'charts', label: 'Graficos', icon: BarChart3, moduleKey: 'module_charts' },
  { page: 'goals', label: 'Metas', icon: Target, moduleKey: 'module_simulator' },
  { page: 'advice', label: 'Consejos', icon: Lightbulb, moduleKey: 'module_tips' },
  { page: 'settings', label: 'Ajustes', icon: Settings },
];

function ThemeToggle() {
  const { profile, updateProfile } = useAuth();
  const setCachedTheme = useStore((s) => s.setCachedTheme);
  const theme = profile?.theme || 'dark';

  const cycle = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    updateProfile({ theme: next });
    setCachedTheme(next);
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
  const { profile, signOut } = useAuth();

  // Filter nav items based on active modules
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.moduleKey) return true;
    if (!profile) return true;
    return (profile as unknown as Record<string, unknown>)[item.moduleKey] !== false;
  });

  // Mobile bottom nav - show top 5 items
  const mobileItems: NavItem[] = [
    { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
    { page: 'goals', label: 'Metas', icon: Target },
    { page: 'advice', label: 'Consejos', icon: Lightbulb },
    { page: 'settings', label: 'Mas', icon: Settings },
  ];

  const isAdmin = profile?.role === 'admin';
  const isPro = profile?.plan === 'pro';

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
        <div className="flex items-center p-4 border-b border-th-border overflow-hidden">
          {sidebarOpen ? (
            <Logo size="sm" animated={false} />
          ) : (
            <div className="w-8 h-8 flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="url(#sidebar-logo-grad)" />
                <path d="M12 34 L20 16 L24 24 L28 14 L36 34" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <circle cx="36" cy="14" r="4" fill="#22d3ee" />
                <defs><linearGradient id="sidebar-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#a78bfa" /><stop offset="1" stopColor="#7c3aed" /></linearGradient></defs>
              </svg>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto" aria-label="Paginas">
          {visibleItems.map(({ page, label, icon: Icon }, index) => {
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

          {/* Admin section */}
          {isAdmin && (
            <>
              {sidebarOpen && (
                <div className="px-3 pt-4 pb-1">
                  <p className="text-[10px] text-th-faint uppercase tracking-wider">Admin</p>
                </div>
              )}
              <motion.button
                onClick={() => setPage('admin')}
                className={`nav-indicator w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative ${
                  currentPage === 'admin'
                    ? 'active text-accent-amber font-medium'
                    : 'text-th-secondary hover:text-th-text'
                }`}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                title="Administracion"
                aria-label="Administracion"
              >
                {currentPage === 'admin' && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-accent-amber/15"
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <ShieldCheck size={18} className="flex-shrink-0 relative z-10" aria-hidden="true" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span className="whitespace-nowrap relative z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Administracion
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </>
          )}
        </nav>

        {/* Theme toggle */}
        <div className="px-2 py-1 border-t border-th-border">
          <AnimatePresence>
            {sidebarOpen ? (
              <ThemeToggle />
            ) : (
              <motion.button
                onClick={() => {
                  const theme = profile?.theme || 'dark';
                  const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
                  // Will be handled by the auth context updateProfile
                }}
                className="w-full flex items-center justify-center py-2 text-th-muted hover:text-th-text transition-colors"
                aria-label="Cambiar tema"
              >
                {(profile?.theme || 'dark') === 'dark' ? <Moon size={16} /> :
                 (profile?.theme || 'dark') === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* User footer */}
        {profile && sidebarOpen && (
          <div className="px-3 py-3 border-t border-th-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-accent-purple">
                {profile.full_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-th-text truncate">{profile.full_name || profile.email}</p>
                <div className="flex items-center gap-1">
                  {isPro ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent-amber/15 text-accent-amber rounded-full font-medium flex items-center gap-0.5">
                      <Crown size={10} /> PRO
                    </span>
                  ) : (
                    <>
                      <span className="text-[10px] px-1.5 py-0.5 bg-th-hover text-th-muted rounded-full">FREE</span>
                      <button
                        onClick={() => setPage('pricing')}
                        className="text-[10px] px-1.5 py-0.5 bg-accent-purple/15 text-accent-purple rounded-full font-medium hover:bg-accent-purple/25 transition-colors"
                      >
                        Actualizar
                      </button>
                    </>
                  )}
                  {profile.points > 0 && (
                    <span className="text-[10px] text-accent-amber font-medium">{profile.points.toLocaleString('es-ES')} pts</span>
                  )}
                  {profile.streak_days > 0 && (
                    <span className="text-[10px] text-orange-500 font-medium flex items-center gap-0.5">
                      <Flame size={9} />{profile.streak_days}d
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 text-th-muted hover:text-accent-red transition-colors"
                aria-label="Cerrar sesion"
                title="Cerrar sesion"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}

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
        className="fixed bottom-0 left-0 right-0 md:hidden bg-th-card border-t border-th-border z-50"
        role="navigation"
        aria-label="Navegacion movil"
      >
        <div className="flex justify-around px-1 py-1 pb-safe">
          {mobileItems.map(({ page, label, icon: Icon }) => {
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
