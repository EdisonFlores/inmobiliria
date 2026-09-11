const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURPOSES = new Set(['property_interest', 'general', 'seller']);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function validateRequestBody(value) {
  if (!value || typeof value !== 'object') throw new Error('Solicitud inválida.');
  const purpose = PURPOSES.has(value.purpose) ? value.purpose : 'property_interest';
  const items = Array.isArray(value.items) ? value.items : [];
  if (items.length > 20) throw new Error('Puedes consultar hasta 20 propiedades a la vez.');
  if (purpose === 'property_interest' && items.length === 0) throw new Error('Selecciona una propiedad.');
  if (purpose !== 'property_interest' && items.length !== 0) throw new Error('La selección no corresponde al tipo de contacto.');

  const normalized = items.map(item => {
    if (!item || !['property', 'lot'].includes(item.kind) || !UUID.test(item.id || '')) {
      throw new Error('La selección contiene información inválida.');
    }
    return { kind: item.kind, id: item.id.toLowerCase() };
  });
  if (new Set(normalized.map(item => `${item.kind}:${item.id}`)).size !== normalized.length) {
    throw new Error('La selección contiene elementos repetidos.');
  }
  if (typeof value.turnstileToken !== 'string' || value.turnstileToken.length < 10 || value.turnstileToken.length > 2048) {
    throw new Error('Completa la verificación de seguridad.');
  }
  return { purpose, items: normalized, turnstileToken: value.turnstileToken };
}

async function verifyTurnstile(token, request, secret) {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  form.set('idempotency_key', crypto.randomUUID());
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.action === 'contact';
}

async function allowContactForClient(request, secret) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return true;
  const fingerprintBytes = new TextEncoder().encode(`${secret}:${ip}`);
  const fingerprintHash = await crypto.subtle.digest('SHA-256', fingerprintBytes);
  const fingerprint = [...new Uint8Array(fingerprintHash)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  const key = new Request(new URL(`/__contact-rate-limit/${fingerprint}`, request.url).toString());
  if (await caches.default.match(key)) return false;
  await caches.default.put(key, new Response('1', {
    headers: { 'Cache-Control': 'max-age=30' },
  }));
  return true;
}

async function createContact(env, request, body) {
  const isGeneral = body.items.length === 0;
  const rpc = isGeneral
    ? body.purpose === 'seller' ? 'create_public_seller_contact' : 'create_public_general_contact'
    : 'create_public_client_contact';
  const propertyIds = body.items.filter(item => item.kind === 'property').map(item => item.id);
  const lotIds = body.items.filter(item => item.kind === 'lot').map(item => item.id);
  const origin = new URL(request.url).origin;
  const rpcBody = isGeneral ? {} : {
    p_property_ids: propertyIds,
    p_lot_ids: lotIds,
    p_public_base_url: origin,
  };
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rpcBody),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Contact RPC failed', { status: response.status, code: result.code });
    throw new Error('No se pudo registrar el contacto.');
  }
  return result;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405, { Allow: 'POST' });
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'El servicio de contacto todavía no está configurado.' }, 503);
  }
  try {
    const body = validateRequestBody(await request.json());
    const verified = await verifyTurnstile(body.turnstileToken, request, env.TURNSTILE_SECRET_KEY);
    if (!verified) return json({ error: 'La verificación de seguridad no fue válida. Inténtalo nuevamente.' }, 403);
    if (!await allowContactForClient(request, env.TURNSTILE_SECRET_KEY)) {
      return json(
        { error: 'Espera 30 segundos antes de iniciar otro contacto.' },
        429,
        { 'Retry-After': '30' },
      );
    }
    return json(await createContact(env, request, body));
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 422;
    return json({ error: status === 400 ? 'La solicitud no contiene JSON válido.' : error.message }, status);
  }
}
