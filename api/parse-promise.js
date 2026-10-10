/* POST /api/parse-promise  ·  Vercel Node.js serverless function
 *
 * Interprets one buyer WhatsApp message with an LLM and returns validated, structured JSON.
 * The API key stays on the server (environment variables); the browser never sees it.
 *
 * Environment variables
 *   OPENAI_API_KEY      required for live AI (OpenAI provider, default)
 *   OPENAI_MODEL        optional, default gpt-4o-mini
 *   ANTHROPIC_API_KEY   optional alternative provider
 *   ANTHROPIC_MODEL     optional, default claude-haiku-4-5
 *   AI_PROVIDER         optional: "openai" | "anthropic" (default: whichever key is set, OpenAI first)
 *   AI_TIMEOUT_MS       optional, default 12000
 *
 * GET returns { configured, provider, model } so the UI can say honestly whether live AI is available.
 * Buyer messages and amounts are never logged.
 */
const rules = require('../lib/promise-rules.js');

const MAX_BODY = 8 * 1024;
const RATE = { windowMs: 60000, max: 20 };
const hits = new Map(); // best-effort, per warm instance

function providerConfig(env = process.env) {
  const pref = (env.AI_PROVIDER || '').toLowerCase();
  if ((pref === 'anthropic' || (!pref && !env.OPENAI_API_KEY)) && env.ANTHROPIC_API_KEY) return { provider: 'anthropic', key: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || 'claude-haiku-4-5' };
  if (env.OPENAI_API_KEY && pref !== 'anthropic') return { provider: 'openai', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini' };
  return { provider: pref || 'openai', key: null, model: pref === 'anthropic' ? (env.ANTHROPIC_MODEL || 'claude-haiku-4-5') : (env.OPENAI_MODEL || 'gpt-4o-mini') };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') { if (req.body.length > MAX_BODY) throw Object.assign(new Error('too large'), { code: 413 }); return JSON.parse(req.body || '{}'); }
    if (Buffer.isBuffer(req.body)) { if (req.body.length > MAX_BODY) throw Object.assign(new Error('too large'), { code: 413 }); return JSON.parse(req.body.toString('utf8') || '{}'); }
    if (JSON.stringify(req.body).length > MAX_BODY) throw Object.assign(new Error('too large'), { code: 413 });
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy && req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(Object.assign(e, { code: 400 })); } });
    req.on('error', reject);
  });
}

function rateLimited(ip, now = Date.now()) {
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE.max;
}

async function callOpenAI(cfg, input, signal, fetchImpl) {
  const r = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model, temperature: 0, max_tokens: 600,
      response_format: { type: 'json_schema', json_schema: { name: 'payment_message_interpretation', strict: true, schema: rules.SCHEMA } },
      messages: [{ role: 'system', content: rules.SYSTEM_PROMPT }, { role: 'user', content: rules.buildUserPrompt(input) }],
    }),
  });
  if (r.status === 429) throw Object.assign(new Error('rate limited'), { code: 'RATE_LIMITED' });
  if (!r.ok) throw Object.assign(new Error('upstream ' + r.status), { code: 'UPSTREAM_ERROR', status: r.status });
  const j = await r.json();
  const msg = j && j.choices && j.choices[0] && j.choices[0].message;
  if (!msg || msg.refusal || typeof msg.content !== 'string') throw Object.assign(new Error('no content'), { code: 'INVALID_MODEL_OUTPUT' });
  try { return JSON.parse(msg.content); } catch (e) { throw Object.assign(new Error('bad json'), { code: 'INVALID_MODEL_OUTPUT' }); }
}

async function callAnthropic(cfg, input, signal, fetchImpl) {
  const r = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: cfg.model, max_tokens: 800, temperature: 0, system: rules.SYSTEM_PROMPT,
      tools: [{ name: 'record_interpretation', description: 'Record the structured interpretation of the buyer message.', input_schema: rules.SCHEMA }],
      tool_choice: { type: 'tool', name: 'record_interpretation' },
      messages: [{ role: 'user', content: rules.buildUserPrompt(input) }],
    }),
  });
  if (r.status === 429) throw Object.assign(new Error('rate limited'), { code: 'RATE_LIMITED' });
  if (!r.ok) throw Object.assign(new Error('upstream ' + r.status), { code: 'UPSTREAM_ERROR', status: r.status });
  const j = await r.json();
  const block = (j.content || []).find((b) => b.type === 'tool_use');
  if (!block || typeof block.input !== 'object') throw Object.assign(new Error('no tool output'), { code: 'INVALID_MODEL_OUTPUT' });
  return block.input;
}

/* required keys present with the right primitive types (strict schema check before semantic checks) */
function schemaErrors(o) {
  const errs = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) return ['not an object'];
  for (const k of rules.SCHEMA.required) if (!(k in o)) errs.push(`missing ${k}`);
  const P = rules.SCHEMA.properties;
  for (const [k, spec] of Object.entries(P)) {
    if (!(k in o)) continue; const v = o[k]; const types = [].concat(spec.type);
    const ok = types.some((t) => (t === 'null' && v === null) || (t === 'number' && typeof v === 'number' && isFinite(v)) || (t === 'string' && typeof v === 'string') || (t === 'boolean' && typeof v === 'boolean') || (t === 'array' && Array.isArray(v)));
    if (!ok) errs.push(`bad type for ${k}`);
    if (spec.enum && typeof v === 'string' && !spec.enum.includes(v)) errs.push(`bad value for ${k}`);
  }
  for (const k of Object.keys(o)) if (!P[k]) errs.push(`unexpected ${k}`);
  return errs;
}

async function handler(req, res, deps = {}) {
  const env = deps.env || process.env; const fetchImpl = deps.fetch || globalThis.fetch;
  const cfg = providerConfig(env);
  if (req.method === 'GET') return send(res, 200, { configured: !!cfg.key, provider: cfg.provider, model: cfg.model });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' }); }
  const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || 'local').split(',')[0].trim();
  if (rateLimited(ip)) return send(res, 429, { ok: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' });
  let body;
  try { body = await readBody(req); } catch (e) { return send(res, e.code === 413 ? 413 : 400, { ok: false, code: e.code === 413 ? 'TOO_LARGE' : 'BAD_JSON' }); }
  const errs = rules.validateRequest(body);
  if (errs.length) return send(res, 400, { ok: false, code: 'INVALID_REQUEST', errors: errs });
  const input = { message: body.message.trim(), outstanding: body.outstanding, invoiceId: body.invoiceId || null, buyerName: body.buyerName || null, messageDate: String(body.messageDate).slice(0, 10), currentDate: String(body.currentDate || body.messageDate).slice(0, 10) };
  if (!cfg.key) return send(res, 503, { ok: false, code: 'AI_NOT_CONFIGURED', message: 'Live AI is not configured on this deployment.', provider: cfg.provider, model: cfg.model });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), +(env.AI_TIMEOUT_MS || 12000));
  try {
    const raw = cfg.provider === 'anthropic' ? await callAnthropic(cfg, input, ctl.signal, fetchImpl) : await callOpenAI(cfg, input, ctl.signal, fetchImpl);
    const se = schemaErrors(raw);
    if (se.length > 3) return send(res, 502, { ok: false, code: 'INVALID_MODEL_OUTPUT', message: 'The model returned output that does not match the schema.' });
    const v = rules.validateInterpretation(raw, input);
    if (se.length) v.checks.unshift(`Model output had ${se.length} schema issue(s); corrected by deterministic checks.`);
    return send(res, 200, { ok: true, mode: 'ai', provider: cfg.provider, model: cfg.model, interpretation: v.interpretation, checks: v.checks, canConfirm: v.canConfirm, paymentVerified: false, requiresMerchantConfirmation: true });
  } catch (e) {
    const code = e.name === 'AbortError' ? 'TIMEOUT' : (e.code || 'UPSTREAM_ERROR');
    const status = code === 'TIMEOUT' ? 504 : code === 'RATE_LIMITED' ? 429 : 502;
    console.error(`[parse-promise] ${code}${e.status ? ' ' + e.status : ''}`); // no message content in logs
    return send(res, status, { ok: false, code, message: code === 'TIMEOUT' ? 'The AI provider took too long to respond.' : code === 'RATE_LIMITED' ? 'The AI provider is rate limiting requests.' : code === 'INVALID_MODEL_OUTPUT' ? 'The model returned invalid output.' : 'The AI provider could not be reached.' });
  } finally { clearTimeout(timer); }
}

module.exports = handler;
module.exports.handler = handler;
module.exports.providerConfig = providerConfig;
module.exports.schemaErrors = schemaErrors;
module.exports._resetRateLimit = () => hits.clear();
