import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Gracefully handle missing key — stripePromise resolves to null
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise: Promise<Stripe | null> = publishableKey
  ? loadStripe(publishableKey)
  : Promise.resolve(null);

/** Whether Stripe is configured (key present). UI can use this to disable payment buttons. */
export const isStripeEnabled = (): boolean => !!publishableKey;

export const redirectToCheckout = async (
  accessToken: string,
  priceId: string,
): Promise<{ error?: string }> => {
  try {
    if (!publishableKey) return { error: 'Pagos no disponibles: Stripe no esta configurado' };

    const stripe = await stripePromise;
    if (!stripe) return { error: 'Stripe no disponible' };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ priceId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: (err as { error?: string }).error || 'Error al crear sesion de pago' };
    }

    const { url, sessionId } = await response.json() as { url?: string; sessionId?: string };

    // Prefer direct URL redirect (Checkout v3)
    if (url) {
      window.location.href = url;
      return {};
    }

    // Fallback: legacy redirectToCheckout
    if (sessionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (stripe as any).redirectToCheckout({ sessionId });
      if (result?.error) return { error: result.error.message };
      return {};
    }

    return { error: 'No se recibio URL de pago' };
  } catch (err) {
    return { error: (err as Error).message };
  }
};
