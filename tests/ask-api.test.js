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
