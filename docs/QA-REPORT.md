# QA report: approval, repayment and truthful verification

Build `9bb5410e05` · prototype date Mon 5 Oct 2026 (IST) · synthetic data only.

Every observation was reproduced against the code before it was changed. The fixes are in shared domain logic, not per-buyer patches: one command path for credit decisions (`src/modules/credit-decisions.js`), one source for payment state (`src/modules/payment-truth.js`), one answer engine (`src/modules/answers.js`) and one send gateway (`sendMessage` in `src/modules/engine.js`).

## 1. Reproduced bugs

| # | Observation | Reproduced? | Root cause | Fix |
|---|---|---|---|---|
| 1 | Gupta approved at ₹60,000 · 14 days, then the recommendation became 7 days | Yes | `lib/policy.js` derived Watch terms as `min(currentTerms, 21)` and the network step shortened from there. Once 14 days was approved it became the baseline and stepped down to 7. The decision snapshot then stored the compounded 7. | Records carry reference (contract) terms `refTerms` separately from current terms; all term rules derive from the reference. An approved increase becomes the new reference; a reduction never does. Evaluation is idempotent. |
| 2 | Undo reopened the decision but the limit stayed ₹60,000 | Yes (credit-request page) | The request page's Undo only cleared `S.req.gupta`; it never touched the limit. The profile Undo restored the limit but wrote no audit event and missed the request state. | `undoCredit()` restores the full snapshot taken at approval (limit, terms, reference raise, request decision, decision record and status, saved-for-later, screen state) and records `CREDIT_REVERSED`. Request decisions use the same path. |
| 3 | After ₹20,000 failed → ₹5,000 → ₹15,000, the header showed ₹0, but the Overview said "recovering ₹0", WhatsApp said "₹5,000 received, ₹15,000 remaining", and mobile kept "IN PROGRESS" | Yes | Recovery status was a stored flag (`'part'`); the WhatsApp, mobile and Ray AI answers were hardcoded strings keyed on that flag; the Overview printed the invoice balance; mobile showed IN PROGRESS for anything not "open". | `recoveryOf(id)` derives status from the ledger (open, action, partial, claimed, completed). Every surface reads it. Completed recoveries leave the active lists, their steps stop, and answers point to the next unpaid invoice. |
| 4 | A ₹25,000 minimum on a ₹20,000 invoice gave no error, and the link still said ₹5,000 | Yes | The minimum field was never read; the log and preview were hardcoded to ₹5,000; "Edit message" re-rendered the sheet and dropped the typed minimum. | `RayGuards.linkMinimum()` validates blank, non-numeric, zero, negative, decimal, below ₹100 and above-balance inputs inline and disables Send. The minimum is bound to the payload, preview, recovery record, outbox, Activity and the simulated buyer payment. Edits survive Edit message and Save message. Balances under ₹5,000 are collected in full. |
| 5 | After "Continue without bank", recovery screens claimed a bank check | Yes | Six hardcoded sentences ("RAY checked Razorpay payments, your bank account…"). A claim could also be marked "Found in bank" with no bank connected. | `payCheck()` / `sourcesLine()` build the text from the actual connection state: what was checked, what was not (with the reason and freshness), and "no matching payment found in these sources. That does not mean the buyer has not paid." Claims are closed only by a bank match (bank connected) or by the merchant confirming receipt with a reference. |
| 6 | "AI not configured on this deployment"; free-text WhatsApp questions said live AI works when opened in Claude; a payment-status answer went stale | Yes | Live AI in the page used the artifact `sample` capability, which only exists inside Claude; the Vercel deployment has no API key. Fallback text pointed users elsewhere. WhatsApp also treated any message containing "send" or "yes" as a bulk-send request. | Rule-based answers from current data for buyer, invoice, balance, credit and payment status on every surface; a clarifying question for ambiguous names; "I won’t guess" otherwise. Optional server-side live AI (`/api/ask`) is used only for unmatched questions and only when a key is set. Labels state the real status. Bulk-send now needs an explicit "send"/"haan" reply. |
| 7 | Safeguards not applied at every entry point | Yes | Mobile follow-up, WhatsApp follow-up, payment-review reminders, the retailer payment link and "Send anyway" set state directly without the send gate. Matching Verma's credit (desktop and mobile) cancelled the reminder without a ledger event. `ledgerPay` silently clamped overpayments. Arora's NEFT was shown as paid without a ledger event. | All sends go through `sendMessage()`, which re-checks every control at execution. "Send anyway" bypasses only the payment-review hold and still respects Do not contact, limits, quiet hours, pause and a stale ledger. Matches and bank syncs write verified ledger events. Overpayments are rejected, not clamped. |
| 8 | The Checks page showed 36/36 while these bugs existed | Yes | It tested pure rules on synthetic inputs, not journeys. | The Checks page now separates live journey checks, live policy checks and recorded development runs (with run time and build id), and shows failures. |

Also found while testing: the toast stack could sit over modal buttons and swallow clicks. Toasts no longer intercept clicks and at most three are shown.

## 2. Preventive improvements

* Proposals are captured with a one-time key when shown. Confirming applies exactly those values once; a double click or a repeated confirm is a no-op. If RAY's recommendation changed after the confirmation was shown, nothing is applied.
* Reference, current and proposed values are shown separately in the confirmation. A limit below what is already owed is explained in plain words: the full amount stays due on the original invoices and dates, nothing is written off, deliveries are not stopped, and new credit orders need approval until the balance is back under the limit.
* Payments need a verified source, whole rupees, an amount within the balance and a unique reference. Bank credits spanning invoices are allocated oldest first and rejected if they exceed everything owed. A payment that clears an invoice cancels any scheduled or queued reminder for it.
* Every outbox item is marked simulated, and every send toast and log line says "simulated".
* Every answer carries its source label: rule-based from current data, AI with model name and amount checks, or sample dashboard data.
* "Reset demo" asks for confirmation. "Concept prototype · what’s real" opens a five-group disclosure: logic running here, synthetic data, simulated integrations, optional live AI (with its real status), and proposed.
* The eight-week pilot plan keeps its defaults and now lists its success measures, how each is measured and the stop conditions (How it works page). It is marked "Proposed · not yet run".

## 3. Test results (this build)

| Suite | Where it runs | Ran | Passed | Failed |
|---|---|---|---|---|
| Unit, journey and API tests (`npm test`) | Node 22 | 52 | 52 | 0 |
| Browser journeys with real clicks (`npm run test:e2e`) | Playwright, Chromium 1440×900 | 96 checks across 12 journeys + AI + routes | 96 | 0 |
| Browser smoke and both guided demos (`npm run test:ui`) | Playwright | 23 | 23 | 0 |
| Every demo step (`scripts/smoke_test.py`) | Playwright | 34 steps | 34 without errors | 0 |
| Journey checks on the Checks page | the viewer's browser, live | 12 | 12 | 0 |
| Policy checks on the Checks page | the viewer's browser, live | 36 | 36 | 0 |
| Interpreter evaluation (`npm run eval`) | Node, rule-based fallback | 40 messages | see `tests/eval/RESULTS.md` | |

Journey coverage (real clicks in `tests/e2e_journeys.py`, the same journeys live on the Checks page, and the pure-logic parts in `tests/journeys.test.js`): approve ₹60,000 · 14 applies exact values · no compounding · undo restores everything (profile and request page) · double-click is idempotent · ₹5,000 partial leaves ₹15,000 · paying ₹15,000 completes recovery on desktop, Actions, Overview, profile and Activity · WhatsApp, mobile and Ray AI agree with the ledger · overpayment and duplicate references rejected · invalid minimums rejected inline and valid edits persist · a disconnected bank is never claimed as checked · verified payments cancel scheduled reminders · Do not contact, pause, stale ledger and quiet hours hold on desktop, bulk, recovery link, mobile, WhatsApp, payment review, retailer link and "Send anyway".

**Not tested:** live AI against a real model (no key in the build environment; only mocked providers); real WhatsApp delivery, bank feeds, Marg sync and mandates (simulated); Devanagari-script replies beyond digits and names; visual layout (checked by eye with screenshots, not asserted); browsers other than Chromium.

## 4. Optional live AI: setup

Live AI is off on the public deployment. To turn it on (keys never reach the browser):

1. In Vercel, open the project → Settings → Environment Variables.
2. Add `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` with `AI_PROVIDER=anthropic`) for Production. Optional: `OPENAI_MODEL` (default `gpt-4o-mini`), `ANTHROPIC_MODEL` (default `claude-haiku-4-5`), `AI_TIMEOUT_MS` (default `12000`).
3. Redeploy (Deployments → Redeploy, or push a commit).
4. Check: `GET /api/ask` and `GET /api/parse-promise` should return `{"configured": true, ...}`. In the app, the Ray AI footer and the mobile Ask RAY header change from "Live AI off on this deployment" to "Live AI · <model> (server)".
5. What changes: free-form questions that the rules cannot match are answered by the model from a snapshot of the current data (amounts not found in the data are flagged); buyer replies are read by the model and then checked by the same deterministic rules. Structured questions, approvals, payments and sends do not change: they stay rule-based and approval-gated.
6. Optional: `npm run eval` with the key set produces the live-model column in `tests/eval/RESULTS.md`.

## 5. Demo script (about 5 minutes)

Click **Walkthrough** in the bottom bar (or `Shift` + `D`) and follow the nine steps:

1. **Install, or continue without a bank.** Choose "No" at the bank step. Point out the "Bank not connected" chip.
2. **Your ledger vs the network.** Toggle "Your data only" (₹75,000 · 21 days) against consented, aggregated network evidence (₹60,000 · 14 days).
3. **Explainable approval.** The confirmation shows current → after, the reference contract values, the reasons, and what happens to the ₹78,400 already owed. Confirm.
4. **Undo.** Undo restores ₹1,00,000 · 30 days and reopens the request; Activity keeps both the approval and the reversal.
5. **Failed collection → partial.** In the link sheet, type ₹25,000 as the minimum (rejected inline), then ₹10,000 or keep ₹5,000. Send (simulated), then "Buyer pays the minimum".
6. **Balance paid.** "Buyer pays the balance": the recovery completes, its steps stop, and it drops out of Actions and the Overview.
7. **Reconcile before follow-up.** Verma Retail's reminder is held until the ₹26,500 credit is matched; matching updates the invoice and cancels the reminder.
8. **Same status everywhere.** Ask "Gupta Traders ka payment kya hua?" on WhatsApp, then on mobile: both read the same ledger. Try "Gupta ka payment kya hua?" to see the clarifying question.
9. **What ran.** Open Checks: live journey and policy checks, plus the recorded unit and browser runs for this build.

## 6. Honest remaining limitations

* All data is synthetic and every integration is simulated. Nothing is sent, collected or written outside the browser.
* Live AI has not been run against a real model in this build; only mocked provider responses were tested.
* A payment applied to the ledger cannot be reversed from the UI; credit decisions can.
* The policy weights are illustrative, not validated on real repayment data. No interviews, pilot results, impact numbers, partnerships, integration status or regulatory approvals are claimed.
* Rule-based answers are English with a short Hinglish line, and understand Devanagari only for names and digits.
* Some showcase content is still scenario-specific copy (the morning brief, the Gupta credit card in Ray AI, the kirana journey), though every number in it is read from the engine or the ledger.
* The in-browser journey checks call the same commands as the buttons but do not click; real clicks are covered by the recorded Playwright suite.
* The serverless rate limit is per warm instance, not global.
