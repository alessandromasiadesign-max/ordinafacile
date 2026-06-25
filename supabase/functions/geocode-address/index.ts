type GeocodeRequest = {
  address?: unknown;
  city?: unknown;
  country?: unknown;
};

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env?: {
    get: (key: string) => string | undefined;
  };
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

function normalizeText(v: unknown) {
  return safeString(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function pickCityFromAddressObject(addr: Record<string, unknown> | null) {
  if (!addr) return '';
  const candidates = [
    addr.city,
    addr.town,
    addr.village,
    addr.municipality,
    addr.hamlet,
    addr.county,
    addr.state,
  ];
  for (const c of candidates) {
    const s = safeString(c).trim();
    if (s) return s;
  }
  return '';
}

function extractCityFromAddressString(address: string) {
  const parts = String(address || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return { street: address, city: '' };
  }

  const candidateCity = parts[parts.length - 1];
  const street = parts.slice(0, -1).join(', ').trim();

  // Avoid extracting ultra-short tokens like "TO" or similar.
  if (candidateCity.length < 3) {
    return { street: address, city: '' };
  }

  return { street: street || address, city: candidateCity };
}

function encodeQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function nominatimSearch(params: Record<string, string>) {
  const url = `https://nominatim.openstreetmap.org/search?${encodeQuery(params)}`;
  const res = await fetch(url, {
    headers: {
      // Nominatim policy requires a valid User-Agent identifying the application.
      'User-Agent': 'OrdinaFacile.food/1.0 (geocode-address)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    return { ok: false as const, status: res.status, data: [] as Array<Record<string, unknown>> };
  }

  const data = (await res.json().catch(() => [])) as Array<Record<string, unknown>>;
  return { ok: true as const, status: res.status, data: Array.isArray(data) ? data : [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as GeocodeRequest;

    const address = safeString(payload?.address).trim();
    const city = safeString(payload?.city).trim();
    const country = safeString(payload?.country).trim() || 'Italia';

    if (!address) {
      return jsonResponse({ error: 'Indirizzo mancante.' }, { status: 400 });
    }

    const extracted = !city ? extractCityFromAddressString(address) : { street: address, city: '' };
    const effectiveCity = city || extracted.city;
    const street = city ? address : extracted.street;

    const q = [street, effectiveCity, country].filter(Boolean).join(', ');
    const normalizedCity = normalizeText(effectiveCity);

    const baseParams = {
      format: 'json',
      limit: '5',
      addressdetails: '1',
      countrycodes: 'it',
      'accept-language': 'it',
    };

    const primary = effectiveCity
      ? await nominatimSearch({
          ...baseParams,
          street,
          city: effectiveCity,
          country,
        })
      : await nominatimSearch({
          ...baseParams,
          q,
        });

    if (!primary.ok) {
      return jsonResponse({ error: `Geocoding non disponibile (HTTP ${primary.status}).` }, { status: 502 });
    }

    let list = primary.data;

    // If we have a city but results don't match it well, try a bounded search within the city's bounding box.
    if (effectiveCity) {
      const hasAnyCityMatch = list.some((row) => {
        const addr = (row?.address && typeof row.address === 'object')
          ? (row.address as Record<string, unknown>)
          : null;
        const rowCity = pickCityFromAddressObject(addr);
        const nRowCity = normalizeText(rowCity);
        const nDisplayName = normalizeText(row?.display_name);
        return (nRowCity && (nRowCity.includes(normalizedCity) || normalizedCity.includes(nRowCity)))
          || (nDisplayName && nDisplayName.includes(normalizedCity));
      });

      if (!hasAnyCityMatch) {
        const cityOnly = await nominatimSearch({
          ...baseParams,
          limit: '1',
          city: effectiveCity,
          country,
        });

        const cityBest = cityOnly.ok ? cityOnly.data[0] : null;
        const bb = Array.isArray(cityBest?.boundingbox) ? (cityBest?.boundingbox as Array<unknown>) : null;

        // boundingbox is [south, north, west, east]
        const south = bb?.[0] != null ? String(bb[0]) : '';
        const north = bb?.[1] != null ? String(bb[1]) : '';
        const west = bb?.[2] != null ? String(bb[2]) : '';
        const east = bb?.[3] != null ? String(bb[3]) : '';

        if (south && north && west && east) {
          const bounded = await nominatimSearch({
            ...baseParams,
            street,
            country,
            viewbox: `${west},${north},${east},${south}`,
            bounded: '1',
          });
          if (bounded.ok && bounded.data.length > 0) {
            list = bounded.data;
          }
        }
      }
    }

    const scored = list
      .map((row) => {
        const addr = (row?.address && typeof row.address === 'object')
          ? (row.address as Record<string, unknown>)
          : null;
        const rowCity = pickCityFromAddressObject(addr);
        const nRowCity = normalizeText(rowCity);
        const nDisplayName = normalizeText(row?.display_name);

        let score = 0;
        if (normalizedCity) {
          if (nRowCity === normalizedCity) score += 50;
          else if (nRowCity.includes(normalizedCity) || normalizedCity.includes(nRowCity)) score += 35;
          else if (nDisplayName.includes(normalizedCity)) score += 20;
        }

        const countryCode = normalizeText(addr?.country_code);
        if (countryCode === 'it') score += 10;

        const importance = typeof row?.importance === 'number' ? row.importance : Number(row?.importance);
        if (Number.isFinite(importance)) score += Math.min(importance * 10, 10);

        return { row, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.row ?? null;

    const lat = best?.lat ? Number(best.lat) : null;
    const lng = best?.lon ? Number(best.lon) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return jsonResponse({ error: 'Indirizzo non trovato. Prova ad aggiungere numero civico e città.' }, { status: 404 });
    }

    const displayName = safeString(best?.display_name).trim();
    return jsonResponse({ result: { lat, lng, display_name: displayName } });
  } catch (error) {
    const msg = (error as Error)?.message ?? 'errore sconosciuto';
    return jsonResponse({ error: `Errore geocoding: ${msg}` }, { status: 500 });
  }
});
