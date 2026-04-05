import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { usePlan } from './usePlan';
import type { Challenge } from '../types';

// ─── Challenge templates ─────────────────────────────────────────
interface ChallengeTemplate {
  type: Challenge['type'];
  title: string;
  description: string;
  target_value: number;
  points_reward: number;
}

const TEMPLATES: ChallengeTemplate[] = [
  {
    type: 'no_spend_day',
    title: 'Dia sin gastar',
    description: 'Pasa al menos 3 dias este mes sin registrar ningun gasto',
    target_value: 3,
    points_reward: 50,
  },
  {
    type: 'reduce_category',
    title: 'Reduce tu mayor gasto',
    description: 'Gasta un 15% menos en tu categoria mas alta respecto al mes pasado',
    target_value: 15,
    points_reward: 100,
  },
  {
    type: 'save_amount',
    title: 'Ahorra 100 euros extra',
    description: 'Consigue ahorrar al menos 100 euros mas que tu media mensual',
    target_value: 100,
    points_reward: 150,
  },
  {
    type: 'log_daily',
    title: 'Registra todos los dias',
    description: 'Registra al menos un gasto o ingreso durante 20 dias del mes',
    target_value: 20,
    points_reward: 75,
  },
  {
    type: 'under_budget',
    title: 'Dentro del presupuesto',
    description: 'Mantente dentro del presupuesto en todas las categorias',
    target_value: 1,
    points_reward: 120,
  },
];

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function pickChallenges(count: number): ChallengeTemplate[] {
  // Shuffle and pick `count` templates
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function useChallenges() {
  const { user } = useAuth();
  const { hasChallenges } = usePlan();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const month = getCurrentMonth();

  // Fetch or auto-generate challenges for this month
  useEffect(() => {
    if (!user || !hasChallenges) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        // Try to fetch existing challenges for this month
        const { data: existing, error: fetchErr } = await supabase
          .from('challenges')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', month)
          .order('created_at');

        if (cancelled) return;

        if (fetchErr) {
          console.error('[useChallenges] fetch error:', fetchErr.message);
          setLoading(false);
          return;
        }

        if (existing && existing.length > 0) {
          setChallenges(existing as Challenge[]);
          setLoading(false);
          return;
        }

        // Auto-generate 3 challenges for this month
        const templates = pickChallenges(3);
        const rows = templates.map((t) => ({
          user_id: user.id,
          month,
          type: t.type,
          title: t.title,
          description: t.description,
          target_value: t.target_value,
          current_value: 0,
          is_completed: false,
          points_reward: t.points_reward,
        }));

        const { data: created, error: insertErr } = await supabase
          .from('challenges')
          .insert(rows)
          .select();

        if (cancelled) return;

        if (insertErr) {
          console.error('[useChallenges] insert error:', insertErr.message);
        }
        if (created) setChallenges(created as Challenge[]);
      } catch (err) {
        console.error('[useChallenges] unexpected error:', err);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user, hasChallenges, month]);

  const completeChallenge = useCallback(
    async (id: string) => {
      if (!user) return;
      const { data } = await supabase
        .from('challenges')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (data) {
        setChallenges((prev) => prev.map((c) => (c.id === id ? (data as Challenge) : c)));
      }
    },
    [user],
  );

  const totalPoints = useMemo(
    () => challenges.filter((c) => c.is_completed).reduce((s, c) => s + c.points_reward, 0),
    [challenges],
  );

  return { challenges, loading, completeChallenge, totalPoints, hasChallenges };
}
