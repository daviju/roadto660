import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Expenses } from './components/expenses/Expenses';
import { Income } from './components/income/Income';
import { Budget } from './components/budget/Budget';
import { Timeline } from './components/timeline/Timeline';
import { Charts } from './components/charts/Charts';
import { Settings } from './components/settings/Settings';
import { Motorcycles } from './components/motorcycles/Motorcycles';
import { LoadingScreen } from './components/LoadingScreen';
import { useStore } from './store/useStore';
import { initializeSync } from './firebase/sync';
import { pageVariants } from './utils/animations';

function PageRouter() {
  const currentPage = useStore((s) => s.currentPage);

  const getPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'expenses':
        return <Expenses />;
      case 'income':
        return <Income />;
      case 'budget':
        return <Budget />;
      case 'timeline':
        return <Timeline />;
      case 'charts':
        return <Charts />;
      case 'motorcycles':
        return <Motorcycles />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeSync().then(() => setReady(true));
  }, []);

  if (!ready) return <LoadingScreen />;

  return (
    <Layout>
      <PageRouter />
    </Layout>
  );
}
