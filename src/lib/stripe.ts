import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export const redirectToCheckout = async (accessToken: string): Promise<{ error?: string }> => {
  try {
    const stripe = await stripePromise;
    if (!stripe) return { error: 'Stripe no disponible' };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
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
