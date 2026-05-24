/* eslint-disable @typescript-eslint/no-explicit-any */

type InvokeLlmRequest = {
  prompt?: unknown;
  response_json_schema?: unknown;
  max_tokens?: unknown;
  add_context_from_internet?: unknown;
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : '';
}

function safeNumber(v: unknown) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function cleanJson(text: string) {
  return text.replace(/```json|```/g, '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'IA non configurata: manca ANTHROPIC_API_KEY.' }, { status: 500 });
    }

    const payload = (await req.json().catch(() => ({}))) as InvokeLlmRequest;

    const prompt = safeString(payload?.prompt).trim();
    if (!prompt) {
      return jsonResponse({ error: 'Prompt mancante.' }, { status: 400 });
    }

    const MAX_PROMPT_CHARS = 8000;
    if (prompt.length > MAX_PROMPT_CHARS) {
      return jsonResponse({ error: `Prompt troppo lungo (max ${MAX_PROMPT_CHARS} caratteri).` }, { status: 400 });
    }

    const requestedMaxTokens = safeNumber(payload?.max_tokens);
    const maxTokens = Math.max(1, Math.min(500, requestedMaxTokens ?? 500));

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data: any = await anthropicResponse.json().catch(() => ({}));

    if (!anthropicResponse.ok) {
      const msg = data?.error?.message || `HTTP ${anthropicResponse.status}`;
      return jsonResponse({ error: `Errore IA: ${msg}` }, { status: 502 });
    }

    const text = safeString(data?.content?.[0]?.text);

    if (payload?.response_json_schema) {
      try {
        const parsed = JSON.parse(cleanJson(text));
        return jsonResponse({ result: parsed });
      } catch {
        return jsonResponse({ result: text });
      }
    }

    return jsonResponse({ result: text });
  } catch (error) {
    const msg = safeString((error as any)?.message) || 'errore sconosciuto';
    return jsonResponse({ error: `Errore IA: ${msg}` }, { status: 500 });
  }
});
