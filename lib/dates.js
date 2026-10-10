/* Calendar and clock helpers shared by the browser bundle, the API and the tests.
 * Calendar dates are 'YYYY-MM-DD' strings for the merchant's calendar in Asia/Kolkata (IST, UTC+05:30, no DST).
 */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const IST_OFFSET_MIN = 330;
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const toN = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  const fromN = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const isISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromN(toN(s)) === s;
  const addDays = (s, k) => fromN(toN(s) + k);
  const diffDays = (a, b) => toN(a) - toN(b); // a minus b, in days
  const dow = (s) => new Date(toN(s) * DAY).getUTCDay(); // 0 = Sunday
  const lastOfMonth = (s) => { const [y, m] = s.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  const fmtShort = (s) => `${+s.slice(8)} ${MO[+s.slice(5, 7) - 1]}`;
  const fmtDay = (s) => `${WD[dow(s)]}, ${fmtShort(s)}`;
  const fmtLong = (s) => `${WDL[dow(s)]}, ${fmtShort(s)}`;
  const monthsBetween = (from, to) => { const [y1, m1] = from.split('-').map(Number); const [y2, m2] = to.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };

  /* IST wall clock <-> epoch milliseconds */
  const istMs = (date, minutes = 0) => (toN(date) * DAY) - IST_OFFSET_MIN * 60000 + minutes * 60000;
  const istParts = (ms) => { const d = new Date(ms + IST_OFFSET_MIN * 60000); return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; };
  const fmtTime = (min) => { const h = Math.floor(min / 60) % 24, m = min % 60; const hh = h % 12 === 0 ? 12 : h % 12; return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  /* '8 PM' / '9:30 AM' / '20:00' -> minutes after midnight */
  const parseClock = (t) => {
    const s = String(t || '').trim().toUpperCase();
    let m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
    if (m) { let h = +m[1] % 12; if (m[3] === 'PM') h += 12; return h * 60 + (+m[2] || 0); }
    m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return (+m[1]) * 60 + (+m[2]);
    return null;
  };

  const api = { DAY, IST_OFFSET_MIN, WD, WDL, MO, toN, fromN, isISO, addDays, diffDays, dow, lastOfMonth, fmtShort, fmtDay, fmtLong, monthsBetween, istMs, istParts, fmtTime, parseClock };
  root.RayDates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
