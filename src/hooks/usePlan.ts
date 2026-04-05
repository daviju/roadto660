import { useAuth } from '../lib/auth';

export function usePlan() {
  const { profile } = useAuth();

  const isPro =
    profile?.plan === 'pro' &&
    (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());

  return {
    isPro,
    plan: isPro ? ('pro' as const) : ('free' as const),
    maxGoals: isPro ? Infinity : 1,
    maxExcelImports: isPro ? Infinity : 1,
    maxMovementsPerImport: isPro ? Infinity : 50,
    maxHistoryMonths: isPro ? Infinity : 3,
    hasSimulatorScenarios: isPro,
    hasAdvancedTips: isPro,
    maxChatMessagesPerDay: isPro ? Infinity : 10,
    hasAdvancedCharts: isPro,
    hasExport: isPro,
    hasGamification: isPro,
    hasChallenges: isPro,
    hasEmailReports: isPro,
  };
}
