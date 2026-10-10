/* Merchant controls, enforced at send time.
 *
 * sendGate(input) decides whether a buyer message or salesperson task may go out NOW, must be queued
 * (quiet hours) or is blocked, and explains why. It is evaluated when a message is drafted AND again at
 * execution time (single send, bulk send, scheduled send), so the displayed count always equals what is sent.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const RD = isNode ? require('./dates.js') : root.RayDates;
  const WEEK = 7 * 86400000;

  function inQuiet(min, fromMin, toMin) {
    if (fromMin == null || toMin == null || fromMin === toMin) return false;
    return fromMin > toMin ? (min >= fromMin || min < toMin) : (min >= fromMin && min < toMin);
  }

  function sendGate(input) {
    const { buyer, channel = 'whatsapp', controls = {}, ledger = {}, state = {}, sentLog = [], now } = input;
    const reasons = [];
    const block = (code, text, extra = {}) => ({ allowed: false, action: 'block', code, reasons: reasons.concat({ code, text }), ...extra });
    const isWa = channel === 'whatsapp';

    if (controls.paused) return block('paused', 'RAY is paused. Resume it in Controls to send.');
    if (ledger.stale) return block('stale', `Ledger last synced ${ledger.ageHours} hours ago. RAY can’t confirm this buyer hasn’t paid, so sending is paused until the ledger is refreshed.`);
    if (isWa && controls.wa === false) return block('channel', 'WhatsApp is turned off in Controls → Allowed channels.');
    if (!isWa && controls.sm === false) return block('channel', 'Salesperson tasks are turned off in Controls → Allowed channels.');
    const dnc = (controls.dnc || []).map((x) => String(x).toLowerCase().trim());
    if (isWa && (dnc.includes(String(buyer.id).toLowerCase()) || dnc.includes(String(buyer.name).toLowerCase()))) return block('dnc', `${buyer.name} is on your Do not contact list. RAY will not message them. A salesperson task is still possible.`);
    if (state.paid || (typeof state.dueAmount === 'number' && state.dueAmount <= 0)) return block('paid', 'Nothing is due on this invoice. It has been paid or matched.');
    if (state.claimPending) return block('claim', 'The buyer says they have paid. Reconcile the claimed payment before sending a reminder.');
    if (state.unmatchedPending) return block('unmatched', state.reviewText || 'A recent payment may already cover this. Review the unmatched payment before sending a reminder.');
    if (state.disputed && typeof state.dueAmount === 'number' && state.disputed >= state.dueAmount) return block('dispute', 'The full amount is under dispute. Resolve the dispute instead of sending a reminder.');

    const max = controls.maxPerWeek || 2;
    const recent = sentLog.filter((s) => s.buyerId === buyer.id && s.status === 'sent' && now - s.at < WEEK).sort((a, b) => a.at - b.at);
    if (recent.length >= max) {
      const next = recent[recent.length - max].at + WEEK;
      const p = RD.istParts(next);
      return block('frequency', `${buyer.name} already received ${recent.length} reminder${recent.length === 1 ? '' : 's'} in the last 7 days (limit ${max} per week). Next eligible ${RD.fmtDay(p.date)}, ${RD.fmtTime(p.min)}.`, { nextEligibleAt: next });
    }
    if (state.disputed) reasons.push({ code: 'dispute_partial', text: `${state.disputed.toLocaleString('en-IN')} under dispute is excluded from the reminder.` });

    if (isWa) {
      const p = RD.istParts(now);
      const from = RD.parseClock(controls.quietFrom), to = RD.parseClock(controls.quietTo);
      if (inQuiet(p.min, from, to)) {
        let date = p.date; if (p.min >= to && from > to) date = RD.addDays(date, 1);
        const at = RD.istMs(date, to);
        return { allowed: false, action: 'queue', code: 'quiet', queueUntil: at, reasons: reasons.concat({ code: 'quiet', text: `Quiet hours (${controls.quietFrom}–${controls.quietTo} IST). Queued for ${RD.fmtDay(date)}, ${RD.fmtTime(to)}.` }) };
      }
    }
    return { allowed: true, action: 'send', code: 'ok', reasons };
  }

  const api = { sendGate, inQuiet };
  root.RayGuards = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
