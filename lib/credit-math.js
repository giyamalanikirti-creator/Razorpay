/* Credit-release arithmetic: the one place that answers "how much of this order can go out on credit, and what
 * must be collected first?". Pure, so the page, the WhatsApp/Ray AI answers and the tests all use the same numbers.
 *
 *   headroom           = max(0, limit − outstanding)                       credit still available today
 *   releasableNow      = min(requested, headroom)                          order value that fits the limit today
 *   collectForFull     = max(0, outstanding + requested − limit)            collection needed before the FULL order fits
 *   afterCollecting(c) = what a collection of c frees: new outstanding, new headroom, order value releasable
 *
 * If the requested order is larger than the limit itself, no collection can make the full order fit
 * (collectForFull would exceed what is owed). That case is reported as fullFits:false with the most that can ever be
 * released on credit (the limit), instead of a collection figure that cannot be met.
 * All amounts are whole rupees. Invalid input (missing, non-numeric, negative) returns { ok:false, error }.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;

  const num = (v) => (typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN));
  function check(name, v) {
    const n = num(v);
    if (!Number.isFinite(n)) return { error: `${name} must be a number.` };
    if (n < 0) return { error: `${name} cannot be negative.` };
    return { value: Math.round(n) };
  }

  function after(outstanding, limit, requested, collected) {
    const c = Math.min(collected, outstanding);
    const out = outstanding - c, headroom = Math.max(0, limit - out);
    return { collected: c, outstanding: out, headroom, releasable: Math.min(requested, headroom), shortBy: Math.max(0, requested - headroom) };
  }

  /* releasePlan({ outstanding, requested, limit, collected? }) */
  function releasePlan(input) {
    const o = input || {};
    const fields = [['Outstanding balance', o.outstanding], ['Requested credit', o.requested], ['Credit limit', o.limit]];
    if (o.collected !== undefined && o.collected !== null) fields.push(['Collected amount', o.collected]);
    const vals = [];
    for (const [name, v] of fields) { const r = check(name, v); if (r.error) return { ok: false, error: r.error }; vals.push(r.value); }
    const [outstanding, requested, limit] = vals; const collected = vals[3] || 0;
    const headroom = Math.max(0, limit - outstanding);
    const releasableNow = Math.min(requested, headroom);
    const fullFits = requested <= limit;
    const collectForFull = requested === 0 ? 0 : fullFits ? Math.max(0, outstanding + requested - limit) : null;
    const overLimitBy = Math.max(0, outstanding - limit);
    const plan = {
      ok: true, outstanding, requested, limit, headroom, releasableNow, fullFits, collectForFull, overLimitBy,
      /* the most that can go on credit even if every rupee owed is collected */
      maxReleasable: Math.min(requested, limit),
      /* upfront payment the buyer would need for the rest of the order once all dues are cleared */
      upfrontIfAllCleared: Math.max(0, requested - limit),
      noRequest: requested === 0,
      withinLimitNow: requested > 0 && releasableNow === requested,
      after: (c) => { const r = check('Collected amount', c); if (r.error) return { ok: false, error: r.error }; return Object.assign({ ok: true }, after(outstanding, limit, requested, r.value)); },
    };
    if (vals.length > 3) plan.collectedResult = after(outstanding, limit, requested, collected);
    return plan;
  }

  const api = { releasePlan };
  root.RayCreditMath = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
