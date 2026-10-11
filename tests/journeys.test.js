/* Regression tests for the journeys reported in QA (pure logic, node --test).
 * Browser end-to-end versions of the same journeys are in tests/e2e_journeys.py. */
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../lib/dataset.js');
const P = require('../lib/policy.js');
const E = require('../lib/events.js');
const G = require('../lib/guards.js');
const RD = require('../lib/dates.js');

const TODAY = D.TODAY;
const gupta = D.ALL.find((b) => b.id === 'gupta');
const evalWith = (patch = {}, ledger = D.baseLedger(), network = true) => {
  const s = P.deriveBuyerSignals(Object.assign({}, gupta, patch), ledger, { today: TODAY });
  return P.evaluateCredit(s, { network }, P.POLICY, { today: TODAY, ledgerAgeHours: 1 });
};
const apply = (L, e) => E.applyRepaymentEvent(L, Object.assign({ date: TODAY, source: 'test', actor: 'test', verification: 'verified' }, e));

test('J1. The recommendation is ₹60,000 on 14 days, and approving it leaves the recommendation at exactly those values', () => {
  const before = evalWith();
  assert.equal(before.recommendedLimit, 60000); assert.equal(before.recommendedTerms, 14);
  /* approval: current values become 60,000 / 14; reference stays 1,00,000 / 30 */
  const after = evalWith({ limit: 60000, terms: 14, refTerms: 30 });
  assert.equal(after.recommendedLimit, 60000); assert.equal(after.recommendedTerms, 14);
  assert.equal(after.currentTerms, 14); assert.equal(after.referenceTerms, 30);
  assert.equal(after.action, 'hold', 'nothing left to change once approved');
});

test('J2. No compounding: re-evaluating any number of times after approval never shortens terms or lowers the limit', () => {
  let cur = { limit: 100000, terms: 30 };
  for (let k = 0; k < 6; k++) {
    const r = evalWith({ limit: cur.limit, terms: cur.terms, refTerms: 30 });
    cur = { limit: r.recommendedLimit, terms: r.recommendedTerms };
    assert.equal(cur.limit, 60000, `limit after ${k + 1} approvals`); assert.equal(cur.terms, 14, `terms after ${k + 1} approvals`);
  }
});

test('J2b. The old failure mode is gone: current terms of 14 used to step down to 7', () => {
  const r = evalWith({ limit: 60000, terms: 14 }); // refTerms defaults to the record's contract terms (30)
  assert.equal(r.recommendedTerms, 14);
  const reliableSlowing = P.evaluateCredit(Object.assign(P.deriveBuyerSignals(Object.assign({}, D.ALL.find((b) => b.id === 'sharma'), { terms: 21, refTerms: 30 }), D.baseLedger(), { today: TODAY }), { delay: 26, usual: 19, delayVsUsual: 7, trajectory: 'worse', last3: [20, 23, 26] }), { network: false }, P.POLICY, { today: TODAY });
  assert.ok([21, 30].includes(reliableSlowing.recommendedTerms), 'slowdown steps from the reference, not from already-shortened terms');
});

test('J3. Undo: a reversed increase no longer counts toward the 90-day increase cooldown', () => {
  let L = D.baseLedger();
  let r = apply(L, { type: 'CREDIT_APPROVED', buyerId: 'sethi', meta: { increase: true, limit: 160000 } }); assert.ok(r.ok); L = r.ledger;
  const ev = r.event;
  const sethi = D.ALL.find((b) => b.id === 'sethi');
  assert.equal(P.deriveBuyerSignals(sethi, L, { today: TODAY }).lastIncreaseAt, TODAY);
  r = apply(L, { type: 'CREDIT_REVERSED', buyerId: 'sethi', meta: { reverses: ev.id } }); assert.ok(r.ok); L = r.ledger;
  assert.equal(P.deriveBuyerSignals(sethi, L, { today: TODAY }).lastIncreaseAt, null);
  assert.equal(L.events.filter((e) => e.buyerId === 'sethi').length, 2, 'history keeps both the approval and the reversal');
});

test('J5. Failed ₹20,000 collection, then ₹5,000 partial: ₹15,000 remains and the invoice is not settled', () => {
  let L = D.baseLedger();
  const r = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, ref: 'plink_1' });
  assert.ok(r.ok); L = r.ledger;
  assert.equal(E.findInvoice(L, 'gupta', 'INV-24790').bal, 15000);
  assert.equal(r.event.type, 'PAYMENT_PARTIALLY_RECEIVED'); assert.equal(r.event.meta.settled, false);
});

test('J6. Paying the remaining ₹15,000 settles the invoice; the next unpaid invoice is INV-24891', () => {
  let L = D.baseLedger();
  L = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, ref: 'plink_1' }).ledger;
  const r = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 15000, ref: 'plink_2' });
  assert.ok(r.ok); L = r.ledger;
  assert.equal(E.findInvoice(L, 'gupta', 'INV-24790').bal, 0); assert.equal(r.event.meta.settled, true);
  const next = L.invoices.gupta.filter((i) => i.bal > 0).sort((a, b) => RD.toN(a.due) - RD.toN(b.due))[0];
  assert.equal(next.inv, 'INV-24891');
  assert.equal(E.outstanding(L, 'gupta'), 38400 + 20000);
});

test('J8. Overpayment and duplicate payments are rejected and leave the ledger unchanged', () => {
  let L = D.baseLedger();
  let r = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 25000, ref: 'big' });
  assert.equal(r.ok, false); assert.match(r.error, /exceeds/);
  r = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, ref: 'same' }); L = r.ledger;
  const again = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, ref: 'same' });
  assert.equal(again.ok, false); assert.match(again.error, /already applied/);
  assert.equal(E.findInvoice(L, 'gupta', 'INV-24790').bal, 15000);
  const paidOff = apply(apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 15000, ref: 'rest' }).ledger, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 1, ref: 'extra' });
  assert.equal(paidOff.ok, false, 'nothing more can be applied to a paid invoice');
});

test('J8b. A payment claim alone never verifies a payment', () => {
  const L = D.baseLedger();
  const r = apply(L, { type: 'PAYMENT_CLAIMED', buyerId: 'gupta', invoice: 'INV-24790', amount: 20000, verification: 'unverified' });
  assert.ok(r.ok); assert.equal(E.findInvoice(r.ledger, 'gupta', 'INV-24790').bal, 20000);
  const fake = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 20000, verification: 'unverified', ref: 'x' });
  assert.equal(fake.ok, false);
});

test('J9. Recovery-link minimum: invalid inputs rejected with a reason, valid edits accepted, small balances paid in full', () => {
  const bad = { '': /Enter a minimum/, 'abc': /number/, '0': /more than ₹0/, '-500': /more than ₹0/, '25000': /can’t be more than the ₹20,000/, '5000.50': /whole rupees/, '50': /at least ₹100/, '₹ 9,99,999': /can’t be more/ };
  for (const [raw, re] of Object.entries(bad)) { const v = G.linkMinimum(raw, 20000); assert.equal(v.ok, false, raw); assert.match(v.error, re, raw); }
  for (const [raw, val] of [['₹10,000', 10000], ['7500', 7500], [' 5,000 ', 5000], ['20000', 20000]]) { const v = G.linkMinimum(raw, 20000); assert.ok(v.ok, raw); assert.equal(v.value, val); }
  assert.equal(G.linkMinimum('20000', 20000).partial, false);
  const small = G.linkMinimum('1000', 3500); assert.ok(small.ok); assert.equal(small.value, 3500); assert.equal(small.partial, false); assert.match(small.note, /below ₹5,000/);
  assert.equal(G.linkMinimum('1000', 0).ok, false);
});

test('J12. Send safeguards: claim, unmatched review, paid, dispute, DNC, weekly limit, quiet hours, pause, stale, channel and approval', () => {
  const now = RD.istMs(TODAY, 11 * 60);
  const base = { buyer: { id: 'b1', name: 'Test Stores' }, channel: 'whatsapp', controls: { maxPerWeek: 2, quietFrom: '8 PM', quietTo: '9 AM', dnc: [] }, ledger: {}, state: { dueAmount: 10000 }, sentLog: [], now, requireApproval: true, approvedBy: 'owner' };
  const g = (o) => G.sendGate(Object.assign({}, base, o, { controls: Object.assign({}, base.controls, o.controls || {}), state: Object.assign({}, base.state, o.state || {}) }));
  assert.equal(g({}).action, 'send');
  const cases = [
    [{ state: { claimPending: true } }, 'claim'], [{ state: { unmatchedPending: true } }, 'unmatched'], [{ state: { dueAmount: 0 } }, 'paid'],
    [{ state: { disputed: 10000 } }, 'dispute'], [{ controls: { dnc: ['Test Stores'] } }, 'dnc'], [{ controls: { paused: true } }, 'paused'],
    [{ ledger: { stale: true, ageHours: 31 } }, 'stale'], [{ controls: { wa: false } }, 'channel'], [{ approvedBy: null }, 'approval'],
    [{ sentLog: [{ buyerId: 'b1', status: 'sent', at: now - 3600e3 }, { buyerId: 'b1', status: 'sent', at: now - 7200e3 }] }, 'frequency'],
  ];
  for (const [o, code] of cases) { const r = g(o); assert.equal(r.action, 'block', code); assert.equal(r.code, code); }
  assert.equal(g({ now: RD.istMs(TODAY, 21 * 60) }).action, 'queue');
});
