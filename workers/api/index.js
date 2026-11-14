const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const ALLOWED_TYPES = new Set(['work-orders','materials','production','equipment','settings','schedule','workers','documents','quotes','invoices','field-work','finished-products','tools','purchases','costs']);
const WORKER_READ_KEYS = new Set(['kamen-app-work-orders-v1','kamen-app-materials-v1','kamen-app-production-stages-v1','kamen-app-schedule-v1','kamen-app-saw-assignments-v1','kamen-app-equipment-register-v1']);
const WORKER_WRITE_KEYS = new Set(['kamen-app-production-stages-v1','kamen-app-schedule-v1','kamen-app-saw-assignments-v1']);
const OWNER_ONLY_TYPES = new Set(['materials','settings','equipment','quotes','invoices','purchases','costs','finished-products']);
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type', 'vary': 'Origin' };
}
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function verifyAccess(request, env) {
  const domain = String(env.ACCESS_TEAM_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const audience = String(env.ACCESS_AUD || '');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!domain || !audience || !token) throw new Error('ACCESS_NOT_CONFIGURED');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('INVALID_ACCESS_TOKEN');
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('INVALID_ACCESS_TOKEN');
  const issuer = 'https://' + domain;
  if (claims.iss !== issuer || !Array.isArray(claims.aud) || !claims.aud.includes(audience) || !claims.sub || !claims.email || claims.exp * 1000 <= Date.now()) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }
  const keysResponse = await fetch(issuer + '/cdn-cgi/access/certs', { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!keysResponse.ok) throw new Error('ACCESS_KEYS_UNAVAILABLE');
  const keys = await keysResponse.json();
  const jwk = (keys.keys || []).find(key => key.kid === header.kid);
  if (!jwk) throw new Error('INVALID_ACCESS_TOKEN');
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const signatureValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, decodeBase64Url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!signatureValid) throw new Error('INVALID_ACCESS_TOKEN');
  return claims;
}
async function memberFor(request, env) {
  const claims = await verifyAccess(request, env);
  const member = await env.DB.prepare(
    'SELECT m.company_id, m.identity_subject, m.email, m.display_name, m.role, c.name AS company_name, c.status AS company_status FROM company_memberships m JOIN companies c ON c.id=m.company_id WHERE m.active=1 AND c.status=\'active\' AND (m.identity_subject=? OR lower(m.email)=lower(?)) LIMIT 1'
  ).bind(claims.sub, claims.email).first();
  if (!member) throw new Error('MEMBERSHIP_REQUIRED');
  return { claims, member };
}
function canRead(type, role) {
  return role === 'owner' || role === 'manager' || (role === 'worker' && ['work-orders','production','schedule','documents'].includes(type));
}
function canWrite(type, role) {
  if (role === 'owner' || role === 'manager') return true;
  return role === 'worker' && type === 'production';
}
function redactForWorker(value) {
  if (Array.isArray(value)) return value.map(redactForWorker);
  if (!value || typeof value !== 'object') return value;
  const hidden = /price|cost|margin|profit|iban|oib|salary|hourlyRate|purchaseValue/i;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !hidden.test(key)).map(([key, item]) => [key, redactForWorker(item)]));
}
async function readBody(request, maxBytes = MAX_BODY_BYTES) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('BODY_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('BODY_TOO_LARGE');
  try { return JSON.parse(text); } catch { throw new Error('INVALID_JSON'); }
}
function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}
async function bootstrap(request, env) {
  const claims = await verifyAccess(request, env);
  if (!env.BOOTSTRAP_EMAIL || String(claims.email).toLowerCase() !== String(env.BOOTSTRAP_EMAIL).toLowerCase()) return response({ error: 'Nije dopušteno prvo postavljanje tvrtke.' }, 403);
  const body = await readBody(request, 16 * 1024);
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  if (name.length < 2 || !slug) return response({ error: 'Unesi valjan naziv tvrtke.' }, 400);
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM companies').first();
  if (Number(count?.count || 0) !== 0) return response({ error: 'Početno postavljanje već je iskorišteno.' }, 409);
  const id = crypto.randomUUID();
  const subject = String(claims.sub || claims.email);
  const statements = [
    env.DB.prepare('INSERT INTO companies (id,name,slug) VALUES (?,?,?)').bind(id,name,slug),
    env.DB.prepare('INSERT INTO company_memberships (company_id,identity_subject,email,display_name,role) VALUES (?,?,?,?,\'owner\')').bind(id,subject,claims.email,claims.name || claims.email)
  ];
  await env.DB.batch(statements);
  return response({ company: { id, name, slug }, role: 'owner' }, 201);
}
async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') return response({ ok: true, service: 'kamen-app-api', storage: 'D1' });
  if (path === '/api/bootstrap' && request.method === 'POST') return bootstrap(request, env);
  const { claims, member } = await memberFor(request, env);
  if (path === '/api/me' && request.method === 'GET') return response({ user: { email: member.email, displayName: member.display_name, role: member.role }, company: { id: member.company_id, name: member.company_name } });

  if (path === '/api/records' && request.method === 'GET') {
    const type = String(url.searchParams.get('type') || '');
    if (!ALLOWED_TYPES.has(type) || !canRead(type, member.role)) return response({ error: 'Nije dopušten pristup ovoj vrsti podataka.' }, 403);
    const rows = await env.DB.prepare('SELECT record_id,payload,version,updated_at FROM app_records WHERE company_id=? AND record_type=? ORDER BY updated_at DESC')
      .bind(member.company_id,type).all();
    const records = (rows.results || []).map(row => {
      const payload = JSON.parse(row.payload);
      return { id: row.record_id, payload: member.role === 'worker' ? redactForWorker(payload) : payload, version: row.version, updatedAt: row.updated_at };
    });
    return response({ records });
  }

  if (path.startsWith('/api/records/') && request.method === 'PUT') {
    const [, , , rawType, ...rawId] = path.split('/');
    const type = decodeURIComponent(rawType || '');
    const id = decodeURIComponent(rawId.join('/') || '');
    if (!id || id.length > 180 || !ALLOWED_TYPES.has(type) || !canWrite(type, member.role)) return response({ error: 'Nije dopuštena izmjena ovog zapisa.' }, 403);
    const body = await readBody(request);
    if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) return response({ error: 'Zapis mora biti objekt.' }, 400);
    const current = await env.DB.prepare('SELECT version FROM app_records WHERE company_id=? AND record_type=? AND record_id=?')
      .bind(member.company_id,type,id).first();
    const expected = Number(body.version || 0);
    const actual = Number(current?.version || 0);
    if (expected !== actual) return response({ error: 'CONFLICT', expected, actual }, 409);
    const nextVersion = actual + 1;
    const now = new Date().toISOString();
    const payload = JSON.stringify(body.payload);
    const batch = [
      env.DB.prepare('INSERT INTO app_records (company_id,record_type,record_id,payload,version,updated_by,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(company_id,record_type,record_id) DO UPDATE SET payload=excluded.payload,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE app_records.version=?')
        .bind(member.company_id,type,id,payload,nextVersion,claims.sub,now,expected),
      env.DB.prepare('INSERT INTO audit_log (id,company_id,actor_subject,action,record_type,record_id,after_payload,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),member.company_id,claims.sub,'upsert',type,id,payload,now)
    ];
    await env.DB.batch(batch);
    return response({ id, version: nextVersion, updatedAt: now });
  }

  if (path === '/api/memberships' && request.method === 'GET') {
    if (!['owner','manager'].includes(member.role)) return response({ error: 'Samo vlasnik ili voditelj mogu pregledavati članove tvrtke.' }, 403);
    const rows = await env.DB.prepare('SELECT email,display_name,role,active,created_at,updated_at FROM company_memberships WHERE company_id=? ORDER BY CASE role WHEN \'owner\' THEN 0 WHEN \'manager\' THEN 1 ELSE 2 END, lower(email)')
      .bind(member.company_id).all();
    return response({ members: rows.results || [] });
  }

  if (path === '/api/memberships' && request.method === 'POST') {
    if (!['owner','manager'].includes(member.role)) return response({ error: 'Nemaš ovlasti za dodavanje članova.' }, 403);
    const body = await readBody(request, 16 * 1024);
    const email = String(body.email || '').trim().toLowerCase();
    const displayName = String(body.displayName || '').trim().slice(0,120);
    const role = String(body.role || 'worker');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['worker','manager'].includes(role)) return response({ error: 'Unesi valjanu e-mail adresu i ulogu radnika ili voditelja.' }, 400);
    if (member.role === 'manager' && role !== 'worker') return response({ error: 'Voditelj može dodavati samo radnike.' }, 403);
    const existing = await env.DB.prepare('SELECT identity_subject,role FROM company_memberships WHERE company_id=? AND lower(email)=lower(?) LIMIT 1')
      .bind(member.company_id,email).first();
    if (existing?.role === 'owner') return response({ error: 'Vlasnički račun ne može se promijeniti kroz pozivnicu.' }, 409);
    const subject = existing?.identity_subject || email;
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO company_memberships (company_id,identity_subject,email,display_name,role,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(company_id,identity_subject) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,role=excluded.role,active=1,updated_at=excluded.updated_at')
        .bind(member.company_id,subject,email,displayName,role,now,now),
      env.DB.prepare('INSERT INTO audit_log (id,company_id,actor_subject,action,record_type,record_id,after_payload,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),member.company_id,claims.sub,'membership_invite','company_memberships',email,JSON.stringify({email,displayName,role}),now)
    ]);
    return response({ member: { email, displayName, role, active: 1 }, signIn: 'Član se prijavljuje istom e-mail adresom putem Cloudflare jednokratnog koda.' }, 201);
  }

  if (path.startsWith('/api/memberships/') && request.method === 'DELETE') {
    if (!['owner','manager'].includes(member.role)) return response({ error: 'Nemaš ovlasti za uklanjanje članova.' }, 403);
    const email = decodeURIComponent(path.slice('/api/memberships/'.length)).trim().toLowerCase();
    const target = await env.DB.prepare('SELECT identity_subject,role FROM company_memberships WHERE company_id=? AND lower(email)=lower(?) AND active=1 LIMIT 1')
      .bind(member.company_id,email).first();
    if (!target) return response({ error: 'Aktivni član nije pronađen.' }, 404);
    if (member.role === 'manager' && target.role !== 'worker') return response({ error: 'Voditelj može deaktivirati samo radnike.' }, 403);
    if (target.role === 'owner') {
      const owners = await env.DB.prepare('SELECT COUNT(*) AS count FROM company_memberships WHERE company_id=? AND role=\'owner\' AND active=1').bind(member.company_id).first();
      if (Number(owners?.count || 0) <= 1) return response({ error: 'Tvrtka mora imati barem jednog aktivnog vlasnika.' }, 409);
    }
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('UPDATE company_memberships SET active=0,updated_at=? WHERE company_id=? AND identity_subject=?').bind(now,member.company_id,target.identity_subject),
      env.DB.prepare('INSERT INTO audit_log (id,company_id,actor_subject,action,record_type,record_id,after_payload,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),member.company_id,claims.sub,'membership_deactivated','company_memberships',email,JSON.stringify({email,active:false}),now)
    ]);
    return response({ email, active: false });
  }

  if (path === '/api/state/status' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT record_id,version,updated_at FROM app_records WHERE company_id=? AND record_type=\'browser_state\' ORDER BY record_id')
      .bind(member.company_id).all();
    return response({ count: result.results?.length || 0, keys: (result.results || []).map(row => row.record_id), updatedAt: result.results?.[0]?.updated_at || null });
  }

  if (path === '/api/state' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT record_id,payload,version,updated_at FROM app_records WHERE company_id=? AND record_type=\'browser_state\' ORDER BY record_id')
      .bind(member.company_id).all();
    const records = (rows.results || []).filter(row => member.role !== 'worker' || WORKER_READ_KEYS.has(row.record_id))
      .map(row => ({ key: row.record_id, value: JSON.parse(row.payload), version: row.version, updatedAt: row.updated_at }));
    return response({ records });
  }

  if (path === '/api/state/import' && request.method === 'POST') {
    if (!['owner','manager'].includes(member.role)) return response({ error: 'Samo vlasnik ili voditelj mogu prenijeti početne podatke.' }, 403);
    const body = await readBody(request, 8 * 1024 * 1024);
    const records = Array.isArray(body.records) ? body.records : [];
    if (!records.length || records.length > 100) return response({ error: 'Prenos mora sadržavati 1–100 zapisa.' }, 400);
    const current = await env.DB.prepare('SELECT COUNT(*) AS count FROM app_records WHERE company_id=? AND record_type=\'browser_state\'').bind(member.company_id).first();
    if (Number(current?.count || 0) !== 0) return response({ error: 'Zajednička pohrana već sadrži podatke. Početni uvoz nije ponovljen.' }, 409);
    const clean = records.filter(item => typeof item.key === 'string' && item.key.startsWith('kamen-app-') && !/(token|secret|password|auth-session)/i.test(item.key));
    if (!clean.length || clean.length !== records.length) return response({ error: 'Uvoz sadrži nedopuštene ili osjetljive ključeve.' }, 400);
    const now = new Date().toISOString();
    const statements = clean.flatMap(item => {
      const payload = JSON.stringify(item.value);
      if (payload === undefined) throw new Error('INVALID_STATE_VALUE');
      return [
        env.DB.prepare('INSERT INTO app_records (company_id,record_type,record_id,payload,version,updated_by,created_at,updated_at) VALUES (?,?,?,?,1,?,?,?)')
          .bind(member.company_id,'browser_state',item.key,payload,claims.sub,now,now),
        env.DB.prepare('INSERT INTO audit_log (id,company_id,actor_subject,action,record_type,record_id,after_payload,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(),member.company_id,claims.sub,'initial_import','browser_state',item.key,payload,now)
      ];
    });
    await env.DB.batch(statements);
    return response({ imported: clean.length, updatedAt: now }, 201);
  }

  if (path.startsWith('/api/state/') && request.method === 'PUT') {
    const key = decodeURIComponent(path.slice('/api/state/'.length));
    const workerAllowed = WORKER_WRITE_KEYS.has(key);
    if (!key.startsWith('kamen-app-') || /(token|secret|password|auth-session)/i.test(key) || (member.role === 'worker' && !workerAllowed) || !['owner','manager','worker'].includes(member.role)) {
      return response({ error: 'Nije dopuštena izmjena ovog zapisa.' }, 403);
    }
    const body = await readBody(request);
    const current = await env.DB.prepare('SELECT version FROM app_records WHERE company_id=? AND record_type=\'browser_state\' AND record_id=?')
      .bind(member.company_id,key).first();
    const expected = Number(body.version || 0);
    const actual = Number(current?.version || 0);
    if (expected !== actual) return response({ error: 'CONFLICT', expected, actual }, 409);
    const payload = JSON.stringify(body.value);
    const now = new Date().toISOString();
    const nextVersion = actual + 1;
    const batch = [
      env.DB.prepare('INSERT INTO app_records (company_id,record_type,record_id,payload,version,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(company_id,record_type,record_id) DO UPDATE SET payload=excluded.payload,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE app_records.version=?')
        .bind(member.company_id,'browser_state',key,payload,nextVersion,claims.sub,now,now,expected),
      env.DB.prepare('INSERT INTO audit_log (id,company_id,actor_subject,action,record_type,record_id,after_payload,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),member.company_id,claims.sub,'sync_update','browser_state',key,payload,now)
    ];
    const results = await env.DB.batch(batch);
    if (Number(results?.[0]?.meta?.changes || 0) !== 1) return response({ error: 'CONFLICT', expected, actual }, 409);
    return response({ key, version: nextVersion, updatedAt: now });
  }

  if (path === '/api/movements' && request.method === 'POST') {
    if (!['owner','manager'].includes(member.role)) return response({ error: 'Samo vlasnik ili voditelj mogu knjižiti skladište.' }, 403);
    const body = await readBody(request, 1024 * 1024);
    const operationId = String(body.operationId || '').trim();
    const movements = Array.isArray(body.movements) ? body.movements : [];
    if (!operationId || !movements.length || movements.length > 200) return response({ error: 'Nevaljana skladišna operacija.' }, 400);
    const existing = await env.DB.prepare('SELECT result_payload FROM idempotency_keys WHERE company_id=? AND idempotency_key=?').bind(member.company_id,operationId).first();
    if (existing) return response({ duplicate: true, result: existing.result_payload ? JSON.parse(existing.result_payload) : null });
    const now = new Date().toISOString();
    const result = { operationId, movementCount: movements.length };
    const statements = [
      env.DB.prepare('INSERT INTO idempotency_keys (company_id,idempotency_key,operation_type,result_payload) VALUES (?,?,?,?)').bind(member.company_id,operationId,'inventory',JSON.stringify(result)),
      ...movements.map(item => env.DB.prepare('INSERT INTO inventory_movements (id,company_id,operation_id,material_id,order_id,movement_type,quantity,payload,actor_subject,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),member.company_id,operationId,item.materialId || null,item.orderId || null,String(item.kind || 'Promjena'),Number(item.quantity || 0),JSON.stringify(item),claims.sub,now))
    ];
    await env.DB.batch(statements);
    return response({ duplicate: false, result }, 201);
  }

  if (path === '/api/ai/extract-dimensions' && request.method === 'POST') {
    if (member.role === 'worker') return response({ error: 'AI prepoznavanje nacrta dostupno je vlasniku i voditelju.' }, 403);
    if (!env.AI) return response({ error: 'AI binding nije postavljen na razvojnom Workeru.' }, 503);
    const body = await readBody(request, 10 * 1024 * 1024);
    if (!body.imageBase64 || typeof body.imageBase64 !== 'string') return response({ error: 'Učitaj sliku nacrta (PNG, JPG ili WEBP).' }, 400);
    const bytes = decodeBase64Url(body.imageBase64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));
    if (bytes.byteLength > 8 * 1024 * 1024) return response({ error: 'Slika je prevelika (najviše 8 MB).' }, 413);
    const prompt = 'Analiziraj nacrt kamenarskog proizvoda. Izdvoji samo dimenzije komada koje su jasno vidljive. Vrati isključivo JSON oblika {"pieces":[{"name":"opis","lengthMm":0,"widthMm":0,"thicknessMm":0,"quantity":1,"confidence":0.0,"sourceText":"oznaka s nacrta"}],"notes":["..."]}. Ne izmišljaj dimenzije. Ako jedinica nije jasna, navedi napomenu. Ako je vrijednost nečitka, postavi null. Razlikuj mm i cm i sve dimenzije vrati u milimetrima.';
    const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image', image: Array.from(bytes) }] }],
      max_tokens: 1800
    });
    const raw = String(result?.response || '');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return response({ error: 'AI nije vratio čitljiv popis dimenzija.', raw: raw.slice(0,2000) }, 422);
    try {
      const parsed = JSON.parse(match[0]);
      const pieces = (Array.isArray(parsed.pieces) ? parsed.pieces : []).slice(0,100).map(piece => ({
        name: String(piece.name || 'Prepoznati komad').slice(0,120),
        lengthMm: Number.isFinite(Number(piece.lengthMm)) ? Number(piece.lengthMm) : null,
        widthMm: Number.isFinite(Number(piece.widthMm)) ? Number(piece.widthMm) : null,
        thicknessMm: Number.isFinite(Number(piece.thicknessMm)) ? Number(piece.thicknessMm) : null,
        quantity: Number.isInteger(Number(piece.quantity)) && Number(piece.quantity) > 0 ? Number(piece.quantity) : 1,
        confidence: Math.max(0,Math.min(1,Number(piece.confidence) || 0)),
        sourceText: String(piece.sourceText || '').slice(0,180)
      }));
      return response({ pieces, notes: Array.isArray(parsed.notes) ? parsed.notes.map(String).slice(0,30) : [], requiresHumanConfirmation: true });
    } catch { return response({ error: 'AI rezultat nije valjan JSON.', raw: raw.slice(0,2000) }, 422); }
  }

  if (path === '/api/documents' && request.method === 'POST') {
    if (!['owner','manager'].includes(member.role)) return response({ error: 'Nije dopušten prijenos dokumenta.' }, 403);
    if (!env.DOCUMENTS) return response({ error: 'Za spremanje nacrta potrebno je uključiti Cloudflare R2 spremište.' }, 503);
    const body = await readBody(request, 12 * 1024 * 1024);
    if (!body.fileBase64 || !body.fileName) return response({ error: 'Nedostaje datoteka.' }, 400);
    const bytes = decodeBase64Url(body.fileBase64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));
    if (bytes.byteLength > 10 * 1024 * 1024) return response({ error: 'Dokument je prevelik (najviše 10 MB).' }, 413);
    const id = crypto.randomUUID();
    const objectKey = member.company_id + '/' + id;
    await env.DOCUMENTS.put(objectKey, bytes, { httpMetadata: { contentType: String(body.contentType || 'application/octet-stream') } });
    await env.DB.prepare('INSERT INTO document_assets (id,company_id,object_key,file_name,content_type,size_bytes,related_record_type,related_record_id,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(id,member.company_id,objectKey,String(body.fileName).slice(0,200),String(body.contentType || 'application/octet-stream'),bytes.byteLength,String(body.relatedRecordType || ''),String(body.relatedRecordId || ''),claims.sub).run();
    return response({ id, fileName: body.fileName, sizeBytes: bytes.byteLength }, 201);
  }

  return response({ error: 'API ruta nije pronađena.' }, 404);
}
export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const result = await handleApi(request, env, ctx);
      const headers = new Headers(result.headers);
      Object.entries(cors).forEach(([key,value]) => headers.set(key,value));
      return new Response(result.body, { status: result.status, headers });
    } catch (error) {
      if (error.message === 'ACCESS_NOT_CONFIGURED') return response({ error: 'Prije korištenja mora se postaviti Cloudflare Access zaštita (team domain i audience).' }, 503);
      if (error.message === 'MEMBERSHIP_REQUIRED') return response({ error: 'Korisnik još nije povezan s tvrtkom. Potrebno je početno postavljanje tvrtke.' }, 403);
      if (error.message === 'INVALID_ACCESS_TOKEN') return response({ error: 'Prijava nije valjana ili je istekla.' }, 401);
      if (error.message === 'BODY_TOO_LARGE') return response({ error: 'Zahtjev je prevelik.' }, 413);
      if (error.message === 'INVALID_JSON') return response({ error: 'Tijelo zahtjeva nije valjan JSON.' }, 400);
      console.error('Kamen API error:', error);
      return response({ error: 'Interna pogreška poslužitelja.' }, 500);
    }
  }
};
