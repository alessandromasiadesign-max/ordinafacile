// deno-lint-ignore-file no-explicit-any
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function toDateOnly(utcSeconds: number | null | undefined) {
  if (!utcSeconds) return null;
  const d = new Date(utcSeconds * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeSecretKey) return jsonResponse(500, { error: 'Missing STRIPE_SECRET_KEY' });
  if (!stripeWebhookSecret) return jsonResponse(500, { error: 'Missing STRIPE_WEBHOOK_SECRET' });
  if (!supabaseUrl) return jsonResponse(500, { error: 'Missing SUPABASE_URL' });
  if (!supabaseServiceRoleKey) return jsonResponse(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return jsonResponse(400, { error: 'Missing stripe-signature header' });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return jsonResponse(400, { error: 'Invalid signature' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const updateRestaurantFromSubscription = async (restaurantId: string, subscriptionId: string, planName?: string) => {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const expiry = toDateOnly(sub.current_period_end);
    await supabaseAdmin
      .from('restaurants')
      .update({
        abbonamento_attivo: sub.status === 'active' || sub.status === 'trialing',
        abbonamento_scadenza: expiry,
        abbonamento_tipo: planName ?? (sub.metadata as any)?.plan_name ?? null,
      })
      .eq('id', restaurantId);
  };

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const restaurantId = String(session.client_reference_id ?? (session.metadata as any)?.restaurant_id ?? '');
      const subscriptionId = String(session.subscription ?? '');
      const planName = String((session.metadata as any)?.plan_name ?? '');

      if (restaurantId && subscriptionId) {
        await updateRestaurantFromSubscription(restaurantId, subscriptionId, planName || undefined);
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = String(invoice.subscription ?? '');
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const restaurantId = String((sub.metadata as any)?.restaurant_id ?? '');
        const planName = String((sub.metadata as any)?.plan_name ?? '');
        if (restaurantId) {
          await updateRestaurantFromSubscription(restaurantId, subscriptionId, planName || undefined);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const restaurantId = String((sub.metadata as any)?.restaurant_id ?? '');
      if (restaurantId) {
        await supabaseAdmin
          .from('restaurants')
          .update({
            abbonamento_attivo: false,
          })
          .eq('id', restaurantId);
      }
    }

    return jsonResponse(200, { received: true });
  } catch (err) {
    console.error('Webhook handling error:', err);
    return jsonResponse(500, { error: 'Webhook handler failed' });
  }
});
