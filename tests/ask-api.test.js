/* /api/ask (optional live AI for free-form questions) with a mocked provider. No network, no key needed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const ask = require('../api/ask.js');

function mockRes() { return { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = JSON.parse(b); } }; }
const call = async (req, deps) => { ask._resetRateLimit(); const res = mockRes(); await ask(Object.assign({ method: 'POST', headers: {} }, req), res, deps); return res; };
const body = { question: 'Which buyers should I worry about this week?', context: { portfolio: { buyers: 642 } } };
const openai = (content, status = 200) => async (url, opts) => { openai.last = { url, opts }; return { ok: status < 400, status, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) }; };

test('ask: GET reports configuration without exposing the key', async () => {
  const r = await call({ method: 'GET' }, { env: { OPENAI_API_KEY: 'sk-secret' } });
  assert.equal(r.body.configured, true); assert.ok(!JSON.stringify(r.body).includes('sk-secret'));
  assert.equal((await call({ method: 'GET' }, { env: {} })).body.configured, false);
});
test('ask: no key → 503 AI_NOT_CONFIGURED, so the page uses its rule-based answer', async () => {
  const r = await call({ body }, { env: {} }); assert.equal(r.statusCode, 503); assert.equal(r.body.code, 'AI_NOT_CONFIGURED');
});
test('ask: invalid requests are rejected before any provider call', async () => {
  assert.equal((await call({ body: { question: '' } }, { env: { OPENAI_API_KEY: 'k' } })).statusCode, 400);
  assert.equal((await call({ body: { question: 'x'.repeat(601), context: {} } }, { env: { OPENAI_API_KEY: 'k' } })).statusCode, 400);
});
test('ask: model output is cleaned (allowed actions only, length capped) and never changes state', async () => {
  const f = openai({ answer: 'Gupta Traders and Chawla Enterprises are slipping.', answerable: true, actions: [{ type: 'open_buyer', buyerId: 'gupta' }, { type: 'mark_paid', buyerId: 'gupta' }] });
  const r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: f });
  assert.equal(r.statusCode, 200); assert.equal(r.body.mode, 'ai'); assert.equal(r.body.changesState, false);
  assert.deepEqual(r.body.actions, [{ type: 'open_buyer', buyerId: 'gupta' }]);
  const sent = JSON.parse(openai.last.opts.body); assert.equal(sent.temperature, 0); assert.ok(sent.messages[0].content.includes('never'));
});
test('ask: provider timeout → 504 with an honest message', async () => {
  const slow = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const r = await call({ body }, { env: { OPENAI_API_KEY: 'k', AI_TIMEOUT_MS: '20' }, fetch: slow });
  assert.equal(r.statusCode, 504); assert.equal(r.body.code, 'TIMEOUT');
});
test('ask: an answer that cites rupee amounts not in the data is discarded (502 UNSUPPORTED_AMOUNT)', async () => {
  const ctx = { buyersMentioned: [{ name: 'Gupta Traders', outstanding: 78400 }] };
  let r = await call({ body: { question: 'Gupta kitna dena hai?', context: ctx } }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai({ answer: 'Gupta Traders owes ₹78,400.', answerable: true, actions: [] }) });
  assert.equal(r.statusCode, 200);
  r = await call({ body: { question: 'Gupta kitna dena hai?', context: ctx } }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai({ answer: 'Gupta Traders owes ₹91,250.', answerable: true, actions: [] }) });
  assert.equal(r.statusCode, 502); assert.equal(r.body.code, 'UNSUPPORTED_AMOUNT');
});
test('ask: 429 and 5xx from the provider are reported, never answered', async () => {
  let r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai({}, 429) }); assert.equal(r.statusCode, 429);
  r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai({}, 503) }); assert.equal(r.statusCode, 502);
});
test('ask: per-IP rate limit (in-memory, best-effort per instance)', async () => {
  ask._resetRateLimit(); let last;
  for (let k = 0; k < 21; k++) { const res = mockRes(); await ask({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body }, res, { env: {} }); last = res; }
  assert.equal(last.statusCode, 429);
});

/* ---------- Gemini provider ---------- */
const geminiAsk = (content, status = 200) => async (url, opts) => { geminiAsk.last = { url, opts }; return { ok: status < 400, status, json: async () => ({ steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(content) }] }] }) }; };

test('ask: a Gemini key answers from the data and keeps the key server-side', async () => {
  const answer = { answer: 'Four buyers are slipping this week.', answerable: true, actions: [{ type: 'open_actions', buyerId: null }] };
  const r = await call({ body }, { env: { GEMINI_API_KEY: 'k' }, fetch: geminiAsk(answer) });
  assert.equal(r.statusCode, 200); assert.equal(r.body.provider, 'gemini'); assert.equal(r.body.changesState, false);
  assert.equal(geminiAsk.last.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(geminiAsk.last.opts.headers['x-goog-api-key'], 'k');
  assert.ok(!JSON.stringify(r.body).includes('"k"'));
  const sent = JSON.parse(geminiAsk.last.opts.body);
  assert.equal(sent.response_format.mime_type, 'application/json');
  assert.ok(sent.input.includes('<question>'));
});

test('ask: an amount Gemini invented is discarded, not shown', async () => {
  const invented = { answer: 'Gupta Traders owes ₹99,999 today.', answerable: true, actions: [] };
  const r = await call({ body }, { env: { GEMINI_API_KEY: 'k' }, fetch: geminiAsk(invented) });
  assert.equal(r.body.ok, false); assert.equal(r.body.code, 'UNSUPPORTED_AMOUNT');
});
