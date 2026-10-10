/* /api/parse-promise with a mocked provider. No network, no API key needed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/parse-promise.js');

function mockRes() { const r = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = JSON.parse(b); } }; return r; }
const body = { message: 'Aadha abhi bhej raha hoon, baaki Monday pakka.', outstanding: 38400, invoiceId: 'INV-24891', buyerName: 'Gupta Traders', messageDate: '2026-10-05' };
const good = { intent: 'promise', promisedAmountNow: 19200, firstPaymentDate: '2026-10-05', promisedAmountLater: 19200, promisedDate: '2026-10-12', currency: 'INR', isConditional: false, amountInferred: true, dateInferred: true, needsClarification: false, confidenceLabel: 'high', evidenceSpans: ['Aadha abhi', 'baaki Monday pakka'], reasoningSummary: 'Half now, rest Monday.', suggestedNextAction: 'confirm_commitment' };
const openai = (content, status = 200) => async (url, opts) => { openai.last = { url, opts }; return { ok: status < 400, status, json: async () => ({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }) }; };
const call = async (req, deps) => { handler._resetRateLimit(); const res = mockRes(); await handler(Object.assign({ method: 'POST', headers: {} }, req), res, deps); return res; };

test('GET reports configuration honestly, without exposing the key', async () => {
  const r = await call({ method: 'GET' }, { env: { OPENAI_API_KEY: 'sk-secret', OPENAI_MODEL: 'gpt-4o-mini' } });
  assert.equal(r.statusCode, 200); assert.deepEqual(r.body, { configured: true, provider: 'openai', model: 'gpt-4o-mini' });
  assert.ok(!JSON.stringify(r.body).includes('sk-secret'));
  const n = await call({ method: 'GET' }, { env: {} }); assert.equal(n.body.configured, false);
});
test('Missing API key → 503 AI_NOT_CONFIGURED (never pretends the model ran)', async () => {
  const r = await call({ body }, { env: {} }); assert.equal(r.statusCode, 503); assert.equal(r.body.code, 'AI_NOT_CONFIGURED');
});
test('Valid model output is validated and returned with mode "ai"', async () => {
  const f = openai(good); const r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: f });
  assert.equal(r.statusCode, 200); assert.equal(r.body.mode, 'ai'); assert.equal(r.body.interpretation.promisedAmountNow, 19200); assert.equal(r.body.canConfirm, true); assert.equal(r.body.paymentVerified, false);
  const sent = JSON.parse(openai.last.opts.body);
  assert.equal(sent.response_format.type, 'json_schema'); assert.equal(sent.temperature, 0);
  assert.ok(sent.messages[1].content.includes('<buyer_message>')); assert.ok(sent.messages[0].content.includes('untrusted'));
  assert.equal(openai.last.opts.headers.Authorization, 'Bearer k');
});
test('Fabricated amounts from the model are removed by deterministic checks', async () => {
  const bad = Object.assign({}, good, { promisedAmountLater: 25000 });
  const r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai(bad) });
  assert.equal(r.body.interpretation.promisedAmountLater, null); assert.equal(r.body.canConfirm, false); assert.ok(r.body.checks.length);
});
test('Invalid JSON, timeouts, rate limits and upstream errors fail safely', async () => {
  let r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai('not json') }); assert.equal(r.statusCode, 502); assert.equal(r.body.code, 'INVALID_MODEL_OUTPUT');
  r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai({ foo: 1 }) }); assert.equal(r.statusCode, 502);
  r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai(good, 429) }); assert.equal(r.statusCode, 429); assert.equal(r.body.code, 'RATE_LIMITED');
  r = await call({ body }, { env: { OPENAI_API_KEY: 'k' }, fetch: openai(good, 500) }); assert.equal(r.statusCode, 502); assert.equal(r.body.code, 'UPSTREAM_ERROR');
  const slow = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  r = await call({ body }, { env: { OPENAI_API_KEY: 'k', AI_TIMEOUT_MS: '50' }, fetch: slow }); assert.equal(r.statusCode, 504); assert.equal(r.body.code, 'TIMEOUT');
  assert.ok(!JSON.stringify(r.body).includes(body.message), 'errors never echo the buyer message');
});
test('Input validation and size limits', async () => {
  let r = await call({ body: { message: '', outstanding: 1, messageDate: '2026-10-05' } }, { env: { OPENAI_API_KEY: 'k' } }); assert.equal(r.statusCode, 400);
  r = await call({ body: JSON.stringify({ message: 'x'.repeat(9000), outstanding: 1, messageDate: '2026-10-05' }) }, { env: { OPENAI_API_KEY: 'k' } }); assert.equal(r.statusCode, 413);
  r = await call({ method: 'PUT' }, { env: {} }); assert.equal(r.statusCode, 405);
});
test('Anthropic provider (optional) uses forced tool output', async () => {
  const f = async (url, opts) => { f.last = { url, opts }; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name: 'record_interpretation', input: good }] }) }; };
  const r = await call({ body }, { env: { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'a' }, fetch: f });
  assert.equal(r.statusCode, 200); assert.equal(r.body.provider, 'anthropic'); assert.ok(f.last.url.includes('anthropic'));
  assert.equal(JSON.parse(f.last.opts.body).tool_choice.name, 'record_interpretation');
});
