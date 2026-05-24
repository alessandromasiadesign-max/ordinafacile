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

function normalizeDiscountCode(code: unknown) {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

function isDateInFuture(d: unknown) {
  if (!d) return false;
  const date = new Date(String(d));
  if (Number.isNaN(date.getTime())) return false;
  return date > new Date();
}

function isDateInPast(d: unknown) {
  if (!d) return false;
  const date = new Date(String(d));
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const frontendUrl = Deno.env.get('FRONTEND_URL');

  if (!stripeSecretKey) return jsonResponse(500, { error: 'Missing STRIPE_SECRET_KEY' });
  if (!supabaseUrl) return jsonResponse(500, { error: 'Missing SUPABASE_URL' });
  if (!supabaseAnonKey) return jsonResponse(500, { error: 'Missing SUPABASE_ANON_KEY' });
  if (!frontendUrl) return jsonResponse(500, { error: 'Missing FRONTEND_URL' });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const restaurantId = String(payload?.restaurant_id ?? '');
  const planId = String(payload?.plan_id ?? '');
  const billingPeriod = String(payload?.billing_period ?? '');
  const discountCode = normalizeDiscountCode(payload?.discount_code);

  if (!restaurantId) return jsonResponse(400, { error: 'restaurant_id is required' });
  if (!planId) return jsonResponse(400, { error: 'plan_id is required' });
  if (!['mensile', 'annuale'].includes(billingPeriod)) return jsonResponse(400, { error: 'billing_period must be mensile|annuale' });

  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, nome, user_id')
    .eq('id', restaurantId)
    .single();

  if (restError || !restaurant?.id) return jsonResponse(404, { error: 'Restaurant not found' });
  if (restaurant.user_id !== userData.user.id) return jsonResponse(403, { error: 'Forbidden' });

  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('id, nome, attivo')
    .eq('id', planId)
    .single();

  if (planError || !plan?.id) return jsonResponse(404, { error: 'Plan not found' });
  if (plan.attivo !== true) return jsonResponse(400, { error: 'Plan not active' });

  const { data: platformSettings, error: psError } = await supabase
    .from('platform_settings')
    .select('payment_info')
    .limit(1);

  if (psError) return jsonResponse(500, { error: 'Failed to read platform settings' });

  const paymentInfo = (platformSettings?.[0]?.payment_info ?? {}) as any;
  const stripePrices = (paymentInfo?.stripe_prices ?? {}) as any;
  const priceId = stripePrices?.[planId]?.[billingPeriod];

  if (!priceId) {
    return jsonResponse(400, { error: `Missing Stripe price id for plan ${planId} (${billingPeriod})` });
  }

  const db = supabaseAdmin ?? supabase;

  let couponId: string | null = null;
  let trialPeriodDays: number | undefined;
  let discountIdToTrack: string | null = null;

  if (discountCode) {
    const { data: discount, error: dcError } = await db
      .from('subscription_discount_codes')
      .select('id, codice, attivo, tipo_sconto, valore_sconto, piani_applicabili, durata_sconto, data_inizio, data_scadenza, max_utilizzi_totali, utilizzi_attuali')
      .eq('codice', discountCode)
      .limit(1)
      .maybeSingle();

    if (dcError) return jsonResponse(400, { error: 'Invalid discount code' });
    if (!discount?.id) return jsonResponse(400, { error: 'Invalid discount code' });
    if (discount.attivo !== true) return jsonResponse(400, { error: 'Discount code not active' });

    discountIdToTrack = String(discount.id);

    if (Array.isArray(discount.piani_applicabili) && discount.piani_applicabili.length > 0) {
      if (!discount.piani_applicabili.includes(String(plan?.nome ?? ''))) {
        return jsonResponse(400, { error: 'Discount code not applicable to plan' });
      }
    }

    if (isDateInFuture(discount.data_inizio)) return jsonResponse(400, { error: 'Discount code not started' });
    if (isDateInPast(discount.data_scadenza)) return jsonResponse(400, { error: 'Discount code expired' });

    const maxUses = Number(discount.max_utilizzi_totali ?? 0);
    if (maxUses > 0) {
      const currentUses = Number.isFinite(Number(discount.utilizzi_attuali))
        ? Number(discount.utilizzi_attuali)
        : (() => {
            return null;
          })();

      if (currentUses == null) {
        const { count, error: countError } = await db
          .from('discount_usages')
          .select('*', { count: 'exact', head: true })
          .eq('discount_code_id', discount.id);
        if (countError) return jsonResponse(400, { error: 'Invalid discount code' });
        if ((count ?? 0) >= maxUses) return jsonResponse(400, { error: 'Discount code usage limit reached' });
      } else {
        if (currentUses >= maxUses) return jsonResponse(400, { error: 'Discount code usage limit reached' });
      }
    }

    const tipo = String(discount.tipo_sconto ?? '');
    const valore = Number(discount.valore_sconto ?? 0);
    const durata = String(discount.durata_sconto ?? 'singolo');

    if (tipo === 'mesi_gratis') {
      const months = Math.max(0, Math.round(valore));
      if (months > 0) trialPeriodDays = months * 30;
    } else {
      const duration = durata === 'singolo' ? 'once' : 'forever';

      const couponParams: any = {
        duration: duration as any,
        name: discountCode,
        metadata: {
          discount_code: discountCode,
          discount_code_id: String(discount.id),
          plan_id: planId,
          restaurant_id: restaurantId,
        },
      };

      if (tipo === 'percentuale') {
        couponParams.percent_off = Math.max(0, Math.min(100, valore));
      } else if (tipo === 'fisso') {
        couponParams.amount_off = Math.max(0, Math.round(valore * 100));
        couponParams.currency = 'eur';
      } else if (tipo === 'gratis_completo') {
        couponParams.percent_off = 100;
      } else {
        return jsonResponse(400, { error: 'Invalid discount code type' });
      }

      const coupon = await stripe.coupons.create(couponParams);
      couponId = coupon?.id ?? null;
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    client_reference_id: restaurantId,
    success_url: `${frontendUrl.replace(/\/$/, '')}/RenewSubscription?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl.replace(/\/$/, '')}/RenewSubscription?stripe=cancel`,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        restaurant_id: restaurantId,
        plan_id: planId,
        plan_name: String(plan?.nome ?? ''),
        billing_period: billingPeriod,
        discount_code: discountCode || undefined,
      },
      ...(typeof trialPeriodDays === 'number' ? { trial_period_days: trialPeriodDays } : {}),
    },
    ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
    metadata: {
      restaurant_id: restaurantId,
      plan_id: planId,
      plan_name: String(plan?.nome ?? ''),
      billing_period: billingPeriod,
      discount_code: discountCode || undefined,
    },
  });

  if (discountIdToTrack) {
    try {
      await db.from('discount_usages').insert({
        discount_code_id: discountIdToTrack,
        restaurant_id: restaurantId,
        stripe_session_id: session.id,
      });
    } catch {
      // best-effort
    }
  }

  return jsonResponse(200, { url: session.url });
});
