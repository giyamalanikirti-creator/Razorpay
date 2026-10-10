/* Repayment event model and invoice ledger.
 *
 * applyRepaymentEvent(ledger, event) is pure: it validates the event, returns a NEW ledger with balances
 * updated and the event appended, or returns { ok:false, error } and leaves the ledger untouched.
 * Rules enforced here (and tested in tests/engine.test.js):
 *   - verified payments reduce invoice balances; they can never exceed the outstanding balance
 *   - the same payment reference can only be applied once (no double counting)
 *   - unverified payment claims (PAYMENT_CLAIMED) are recorded but never change balances
 *   - disputes mark an amount as disputed; they are not defaults
 *   - failed Autopay / eNACH debits are counted, never marked as default
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const RD = isNode ? require('./dates.js') : root.RayDates;

  const EVENT_TYPES = [
    'CREDIT_APPROVED', 'CREDIT_KEPT',
    'PROMISE_RECORDED', 'PROMISE_EDITED', 'PROMISE_KEPT', 'PROMISE_PARTIALLY_KEPT', 'PROMISE_MISSED',
    'PAYMENT_RECEIVED', 'PAYMENT_PARTIALLY_RECEIVED', 'PAYMENT_CLAIMED', 'PAYMENT_RECONCILED', 'CLAIM_REJECTED',
    'AUTOPAY_FAILED', 'AUTOPAY_SUCCEEDED',
    'DISPUTE_OPENED', 'DISPUTE_RESOLVED',
    'CONSENT_REQUESTED', 'CONSENT_GRANTED', 'CONSENT_DENIED', 'CONSENT_REVOKED',
    'NETWORK_DISPUTED', 'NETWORK_DISPUTE_RESOLVED', 'GST_VERIFIED',
  ];
  const MONEY_IN = ['PAYMENT_RECEIVED', 'PAYMENT_PARTIALLY_RECEIVED', 'PAYMENT_RECONCILED', 'AUTOPAY_SUCCEEDED'];
  const NEEDS_INVOICE = MONEY_IN.concat(['AUTOPAY_FAILED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'PAYMENT_CLAIMED']);

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const emptyLedger = () => ({ invoices: {}, events: [], refs: {}, seq: 0 });

  function findInvoice(ledger, buyerId, inv) { return ((ledger.invoices[buyerId]) || []).find((i) => i.inv === inv); }
  function outstanding(ledger, buyerId) { return ((ledger.invoices[buyerId]) || []).reduce((a, i) => a + Math.max(0, i.bal), 0); }

  function validate(ledger, e) {
    if (!e || typeof e !== 'object') return 'Event missing';
    if (!EVENT_TYPES.includes(e.type)) return `Unknown event type ${e.type}`;
    if (!e.buyerId) return 'buyerId required';
    if (!RD.isISO(e.date)) return 'date must be YYYY-MM-DD';
    if (!e.source) return 'source required';
    if (!e.actor) return 'actor required';
    if (NEEDS_INVOICE.includes(e.type)) {
      if (!e.invoice) return 'invoice reference required';
      if (!findInvoice(ledger, e.buyerId, e.invoice)) return `Invoice ${e.invoice} not found for ${e.buyerId}`;
    }
    if (MONEY_IN.includes(e.type) || e.type === 'PAYMENT_CLAIMED' || e.type === 'DISPUTE_OPENED') {
      if (typeof e.amount !== 'number' || !isFinite(e.amount) || e.amount <= 0) return 'amount must be a positive number';
    }
    if (MONEY_IN.includes(e.type)) {
      if (e.verification !== 'verified') return 'Only verified payments change balances. Record unverified payments as PAYMENT_CLAIMED.';
      const i = findInvoice(ledger, e.buyerId, e.invoice);
      if (e.amount > i.bal + 0.5) return `Amount ${e.amount} exceeds the ${i.bal} outstanding on ${e.invoice}`;
      if (e.ref && ledger.refs[e.ref]) return `Payment ${e.ref} was already applied`;
    }
    if (e.type === 'DISPUTE_OPENED') { const i = findInvoice(ledger, e.buyerId, e.invoice); if (e.amount > i.bal + 0.5) return 'Disputed amount exceeds the invoice balance'; }
    return null;
  }

  function applyRepaymentEvent(ledger, event) {
    const err = validate(ledger, event);
    if (err) return { ok: false, error: err, ledger };
    const L = clone(ledger);
    L.seq = (L.seq || 0) + 1;
    const e = Object.assign({ verification: 'n/a', meta: {} }, clone(event));
    e.id = e.id || `ev-${String(L.seq).padStart(4, '0')}`;
    const effects = [];
    const inv = e.invoice ? findInvoice(L, e.buyerId, e.invoice) : null;
    if (MONEY_IN.includes(e.type)) {
      const before = inv.bal;
      inv.bal = Math.max(0, Math.round(inv.bal - e.amount));
      if (inv.disputed) inv.disputed = Math.min(inv.disputed, inv.bal);
      if (e.ref) L.refs[e.ref] = e.id;
      e.meta.balanceBefore = before; e.meta.balanceAfter = inv.bal;
      e.meta.settled = inv.bal === 0;
      if (e.meta.settled) { e.meta.daysLate = RD.diffDays(e.date, inv.due); if (inv.issued) e.meta.daysToPay = RD.diffDays(e.date, inv.issued); }
      if (e.type === 'PAYMENT_RECEIVED' && !e.meta.settled) e.type = 'PAYMENT_PARTIALLY_RECEIVED';
      effects.push(`${e.invoice} balance ${before} → ${inv.bal}`);
    } else if (e.type === 'AUTOPAY_FAILED') {
      inv.lastFailed = e.date; effects.push(`${e.invoice} debit failed · balance unchanged · not a default`);
    } else if (e.type === 'PAYMENT_CLAIMED') {
      inv.claim = { amount: e.amount, date: e.date, id: e.id }; effects.push('Claim recorded · balance unchanged until verified');
    } else if (e.type === 'CLAIM_REJECTED') {
      const i = e.invoice ? findInvoice(L, e.buyerId, e.invoice) : null; if (i) delete i.claim; effects.push('Claim closed');
    } else if (e.type === 'DISPUTE_OPENED') {
      inv.disputed = Math.min(inv.bal, Math.round(e.amount)); effects.push(`${e.invoice} ${inv.disputed} disputed · excluded from reminders and overdue`);
    } else if (e.type === 'DISPUTE_RESOLVED') {
      const credit = Math.min(inv.bal, Math.max(0, Math.round((e.meta && e.meta.creditNote) || 0)));
      inv.bal -= credit; inv.disputed = 0; effects.push(credit ? `Credit note ${credit} applied` : 'Dispute closed');
    }
    if (e.type === 'PAYMENT_RECONCILED' && inv && inv.claim) delete inv.claim;
    L.events.push(e);
    return { ok: true, ledger: L, event: e, effects };
  }

  /* Verified payment against a buyer's oldest open invoices first (used by "record payment" simulations). */
  function allocate(ledger, buyerId, amount, preferInv) {
    const list = ((ledger.invoices[buyerId]) || []).filter((i) => i.bal > 0).slice().sort((a, b) => (a.inv === preferInv ? -1 : b.inv === preferInv ? 1 : RD.toN(a.due) - RD.toN(b.due)));
    const out = []; let left = amount;
    for (const i of list) { if (left <= 0) break; const take = Math.min(left, i.bal); out.push({ invoice: i.inv, amount: take }); left -= take; }
    return { parts: out, unallocated: left };
  }

  const api = { EVENT_TYPES, MONEY_IN, emptyLedger, applyRepaymentEvent, validate, findInvoice, outstanding, allocate };
  root.RayEvents = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
