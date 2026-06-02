import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno';

const corsHeaders: Record<string, string> = {
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

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function escapePostgrestOrValue(v: string) {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) return jsonResponse(500, { error: 'Missing SUPABASE_URL' });
  if (!supabaseServiceRoleKey) return jsonResponse(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const bodyObj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : null;

  const orderId = safeString(bodyObj?.orderId ?? bodyObj?.oid ?? bodyObj?.id);
  const orderNumber = safeString(bodyObj?.orderNumber ?? bodyObj?.order);

  if (!orderId && !orderNumber) {
    return jsonResponse(400, { error: 'Missing orderId or orderNumber' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const selectCols = [
    'id',
    'numero_ordine',
    'order_number',
    'stato',
    'status',
    'tipo_consegna',
    'delivery_type',
    'totale',
    'total',
    'updated_at',
    'created_at',
  ].join(',');

  let query = supabaseAdmin.from('orders').select(selectCols).limit(1);

  if (orderId) {
    query = query.eq('id', orderId);
  } else {
    const escaped = escapePostgrestOrValue(orderNumber);
    query = query.or(`numero_ordine.eq."${escaped}",order_number.eq."${escaped}"`);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    const e = error as unknown as { message?: unknown; code?: unknown };
    return jsonResponse(500, {
      error: typeof e?.message === 'string' ? e.message : 'Query error',
      code: typeof e?.code === 'string' ? e.code : null,
    });
  }

  if (!data) {
    return jsonResponse(404, { error: 'Order not found' });
  }

  return jsonResponse(200, { order: data });
});
