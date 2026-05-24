// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

function formatYmdInTimeZone(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
      map[p.type] = p.value;
    }
  }

  if (!map.year || !map.month || !map.day) {
    return d.toISOString().slice(0, 10);
  }

  return `${map.year}-${map.month}-${map.day}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!supabaseUrl) return jsonResponse(500, { error: 'Missing SUPABASE_URL' });
  if (!supabaseServiceRoleKey) return jsonResponse(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret') ?? '';
    if (provided !== cronSecret) return jsonResponse(401, { error: 'Unauthorized' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const todayYmdRome = formatYmdInTimeZone(new Date(), 'Europe/Rome');

  const { data: updated, error } = await supabaseAdmin
    .from('restaurants')
    .update({ abbonamento_attivo: false })
    .eq('abbonamento_attivo', true)
    .not('abbonamento_scadenza', 'is', null)
    .lt('abbonamento_scadenza', todayYmdRome)
    .select('id');

  if (error) {
    console.error('sync-subscription-status error:', error);
    return jsonResponse(500, { error: 'Failed to sync subscription status' });
  }

  return jsonResponse(200, {
    ok: true,
    today: todayYmdRome,
    expired_deactivated: Array.isArray(updated) ? updated.length : 0,
  });
});
