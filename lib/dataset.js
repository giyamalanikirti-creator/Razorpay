/* Synthetic portfolio for the RAY Credit prototype (Agarwal Distributors, Ludhiana).
 *
 * Everything here is invented. 16 featured buyers carry the product scenarios; 626 background buyers are
 * generated with a seeded pseudo-random generator so the portfolio is reproducible: 642 buyers with open
 * dues and exactly 1,184 open invoices. Generated records have no phone numbers, GSTINs or other
 * identifiers, and are labelled as synthetic in the UI.
 *
 * Features are a snapshot as of Mon 5 Oct 2026, 9 AM IST. Session events (lib/events.js) are applied on top.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const RD = isNode ? require('./dates.js') : root.RayDates;

  const TODAY = '2026-10-05';
  const SNAPSHOT = { today: TODAY, time: '09:12', label: 'Mon, 5 Oct · 9:12 AM IST' };

  /* i = [invoice, amount, issued, due, disputed?] */
  const inv = (rows) => rows.map(([n, amt, issued, due, disputed]) => ({ inv: n, amt, bal: amt, issued, due, disputed: disputed || 0 }));

  const FEATURED = [
    { id: 'sharma', name: 'Sharma Supermarket', area: 'Ghumar Mandi', expectedBand: 'Reliable', limit: 350000, refLimit: 350000, terms: 30, delay: 20, usual: 19, trend: 'flat', next: 'Salesperson visit', sinceLabel: 'Jun 2019', since: '2019-06-01',
      last3: [19, 20, 20], invoicesPaid: 10, onTimePaid: 8, ordersNow: 310000, ordersPrev: 305000, promises: { made: 1, kept: 1, broken: 0 }, debit: { method: 'Manual' },
      invoices: inv([['INV-24117', 240000, '2026-08-15', '2026-09-14']]) },
    { id: 'gupta', name: 'Gupta Traders', area: 'Model Town', expectedBand: 'Watch', limit: 100000, refLimit: 100000, terms: 30, delay: 24, usual: 8, trend: 'up', next: 'Review', sinceLabel: 'May 2024', since: '2024-05-01',
      last3: [8, 15, 24], invoicesPaid: 11, onTimePaid: 5, ordersNow: 84000, ordersPrev: 120000, promises: { made: 3, kept: 1, broken: 2, partial: 1 },
      debit: { method: 'UPI Autopay', attempts: 5, failures60d: 0, failures6m: 1, streak: 0 },
      network: { coverage: 7, baseLow: 10, baseHigh: 14, nowLow: 24, nowHigh: 30, recencyDays: 6, firstSlowed: 'July' }, consent: 'available',
      invoices: inv([['INV-24790', 20000, '2026-09-03', '2026-10-03'], ['INV-24891', 38400, '2026-09-12', '2026-10-12'], ['INV-25130', 20000, '2026-09-28', '2026-10-28']]) },
    { id: 'singh', name: 'Sandhu Mart', area: 'Sarabha Nagar', expectedBand: 'Watch', limit: 80000, refLimit: 80000, terms: 30, delay: 22, usual: 16, trend: 'up', next: 'Promise due today', sinceLabel: 'Nov 2022', since: '2022-11-01',
      last3: [17, 19, 22], invoicesPaid: 10, onTimePaid: 6, ordersNow: 92000, ordersPrev: 100000, promises: { made: 3, kept: 2, broken: 1 }, debit: { method: 'Manual' },
      network: { coverage: 6, baseLow: 16, baseHigh: 20, nowLow: 22, nowHigh: 26, recencyDays: 8 }, consent: 'available',
      invoices: inv([['INV-24760', 54000, '2026-09-05', '2026-10-05'], ['INV-24697', 9800, '2026-08-30', '2026-09-29', 9800]]) },
    { id: 'bansal', name: 'Bansal General Store', area: 'Civil Lines', expectedBand: 'Risky', limit: 120000, refLimit: 120000, terms: 30, delay: 41, usual: 22, trend: 'up', next: 'Collect before supply', sinceLabel: 'Feb 2021', since: '2021-02-01',
      last3: [30, 36, 41], invoicesPaid: 10, onTimePaid: 3, ordersNow: 80000, ordersPrev: 100000, promises: { made: 3, kept: 1, broken: 2 }, debit: { method: 'Manual' },
      network: { coverage: 5, baseLow: 20, baseHigh: 25, nowLow: 35, nowHigh: 45, recencyDays: 12 }, consent: 'expired',
      invoices: inv([['INV-24410', 62000, '2026-07-26', '2026-08-25'], ['INV-24590', 30000, '2026-08-28', '2026-09-27'], ['INV-24901', 20000, '2026-09-14', '2026-10-14']]) },
    { id: 'jain', name: 'Jain Traders', area: 'Dugri', expectedBand: 'Watch', limit: 90000, refLimit: 90000, terms: 30, delay: 27, usual: 18, trend: 'up', next: 'WhatsApp reminder', sinceLabel: 'Aug 2023', since: '2023-08-01',
      last3: [20, 24, 27], invoicesPaid: 11, onTimePaid: 6, ordersNow: 76000, ordersPrev: 80000, promises: { made: 2, kept: 1, broken: 1 }, debit: { method: 'Manual' },
      network: { coverage: 5, baseLow: 15, baseHigh: 18, nowLow: 20, nowHigh: 25, recencyDays: 9 }, consent: 'available',
      invoices: inv([['INV-25012', 20000, '2026-09-08', '2026-10-08'], ['INV-25013', 15500, '2026-09-08', '2026-10-08'], ['INV-25110', 35500, '2026-09-24', '2026-10-24']]) },
    { id: 'arora', name: 'Arora Retail', area: 'Field Ganj', expectedBand: 'Reliable', limit: 120000, refLimit: 120000, terms: 30, delay: 19, usual: 21, trend: 'down', next: 'Routine reminder', sinceLabel: 'Mar 2018', since: '2018-03-01',
      last3: [21, 20, 19], invoicesPaid: 12, onTimePaid: 11, ordersNow: 142000, ordersPrev: 120000, promises: { made: 0 },
      debit: { method: 'UPI Autopay', attempts: 12, failures60d: 0, failures6m: 0, streak: 12 },
      network: { coverage: 5, baseLow: 16, baseHigh: 18, nowLow: 16, nowHigh: 18, recencyDays: 7 }, consent: 'available',
      invoices: inv([['INV-24860', 42800, '2026-09-05', '2026-10-05'], ['INV-25190', 21400, '2026-09-25', '2026-10-25']]) },
    { id: 'kapoor', name: 'Kapoor Stores', area: 'BRS Nagar', expectedBand: 'Reliable', limit: 100000, refLimit: 100000, terms: 30, delay: 14, usual: 14, trend: 'flat', next: 'Routine reminder', sinceLabel: 'Jan 2020', since: '2020-01-01',
      last3: [14, 15, 14], invoicesPaid: 10, onTimePaid: 9, ordersNow: 98000, ordersPrev: 96000, promises: { made: 0 }, debit: { method: 'Manual' },
      invoices: inv([['INV-25233', 46500, '2026-09-10', '2026-10-10']]) },
    { id: 'mehta', name: 'Mehta Enterprises', area: 'Shimlapuri', expectedBand: 'Reliable', limit: 75000, refLimit: 75000, terms: 30, delay: 21, usual: 17, trend: 'up', next: 'Salesperson follow-up', sinceLabel: 'Jul 2021', since: '2021-07-01',
      last3: [17, 19, 21], invoicesPaid: 10, onTimePaid: 8, ordersNow: 62000, ordersPrev: 61000, promises: { made: 0 },
      debit: { method: 'UPI Autopay', attempts: 9, failures60d: 0, failures6m: 0, streak: 9 },
      network: { coverage: 3, baseLow: 17, baseHigh: 19, nowLow: 17, nowHigh: 19, recencyDays: 10 }, consent: 'available',
      invoices: inv([['INV-24812', 30000, '2026-09-06', '2026-10-06']]) },
    { id: 'lifeline', name: 'Lifeline Mart', area: 'Pakhowal Road', expectedBand: 'Reliable', limit: 70000, refLimit: 70000, terms: 30, delay: 21, usual: 19, trend: 'flat', next: 'WhatsApp reminder', sinceLabel: 'Sep 2022', since: '2022-09-01',
      last3: [20, 21, 21], invoicesPaid: 10, onTimePaid: 8, ordersNow: 58000, ordersPrev: 57000, promises: { made: 1, kept: 1, broken: 0 }, debit: { method: 'Manual' },
      invoices: inv([['INV-24702', 31200, '2026-08-29', '2026-09-28']]) },
    { id: 'chawla', name: 'Chawla Enterprises', area: 'Jawahar Nagar', expectedBand: 'Reliable', limit: 60000, refLimit: 60000, terms: 30, delay: 19, usual: 18, trend: 'flat', next: 'Routine reminder', sinceLabel: 'May 2023', since: '2023-05-01',
      last3: [18, 19, 19], invoicesPaid: 10, onTimePaid: 9, ordersNow: 54000, ordersPrev: 53000, promises: { made: 0 },
      debit: { method: 'eNACH', attempts: 8, failures60d: 0, failures6m: 0, streak: 5 },
      network: { coverage: 4, baseLow: 12, baseHigh: 15, nowLow: 21, nowHigh: 25, recencyDays: 5, firstSlowed: 'August' }, consent: 'available',
      invoices: inv([['INV-24930', 27600, '2026-09-06', '2026-10-06']]) },
    { id: 'verma', name: 'Verma Retail', area: 'Haibowal', expectedBand: 'Reliable', limit: 60000, refLimit: 60000, terms: 30, delay: 16, usual: 16, trend: 'flat', next: 'Match payment', sinceLabel: 'Oct 2020', since: '2020-10-01',
      last3: [16, 16, 16], invoicesPaid: 10, onTimePaid: 9, ordersNow: 52000, ordersPrev: 51000, promises: { made: 0 }, debit: { method: 'Manual' },
      invoices: inv([['INV-24655', 26500, '2026-09-05', '2026-10-05']]) },
    { id: 'goyal', name: 'Goyal Agencies', area: 'Salem Tabri', expectedBand: 'Watch', limit: 40000, refLimit: 40000, terms: 30, delay: 26, usual: 17, trend: 'up', next: 'Send reminder', sinceLabel: 'Dec 2023', since: '2023-12-01',
      last3: [19, 23, 26], invoicesPaid: 10, onTimePaid: 6, ordersNow: 36000, ordersPrev: 40000, promises: { made: 2, kept: 1, broken: 1 }, debit: { method: 'Manual' },
      network: { coverage: 4, baseLow: 15, baseHigh: 18, nowLow: 20, nowHigh: 24, recencyDays: 11 }, consent: 'denied',
      invoices: inv([['INV-24611', 24100, '2026-08-31', '2026-09-30']]) },
    { id: 'sethi', name: 'Sethi Mart', area: 'Ghumar Mandi', expectedBand: 'Reliable', limit: 60000, refLimit: 60000, terms: 30, delay: 15, usual: 15, trend: 'flat', next: 'Routine reminder', sinceLabel: 'Jun 2022', since: '2022-06-01',
      last3: [15, 15, 15], invoicesPaid: 8, onTimePaid: 8, ordersNow: 47000, ordersPrev: 45000, promises: { made: 0 },
      debit: { method: 'UPI Autopay', attempts: 6, failures60d: 0, failures6m: 0, streak: 6 },
      network: { coverage: 4, baseLow: 15, baseHigh: 17, nowLow: 15, nowHigh: 17, recencyDays: 7 }, consent: 'available',
      invoices: inv([['INV-24940', 18900, '2026-09-08', '2026-10-08']]) },
    { id: 'citycare', name: 'City Mart', area: 'Model Town Extn', expectedBand: 'Watch', limit: 75000, refLimit: 75000, terms: 30, delay: 23, usual: 20, trend: 'up', next: 'Verify GST status', sinceLabel: 'Jul 2021', since: '2021-07-01',
      last3: [20, 21, 23], invoicesPaid: 10, onTimePaid: 7, ordersNow: 64000, ordersPrev: 65000, promises: { made: 0 }, debit: { method: 'Manual' }, gst: 'cancelled',
      network: { coverage: 3, baseLow: 14, baseHigh: 18, nowLow: 20, nowHigh: 24, recencyDays: 14 }, consent: 'available',
      invoices: inv([['INV-24733', 42000, '2026-09-02', '2026-10-02'], ['INV-25140', 16900, '2026-09-14', '2026-10-14']]) },
    { id: 'guptak', name: 'Gupta Kirana Store', area: 'Kitchlu Nagar', expectedBand: 'Watch', limit: 50000, refLimit: 50000, terms: 30, delay: 15, usual: 9, trend: 'up', next: 'Send payment link', sinceLabel: 'Feb 2023', since: '2023-02-01',
      last3: [10, 12, 15], invoicesPaid: 10, onTimePaid: 6, ordersNow: 37000, ordersPrev: 42000, promises: { made: 1, kept: 1, broken: 0 }, debit: { method: 'Manual' },
      invoices: inv([['INV-2048', 40000, '2026-09-02', '2026-10-02']]) },
    { id: 'singhms', name: 'Singh Stores', area: 'Jamalpur', expectedBand: 'Reliable', limit: 40000, refLimit: 40000, terms: 30, delay: 17, usual: 17, trend: 'flat', next: 'Routine reminder', sinceLabel: 'Feb 2022', since: '2022-02-01',
      last3: [17, 17, 17], invoicesPaid: 10, onTimePaid: 8, ordersNow: 36000, ordersPrev: 35000, promises: { made: 0 },
      debit: { method: 'eNACH', attempts: 4, failures60d: 0, failures6m: 0, streak: 4 },
      invoices: inv([['INV-25088', 21600, '2026-09-15', '2026-10-15']]) },
  ];
  const NEW_BUYER = { id: 'newlife', name: 'New Life Stores', area: 'Sarabha Nagar', isNew: true, limit: 0, refLimit: 0, terms: 15, delay: null, usual: null, trend: 'flat', next: 'First order', sinceLabel: 'Oct 2026', since: '2026-10-01', gst: 'active',
    last3: [], invoicesPaid: 0, onTimePaid: 0, promises: { made: 0 }, debit: { method: 'Not set up' },
    network: { coverage: 7, avgDays: 18, recencyDays: 10 }, consent: 'none', invoices: [] };

  /* ---------- seeded background portfolio ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const SURNAMES = ['Bhatia', 'Malhotra', 'Khanna', 'Sood', 'Grover', 'Dhillon', 'Gill', 'Sidhu', 'Bedi', 'Chopra', 'Ahuja', 'Kohli', 'Mittal', 'Goel', 'Jindal', 'Garg', 'Bajaj', 'Sachdeva', 'Talwar', 'Walia', 'Anand', 'Kalra', 'Narang', 'Oberoi', 'Puri', 'Rana', 'Saini', 'Thakur', 'Verma', 'Wadhwa', 'Aggarwal', 'Bansal', 'Chadha', 'Duggal', 'Gulati', 'Handa', 'Juneja', 'Kakkar', 'Luthra', 'Madan', 'Nanda', 'Pahwa', 'Sehgal', 'Tandon', 'Uppal', 'Vohra', 'Dua', 'Kapur', 'Bhalla', 'Mehra'];
  const KINDS = ['Kiryana Store', 'General Store', 'Provision Store', 'Mart', 'Traders', 'Supermart', 'Departmental Store', 'Enterprises', 'Retail', 'Brothers', 'Sweets & Namkeen', 'Medical & General'];
  const AREAS = ['Sarabha Nagar', 'Model Town', 'Civil Lines', 'Dugri', 'BRS Nagar', 'Pakhowal Road', 'Haibowal', 'Shimlapuri', 'Jamalpur', 'Kitchlu Nagar', 'Field Ganj', 'Salem Tabri', 'Ghumar Mandi', 'Jawahar Nagar', 'Rajguru Nagar', 'Ferozepur Road', 'Urban Estate', 'Gill Road', 'Dhandari', 'Focal Point', 'Giaspura', 'Sundar Nagar', 'Tagore Nagar', 'Basti Jodhewal', 'Chandigarh Road'];

  const TARGET = { buyers: 642, invoices: 1184, outstanding: 18400000, networkSignals: 412 };

  function generate() {
    const rnd = mulberry32(642);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    const n = TARGET.buyers - FEATURED.length;
    const used = new Set(FEATURED.map((f) => f.name).concat(NEW_BUYER.name));
    const out = [];
    for (let i = 0; i < n; i++) {
      let name, area, guard = 0;
      do { name = `${pick(SURNAMES)} ${pick(KINDS)}`; area = pick(AREAS); if (used.has(name)) name = `${name}, ${area}`; guard++; } while (used.has(name) && guard < 20);
      used.add(name);
      const refLimit = [20000, 25000, 30000, 40000, 50000, 60000, 75000, 80000, 100000, 120000, 150000][Math.min(10, Math.floor(Math.pow(rnd(), 1.4) * 11))];
      const usual = between(10, 24);
      const r = rnd();
      /* background buyers are deliberately steady: most pay as usual, some are long-standing slow payers */
      const slow = r < 0.12, risky = r < 0.02;
      const delay = usual + (risky ? between(10, 16) : slow ? between(0, 2) : between(-2, 2));
      const last3 = [delay - between(0, 1), delay, delay - between(0, 1)];
      const invoicesPaid = between(6, 14);
      const onTimePaid = Math.round(invoicesPaid * (risky ? 0.3 : slow ? (0.4 + rnd() * 0.15) : (0.78 + rnd() * 0.2)));
      const ordersPrev = Math.round(refLimit * (0.6 + rnd() * 0.5) / 1000) * 1000;
      const ordersNow = Math.round(ordersPrev * (risky ? 0.8 : slow ? 0.85 + rnd() * 0.05 : 0.93 + rnd() * 0.14) / 1000) * 1000;
      const method = rnd() < 0.42 ? 'UPI Autopay' : rnd() < 0.27 ? 'eNACH' : 'Manual';
      const attempts = method === 'Manual' ? 0 : between(3, 12);
      const debit = { method, attempts, failures60d: 0, failures6m: method !== 'Manual' && (slow || risky) && rnd() < 0.4 ? 1 : 0, streak: method === 'Manual' ? 0 : Math.min(attempts, between(1, 5)) };
      const sinceYear = 2016 + between(0, 9), sinceMonth = between(1, 12);
      const since = `${Math.min(2026, sinceYear)}-${String(sinceYear >= 2026 ? Math.min(sinceMonth, 7) : sinceMonth).padStart(2, '0')}-01`;
      const util = risky ? 0.9 + rnd() * 0.07 : slow ? 0.8 + rnd() * 0.15 : 0.15 + rnd() * 0.55;
      out.push({ id: `syn-${String(i + 1).padStart(3, '0')}`, synthetic: true, name, area, limit: refLimit, refLimit, terms: 30, delay, usual, trend: risky ? 'up' : 'flat', next: 'Routine reminder',
        sinceLabel: `${RD.MO[+since.slice(5, 7) - 1]} ${since.slice(0, 4)}`, since, last3, invoicesPaid, onTimePaid, ordersNow, ordersPrev,
        promises: { made: risky ? 3 : slow ? 3 : 0, kept: slow && !risky ? 1 : 0, broken: risky ? 3 : slow ? 2 : 0 }, debit, gst: 'active', consent: 'none', network: null,
        _util: util, _risky: risky, _slow: slow });
    }
    /* outstanding: scale to the portfolio total, then split into invoices */
    const featuredOut = FEATURED.reduce((a, f) => a + f.invoices.reduce((x, i) => x + i.bal, 0), 0);
    const targetGen = TARGET.outstanding - featuredOut;
    const raw = out.map((b) => b._util * b.refLimit);
    const k = targetGen / raw.reduce((a, b) => a + b, 0);
    let acc = 0;
    out.forEach((b, i) => { const v = Math.max(1000, Math.min(Math.round(b.refLimit * 0.97 / 100) * 100, Math.round(raw[i] * k / 100) * 100)); b._out = v; acc += v; });
    let diff = targetGen - acc; // settle rounding on the largest balances, within each buyer's limit
    for (const b of out.slice().sort((a, c) => (c.refLimit - c._out) - (a.refLimit - a._out))) { if (!diff) break; const room = Math.round(b.refLimit * 0.97) - b._out; const take = diff > 0 ? Math.min(diff, room) : Math.max(diff, -(b._out - 1000)); b._out += take; diff -= take; }
    /* invoice counts: every buyer has at least one; extra invoices spread deterministically */
    const featuredInv = FEATURED.reduce((a, f) => a + f.invoices.length, 0);
    let extra = TARGET.invoices - featuredInv - out.length;
    const counts = out.map(() => 1);
    let j = 0; while (extra > 0) { const idx = (j * 7919) % out.length; if (counts[idx] < 3 && out[idx]._out >= 6000) { counts[idx] += 1; extra -= 1; } j++; }
    let invNo = 30001;
    out.forEach((b, i) => {
      const c = counts[i], parts = []; let left = b._out;
      for (let p = 0; p < c; p++) { const amt = p === c - 1 ? left : Math.max(500, Math.round((b._out / c) * (0.7 + rnd() * 0.6) / 100) * 100); parts.push(Math.min(amt, left - (c - 1 - p) * 500)); left -= parts[p]; }
      b.invoices = parts.map((amt) => {
        const rr = rnd();
        const dueOff = b._risky ? -between(30, 50) : (b._slow && b.invoices === undefined && parts.indexOf(amt) === 0) ? -between(15, 25) : rr < 0.7 ? between(0, 30) : rr < 0.95 ? -between(1, 12) : -between(13, 20);
        const due = RD.addDays(TODAY, dueOff), issued = RD.addDays(due, -30);
        return { inv: `INV-${invNo++}`, amt, bal: amt, issued, due, disputed: 0 };
      });
      delete b._util; delete b._out;
    });
    /* consented network coverage for a fixed share of the background portfolio; signals are steady */
    const featuredSignals = FEATURED.filter((f) => f.consent === 'available' && f.network && f.network.coverage >= 4).length;
    let need = TARGET.networkSignals - featuredSignals;
    for (let i = 0; i < out.length && need > 0; i++) {
      const b = out[(i * 4243) % out.length]; if (b.network) continue;
      const base = b.delay - 2;
      b.network = { coverage: 4 + Math.floor(rnd() * 6), baseLow: base, baseHigh: base + 3, nowLow: base + (b._risky ? 1 : 0), nowHigh: base + 3, recencyDays: 3 + Math.floor(rnd() * 30) };
      b.consent = 'available'; need -= 1;
    }
    out.forEach((b) => { delete b._risky; delete b._slow; if (!b.network && rnd() < 0.3) { b.consent = 'pending'; } });
    return out;
  }

  const GENERATED = generate();
  const ALL = FEATURED.concat(GENERATED);

  function baseLedger() {
    const L = { invoices: {}, events: [], refs: {}, seq: 0 };
    for (const b of ALL.concat([NEW_BUYER])) L.invoices[b.id] = b.invoices.map((i) => Object.assign({}, i));
    /* history already known at the start of the session (Razorpay events) */
    L.events.push({ id: 'ev-seed-1', type: 'AUTOPAY_FAILED', buyerId: 'gupta', date: '2026-10-03', invoice: 'INV-24790', amount: 20000, source: 'Razorpay UPI Autopay', verification: 'verified', actor: 'Razorpay', meta: { reason: 'Insufficient balance', seed: true } });
    return L;
  }

  function stats(ledger, today) {
    const L = ledger || baseLedger(); let out = 0, invs = 0, buyers = 0, dueWeek = 0, autoWeek = 0, autoCount = 0;
    const end = RD.addDays(today || TODAY, 6);
    const methods = {}; ALL.forEach((b) => { methods[b.id] = b.debit && b.debit.method; });
    for (const id of Object.keys(L.invoices)) {
      const open = L.invoices[id].filter((i) => i.bal > 0); if (!open.length) continue;
      buyers += 1; invs += open.length;
      for (const i of open) { out += i.bal; if (RD.diffDays(i.due, today || TODAY) >= 0 && RD.diffDays(end, i.due) >= 0) { dueWeek += i.bal; if (methods[id] === 'UPI Autopay' || methods[id] === 'eNACH') { autoWeek += i.bal; autoCount += 1; } } }
    }
    return { buyers, openInvoices: invs, outstanding: out, dueThisWeek: dueWeek, autoThisWeek: autoWeek, autoDebitsThisWeek: autoCount };
  }

  const api = { TODAY, SNAPSHOT, FEATURED, NEW_BUYER, GENERATED, ALL, TARGET, baseLedger, stats, mulberry32 };
  root.RayData = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
