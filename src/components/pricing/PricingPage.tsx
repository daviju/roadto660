import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../lib/auth';
import { staggerContainer, fadeUp } from '../../utils/animations';
import { redirectToCheckout, isStripeEnabled } from '../../lib/stripe';
import { STRIPE_PRICES, type StripePlan } from '../../lib/stripe-config';

const FREE_FEATURES = [
  '1 objetivo de ahorro',
  'Registro de gastos e ingresos',
  'Presupuestos por categoria',
  'Timeline de fases',
  'Hasta 3 meses de historial',
  '50 movimientos por importacion Excel',
];

const PRO_FEATURES = [
  'Objetivos ilimitados',
  'Historial completo sin limite',
  'Importacion Excel ilimitada',
  'Escenarios de ahorro (simulador)',
  'Consejos personalizados avanzados',
  'Graficos avanzados',
  'Exportacion de datos',
  'Gamificacion: puntos y logros',
  'Soporte prioritario',
];

export function PricingPage() {
  const { isPro } = usePlan();
  const { profile, session } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StripePlan>('monthly');

  const stripeReady = isStripeEnabled();
  const price = STRIPE_PRICES[selectedPlan];

  const handleUpgrade = async () => {
    if (!session?.access_token) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    const { error } = await redirectToCheckout(session.access_token, price.id);
    if (error) setCheckoutError(error);
    setCheckoutLoading(false);
  };

  return (
    <motion.div className="space-y-6 max-w-3xl mx-auto" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="text-center">
        <h2 className="text-2xl font-bold text-th-text">Planes</h2>
        <p className="text-sm text-th-muted mt-2">Elige el plan que mejor se adapte a tus necesidades</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* FREE */}
        <motion.div variants={fadeUp}
          className={`bg-th-card rounded-2xl p-6 border ${!isPro ? 'border-accent-purple ring-2 ring-accent-purple/30' : 'border-th-border'} flex flex-col`}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-th-muted uppercase tracking-wider">Free</span>
              {!isPro && (
                <span className="text-xs px-2 py-0.5 bg-accent-purple/15 text-accent-purple rounded font-medium">Plan actual</span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-th-text">0€</span>
              <span className="text-th-muted text-sm">/mes</span>
            </div>
          </div>

          <ul className="space-y-2.5 flex-1 mb-6">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-th-secondary">
                <Check size={14} className="text-accent-green mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {!isPro ? (
              <div className="w-full py-2.5 text-center text-sm text-th-muted border border-th-border rounded-xl">
                Plan actual
              </div>
            ) : (
              <div className="w-full py-2.5 text-center text-sm text-th-muted">
                Plan gratuito
              </div>
            )}
          </div>
        </motion.div>

        {/* PRO */}
        <motion.div variants={fadeUp}
          className={`bg-th-card rounded-2xl p-6 border ${isPro ? 'border-accent-amber ring-2 ring-accent-amber/30' : 'border-accent-amber/40'} flex flex-col relative overflow-hidden`}>
          <div className="absolute top-0 right-0 px-3 py-1 bg-accent-amber text-white text-xs font-bold rounded-bl-xl flex items-center gap-1">
            <Crown size={10} /> RECOMENDADO
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-accent-amber uppercase tracking-wider">Pro</span>
              {isPro && (
                <span className="text-xs px-2 py-0.5 bg-accent-amber/15 text-accent-amber rounded font-medium">Plan actual</span>
              )}
            </div>

            {/* Plan toggle */}
            {!isPro && (
              <div className="flex gap-1 bg-th-bg rounded-lg p-1 mb-3">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'bg-accent-amber/15 text-accent-amber'
                      : 'text-th-muted hover:text-th-text'
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    selectedPlan === 'annual'
                      ? 'bg-accent-amber/15 text-accent-amber'
                      : 'text-th-muted hover:text-th-text'
                  }`}
                >
                  Anual
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-accent-green/15 text-accent-green rounded-full">
                    -{STRIPE_PRICES.annual.savings}%
                  </span>
                </button>
              </div>
            )}

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-th-text">{price.amount.toFixed(2).replace('.', ',')}€</span>
              <span className="text-th-muted text-sm">/{price.interval}</span>
            </div>
            {selectedPlan === 'annual' && !isPro && (
              <p className="text-xs text-accent-green mt-1">
                Equivale a {(STRIPE_PRICES.annual.amount / 12).toFixed(2).replace('.', ',')}€/mes
              </p>
            )}
            <p className="text-xs text-th-muted mt-1">Cancela cuando quieras</p>
          </div>

          <ul className="space-y-2.5 flex-1 mb-6">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-th-secondary">
                <Check size={14} className="text-accent-amber mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {isPro ? (
              <div className="w-full py-2.5 text-center text-sm text-accent-amber border border-accent-amber/30 rounded-xl font-medium flex items-center justify-center gap-2">
                <Crown size={14} /> Plan PRO activo
              </div>
            ) : (
              <>
                <motion.button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading || !stripeReady}
                  className="w-full py-2.5 bg-accent-amber text-white rounded-xl text-sm font-semibold hover:bg-accent-amber/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={{ scale: checkoutLoading || !stripeReady ? 1 : 1.02 }} whileTap={{ scale: checkoutLoading || !stripeReady ? 1 : 0.97 }}>
                  {checkoutLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Redirigiendo...</>
                    : !stripeReady
                    ? <>Pagos no disponibles</>
                    : <><Zap size={14} /> Actualizar a PRO — {price.amount.toFixed(2).replace('.', ',')}€/{price.interval}</>}
                </motion.button>
                {checkoutError && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle size={12} /> {checkoutError}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {isPro && profile?.plan_expires_at && (
        <motion.div variants={fadeUp} className="bg-accent-amber/10 border border-accent-amber/20 rounded-xl p-4 text-sm text-center text-th-secondary">
          Tu plan PRO esta activo hasta{' '}
          <span className="font-medium text-accent-amber">
            {new Date(profile.plan_expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </motion.div>
      )}

      <motion.p variants={fadeUp} className="text-xs text-th-muted text-center">
        Pago seguro con Stripe · Cancela en cualquier momento · Sin compromisos
      </motion.p>
    </motion.div>
  );
}
