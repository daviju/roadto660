import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Expenses } from './components/expenses/Expenses';
import { Income } from './components/income/Income';
import { Budget } from './components/budget/Budget';
import { Timeline } from './components/timeline/Timeline';
import { Charts } from './components/charts/Charts';
import { Settings } from './components/settings/Settings';
import { Movements } from './components/movements/Movements';
import { Advice } from './components/advice/Advice';
import { Goals } from './components/goals/Goals';
import { AdminPanel } from './components/admin/AdminPanel';
import { PricingPage } from './components/pricing/PricingPage';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { RewardsPage } from './components/rewards/RewardsPage';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { BannedScreen } from './components/auth/BannedScreen';
import { Onboarding } from './components/auth/Onboarding';
import { LoadingScreen } from './components/LoadingScreen';
import { PaywallModal } from './components/shared/PaywallModal';
import { ChatWidget } from './components/shared/ChatWidget';
import { useToast } from './components/shared/Toast';
import { useStore } from './store/useStore';
import { useAuth } from './lib/auth';
import { pageVariants } from './utils/animations';

function PageRouter() {
  const currentPage = useStore((s) => s.currentPage);

  const getPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'movements': return <Movements />;
      case 'expenses': return <Expenses />;
      case 'income': return <Income />;
      case 'budget': return <Budget />;
      case 'timeline': return <Timeline />;
      case 'charts': return <Charts />;
      case 'goals': return <Goals />;
      case 'advice': return <Advice />;
      case 'settings': return <Settings />;
      case 'admin': return <AdminPanel />;
      case 'pricing': return <PricingPage />;
      case 'privacy': return <PrivacyPolicy onBack={() => useStore.getState().setPage('settings')} />;
      case 'rewards': return <RewardsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {getPage()}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const cachedTheme = useStore((s) => s.cachedTheme);
  const setCachedTheme = useStore((s) => s.setCachedTheme);
  const expiredNotified = useRef(false);
  const [showLogin, setShowLogin] = useState(false);

  // Sync cachedTheme from profile when profile loads/changes
  useEffect(() => {
    if (profile?.theme) setCachedTheme(profile.theme);
  }, [profile?.theme, setCachedTheme]);

  // Detect PRO plan expiration → show downgrade notice once
  useEffect(() => {
    if (!profile || expiredNotified.current) return;
    if (
      profile.plan === 'pro' &&
      profile.plan_expires_at &&
      new Date(profile.plan_expires_at) <= new Date()
    ) {
      expiredNotified.current = true;
      toast.warning('Tu plan PRO ha expirado. Algunas funciones estan ahora limitadas.');
    }
  }, [profile, toast]);

  // Handle Stripe checkout return params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    if (checkout === 'success') {
      toast.success('Pago completado. Tu plan PRO se activara en unos segundos.');
    } else if (checkout === 'cancel') {
      toast.info('Pago cancelado. Puedes intentarlo de nuevo cuando quieras.');
    }
  }, [toast]);

  // Apply cachedTheme to DOM — cachedTheme is the single source of truth for visual
  useEffect(() => {
    const root = document.documentElement;
    if (cachedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('light', cachedTheme === 'light');
    }
  }, [cachedTheme]);

  if (loading) return <LoadingScreen />;

  // Not authenticated — show landing or login
  if (!user) return showLogin ? <LoginPage /> : <LandingPage onLogin={() => setShowLogin(true)} />;

  // User authenticated but profile not yet fetched — keep loading
  if (!profile) return <LoadingScreen />;

  // Banned
  if (profile.is_banned) return <BannedScreen />;

  // Onboarding not completed
  if (!profile.onboarding_completed) return <Onboarding />;

  return (
    <Layout>
      <PageRouter />
      <PaywallModal />
      <ChatWidget />
    </Layout>
  );
}
