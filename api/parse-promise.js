/* POST /api/parse-promise  ·  Vercel Node.js serverless function
 *
 * Interprets one buyer WhatsApp message with an LLM and returns validated, structured JSON.
 * The API key stays on the server (environment variables); the browser never sees it.
 *
 * Environment variables
 *   OPENAI_API_KEY      required for live AI (OpenAI provider, default)
 *   OPENAI_MODEL        optional, default gpt-4o-mini
 *   ANTHROPIC_API_KEY   optional alternative provider
 *   ANTHROPIC_MODEL     optional, default claude-haiku-5-5
 *   GEMINI_API_KEY      optional alternative provider (Google AI Studio; has a free tier)
 *   GEMINI_MODEL        optional, default gemini-3.5-flash-lite
 *   AI_PROVIDER         optional: "openai" | "anthropic" | "gemini" (default: whichever key is set, OpenAI first)
 *   AI_TIMEOUT_MS       optional, default 12000
 *
 * GET returns { configured, provider, model } so the UI can say honestly whether live AI is available.
 * Buyer messages and amounts are never logged.
 * Rate limit: 20 requests/minute per IP, in memory per warm serverless instance (best-effort: instances do not
 * share counts and a cold start resets them). Production needs a shared store such as Redis/KV.
 */
const rules = require('../lib/promise-rules.js');

const MAX_BODY = 8 * 1024;
const RATE = { windowMs: 60000, max: 20 };
const hits = new Map(); // best-effort, per warm instance

/* Which provider to call. An explicit AI_PROVIDER wins; otherwise the first key present, OpenAI → Anthropic →
   Gemini. With no key at all, the shape is still returned so GET can report the model it would use. */
const MODEL_DEFAULT = { openai: 'gpt-4o-mini', anthropic: 'claude-haiku-5-5', gemini: 'gemini-3.5-flash-lite' };
const KEY_ENV = { openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' };
const MODEL_ENV = { openai: 'OPENAI_MODEL', anthropic: 'ANTHROPIC_MODEL', gemini: 'GEMINI_MODEL' };
function providerConfig(env = process.env) {
  const pref = (env.AI_PROVIDER || '').toLowerCase();
  const of = (p) => ({ provider: p, key: env[KEY_ENV[p]] || null, model: env[MODEL_ENV[p]] || MODEL_DEFAULT[p] });
  if (MODEL_DEFAULT[pref]) return of(pref);
  for (const p of ['openai', 'anthropic', 'gemini']) if (env[KEY_ENV[p]]) return of(p);
  return of('openai');
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

/* Google AI Studio (Gemini). Interactions API with a response_format schema; the JSON comes back as text
   inside a model_output step, so the first content item that parses as JSON is used. */
async function callGemini(cfg, input, signal, fetchImpl) {
  const r = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/interactions`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
    body: JSON.stringify({
      model: cfg.model,
      system_instruction: rules.SYSTEM_PROMPT,
      input: rules.buildUserPrompt(input),
      response_format: { type: 'text', mime_type: 'application/json', schema: rules.SCHEMA },
      generation_config: { max_output_tokens: 800, seed: 7, thinking_level: 'minimal', thinking_summaries: 'none' },
    }),
  });
  if (r.status === 429) throw Object.assign(new Error('rate limited'), { code: 'RATE_LIMITED' });
  if (!r.ok) throw Object.assign(new Error('upstream ' + r.status), { code: 'UPSTREAM_ERROR', status: r.status });
  const j = await r.json();
  return geminiJson(j);
}
/* the structured payload out of an Interaction response, whatever step it lands in */
function geminiJson(j) {
  const steps = (j && j.steps) || [];
  for (const st of steps) {
    for (const c of (st && st.content) || []) {
      if (c && typeof c.text === 'string') { try { return JSON.parse(c.text); } catch (e) { /* keep looking */ } }
      if (c && c.type === 'function_call' && c.arguments && typeof c.arguments === 'object') return c.arguments;
    }
  }
  throw Object.assign(new Error('no content'), { code: 'INVALID_MODEL_OUTPUT' });
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
    const call = cfg.provider === 'anthropic' ? callAnthropic : cfg.provider === 'gemini' ? callGemini : callOpenAI;
    const raw = await call(cfg, input, ctl.signal, fetchImpl);
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
module.exports.send = send;
module.exports.readBody = readBody;
module.exports.geminiJson = geminiJson;
