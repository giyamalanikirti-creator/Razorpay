/* Payment reversal: PAYMENT_REVERSED is a compensating event. The original payment is never edited or deleted. */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../lib/events.js');
const P = require('../lib/policy.js');
const D = require('../lib/dataset.js');

const day = '2026-10-05';
const ledger = () => D.baseLedger();
const pay = (L, buyerId, invoice, amount, ref, extra = {}) => E.applyRepaymentEvent(L, Object.assign({ type: 'PAYMENT_RECEIVED', buyerId, invoice, amount, verification: 'verified', ref, date: day, source: 'test', actor: 'test' }, extra));
const rev = (L, o, reason = 'Amount entered incorrectly', extra = {}) => E.applyRepaymentEvent(L, Object.assign({ type: 'PAYMENT_REVERSED', buyerId: o.buyerId, invoice: o.invoice, amount: o.amount, date: day, source: 'Merchant correction', actor: 'Owner', meta: { reverses: o.id, reason } }, extra));
const bal = (L, id, inv) => E.findInvoice(L, id, inv).bal;

test('Valid reversal restores the balance and keeps the original payment in the log', () => {
  let L = ledger(); const a = pay(L, 'gupta', 'INV-24790', 5000, 'r-1'); L = a.ledger; assert.equal(bal(L, 'gupta', 'INV-24790'), 15000);
  const r = rev(L, a.event); assert.ok(r.ok, r.error); L = r.ledger;
  assert.equal(bal(L, 'gupta', 'INV-24790'), 20000);
  assert.ok(L.events.some((e) => e.id === a.event.id && e.type === 'PAYMENT_PARTIALLY_RECEIVED'), 'original kept');
  assert.equal(r.event.meta.balanceBefore, 15000); assert.equal(r.event.meta.balanceAfter, 20000);
  assert.ok(E.isReversed(L, a.event.id));
});
test('Duplicate reversal is rejected and changes nothing', () => {
  let L = ledger(); const a = pay(L, 'gupta', 'INV-24790', 5000, 'r-2'); L = rev(a.ledger, a.event).ledger;
  const again = rev(L, a.event); assert.equal(again.ok, false); assert.match(again.error, /already reversed/);
  assert.equal(bal(again.ledger, 'gupta', 'INV-24790'), 20000);
});
test('Unknown payment, non-payment events, wrong amount, wrong invoice and a missing reason are rejected', () => {
  let L = ledger(); const a = pay(L, 'gupta', 'INV-24790', 5000, 'r-3'); L = a.ledger;
  assert.match(rev(L, Object.assign({}, a.event, { id: 'ev-9999' })).error, /not found/);
  const claim = E.applyRepaymentEvent(L, { type: 'PAYMENT_CLAIMED', buyerId: 'gupta', invoice: 'INV-24891', amount: 1000, date: day, source: 't', actor: 't' });
  assert.match(rev(claim.ledger, claim.event).error, /not a recorded payment/);
  assert.match(rev(L, Object.assign({}, a.event, { amount: 4000 })).error, /must equal the original/);
  assert.match(rev(L, Object.assign({}, a.event, { invoice: 'INV-24891' })).error, /match the original/);
  assert.match(rev(L, a.event, '').error, /reason/);
});
test('Partial payment reversal and multiple payments on one invoice: only the reversed one comes back', () => {
  let L = ledger(); const a = pay(L, 'gupta', 'INV-24790', 5000, 'm-1'); L = a.ledger; const b = pay(L, 'gupta', 'INV-24790', 15000, 'm-2'); L = b.ledger;
  assert.equal(bal(L, 'gupta', 'INV-24790'), 0);
  L = rev(L, a.event).ledger; assert.equal(bal(L, 'gupta', 'INV-24790'), 5000, 'reversing the ₹5,000 after full recovery reopens ₹5,000');
  L = rev(L, b.event).ledger; assert.equal(bal(L, 'gupta', 'INV-24790'), 20000);
});
test('A reversal can never take an invoice above its amount (stale or conflicting state is rejected)', () => {
  let L = ledger(); const a = pay(L, 'gupta', 'INV-24790', 5000, 's-1'); L = a.ledger;
  const inv = E.findInvoice(L, 'gupta', 'INV-24790'); inv.bal = 20000; // simulate a conflicting later correction outside the ledger
  const r = rev(L, a.event); assert.equal(r.ok, false); assert.match(r.error, /above its invoice amount/);
});
test('A reference becomes reusable only after its payment is reversed (correction = reverse + re-record)', () => {
  let L = ledger(); const a = pay(L, 'gupta', 'INV-24790', 5000, 'utr-77'); L = a.ledger;
  assert.match(pay(L, 'gupta', 'INV-24891', 5000, 'utr-77').error, /already applied/);
  L = rev(L, a.event, 'Recorded against the wrong invoice or buyer').ledger;
  const c = pay(L, 'gupta', 'INV-24891', 5000, 'utr-77'); assert.ok(c.ok, c.error);
  assert.equal(bal(c.ledger, 'gupta', 'INV-24790'), 20000); assert.equal(bal(c.ledger, 'gupta', 'INV-24891'), 33400);
});
test('A payment split across invoices is one reversal group', () => {
  let L = ledger(); const meta = { allocation: 'NEFT-1' };
  const a = pay(L, 'gupta', 'INV-24790', 20000, 'NEFT-1#1', { meta: Object.assign({ part: 1 }, meta) }); L = a.ledger;
  const b = pay(L, 'gupta', 'INV-24891', 10000, 'NEFT-1#2', { meta: Object.assign({ part: 2 }, meta) }); L = b.ledger;
  const g = E.reversalGroup(L, a.event.id); assert.deepEqual(g.map((e) => e.id).sort(), [a.event.id, b.event.id].sort());
  assert.deepEqual(E.reversalGroup(ledger(), 'ev-x'), []);
});
test('Policy ignores reversed payments: a reversed settlement is not on-time evidence', () => {
  const rec = D.FEATURED.find((b) => b.id === 'gupta');
  let L = ledger(); const before = P.deriveBuyerSignals(rec, L, { today: day });
  const a = pay(L, 'gupta', 'INV-24790', 20000, 'p-1'); L = a.ledger;
  const paid = P.deriveBuyerSignals(rec, L, { today: day }); assert.equal(paid.invoicesPaid, before.invoicesPaid + 1);
  L = rev(L, a.event).ledger; const after = P.deriveBuyerSignals(rec, L, { today: day });
  assert.equal(after.invoicesPaid, before.invoicesPaid); assert.equal(after.verifiedPayments, before.verifiedPayments); assert.equal(after.out, before.out); assert.equal(after.paymentsReversed, 1);
});
test('A promise "kept" outcome reopened by a reversal no longer counts as kept', () => {
  const rec = D.FEATURED.find((b) => b.id === 'gupta'); let L = ledger();
  const k = E.applyRepaymentEvent(L, { type: 'PROMISE_KEPT', buyerId: 'gupta', invoice: 'INV-24891', date: day, source: 't', actor: 'RAY', meta: { promiseId: 'pr-1' } }); L = k.ledger;
  const kept = P.deriveBuyerSignals(rec, L, { today: day }).promises.kept;
  L = E.applyRepaymentEvent(L, { type: 'PROMISE_REOPENED', buyerId: 'gupta', invoice: 'INV-24891', date: day, source: 't', actor: 'RAY', meta: { reverses: k.event.id } }).ledger;
  assert.equal(P.deriveBuyerSignals(rec, L, { today: day }).promises.kept, kept - 1);
});
