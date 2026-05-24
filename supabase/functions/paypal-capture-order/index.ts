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

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

function parsePayPalCapturedAmount(captureJson: any) {
  const purchaseUnit = captureJson?.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const amount = capture?.amount;
  const currency = String(amount?.currency_code ?? '');
  const value = Number(amount?.value);
  const status = String(capture?.status ?? captureJson?.status ?? '');
  return {
    currency,
    value,
    status,
  };
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

  const orderId = String(payload?.order_id ?? '');
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
  let monthsGratis = 0;

  if (discountCode) {
    const { data: discount, error: dcError } = await db
      .from('subscription_discount_codes')
      .select('id, codice, attivo, tipo_sconto, valore_sconto, piani_applicabili, data_inizio, data_scadenza')
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
        const tipo = String(discount.tipo_sconto ?? '');
        const valore = Number(discount.valore_sconto ?? 0);

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

  finalPrice = Number(finalPrice.toFixed(2));

  if (finalPrice <= 0) {
    const dataInizio = new Date();
    const dataScadenza = new Date(dataInizio);
    if (billingPeriod === 'mensile') {
      dataScadenza.setMonth(dataScadenza.getMonth() + 1);
    } else {
      dataScadenza.setFullYear(dataScadenza.getFullYear() + 1);
    }
    if (monthsGratis > 0) {
      dataScadenza.setMonth(dataScadenza.getMonth() + monthsGratis);
    }

    if (!supabaseAdmin) {
      return jsonResponse(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
    }

    await supabaseAdmin.from('subscription_transactions').insert({
      restaurant_id: restaurantId,
      piano: String(plan?.nome ?? ''),
      tipo: billingPeriod,
      importo: 0,
      metodo_pagamento: 'paypal',
      codice_sconto: discountCode || null,
      stato: 'paid',
      data_inizio: toYmd(dataInizio),
      data_scadenza: toYmd(dataScadenza),
      rinnovo_automatico: false,
    });

    await supabaseAdmin.from('restaurants').update({
      abbonamento_tipo: String(plan?.nome ?? ''),
      abbonamento_scadenza: toYmd(dataScadenza),
      abbonamento_attivo: true,
    }).eq('id', restaurantId);

    return jsonResponse(200, {
      status: 'COMPLETED',
      free: true,
      expiry: toYmd(dataScadenza),
    });
  }

  if (!orderId) return jsonResponse(400, { error: 'order_id is required' });
  if (!paypalClientId) return jsonResponse(500, { error: 'Missing PAYPAL_CLIENT_ID' });
  if (!paypalClientSecret) return jsonResponse(500, { error: 'Missing PAYPAL_CLIENT_SECRET' });

  const accessToken = await getPayPalAccessToken(baseUrl, paypalClientId, paypalClientSecret);

  const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const captureJson = await captureRes.json().catch(() => ({}));
  if (!captureRes.ok) {
    return jsonResponse(400, {
      error: captureJson?.message || 'PayPal capture error',
      details: captureJson,
    });
  }

  const captured = parsePayPalCapturedAmount(captureJson);
  if (captured.status !== 'COMPLETED') {
    return jsonResponse(400, { error: 'Payment not completed' });
  }

  if (captured.currency && captured.currency !== 'EUR') {
    return jsonResponse(400, { error: 'Invalid currency' });
  }

  if (!Number.isFinite(captured.value)) {
    return jsonResponse(400, { error: 'Invalid captured amount' });
  }

  const diff = Math.abs(Number(captured.value.toFixed(2)) - finalPrice);
  if (diff > 0.01) {
    return jsonResponse(400, { error: 'Captured amount mismatch' });
  }

  const dataInizio = new Date();
  const dataScadenza = new Date(dataInizio);
  if (billingPeriod === 'mensile') {
    dataScadenza.setMonth(dataScadenza.getMonth() + 1);
  } else {
    dataScadenza.setFullYear(dataScadenza.getFullYear() + 1);
  }
  if (monthsGratis > 0) {
    dataScadenza.setMonth(dataScadenza.getMonth() + monthsGratis);
  }

  if (!supabaseAdmin) {
    return jsonResponse(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  await supabaseAdmin.from('subscription_transactions').insert({
    restaurant_id: restaurantId,
    piano: String(plan?.nome ?? ''),
    tipo: billingPeriod,
    importo: finalPrice,
    metodo_pagamento: 'paypal',
    codice_sconto: discountCode || null,
    stato: 'paid',
    data_inizio: toYmd(dataInizio),
    data_scadenza: toYmd(dataScadenza),
    rinnovo_automatico: false,
  });

  await supabaseAdmin.from('restaurants').update({
    abbonamento_tipo: String(plan?.nome ?? ''),
    abbonamento_scadenza: toYmd(dataScadenza),
    abbonamento_attivo: true,
  }).eq('id', restaurantId);

  return jsonResponse(200, {
    status: 'COMPLETED',
    id: captureJson?.id,
    expiry: toYmd(dataScadenza),
  });
});
