/* Network evidence: participation, consent, coverage, freshness, disputes and disagreement all go through one policy. */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../lib/events.js');
const P = require('../lib/policy.js');
const D = require('../lib/dataset.js');
const today = '2026-10-05';
const rec = (id) => (id === 'newlife' ? D.NEW_BUYER : D.FEATURED.find((b) => b.id === id));
const evalFor = (id, network, L = D.baseLedger(), r = rec(id)) => P.evaluateCredit(P.deriveBuyerSignals(r, L, { today }), { network }, P.POLICY, { today });
const ev = (L, type, buyerId, meta) => E.applyRepaymentEvent(L, { type, buyerId, date: today, source: 'test', actor: 'test', meta }).ledger;

test('Gupta Traders: own ledger ₹75,000 · 21d; with eligible network ₹60,000 · 14d (corroborated)', () => {
  const off = evalFor('gupta', false), on = evalFor('gupta', true);
  assert.equal(off.recommendedLimit, 75000); assert.equal(off.recommendedTerms, 21);
  assert.equal(on.recommendedLimit, 60000); assert.equal(on.recommendedTerms, 14);
  assert.equal(on.networkStep.kind, 'corroborated'); assert.equal(on.ownData.recommendedLimit, 75000);
});
test('Chawla Enterprises: reliable on own data, network disagrees → Watch, limit held (no cut on uncorroborated evidence)', () => {
  const off = evalFor('chawla', false), on = evalFor('chawla', true);
  assert.equal(off.band, 'Reliable'); assert.equal(on.band, 'Watch'); assert.equal(on.recommendedLimit, off.recommendedLimit);
  assert.equal(on.networkStep.kind, 'uncorroborated'); assert.ok(on.reviewReasons.some((r) => /disagree/.test(r)));
});
test('New Life Stores: conservative starter without eligible evidence, raised by rule with it', () => {
  assert.equal(evalFor('newlife', true).recommendedLimit, 50000, 'no consent on record → starter');
  let L = ev(D.baseLedger(), 'CONSENT_GRANTED', 'newlife');
  const on = evalFor('newlife', true, L), off = evalFor('newlife', false, L);
  assert.equal(off.recommendedLimit, 50000); assert.equal(off.recommendedTerms, 15);
  assert.equal(on.recommendedLimit, 150000); assert.equal(on.recommendedTerms, 21);
});
test('Consent states: requested and declined/revoked exclude evidence; granted includes it', () => {
  let L = ev(D.baseLedger(), 'CONSENT_REVOKED', 'gupta'); let r = evalFor('gupta', true, L);
  assert.equal(r.network.state, 'revoked'); assert.equal(r.recommendedLimit, 75000); assert.equal(r.networkStep, null);
  L = ev(L, 'CONSENT_REQUESTED', 'gupta'); assert.equal(evalFor('gupta', true, L).network.state, 'pending');
  const d = ev(L, 'CONSENT_DENIED', 'gupta'); assert.equal(evalFor('gupta', true, d).recommendedLimit, 75000);
  L = ev(L, 'CONSENT_GRANTED', 'gupta'); assert.equal(evalFor('gupta', true, L).recommendedLimit, 60000);
});
test('Insufficient coverage, stale signals and disputes are excluded with a stated reason, and restore cleanly', () => {
  let L = ev(D.baseLedger(), 'NETWORK_SIGNAL_UPDATED', 'gupta', { coverage: 2 }); let r = evalFor('gupta', true, L);
  assert.equal(r.network.state, 'insufficient'); assert.match(r.network.reason, /minimum is 4/); assert.equal(r.recommendedLimit, 75000);
  L = ev(L, 'NETWORK_SIGNAL_UPDATED', 'gupta', { reset: true }); assert.equal(evalFor('gupta', true, L).recommendedLimit, 60000);
  L = ev(L, 'NETWORK_SIGNAL_UPDATED', 'gupta', { recencyDays: 60 }); r = evalFor('gupta', true, L);
  assert.equal(r.network.state, 'stale'); assert.equal(r.recommendedLimit, 75000);
  L = ev(ev(L, 'NETWORK_SIGNAL_UPDATED', 'gupta', { reset: true }), 'NETWORK_DISPUTED', 'gupta'); r = evalFor('gupta', true, L);
  assert.equal(r.network.state, 'under_review'); assert.equal(r.recommendedLimit, 75000);
  L = ev(L, 'NETWORK_DISPUTE_RESOLVED', 'gupta'); assert.equal(evalFor('gupta', true, L).recommendedLimit, 60000);
});
test('Participation off: no network evidence for anyone, and the reason says so', () => {
  for (const id of ['gupta', 'chawla', 'newlife']) { const r = evalFor(id, false); assert.equal(r.networkStep, null); assert.equal(r.dataSources.find((s) => s.key === 'net').used, false); }
});
test('Shared logic: the same record under a different id and name gets the same decision (no special-casing)', () => {
  for (const id of ['gupta', 'chawla']) {
    const clone = Object.assign({}, rec(id), { id: 'clone-' + id, name: 'Unrelated Buyer ' + id });
    const L = D.baseLedger(); L.invoices[clone.id] = L.invoices[id].map((i) => Object.assign({}, i));
    const a = evalFor(id, true), b = evalFor(clone.id, true, L, clone);
    assert.deepEqual([b.band, b.recommendedLimit, b.recommendedTerms, b.action], [a.band, a.recommendedLimit, a.recommendedTerms, a.action]);
  }
});
