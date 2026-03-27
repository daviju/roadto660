import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Gift, Crown, Flame, Diamond, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useToast } from '../shared/Toast';
import { REWARDS, POINT_TABLE, type Reward } from '../../utils/points';
import { staggerContainer, fadeUp, scaleFade } from '../../utils/animations';

const ICON_MAP: Record<string, typeof Star> = {
  badge_star: Star,
  badge_fire: Flame,
  badge_diamond: Diamond,
  pro_1m: Crown,
  pro_feature_3m: Gift,
  pro_feature_6m: Gift,
};

function PointHistoryItem({ action, points }: { action: string; points: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-th-secondary">{action}</span>
      <span className={`font-mono font-medium ${points >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
        {points >= 0 ? '+' : ''}{points}
      </span>
    </div>
  );
}

export function RewardsPage() {
  const { profile, session, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);

  const userPoints = profile?.points || 0;

  const handleRedeem = async (reward: Reward) => {
    if (userPoints < reward.cost || !session?.access_token || !profile) return;
    setRedeemingId(reward.id);
    try {
      // Deduct points
      const newPoints = userPoints - reward.cost;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profile.id);

      if (updateError) {
        toast.error('Error al canjear la recompensa');
        setRedeemingId(null);
        return;
      }

      // Log the point event
      await supabase.from('point_events').insert({
        user_id: profile.id,
        points: -reward.cost,
        reason: `Canjeado: ${reward.name}`,
      });

      // If it's a PRO reward, activate the benefit
      if (reward.type === 'pro_month' && reward.duration_months) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + reward.duration_months);
        await supabase
          .from('profiles')
          .update({
            plan: 'pro',
            plan_expires_at: expiresAt.toISOString(),
          })
          .eq('id', profile.id);
        toast.success(`Has canjeado ${reward.name}! Activo hasta el ${expiresAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`);
      } else {
        toast.success(`Has canjeado ${reward.name}!`);
      }

      await refreshProfile();
    } catch {
      toast.error('Error al procesar el canje');
    } finally {
      setRedeemingId(null);
      setConfirmReward(null);
    }
  };

  return (
    <motion.div className="space-y-6 max-w-2xl mx-auto" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-th-text">Recompensas</h2>
        <p className="text-sm text-th-muted mt-1">Canjea tus puntos por beneficios</p>
      </motion.div>

      {/* Points balance */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-5 border border-accent-amber/20 text-center">
        <p className="text-xs text-th-muted uppercase tracking-wider mb-1">Tus puntos</p>
        <div className="flex items-center justify-center gap-2">
          <Star size={24} className="text-accent-amber" />
          <span className="text-4xl font-bold text-accent-amber">{userPoints.toLocaleString('es-ES')}</span>
        </div>
      </motion.div>

      {/* How to earn */}
      <motion.div variants={fadeUp} className="bg-th-card rounded-xl p-4 border border-th-border">
        <h3 className="text-sm font-semibold text-th-text mb-3">Como ganar puntos</h3>
        <div className="space-y-0.5">
          <PointHistoryItem action="Registrar gasto/ingreso" points={POINT_TABLE.REGISTER_EXPENSE} />
          <PointHistoryItem action="Importar Excel" points={POINT_TABLE.EXCEL_IMPORT} />
          <PointHistoryItem action="Racha de 7 dias" points={POINT_TABLE.STREAK_7_DAYS} />
          <PointHistoryItem action="Mes bajo presupuesto" points={POINT_TABLE.MONTH_UNDER_BUDGET} />
          <PointHistoryItem action="Categoria bajo presupuesto (mes)" points={POINT_TABLE.CATEGORY_UNDER_BUDGET} />
          <PointHistoryItem action="Primer mes en la app" points={POINT_TABLE.FIRST_MONTH} />
          <PointHistoryItem action="3 meses consecutivos" points={POINT_TABLE.THREE_MONTHS} />
          <PointHistoryItem action="Completar meta (segun coste)" points={300} />
        </div>
      </motion.div>

      {/* Rewards grid */}
      <motion.div variants={fadeUp}>
        <h3 className="text-sm font-semibold text-th-text mb-3">Recompensas disponibles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REWARDS.map((reward) => {
            const Icon = ICON_MAP[reward.id] || Gift;
            const canAfford = userPoints >= reward.cost;
            return (
              <motion.div
                key={reward.id}
                className={`bg-th-card rounded-xl p-4 border transition-colors ${
                  canAfford ? 'border-accent-amber/30 hover:border-accent-amber/60' : 'border-th-border opacity-60'
                }`}
                whileHover={canAfford ? { y: -2 } : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    canAfford ? 'bg-accent-amber/15' : 'bg-th-hover'
                  }`}>
                    <Icon size={18} className={canAfford ? 'text-accent-amber' : 'text-th-muted'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-th-text">{reward.name}</p>
                    <p className="text-xs text-th-muted mt-0.5 leading-relaxed">{reward.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-mono font-semibold text-accent-amber flex items-center gap-1">
                        <Star size={10} /> {reward.cost.toLocaleString('es-ES')} pts
                      </span>
                      <motion.button
                        onClick={() => setConfirmReward(reward)}
                        disabled={!canAfford || redeemingId === reward.id}
                        className="px-3 py-1 bg-accent-amber text-white text-xs font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-amber/80 transition-colors"
                        whileTap={canAfford ? { scale: 0.95 } : undefined}
                      >
                        {redeemingId === reward.id ? <Loader2 size={12} className="animate-spin" /> : 'Canjear'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Confirm redeem modal */}
      <AnimatePresence>
        {confirmReward && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmReward(null)}
          >
            <motion.div
              className="bg-th-card rounded-xl p-5 border border-th-border-strong max-w-sm w-full space-y-4"
              variants={scaleFade} initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-th-text">Confirmar canje</h3>
              <p className="text-sm text-th-secondary">
                Vas a canjear <strong className="text-accent-amber">{confirmReward.name}</strong> por{' '}
                <strong className="text-accent-amber">{confirmReward.cost.toLocaleString('es-ES')} puntos</strong>.
              </p>
              <p className="text-xs text-th-muted">
                Te quedaran {(userPoints - confirmReward.cost).toLocaleString('es-ES')} puntos despues del canje.
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  onClick={() => setConfirmReward(null)}
                  className="px-4 py-2 text-sm text-th-secondary hover:text-th-text"
                  whileTap={{ scale: 0.95 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={() => handleRedeem(confirmReward)}
                  disabled={redeemingId !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-amber text-white rounded-lg text-sm font-medium hover:bg-accent-amber/80 disabled:opacity-50"
                  whileTap={{ scale: 0.97 }}
                >
                  {redeemingId ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                  Canjear
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
