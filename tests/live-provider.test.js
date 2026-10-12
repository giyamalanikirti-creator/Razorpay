/* Live provider check. Runs ONLY when OPENAI_API_KEY or ANTHROPIC_API_KEY is set; otherwise it is skipped and
 * reported as "not run". It never claims a model was tested when no key was present. */
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/parse-promise.js');
const live = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
test('LIVE provider: a real model reads a Hinglish promise and passes deterministic checks', { skip: live ? false : 'no provider key configured: live model NOT tested' }, async () => {
  handler._resetRateLimit();
  const res = { statusCode: 0, headers: {}, body: null, setHeader() {}, end(b) { this.body = JSON.parse(b); } };
  await handler({ method: 'POST', headers: {}, body: { message: 'Aadha abhi bhej raha hoon, baaki Monday pakka.', outstanding: 38400, invoiceId: 'INV-24891', messageDate: '2026-10-05' } }, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body)); assert.equal(res.body.mode, 'ai'); assert.equal(res.body.paymentVerified, false);
});
