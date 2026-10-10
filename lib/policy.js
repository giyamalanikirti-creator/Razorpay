/* RAY Credit decision engine.
 *
 * An ILLUSTRATIVE trade-credit policy for distributor decision support. It is a transparent, rule-based
 * evidence model, not a validated credit score, and it produces no default probabilities. Every rule,
 * weight and threshold is listed in POLICY below and documented in docs/TECHNICAL.md.
 *
 *   deriveBuyerSignals(record, ledger, ctx)  -> signals   (lib/events.js supplies the ledger)
 *   evaluateCredit(signals, permitted, POLICY, ctx) -> decision
 *
 * No buyer is special-cased by name or id: the featured scenarios come out of the same rules as the
 * 600+ generated background records.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const RD = isNode ? require('./dates.js') : root.RayDates;

  const POLICY = {
    version: 'RAY-TC-0.4',
    label: 'Illustrative trade-credit policy · not a validated credit score',
    /* risk index: sum of signal points, clamped to 0..100 */
    bands: { watchAt: 25, riskyAt: 60 },
    points: {
      delay: [{ min: 10, pts: 20 }, { min: 6, pts: 12 }, { min: 3, pts: 6 }], delayImproving: -4, // days slower than usual
      onTime: [{ below: 50, pts: 8 }, { below: 75, pts: 4 }], onTimeStrong: -4,                  // % paid on time, 6 months
      trajectoryWorse: 6, trajectoryBetter: -2,                                                  // last 3 invoices
      overdue: [{ min: 30, pts: 10 }, { min: 15, pts: 5 }],                                     // oldest undisputed overdue, days
      orders: [{ max: -25, pts: 8 }, { max: -10, pts: 4 }], ordersGrowing: -2,                  // % change in monthly orders
      utilisation: [{ min: 90, pts: 6 }, { min: 75, pts: 3 }],                                   // outstanding / reference limit
      brokenPromises: [{ min: 3, pts: 14 }, { min: 2, pts: 8 }, { min: 1, pts: 4 }],             // last 90 days
      debitFailures: [{ min: 3, pts: 14 }, { min: 2, pts: 10 }, { min: 1, pts: 4 }],             // Autopay / eNACH, last 60 days
      cleanStreak: { min: 6, pts: -6 },                                                          // consecutive on-time automatic collections
      tenureNew: { below: 6, pts: 4 }, tenureLong: { min: 36, pts: -2 },                         // months as a buyer
      gstInactive: 8,
    },
    limits: {
      multiplier: { Reliable: 1, Watch: 0.75, Risky: 0.5 }, // applied to the reference limit, never compounded
      round: 5000, floor: 10000,
      networkCut: 0.2,            // corroborated adverse network evidence
      increaseStep: 1 / 3,        // maximum increase per review
      requestRoundUp: 10000,
      increaseCooldownDays: 90,
    },
    increase: { minOnTimePct: 90, maxDelayVsUsual: 2, minCleanStreak: 6 },
    terms: { ladder: [30, 21, 14, 7], watch: 21, risky: 7 },
    slowdown: { minDelayVsUsual: 3 }, // Reliable buyer slowing: shorten terms one step, no limit change
    newBuyer: { starter: 50000, starterTerms: 15, cap: 150000, strongCoverage: 5, strongMultiplier: 3, moderateMultiplier: 2, networkTerms: 21, maxAvgDays: 21 },
    network: { minCoverage: 4, maxRecencyDays: 45, adverseDeltaDays: 5, improvingDeltaDays: -3 },
    freshness: { ledgerMaxHours: 24 },
    minimumData: { invoices: 3 },
    confidence: { high: 6, medium: 3 },
  };

  const CONSENT_LABEL = {
    available: 'Consent available', pending: 'Consent pending', denied: 'Consent denied', revoked: 'Consent revoked',
    expired: 'Consent expired', none: 'No consent on record', insufficient: 'Insufficient coverage',
  };

  const roundTo = (v, step) => Math.round(v / step) * step;
  const roundUpTo = (v, step) => Math.ceil(v / step) * step;
  const mid = (lo, hi) => (lo + hi) / 2;
  const fmtInr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const firstMatch = (tiers, test) => { for (const t of tiers) if (test(t)) return t.pts; return 0; };

  /* ---------- signals ---------- */
  function deriveBuyerSignals(record, ledger, ctx) {
    const today = ctx.today;
    const L = ledger || { invoices: {}, events: [] };
    const inv = (L.invoices && L.invoices[record.id]) || [];
    const ev = (L.events || []).filter((e) => e.buyerId === record.id);
    const within = (e, days) => RD.diffDays(today, e.date) <= days && RD.diffDays(today, e.date) >= 0;

    const s = {
      id: record.id, name: record.name, isNew: !!record.isNew,
      refLimit: record.refLimit, limit: record.limit, terms: record.terms || 30,
      usual: record.usual, delay: record.delay, last3: (record.last3 || []).slice(),
      invoicesPaid: record.invoicesPaid || 0, onTimePaid: record.onTimePaid || 0,
      ordersNow: record.ordersNow || 0, ordersPrev: record.ordersPrev || 0,
      tenureMonths: record.since ? Math.max(0, RD.monthsBetween(record.since, today)) : 0,
      promises: Object.assign({ made: 0, kept: 0, broken: 0, partial: 0 }, record.promises),
      debit: Object.assign({ method: 'Manual', attempts: 0, failures60d: 0, failures6m: 0, streak: 0 }, record.debit),
      partialPayments: 0, verifiedPayments: 0, claimsPending: 0,
      gst: record.gst || 'active', gstVerified: !!record.gstVerified,
      network: record.network || null, consent: record.consent || 'none', networkDisputed: !!record.networkDisputed,
      lastIncreaseAt: record.lastIncreaseAt || null,
      eventsApplied: [],
    };

    for (const e of ev) {
      let used = true;
      switch (e.type) {
        case 'AUTOPAY_FAILED':
          s.debit.attempts += 1; s.debit.failures6m += 1; s.debit.streak = 0;
          if (within(e, 60)) s.debit.failures60d += 1;
          break;
        case 'AUTOPAY_SUCCEEDED':
          s.debit.attempts += 1; s.debit.streak += 1; s.verifiedPayments += 1;
          if (e.meta && e.meta.settled) { s.invoicesPaid += 1; if (!e.meta.daysLate || e.meta.daysLate <= 0) s.onTimePaid += 1; }
          break;
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_RECONCILED':
          s.verifiedPayments += 1;
          if (e.meta && e.meta.settled) {
            s.invoicesPaid += 1;
            if (!e.meta.daysLate || e.meta.daysLate <= 0) s.onTimePaid += 1;
            if (typeof e.meta.daysToPay === 'number') { s.delay = Math.round((s.delay * 3 + e.meta.daysToPay) / 4); s.last3 = s.last3.slice(1).concat(e.meta.daysToPay); }
          }
          break;
        case 'PAYMENT_PARTIALLY_RECEIVED': s.partialPayments += 1; s.verifiedPayments += 1; break; // balance already reduced in the ledger; no risk points
        case 'PAYMENT_CLAIMED': s.claimsPending += 1; break; // unverified: never changes balances or risk
        case 'PROMISE_RECORDED': s.promises.made += 1; break;
        case 'PROMISE_KEPT': s.promises.kept += 1; break;
        case 'PROMISE_PARTIALLY_KEPT': s.promises.partial += 1; break;
        case 'PROMISE_MISSED': if (!(e.meta && e.meta.disputed)) s.promises.broken += 1; else used = false; break;
        case 'CONSENT_REQUESTED': s.consent = 'pending'; break;
        case 'CONSENT_GRANTED': s.consent = 'available'; break;
        case 'CONSENT_DENIED': s.consent = 'denied'; break;
        case 'CONSENT_REVOKED': s.consent = 'revoked'; break;
        case 'NETWORK_DISPUTED': s.networkDisputed = true; break;
        case 'NETWORK_DISPUTE_RESOLVED': s.networkDisputed = false; break;
        case 'GST_VERIFIED': s.gstVerified = true; break;
        case 'CREDIT_APPROVED': if (e.meta && e.meta.increase) s.lastIncreaseAt = e.date; break;
        default: used = false;
      }
      if (used) s.eventsApplied.push(e.id);
    }
    if (s.claimsPending) {
      const cleared = ev.filter((e) => e.type === 'PAYMENT_RECONCILED' || e.type === 'CLAIM_REJECTED').length;
      s.claimsPending = Math.max(0, s.claimsPending - cleared);
    }

    /* balances come from the ledger, so a verified payment is never double-counted */
    let out = 0, disputed = 0, maxOverdue = 0, openInvoices = 0;
    for (const i of inv) {
      if (i.bal <= 0) continue;
      openInvoices += 1; out += i.bal; disputed += i.disputed || 0;
      const undisputed = i.bal - (i.disputed || 0);
      if (undisputed > 0) maxOverdue = Math.max(maxOverdue, RD.diffDays(today, i.due));
    }
    s.out = out; s.disputed = disputed; s.maxOverdueDays = Math.max(0, maxOverdue); s.openInvoices = openInvoices;
    s.onTimePct = s.invoicesPaid ? Math.round((s.onTimePaid / s.invoicesPaid) * 100) : null;
    s.delayVsUsual = (s.delay != null && s.usual != null) ? s.delay - s.usual : null;
    s.ordersChangePct = s.ordersPrev ? Math.round(((s.ordersNow - s.ordersPrev) / s.ordersPrev) * 100) : null;
    s.utilisationPct = s.refLimit ? Math.round((s.out / s.refLimit) * 100) : null;
    const l3 = s.last3;
    s.trajectory = l3.length === 3 ? (l3[0] < l3[1] && l3[1] < l3[2] ? 'worse' : l3[0] > l3[1] && l3[1] > l3[2] ? 'better' : 'flat') : 'unknown';
    return s;
  }

  /* ---------- consented network evidence ---------- */
  function networkEvidence(s, permitted, P, ctx) {
    const n = s.network, cfg = P.network;
    const base = { eligible: false, used: false, state: 'off', reason: '', trend: null, delta: null, coverage: n ? n.coverage : 0 };
    if (!permitted || !permitted.network) return Object.assign(base, { state: 'off', reason: 'Razorpay network participation is turned off' });
    if (s.consent !== 'available') return Object.assign(base, { state: s.consent, reason: CONSENT_LABEL[s.consent] || 'No consent on record' });
    if (!n) return Object.assign(base, { state: 'insufficient', reason: 'No participating distributors report this buyer' });
    if (s.networkDisputed) return Object.assign(base, { state: 'under_review', reason: 'Buyer disputed the network information · excluded until reviewed' });
    if (n.coverage < cfg.minCoverage) return Object.assign(base, { state: 'insufficient', reason: `Seen by ${n.coverage} participating distributors · minimum is ${cfg.minCoverage}` });
    if (n.recencyDays > cfg.maxRecencyDays) return Object.assign(base, { state: 'stale', reason: `Latest network signal is ${n.recencyDays} days old · maximum is ${cfg.maxRecencyDays}` });
    if (n.avgDays != null && n.baseLow == null) return Object.assign(base, { eligible: true, state: 'available', trend: 'stable', delta: 0, avgDays: n.avgDays, reason: `Pays ${n.coverage} participating distributors in about ${n.avgDays} days` });
    const delta = mid(n.nowLow, n.nowHigh) - mid(n.baseLow, n.baseHigh);
    const trend = delta >= cfg.adverseDeltaDays ? 'adverse' : delta <= cfg.improvingDeltaDays ? 'improving' : 'stable';
    return Object.assign(base, { eligible: true, state: 'available', trend, delta, avgDays: mid(n.nowLow, n.nowHigh), reason: `${n.coverage} participating distributors · typical days to pay ${n.baseLow}–${n.baseHigh} → ${n.nowLow}–${n.nowHigh}` });
  }

  const bandOf = (score, P) => (score >= P.bands.riskyAt ? 'Risky' : score >= P.bands.watchAt ? 'Watch' : 'Reliable');
  const stepTerms = (t, P, steps = 1) => { const L = P.terms.ladder; let i = L.findIndex((x) => x <= t); if (i < 0) i = L.length - 1; return L[Math.min(L.length - 1, i + steps)]; };

  /* ---------- the decision ---------- */
  function evaluateCredit(s, permitted = {}, P = POLICY, ctx = {}) {
    const pts = P.points, contributions = [], reasons = [], missing = [], review = [];
    const add = (c) => { contributions.push(Object.assign({ points: 0, effect: '' }, c)); };
    const sources = { led: false, rzp: false, conv: false, bank: !!ctx.bankConnected, net: false, gst: false };
    let score = 0;
    const net = networkEvidence(s, permitted, P, ctx);
    const staleHours = ctx.ledgerAgeHours || 0, stale = staleHours > P.freshness.ledgerMaxHours;

    if (s.isNew) {
      /* ---- first credit: starter policy, optional consented network uplift ---- */
      const nb = P.newBuyer;
      sources.gst = s.gst === 'active';
      add({ group: 'Identity', key: 'gst', label: 'GST registration', observed: s.gst === 'active' ? 'Active · returns filed on time' : 'Not active', source: 'GST public record', rule: 'Required for a starter limit', effect: s.gst === 'active' ? 'Starter limit allowed' : 'Review before credit' });
      add({ group: 'Relationship', key: 'history', label: 'Repayment history with you', observed: 'None (new buyer)', source: 'Own ledger', rule: `New buyers start at ${fmtInr(nb.starter)} · ${nb.starterTerms} days`, effect: 'Starter limit' });
      missing.push('Repayment history with you (new buyer)');
      let limit = nb.starter, terms = nb.starterTerms, band = 'Unrated', netStep = null;
      const own = { band: 'Unrated', recommendedLimit: nb.starter, recommendedTerms: nb.starterTerms };
      if (net.eligible && net.trend !== 'adverse' && (net.avgDays || 99) <= nb.maxAvgDays) {
        const mult = net.coverage >= nb.strongCoverage ? nb.strongMultiplier : nb.moderateMultiplier;
        limit = Math.min(nb.cap, nb.starter * mult); terms = nb.networkTerms; band = 'Reliable'; sources.net = true;
        netStep = { from: own.recommendedLimit, to: limit, rule: `Consented network: ≥${nb.strongCoverage} distributors, pays within ${nb.maxAvgDays} days → up to ${mult}× starter, capped at ${fmtInr(nb.cap)}` };
        add({ group: 'Network (consented)', key: 'network', label: 'How they pay other distributors', observed: net.reason, source: 'Razorpay network (synthetic, aggregated)', rule: netStep.rule, effect: `Limit ${fmtInr(own.recommendedLimit)} → ${fmtInr(limit)}` });
        reasons.push(`Pays ${net.coverage} participating distributors in about ${Math.round(net.avgDays)} days (aggregated, consented)`);
      } else {
        if (net.state !== 'off' || permitted.network) missing.push(`Network signal: ${net.reason}`);
        add({ group: 'Network (consented)', key: 'network', label: 'How they pay other distributors', observed: net.eligible ? net.reason : 'Not used', source: 'Razorpay network', rule: net.eligible ? 'Adverse or slow repayment elsewhere: no uplift' : net.reason, effect: 'No uplift' });
      }
      reasons.unshift(s.gst === 'active' ? 'GSTIN active · returns filed on time' : 'GST registration not active');
      review.push('First credit for a new buyer');
      if (stale) review.push(`Ledger last synced ${staleHours} hours ago`);
      let ev = (s.gst === 'active' ? 1 : 0) + (net.eligible && sources.net ? 2 : 0) - (stale ? 2 : 0);
      const confidence = ev >= P.confidence.high ? 'High' : ev >= P.confidence.medium ? 'Medium' : 'Low';
      return finish({ band, limit, terms, own, netStep, score: null, confidence, action: 'new',
        recommendation: `Start at ${fmtInr(limit)} on ${terms}-day terms.` });
    }

    /* ---- payment behaviour ---- */
    sources.led = true; sources.rzp = true;
    const dv = s.delayVsUsual;
    let p = dv == null ? 0 : (firstMatch(pts.delay, (t) => dv >= t.min) || (dv <= -2 ? pts.delayImproving : 0));
    add({ group: 'Payment behaviour', key: 'delay', label: 'Average days to pay vs usual', observed: `${s.usual} → ${s.delay} days`, source: 'Razorpay payments · own ledger', rule: '≥10 days slower +20 · 6–9 +12 · 3–5 +6 · 2+ faster −4', points: p }); score += p;
    if (s.onTimePct == null || s.invoicesPaid < P.minimumData.invoices) { missing.push('Repayment history (fewer than 3 paid invoices)'); }
    else {
      p = s.onTimePct >= 90 ? pts.onTimeStrong : firstMatch(pts.onTime, (t) => s.onTimePct < t.below);
      add({ group: 'Payment behaviour', key: 'onTime', label: 'Invoices paid on time (6 months)', observed: `${s.onTimePaid} of ${s.invoicesPaid} · ${s.onTimePct}%`, source: 'Razorpay payments · own ledger', rule: '<50% +8 · 50–74% +4 · ≥90% −4', points: p }); score += p;
    }
    p = s.trajectory === 'worse' ? pts.trajectoryWorse : s.trajectory === 'better' ? pts.trajectoryBetter : 0;
    add({ group: 'Payment behaviour', key: 'trajectory', label: 'Recent trajectory (last 3 invoices)', observed: s.last3.length ? s.last3.map((d) => d + 'd').join(' → ') : 'Not enough invoices', source: 'Own ledger', rule: 'Each slower than the last +6 · each faster −2', points: p }); score += p;
    p = firstMatch(pts.overdue, (t) => s.maxOverdueDays >= t.min);
    add({ group: 'Payment behaviour', key: 'overdue', label: 'Oldest undisputed overdue', observed: s.maxOverdueDays ? `${s.maxOverdueDays} days` : 'None overdue', source: 'Own ledger', rule: '≥30 days +10 · 15–29 days +5 · disputed amounts excluded', points: p }); score += p;

    /* ---- relationship and exposure ---- */
    if (s.ordersChangePct == null) missing.push('Order history');
    else {
      p = s.ordersChangePct >= 10 ? pts.ordersGrowing : firstMatch(pts.orders, (t) => s.ordersChangePct <= t.max);
      add({ group: 'Orders and exposure', key: 'orders', label: 'Monthly orders vs 3 months ago', observed: `${fmtInr(s.ordersPrev)} → ${fmtInr(s.ordersNow)} · ${s.ordersChangePct > 0 ? '+' : ''}${s.ordersChangePct}%`, source: 'Own ledger', rule: '≤−25% +8 · −10 to −24% +4 · ≥+10% −2', points: p }); score += p;
    }
    p = firstMatch(pts.utilisation, (t) => s.utilisationPct >= t.min);
    add({ group: 'Orders and exposure', key: 'utilisation', label: 'Exposure vs reference limit', observed: `${fmtInr(s.out)} of ${fmtInr(s.refLimit)} · ${s.utilisationPct}%`, source: 'Own ledger', rule: '≥90% +6 · 75–89% +3', points: p }); score += p;
    p = s.tenureMonths < pts.tenureNew.below ? pts.tenureNew.pts : s.tenureMonths >= pts.tenureLong.min ? pts.tenureLong.pts : 0;
    add({ group: 'Orders and exposure', key: 'tenure', label: 'Buying from you', observed: `${(s.tenureMonths / 12).toFixed(1)} years`, source: 'Own ledger', rule: '<6 months +4 · ≥3 years −2', points: p }); score += p;

    /* ---- promise reliability ---- */
    const pr = s.promises;
    if (pr.made) sources.conv = true;
    p = firstMatch(pts.brokenPromises, (t) => pr.broken >= t.min);
    add({ group: 'Promise reliability', key: 'promises', label: 'Payment promises (90 days)', observed: pr.made ? `${pr.broken} of ${pr.made} missed · ${pr.kept} kept${pr.partial ? ` · ${pr.partial} part-paid` : ''}` : 'No promises recorded', source: 'Merchant-confirmed buyer conversations', rule: '1 missed +4 · 2 +8 · 3+ +14 · disputed invoices never count as missed', points: p }); score += p;

    /* ---- collection reliability ---- */
    const d = s.debit;
    if (d.method !== 'Manual') {
      p = firstMatch(pts.debitFailures, (t) => d.failures60d >= t.min);
      add({ group: 'Collection reliability', key: 'failures', label: `${d.method} failures (60 days)`, observed: `${d.failures60d} in 60 days · ${d.failures6m} in 6 months · ${d.attempts} attempts`, source: 'Razorpay payments', rule: '1 +4 · 2 +10 · 3+ +14 · a failure is never marked as default', points: p }); score += p;
      p = d.streak >= pts.cleanStreak.min ? pts.cleanStreak.pts : 0;
      add({ group: 'Collection reliability', key: 'streak', label: 'Consecutive on-time collections', observed: `${d.streak} in a row`, source: 'Razorpay payments', rule: `≥${pts.cleanStreak.min} in a row −6`, points: p }); score += p;
    } else if (s.verifiedPayments || s.partialPayments) {
      add({ group: 'Collection reliability', key: 'payments', label: 'Payments this session', observed: `${s.verifiedPayments} verified${s.partialPayments ? ` · ${s.partialPayments} partial` : ''}`, source: 'Razorpay payments', rule: 'Partial payments reduce the balance and never add risk', points: 0 });
    }
    if (s.partialPayments && d.method !== 'Manual') add({ group: 'Collection reliability', key: 'partial', label: 'Partial payments', observed: `${s.partialPayments} verified`, source: 'Razorpay payments', rule: 'Reduce the balance · never add risk', points: 0 });
    if (s.disputed) { add({ group: 'Collection reliability', key: 'dispute', label: 'Disputed amount', observed: fmtInr(s.disputed), source: 'Own ledger', rule: 'Routed to dispute review · excluded from overdue and missed promises', points: 0 }); review.push(`${fmtInr(s.disputed)} under dispute`); }
    if (s.claimsPending) { add({ group: 'Collection reliability', key: 'claim', label: 'Payment claimed by buyer', observed: `${s.claimsPending} unverified`, source: 'Buyer conversations', rule: 'Unverified claims never count as received · reconcile first', points: 0 }); }

    /* ---- identity ---- */
    let identityHold = false;
    if (s.gst === 'cancelled') {
      sources.gst = true;
      p = s.gstVerified ? 0 : pts.gstInactive;
      add({ group: 'Identity', key: 'gst', label: 'GST registration', observed: s.gstVerified ? 'Cancelled · business verified by you' : 'Cancelled', source: 'GST public record', rule: 'Inactive GST +8 and hold the limit until verified', points: p }); score += p;
      if (!s.gstVerified) { identityHold = true; review.push('GST registration is no longer active'); }
    }

    score = Math.max(0, Math.min(100, score));
    let band = bandOf(score, P);
    const ownBand = band;
    const mult = P.limits.multiplier[band];
    let limit = roundTo(s.refLimit * mult, P.limits.round);
    let terms = band === 'Risky' ? P.terms.risky : band === 'Watch' ? Math.min(s.terms, P.terms.watch) : s.terms;
    let action = 'none';
    const limitRule = band === 'Reliable' ? 'Reliable: keep the reference limit' : `${band}: ${Math.round(mult * 100)}% of the ${fmtInr(s.refLimit)} reference limit`;
    const termsRule = band === 'Risky' ? 'Risky: 7-day terms' : band === 'Watch' ? 'Watch: at most 21-day terms' : 'Reliable: keep current terms';

    /* Reliable but slowing: shorter terms for new credit, no limit change */
    if (band === 'Reliable' && dv != null && dv >= P.slowdown.minDelayVsUsual && s.trajectory === 'worse') {
      terms = stepTerms(s.terms, P); reasons.push(`Payments slowing ${s.usual} → ${s.delay} days`);
      add({ group: 'Decision rules', key: 'slowdown', label: 'Emerging slowdown', observed: `${dv} days slower, trajectory worsening`, source: 'Policy', rule: 'Reliable but slowing: terms one step shorter for new credit, limit unchanged', effect: `Terms ${s.terms} → ${terms} days` });
    }

    /* increases need strong positive evidence and a trigger */
    const req = ctx.request || null;
    const cooldown = s.lastIncreaseAt && RD.diffDays(ctx.today, s.lastIncreaseAt) < P.limits.increaseCooldownDays;
    const strong = band === 'Reliable' && (s.onTimePct || 0) >= P.increase.minOnTimePct && d.failures60d === 0 && pr.broken === 0 && (dv == null || dv <= P.increase.maxDelayVsUsual);
    const trigger = req ? 'request' : (d.method !== 'Manual' && d.streak >= P.increase.minCleanStreak) ? 'streak' : null;
    const capInc = roundTo(s.refLimit * (1 + P.limits.increaseStep), P.limits.round);
    if (strong && trigger && !cooldown && !identityHold) {
      const target = trigger === 'request' ? roundUpTo(s.out + req.amount, P.limits.requestRoundUp) : capInc;
      if (target > limit) {
        limit = Math.min(capInc, target);
        if (req && req.terms && req.terms < terms) terms = req.terms;
        add({ group: 'Decision rules', key: 'increase', label: 'Increase eligibility', observed: trigger === 'request' ? `Request ${fmtInr(req.amount)} · exposure after ${fmtInr(s.out + req.amount)}` : `${d.streak} on-time ${d.method} collections in a row`, source: 'Policy', rule: `Reliable, ≥${P.increase.minOnTimePct}% on time, no failures or missed promises: up to +⅓ of the reference limit per review${trigger === 'request' ? ', sized to the request' : ''}`, effect: `Limit ${fmtInr(s.refLimit)} → ${fmtInr(limit)}` });
      }
    } else if (cooldown && band === 'Reliable' && trigger) {
      add({ group: 'Decision rules', key: 'cooldown', label: 'Increase cooldown', observed: `Last increase ${s.lastIncreaseAt}`, source: 'Policy', rule: `One increase per ${P.limits.increaseCooldownDays} days`, effect: 'No further increase yet' });
    }
    const own = { band: ownBand, recommendedLimit: identityHold ? s.limit : limit, recommendedTerms: identityHold ? s.terms : terms, score };

    /* ---- consented network evidence ---- */
    let netStep = null;
    if (net.eligible) {
      sources.net = true;
      if (net.trend === 'adverse') {
        if (ownBand !== 'Reliable') {
          const before = limit, beforeT = terms;
          limit = roundTo(limit * (1 - P.limits.networkCut), P.limits.round); terms = stepTerms(terms, P);
          netStep = { from: before, to: limit, termsFrom: beforeT, termsTo: terms, kind: 'corroborated', rule: `Adverse network evidence that agrees with your own data: limit −${Math.round(P.limits.networkCut * 100)}%, terms one step shorter` };
          add({ group: 'Network (consented)', key: 'network', label: 'How they pay other distributors', observed: net.reason, source: 'Razorpay network (synthetic, aggregated)', rule: netStep.rule, effect: `Limit ${fmtInr(before)} → ${fmtInr(limit)} · terms ${beforeT} → ${terms} days` });
          reasons.push(`Also slowing with ${net.coverage} other distributors on Razorpay (consented, aggregated)`);
        } else {
          band = 'Watch'; limit = Math.min(s.limit, limit); terms = s.terms;
          netStep = { from: own.recommendedLimit, to: limit, kind: 'uncorroborated', rule: 'Adverse network evidence your own data does not show: move to Watch, hold limit and terms, no increases, follow up early' };
          add({ group: 'Network (consented)', key: 'network', label: 'How they pay other distributors', observed: net.reason, source: 'Razorpay network (synthetic, aggregated)', rule: netStep.rule, effect: 'Band Reliable → Watch · limit held' });
          reasons.push(`On time with you, but slowing with ${net.coverage} other distributors (consented, aggregated)`);
          review.push('Your data and the network disagree');
        }
      } else {
        add({ group: 'Network (consented)', key: 'network', label: 'How they pay other distributors', observed: net.reason, source: 'Razorpay network (synthetic, aggregated)', rule: 'Stable or improving elsewhere: no adjustment', effect: ownBand === 'Reliable' ? 'Supports the recommendation' : 'Does not corroborate the slowdown' });
      }
    } else {
      if (permitted.network) missing.push(`Network signal: ${net.reason}`);
      add({ group: 'Network (consented)', key: 'network', label: 'How they pay other distributors', observed: 'Not used', source: 'Razorpay network', rule: net.reason, effect: 'No network adjustment' });
    }

    if (identityHold) { limit = s.limit; terms = s.terms; action = 'verify'; }
    limit = Math.max(Math.min(P.limits.floor, s.refLimit), limit);
    if (action !== 'verify') action = limit < s.limit ? 'reduce' : limit > s.limit ? 'increase' : (band === 'Reliable' ? 'none' : 'hold');
    if (terms < s.terms && action === 'none') action = 'terms';

    /* reasons (plain language, strongest first) */
    const top = contributions.filter((c) => c.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);
    top.reverse().forEach((c) => reasons.unshift(`${c.label}: ${c.observed}`));
    if (band === 'Reliable' && !reasons.length) reasons.push('Repayment steady and within usual days');
    if (band === 'Risky') review.push('Risky band');
    if (action === 'reduce') review.push('Lower future limit');
    if (stale) review.push(`Ledger last synced ${staleHours} hours ago`);

    /* confidence = evidence sufficiency, not a probability */
    let ev = (s.invoicesPaid >= 6 ? 2 : s.invoicesPaid >= 3 ? 1 : 0) + (pr.made >= 2 ? 1 : 0) + (d.attempts >= 4 ? 1 : 0) + (s.ordersPrev ? 1 : 0);
    if (net.eligible && ((net.trend === 'adverse' && ownBand !== 'Reliable') || (net.trend !== 'adverse' && ownBand === 'Reliable'))) ev += 1;
    if (stale) ev -= 2;
    if (identityHold) ev -= 1;
    if (pr.made < 2) missing.push('Promise history (fewer than 2 promises)');
    if (d.method === 'Manual') missing.push('Automatic collection history (manual payments only)');
    const confidence = ev >= P.confidence.high ? 'High' : ev >= P.confidence.medium ? 'Medium' : 'Low';
    if (confidence === 'Low') review.push('Low evidence sufficiency');

    const sentence = action === 'verify' ? `Verify GST status before extending further credit. Current ${fmtInr(s.limit)} limit held.`
      : action === 'reduce' ? `Lower the future limit to ${fmtInr(limit)} on ${terms}-day terms. Applies to new credit only.`
      : action === 'increase' ? `Raise the future limit to ${fmtInr(limit)}${terms !== s.terms ? ` on ${terms}-day terms` : ''}.`
      : action === 'hold' ? `Hold the limit at ${fmtInr(limit)}${terms < s.terms ? ` and move new credit to ${terms}-day terms` : ''}. Follow up before the next due date.`
      : action === 'terms' ? `Keep the ${fmtInr(limit)} limit, but move new credit to ${terms}-day terms.`
      : 'No change. Keep current terms.';
    return finish({ band, limit, terms, own, netStep, score, confidence, action, recommendation: sentence, limitRule, termsRule });

    function finish(o) {
      const over = Math.max(0, s.out - o.limit);
      return {
        buyerId: s.id,
        band: o.band,
        recommendedLimit: o.limit,
        recommendedTerms: o.terms,
        currentLimit: s.limit, currentTerms: s.terms, referenceLimit: s.refLimit,
        action: o.action,
        recommendation: o.recommendation,
        confidence: o.confidence,
        riskIndex: o.score,
        reasons: reasons.slice(0, 5),
        signalContributions: contributions,
        ownData: o.own,
        networkStep: o.netStep,
        network: net,
        dataSources: [
          { key: 'led', label: 'Own ledger (Marg ERP, demo connector)', used: sources.led },
          { key: 'rzp', label: 'Razorpay payment history', used: sources.rzp },
          { key: 'conv', label: 'Merchant-confirmed buyer conversations', used: sources.conv },
          { key: 'bank', label: 'Bank account via Connected Banking+', used: sources.bank },
          { key: 'gst', label: 'GST public record', used: sources.gst },
          { key: 'net', label: 'Razorpay network (synthetic, consented, aggregated)', used: sources.net },
        ],
        missingSignals: missing,
        needsHumanReview: review.length > 0,
        reviewReasons: review,
        guardrails: {
          prospectiveOnly: true,
          outstandingAboveLimit: over,
          note: over > 0 ? `${fmtInr(over)} already outstanding above this limit stays due. The new limit applies to new credit only.` : 'Applies to new credit only.',
          noAutoSuspension: true, approvalRequired: true,
        },
        freshness: { ledgerAgeHours: staleHours, stale },
        rules: { limit: o.limitRule || null, terms: o.termsRule || null },
        policyVersion: P.version,
        evaluatedAt: ctx.now || null,
      };
    }
  }

  /* credit request verdict from the same decision */
  function requestVerdict(decision, signals, request) {
    const after = signals.out + request.amount;
    if (decision.band === 'Risky' || after > decision.recommendedLimit) return { verdict: 'DO NOT EXTEND YET', tone: 'r', exposureAfter: after };
    if (decision.band === 'Watch' || decision.recommendedTerms < (request.terms || signals.terms)) return { verdict: 'REVIEW TERMS', tone: 'a', exposureAfter: after };
    return { verdict: 'EXTEND', tone: 'g', exposureAfter: after };
  }

  const api = { POLICY, CONSENT_LABEL, deriveBuyerSignals, networkEvidence, evaluateCredit, requestVerdict, bandOf, stepTerms };
  root.RayPolicy = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
