// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1?target=deno';

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

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

function addDays(d: Date, days: number) {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function normalizeEmail(e: unknown) {
  if (typeof e !== 'string') return '';
  return e.trim();
}

function applyTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

async function sendWithResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String((json as any)?.message ?? (json as any)?.error ?? 'Resend error');
    throw new Error(msg);
  }

  return json;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const cronSecret = Deno.env.get('CRON_SECRET');
  const appUrl = Deno.env.get('APP_URL') || '';

  if (!supabaseUrl) return jsonResponse(500, { error: 'Missing SUPABASE_URL' });
  if (!supabaseServiceRoleKey) return jsonResponse(500, { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  if (!resendApiKey) return jsonResponse(500, { error: 'Missing RESEND_API_KEY' });

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

  const { data: platformSettingsRows, error: psError } = await supabaseAdmin
    .from('platform_settings')
    .select('notification_settings')
    .limit(1);

  if (psError) return jsonResponse(500, { error: 'Failed to read platform settings' });

  const notificationSettings = (platformSettingsRows?.[0]?.notification_settings ?? {}) as any;
  const adminEmail = normalizeEmail(notificationSettings?.admin_email);
  const template = String(notificationSettings?.email_template_scadenza ?? '').trim();

  const tz = 'Europe/Rome';
  const now = new Date();

  const reminderDaysList = [7, 1];
  const stats = {
    ok: true,
    today: formatYmdInTimeZone(now, tz),
    reminders: [] as any[],
  };

  for (const daysBefore of reminderDaysList) {
    const targetExpiry = formatYmdInTimeZone(addDays(now, daysBefore), tz);

    const { data: expiringRestaurants, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nome, email, abbonamento_tipo, abbonamento_scadenza')
      .eq('abbonamento_attivo', true)
      .eq('abbonamento_scadenza', targetExpiry);

    if (restError) return jsonResponse(500, { error: 'Failed to read restaurants' });

    let considered = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const r of expiringRestaurants ?? []) {
      considered += 1;

      const toEmail = normalizeEmail((r as any)?.email);
      if (!toEmail) {
        skipped += 1;
        continue;
      }

      const restaurantId = String((r as any)?.id ?? '');
      if (!restaurantId) {
        skipped += 1;
        continue;
      }

      const expiryDate = String((r as any)?.abbonamento_scadenza ?? targetExpiry);
      const restaurantName = String((r as any)?.nome ?? '');
      const planName = String((r as any)?.abbonamento_tipo ?? '');

      const insertRes = await supabaseAdmin
        .from('subscription_expiry_reminders')
        .insert({
          restaurant_id: restaurantId,
          days_before: daysBefore,
          expiry_date: expiryDate,
          to_email: toEmail,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertRes.error) {
        if (insertRes.error.code === '23505') {
          skipped += 1;
          continue;
        }
        failed += 1;
        continue;
      }

      const reminderId = String((insertRes.data as any)?.id ?? '');

      const subject = `Abbonamento in scadenza tra ${daysBefore} giorni`;
      const renewUrl = appUrl ? `${appUrl.replace(/\/+$/, '')}/RenewSubscription` : '';

      const defaultHtml = `
        <h2>Abbonamento in scadenza</h2>
        <p>Ciao ${restaurantName || 'ristorante'},</p>
        <p>Il tuo abbonamento <strong>${planName || ''}</strong> scade il <strong>${expiryDate}</strong>.</p>
        <p>Mancano <strong>${daysBefore}</strong> giorni.</p>
        ${renewUrl ? `<p>Rinnova qui: <a href="${renewUrl}">${renewUrl}</a></p>` : ''}
      `;

      const html = template
        ? applyTemplate(template, {
            RISTORANTE_NOME: restaurantName,
            PIANO: planName,
            SCADENZA: expiryDate,
            GIORNI: String(daysBefore),
            LINK_RINNOVO: renewUrl,
          })
        : defaultHtml;

      try {
        await sendWithResend({
          apiKey: resendApiKey,
          from: resendFrom,
          to: toEmail,
          subject,
          html,
        });

        if (adminEmail) {
          await sendWithResend({
            apiKey: resendApiKey,
            from: resendFrom,
            to: adminEmail,
            subject: `[ADMIN] ${subject} - ${restaurantName}`,
            html,
          });
        }

        await supabaseAdmin
          .from('subscription_expiry_reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reminderId);

        sent += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabaseAdmin
          .from('subscription_expiry_reminders')
          .update({ status: 'failed', error: msg })
          .eq('id', reminderId);
        failed += 1;
      }
    }

    stats.reminders.push({
      days_before: daysBefore,
      target_expiry: targetExpiry,
      considered,
      sent,
      skipped,
      failed,
    });
  }

  return jsonResponse(200, stats);
});
