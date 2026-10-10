/* Credit policy, event model, controls and dataset: pure-function tests (node --test). */
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../lib/dataset.js');
const P = require('../lib/policy.js');
const E = require('../lib/events.js');
const G = require('../lib/guards.js');
const RD = require('../lib/dates.js');

const TODAY = D.TODAY;
const rec = (id, { network = true, ledger = D.baseLedger(), today = TODAY, request = null, patch = {}, stale = false } = {}) => {
  const base = D.ALL.concat([D.NEW_BUYER]).find((b) => b.id === id);
  const s = P.deriveBuyerSignals(Object.assign({}, base, patch), ledger, { today });
  return { s, r: P.evaluateCredit(s, { network }, P.POLICY, { today, request, ledgerAgeHours: stale ? 31 : 1 }) };
};
const apply = (L, e) => { const r = E.applyRepaymentEvent(L, Object.assign({ date: TODAY, source: 'test', actor: 'test' }, e)); assert.ok(r.ok, r.error); return r.ledger; };

test('1. Gupta Traders, own data only: Watch, ₹75,000, 21-day terms', () => {
  const { r } = rec('gupta', { network: false });
  assert.equal(r.band, 'Watch'); assert.equal(r.recommendedLimit, 75000); assert.equal(r.recommendedTerms, 21);
  assert.equal(r.networkStep, null); assert.equal(r.riskIndex, 57); assert.equal(r.policyVersion, P.POLICY.version);
});

test('2. Gupta Traders with eligible network data: ₹60,000, 14-day terms, from the reusable −20% rule', () => {
  const { r } = rec('gupta');
  assert.equal(r.recommendedLimit, 60000); assert.equal(r.recommendedTerms, 14);
  assert.equal(r.networkStep.kind, 'corroborated'); assert.equal(r.networkStep.from, 75000); assert.equal(r.networkStep.to, 60000);
  assert.equal(r.ownData.recommendedLimit, 75000); assert.equal(r.confidence, 'High');
  assert.ok(r.guardrails.prospectiveOnly && r.guardrails.approvalRequired && r.guardrails.noAutoSuspension);
});

test('3. Network disabled, or buyer consent revoked: network evidence is excluded and the decision recalculates', () => {
  assert.equal(rec('gupta', { network: false }).r.recommendedLimit, 75000);
  let L = D.baseLedger(); L = apply(L, { type: 'CONSENT_REVOKED', buyerId: 'gupta' });
  const { r } = rec('gupta', { ledger: L });
  assert.equal(r.network.state, 'revoked'); assert.equal(r.network.eligible, false); assert.equal(r.recommendedLimit, 75000);
  assert.ok(r.missingSignals.some((m) => /revoked/i.test(m)));
});

test('4. Chawla Enterprises: Reliable on own data, Watch with network, limit held (uncorroborated rule)', () => {
  const own = rec('chawla', { network: false }).r, net = rec('chawla').r;
  assert.equal(own.band, 'Reliable'); assert.equal(net.band, 'Watch');
  assert.equal(net.recommendedLimit, 60000); assert.equal(net.action, 'hold'); assert.equal(net.networkStep.kind, 'uncorroborated');
  assert.ok(net.needsHumanReview);
});

test('5. New Life Stores, first credit without consent: starter ₹50,000, 15 days, Unrated', () => {
  const { r } = rec('newlife');
  assert.equal(r.recommendedLimit, 50000); assert.equal(r.recommendedTerms, 15); assert.equal(r.band, 'Unrated'); assert.equal(r.confidence, 'Low');
  let L = apply(D.baseLedger(), { type: 'CONSENT_DENIED', buyerId: 'newlife' });
  assert.equal(rec('newlife', { ledger: L }).r.recommendedLimit, 50000);
});

test('6. New Life Stores with valid consent: ₹1,50,000, 21 days; revocation reverts to starter', () => {
  let L = apply(D.baseLedger(), { type: 'CONSENT_REQUESTED', buyerId: 'newlife' });
  assert.equal(rec('newlife', { ledger: L }).r.network.state, 'pending');
  L = apply(L, { type: 'CONSENT_GRANTED', buyerId: 'newlife' });
  const { r } = rec('newlife', { ledger: L });
  assert.equal(r.recommendedLimit, 150000); assert.equal(r.recommendedTerms, 21); assert.equal(r.band, 'Reliable'); assert.equal(r.confidence, 'Medium');
  L = apply(L, { type: 'CONSENT_REVOKED', buyerId: 'newlife' });
  assert.equal(rec('newlife', { ledger: L }).r.recommendedLimit, 50000);
});

test('7. Positive repayment history improves the recommendation within policy limits', () => {
  const sethi = rec('sethi').r; assert.equal(sethi.action, 'increase'); assert.equal(sethi.recommendedLimit, 80000);
  const P9 = { onTimePaid: 9 }; // 90% on time
  assert.equal(rec('singhms', { patch: P9 }).r.action, 'none'); // 4 on-time eNACH collections: below the 6 needed
  let L = D.baseLedger();
  L.invoices.singhms.push({ inv: 'T-1', amt: 1000, bal: 1000, issued: '2026-09-01', due: '2026-10-01', disputed: 0 }, { inv: 'T-2', amt: 1000, bal: 1000, issued: '2026-09-02', due: '2026-10-02', disputed: 0 });
  L = apply(L, { type: 'AUTOPAY_SUCCEEDED', buyerId: 'singhms', invoice: 'T-1', amount: 1000, verification: 'verified', ref: 'a1', date: '2026-10-01' });
  L = apply(L, { type: 'AUTOPAY_SUCCEEDED', buyerId: 'singhms', invoice: 'T-2', amount: 1000, verification: 'verified', ref: 'a2', date: '2026-10-02' });
  const r = rec('singhms', { ledger: L, patch: P9 }).r;
  assert.equal(r.action, 'increase'); assert.equal(r.recommendedLimit, 55000); // +⅓ of ₹40,000, rounded to ₹5,000
  assert.ok(r.recommendedLimit <= Math.round(40000 * 4 / 3 / 5000) * 5000);
  const cool = rec('sethi', { patch: { lastIncreaseAt: '2026-09-20' } }).r; assert.equal(cool.action, 'none'); // one increase per 90 days
});

test('8. A failed Autopay updates collection state without marking a default', () => {
  let L = D.baseLedger(); const before = rec('gupta', { ledger: L });
  L = apply(L, { type: 'AUTOPAY_FAILED', buyerId: 'gupta', invoice: 'INV-24891', amount: 38400, verification: 'verified' });
  const after = rec('gupta', { ledger: L });
  assert.equal(after.s.debit.failures60d, before.s.debit.failures60d + 1);
  assert.equal(after.s.out, before.s.out, 'balance unchanged');
  assert.equal(E.findInvoice(L, 'gupta', 'INV-24891').lastFailed, TODAY);
  assert.ok(!JSON.stringify(after.r).includes('default'.toUpperCase()));
});

test('9. A verified partial payment reduces the invoice outstanding and never adds risk', () => {
  let L = D.baseLedger(); const before = rec('gupta', { ledger: L }).r;
  L = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, verification: 'verified', ref: 'pl-1' });
  assert.equal(E.findInvoice(L, 'gupta', 'INV-24790').bal, 15000);
  assert.equal(L.events[L.events.length - 1].type, 'PAYMENT_PARTIALLY_RECEIVED');
  const after = rec('gupta', { ledger: L }).r;
  assert.ok(after.riskIndex <= before.riskIndex); assert.equal(after.band, before.band);
  const dup = E.applyRepaymentEvent(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, verification: 'verified', ref: 'pl-1', date: TODAY, source: 't', actor: 't' });
  assert.equal(dup.ok, false, 'same payment cannot be applied twice');
  const over = E.applyRepaymentEvent(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 99999, verification: 'verified', ref: 'pl-2', date: TODAY, source: 't', actor: 't' });
  assert.equal(over.ok, false, 'cannot exceed outstanding');
});

test('10. An unverified payment claim does not count as received', () => {
  const L = D.baseLedger();
  const bad = E.applyRepaymentEvent(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24891', amount: 38400, verification: 'unverified', date: TODAY, source: 't', actor: 't' });
  assert.equal(bad.ok, false);
  const L2 = apply(L, { type: 'PAYMENT_CLAIMED', buyerId: 'gupta', invoice: 'INV-24891', amount: 38400, verification: 'unverified' });
  assert.equal(E.outstanding(L2, 'gupta'), 78400);
  assert.equal(rec('gupta', { ledger: L2 }).s.claimsPending, 1);
});

const gate = (over = {}) => G.sendGate(Object.assign({ buyer: { id: 'kapoor', name: 'Kapoor Stores' }, channel: 'whatsapp', controls: { wa: true, sm: true, dnc: [], maxPerWeek: 2, quietFrom: '8 PM', quietTo: '9 AM' }, ledger: { stale: false }, state: { dueAmount: 46500 }, sentLog: [], now: RD.istMs(TODAY, 9 * 60 + 15) }, over));

test('11. An existing unmatched payment blocks an inappropriate reminder', () => {
  assert.equal(gate({ state: { dueAmount: 26500, unmatchedPending: true } }).code, 'unmatched');
  assert.equal(gate({ state: { dueAmount: 26500, claimPending: true } }).code, 'claim');
  assert.equal(gate({ state: { dueAmount: 0, paid: true } }).code, 'paid');
});

test('12. A Do Not Contact buyer cannot be messaged on WhatsApp (salesperson tasks still allowed)', () => {
  const g = gate({ controls: { wa: true, sm: true, dnc: ['Kapoor Stores'], maxPerWeek: 2, quietFrom: '8 PM', quietTo: '9 AM' } });
  assert.equal(g.action, 'block'); assert.equal(g.code, 'dnc');
  assert.equal(gate({ channel: 'salesperson', controls: { wa: true, sm: true, dnc: ['Kapoor Stores'] } }).action, 'send');
  assert.equal(gate({ controls: { wa: false, sm: true, dnc: [] } }).code, 'channel');
});

test('13. Quiet hours queue the message for the next permitted window (IST)', () => {
  const g = gate({ controls: { wa: true, dnc: [], maxPerWeek: 2, quietFrom: '9 PM', quietTo: '10 AM' } });
  assert.equal(g.action, 'queue'); assert.equal(g.queueUntil, RD.istMs(TODAY, 600));
  const night = gate({ now: RD.istMs(TODAY, 22 * 60) });
  assert.equal(night.action, 'queue'); assert.equal(night.queueUntil, RD.istMs(RD.addDays(TODAY, 1), 540));
  assert.equal(gate().action, 'send');
});

test('14. The weekly reminder limit is enforced with the next eligible time', () => {
  const log = [{ buyerId: 'kapoor', status: 'sent', at: RD.istMs('2026-10-01', 630) }, { buyerId: 'kapoor', status: 'sent', at: RD.istMs('2026-10-03', 660) }];
  const g = gate({ sentLog: log });
  assert.equal(g.code, 'frequency'); assert.equal(g.nextEligibleAt, RD.istMs('2026-10-08', 630));
  assert.equal(gate({ sentLog: log, controls: { wa: true, dnc: [], maxPerWeek: 3, quietFrom: '8 PM', quietTo: '9 AM' } }).action, 'send');
});

test('16. A dispute is routed to review and is not classified as default or a missed promise', () => {
  let L = D.baseLedger(); const before = rec('singh', { ledger: L }).r;
  assert.equal(rec('singh', { ledger: L }).s.disputed, 9800);
  L = apply(L, { type: 'DISPUTE_OPENED', buyerId: 'gupta', invoice: 'INV-24790', amount: 20000 });
  const s = rec('gupta', { ledger: L }).s; assert.equal(s.maxOverdueDays, 0, 'disputed amount excluded from overdue');
  L = apply(L, { type: 'PROMISE_MISSED', buyerId: 'gupta', invoice: 'INV-24790', meta: { disputed: true } });
  assert.equal(rec('gupta', { ledger: L }).s.promises.broken, 2, 'disputed promise not counted');
  assert.ok(rec('gupta', { ledger: L }).r.reviewReasons.some((x) => /dispute/i.test(x)));
  assert.equal(before.band, 'Watch');
});

test('17. Stale data blocks unsafe execution and lowers confidence', () => {
  assert.equal(gate({ ledger: { stale: true, ageHours: 31 } }).code, 'stale');
  const r = rec('gupta', { stale: true }).r;
  assert.equal(r.freshness.stale, true); assert.ok(r.needsHumanReview); assert.notEqual(r.confidence, 'High');
});

test('18. Consequential changes are proposals that need merchant approval', () => {
  const r = rec('gupta').r;
  assert.equal(r.currentLimit, 100000, 'evaluation never changes the current limit');
  assert.equal(r.guardrails.approvalRequired, true);
  assert.equal(r.guardrails.outstandingAboveLimit, 18400);
  const after = rec('gupta', { patch: { limit: 60000, terms: 14 } }).r;
  assert.equal(after.action, 'hold', 'once the merchant applies it, nothing further is proposed');
});

test('20. Portfolio aggregates are internally consistent', () => {
  const L = D.baseLedger(); const st = D.stats(L, TODAY);
  assert.equal(st.buyers, 642); assert.equal(st.openInvoices, 1184); assert.equal(st.outstanding, 18400000);
  let sum = 0, inv = 0;
  for (const b of D.ALL) { for (const i of L.invoices[b.id]) { assert.ok(i.bal >= 0 && i.bal <= i.amt); assert.ok(i.disputed <= i.bal); sum += i.bal; inv++; } }
  assert.equal(sum, st.outstanding); assert.equal(inv, st.openInvoices);
  const bands = { Reliable: 0, Watch: 0, Risky: 0 };
  for (const b of D.ALL) bands[rec(b.id, { ledger: L }).r.band]++;
  assert.equal(bands.Reliable + bands.Watch + bands.Risky, 642);
  const names = new Set(D.ALL.map((b) => b.name)); assert.equal(names.size, 642, 'unique names');
  assert.ok(D.GENERATED.every((b) => !b.phone && !b.gstin), 'no contact details or identifiers generated');
  const netSignals = D.ALL.filter((b) => rec(b.id, { ledger: L }).r.network.eligible).length; assert.equal(netSignals, 412);
});

test('Featured scenarios match their expected bands; no buyer is special-cased', () => {
  for (const b of D.FEATURED) assert.equal(rec(b.id).r.band, b.expectedBand === 'Reliable' && b.id === 'chawla' ? 'Watch' : b.expectedBand, b.id);
  const src = require('fs').readFileSync(require.resolve('../lib/policy.js'), 'utf8');
  for (const id of ['gupta', 'chawla', 'newlife', 'sethi', 'arora', 'Gupta']) assert.ok(!src.includes(`'${id}'`), `policy mentions ${id}`);
});

test('Feedback loop: failed Autopay + partial payment + missed promise moves Gupta to Risky, ₹40,000, 7 days', () => {
  let L = D.baseLedger();
  L = apply(L, { type: 'PROMISE_RECORDED', buyerId: 'gupta', invoice: 'INV-24891', amount: 38400 });
  L = apply(L, { type: 'PAYMENT_RECEIVED', buyerId: 'gupta', invoice: 'INV-24790', amount: 5000, verification: 'verified', ref: 'x1' });
  L = apply(L, { type: 'AUTOPAY_FAILED', buyerId: 'gupta', invoice: 'INV-24891', amount: 38400, verification: 'verified', date: '2026-10-12' });
  L = apply(L, { type: 'PROMISE_MISSED', buyerId: 'gupta', invoice: 'INV-24891', amount: 19200, date: '2026-10-13' });
  const { r } = rec('gupta', { ledger: L, today: '2026-10-13' });
  assert.equal(r.band, 'Risky'); assert.equal(r.recommendedLimit, 40000); assert.equal(r.recommendedTerms, 7);
  assert.equal(rec('gupta', { ledger: L, today: '2026-10-13', network: false }).r.recommendedLimit, 50000);
});

test('Requests: verdicts come from the same decision', () => {
  const v = (id, amt, terms) => { const { s, r } = rec(id, { request: { amount: amt, terms } }); return P.requestVerdict(r, s, { amount: amt, terms }).verdict; };
  assert.equal(v('gupta', 50000), 'DO NOT EXTEND YET'); assert.equal(v('arora', 80000, 21), 'EXTEND'); assert.equal(v('mehta', 30000), 'REVIEW TERMS');
  assert.equal(rec('arora', { request: { amount: 80000, terms: 21 } }).r.recommendedLimit, 150000);
});
