// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function getPayPalAccessToken(baseUrl: string, clientId: string, clientSecret: string) {
  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    throw new Error(tokenJson?.error_description || tokenJson?.message || 'PayPal token error');
  }
  const accessToken = tokenJson?.access_token;
  if (!accessToken) throw new Error('PayPal access token missing');
  return String(accessToken);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const paypalEnv = (Deno.env.get('PAYPAL_ENV') || 'sandbox').toLowerCase();

  if (!supabaseUrl) return jsonResponse(500, { error: 'Missing SUPABASE_URL' });
  if (!supabaseAnonKey) return jsonResponse(500, { error: 'Missing SUPABASE_ANON_KEY' });
  if (!paypalClientId) return jsonResponse(500, { error: 'Missing PAYPAL_CLIENT_ID' });
  if (!paypalClientSecret) return jsonResponse(500, { error: 'Missing PAYPAL_CLIENT_SECRET' });

  const baseUrl = paypalEnv === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'Missing Authorization header' });
  }

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
    .select('id, nome, attivo, prezzo_mensile, prezzo_annuale')
    .eq('id', planId)
    .single();

  if (planError || !plan?.id) return jsonResponse(404, { error: 'Plan not found' });
  if (plan.attivo !== true) return jsonResponse(400, { error: 'Plan not active' });

  const basePrice = Number(
    billingPeriod === 'mensile'
      ? plan.prezzo_mensile
      : plan.prezzo_annuale,
  );

  if (!Number.isFinite(basePrice) || basePrice < 0) return jsonResponse(400, { error: 'Invalid price' });

  const db = supabaseAdmin ?? supabase;

  let finalPrice = basePrice;
  let discountIdToTrack: string | null = null;
  let monthsGratis = 0;

  if (discountCode) {
    const { data: discount, error: dcError } = await db
      .from('subscription_discount_codes')
      .select('id, codice, attivo, tipo_sconto, valore_sconto, piani_applicabili, durata_sconto, data_inizio, data_scadenza, max_utilizzi_totali, utilizzi_attuali')
      .eq('codice', discountCode)
      .limit(1)
      .maybeSingle();

    if (!dcError && discount?.id && discount.attivo === true) {
      let applicable = true;

      if (Array.isArray(discount.piani_applicabili) && discount.piani_applicabili.length > 0) {
        applicable = discount.piani_applicabili.includes(String(plan?.nome ?? ''));
      }

      if (applicable && (isDateInFuture(discount.data_inizio) || isDateInPast(discount.data_scadenza))) {
        applicable = false;
      }

      if (applicable) {
        const maxUses = Number(discount.max_utilizzi_totali ?? 0);
        if (maxUses > 0) {
          const currentUses = Number.isFinite(Number(discount.utilizzi_attuali))
            ? Number(discount.utilizzi_attuali)
            : null;

          if (currentUses == null) {
            const { count, error: countError } = await db
              .from('discount_usages')
              .select('*', { count: 'exact', head: true })
              .eq('discount_code_id', discount.id);
            if (!countError && (count ?? 0) >= maxUses) {
              applicable = false;
            }
          } else if (currentUses >= maxUses) {
            applicable = false;
          }
        }
      }

      if (applicable) {
        const tipo = String(discount.tipo_sconto ?? '');
        const valore = Number(discount.valore_sconto ?? 0);

        discountIdToTrack = String(discount.id);

        if (tipo === 'percentuale') {
          finalPrice = basePrice * (1 - Math.max(0, Math.min(100, valore)) / 100);
        } else if (tipo === 'fisso') {
          finalPrice = Math.max(0, basePrice - Math.max(0, valore));
        } else if (tipo === 'gratis_completo') {
          finalPrice = 0;
        } else if (tipo === 'mesi_gratis') {
          monthsGratis = Math.max(0, Math.round(valore));
          finalPrice = basePrice;
        }
      }
    }
  }

  // PayPal non gestisce bene un ordine a 0€: in quel caso fai il rinnovo come "gratis" lato app.
  if (finalPrice <= 0) {
    return jsonResponse(200, {
      free: true,
      amount: '0.00',
      currency: 'EUR',
      discount_code: discountCode || null,
      months_gratis: monthsGratis,
    });
  }

  const accessToken = await getPayPalAccessToken(baseUrl, paypalClientId, paypalClientSecret);

  const amountStr = finalPrice.toFixed(2);

  const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'subscription',
          custom_id: `${restaurantId}|${planId}|${billingPeriod}`,
          description: `Abbonamento ${String(plan?.nome ?? '')} (${billingPeriod})`,
          amount: {
            currency_code: 'EUR',
            value: amountStr,
          },
        },
      ],
      application_context: {
        brand_name: 'OrdinaFacile.food',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
      },
    }),
  });

  const orderJson = await orderRes.json().catch(() => ({}));
  if (!orderRes.ok) {
    return jsonResponse(400, {
      error: orderJson?.message || 'PayPal order error',
      details: orderJson,
    });
  }

  if (discountIdToTrack) {
    try {
      await db.from('discount_usages').insert({
        discount_code_id: discountIdToTrack,
        restaurant_id: restaurantId,
        stripe_session_id: String(orderJson?.id ?? ''),
      });
    } catch {
      // best-effort
    }
  }

  return jsonResponse(200, {
    id: orderJson?.id,
    amount: amountStr,
    currency: 'EUR',
    discount_code: discountCode || null,
    months_gratis: monthsGratis,
  });
});
