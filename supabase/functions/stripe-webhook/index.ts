// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook
// Configure in Stripe Dashboard: Webhooks → add endpoint → /functions/v1/stripe-webhook
// Events to listen: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
// Env vars:
//   STRIPE_WEBHOOK_SECRET  — whsec_...
//   STRIPE_SECRET_KEY      — sk_live_... or sk_test_...

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Supabase admin client (service role)
function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Webhook error: ${(err as Error).message}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = adminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await supabase.from('profiles').update({
          plan: 'pro',
          plan_expires_at: expiresAt,
          stripe_subscription_id: sub.id,
        }).eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await supabase.from('profiles').update({
          plan: isActive ? 'pro' : 'free',
          plan_expires_at: isActive ? expiresAt : null,
          stripe_subscription_id: sub.id,
        }).eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await supabase.from('profiles').update({
          plan: 'free',
          plan_expires_at: null,
          stripe_subscription_id: null,
        }).eq('id', userId);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
