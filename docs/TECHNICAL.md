# RAY Credit: technical notes

RAY Credit is a concept prototype for Razorpay Agent Studio (Razorpay x ISB AI PM Build Challenge, track: Recover and Grow with AI). It runs on synthetic data and connects to no real account, bank or WhatsApp number. This document explains what is actually implemented, what is simulated, and how a recommendation is produced.

## 1. Architecture

```
DATA SOURCES (sample data / mocked)
  Marg-style ledger · Razorpay payment events · Connected Banking+ feed · WhatsApp replies · consented network signals
        │
DATA PROCESSING                     lib/events.js, lib/dataset.js, src/modules/engine.js
  event normalisation · invoice ledger · de-duplication · consent and coverage checks · freshness
        │
AI UNDERSTANDING                    api/parse-promise.js  (+ lib/promise-rules.js checks)
  Hinglish promise / dispute / payment-claim extraction → deterministic validation
        │
CREDIT POLICY ENGINE                lib/policy.js
  deriveBuyerSignals() → evaluateCredit() → band, limit, terms, reasons, contributions
        │
MERCHANT ACTION                     src/modules/actions.js, lib/guards.js
  review · edit · approve · send-time controls (DNC, weekly limit, quiet hours, channels, stale data)
        │
OUTCOMES                            applyRepaymentEvent()
  payment received · promise kept or missed · debit failed · dispute opened or resolved
        │
UPDATED REPAYMENT FEATURES → next evaluateCredit() → "What changed since the last decision?"
```

The front end is still one self-contained `index.html` (vanilla JS, string templates, hash router). `scripts/build.py` concatenates `lib/*.js` (pure logic) and `src/modules/*.js` (screens) into it. The same `lib/` files are `require`d by the Vercel function and by the tests, so the browser, the API and the test suite run identical rules.

| Layer | Files | Status |
|---|---|---|
| Credit policy engine | `lib/policy.js` | Working logic |
| Event model and ledger | `lib/events.js` | Working logic |
| Send-time controls | `lib/guards.js` | Working logic |
| Interpreter checks + fallback parser | `lib/promise-rules.js` | Working logic (fallback is rule-based, not AI) |
| LLM endpoint (self-hosted) | `api/parse-promise.js` | Working when an API key is configured |
| Credit decisions (approve, keep, undo) | `src/modules/credit-decisions.js` | Working logic: one command path for every surface; exact values, once; full-state undo with `CREDIT_REVERSED` |
| Payment truth (balances, recovery, sources) | `src/modules/payment-truth.js` | Working logic: `recoveryOf`, `paymentStatus`, `payCheck`/`sourcesLine`, `ledgerPay` (the only way money is applied) |
| Answers for Ray AI, WhatsApp, mobile | `src/modules/answers.js` | Working rule-based handler from current data; optional live AI only for free-form questions |
| Optional live AI for free-form questions | `api/ask.js` | Working when an API key is configured; otherwise 503 and the page uses its rule-based answer |
| Claude in the page | `src/modules/engine.js` (`claudeSample`) | Used only if the page runs where Claude access is granted; off on the Vercel deployment |
| Checks page | `src/modules/checks.js` | Live policy and journey checks in the browser; recorded dev-suite results embedded at build time |
| Daily chase plan | `src/modules/core.js` (`planItem`, `syncChase`) | Working logic, rebuilt on every ledger change |
| Computed collection lists | `src/modules/collections.js` (`syncLists`) | Working logic over ledger events, mandates and payment signals |
| Checks, learning loop, How it works | `src/modules/workspace.js` (`runChecks`, `policyProposal`, `vHow`) | Working logic; outcome history is synthetic |
| Sample portfolio | `lib/dataset.js` | Seeded sample data, dates shifted onto today |
| Engine bridge (single source of truth) | `src/modules/engine.js` | Working logic |
| Explanations, outcomes, interpreter UI, disclosures | `src/modules/explain.js` | Working logic |

## 2. What is implemented, simulated and proposed (mock manifest)

| Component | Working | Simulated | Proposed |
|---|---|---|---|
| Credit decisions (bands, limits, terms, reasons) for all 642 buyers | ✓ rule-based engine | | |
| "How RAY reached this recommendation" panel | ✓ built from engine output | | |
| Repayment events → signals → new recommendation ("What changed") | ✓ | | |
| Merchant approval for limit, terms and bulk messages | ✓ enforced | | |
| Payment promise extract → edit → confirm → collections | ✓ | | |
| Do not contact, weekly limit, quiet hours (IST), channels, stale ledger, payment review | ✓ enforced at send time | | |
| Per-buyer network consent (request, accept, decline, revoke, dispute, coverage, recency) | ✓ | buyer responses are simulated buttons | |
| Hinglish interpretation by an LLM | ✓ when `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) is set | rule-based fallback otherwise, labelled "not AI" | |
| Marg ERP ledger and sync | | ✓ demo connector | |
| Razorpay payment events, Smart Collect, Payment Links | | ✓ | |
| Bank feed via RazorpayX Connected Banking+ | | ✓ | |
| WhatsApp delivery and buyer replies | | ✓ | |
| UPI Autopay / eNACH mandates and debits | | ✓ | |
| Razorpay network repayment signals | | ✓ sample data, aggregated | production network |
| Credit approvals written to the ledger | | ✓ mock ledger in browser state | |
| RAY Payment Passport | | | ✓ |
| Regulated financing via a lending partner | | | ✓ (separate from trade-credit decisions) |
| WhatsApp Business inbox integration | | ✓ concept screen | ✓ |

The same manifest is visible in the app: **Concept prototype ⓘ** in the surface switcher opens "About this demo"; "Behind RAY" shows the architecture with each stage tagged.

## 3. Where the LLM is used, and where it is not

* **Answers on every surface start rule-based.** `ruleAnswer()` (answers.js) answers buyer, invoice, balance, credit and payment-status questions from the current ledger and engine, in English with a short Hinglish line for Hinglish questions. Ambiguous names (two "Gupta" businesses) get a clarifying question; anything it cannot match gets "I won’t guess" plus examples. Only those unmatched questions go to live AI, and only if a provider is actually configured (`/api/ask` with a server key) or the page runs with Claude access. Every answer is labelled with its source.
* **LLM (when configured):** reads unstructured buyer replies into structured JSON (`/api/parse-promise`), drafts reminder messages, and answers free-form questions (`/api/ask`) from a snapshot of the merchant's current data. Drafts must contain the exact amount, no link, no threats and no mention of other distributors; Ask RAY answers flag any rupee amount not found in the data; reply readings are checked against the message. It never sets a limit, a band, a balance or a policy, and never sends anything.
* **Rule-based:** every credit recommendation, band, limit, term, explanation, early warning, portfolio figure, control and feedback-loop update.
* **No model training.** Outcomes update the buyer's derived signals and the same policy re-runs. Separately, RAY compares on-time payment by follow-up timing and suggests a follow-up policy change only when another timing does at least 8 points better on 30+ reminders; the owner approves it, it is versioned, and it can be undone. Credit policy weights are never changed this way. The outcome history behind the suggestion is synthetic in this prototype.

## 4. Model provider and endpoint

`POST /api/parse-promise` (Vercel Node.js function, `api/parse-promise.js`)

Request: `{ message, outstanding, invoiceId, buyerName, messageDate (YYYY-MM-DD…), currentDate }` · max 8 KB body, message ≤ 1,000 characters.
Response (200): `{ ok, mode:"ai", provider, model, interpretation, checks[], canConfirm, paymentVerified:false, requiresMerchantConfirmation:true }`.
`GET /api/parse-promise` returns `{ configured, provider, model }` so the UI can say honestly whether live AI is on.

* Provider: OpenAI Chat Completions with `response_format: json_schema` (strict), temperature 0. Optional Anthropic Messages API with forced tool output (`AI_PROVIDER=anthropic`).
* Schema (`lib/promise-rules.js → SCHEMA`): `intent` (promise · payment_claim · dispute · extension_request · general_query · unclear), `promisedAmountNow`, `firstPaymentDate`, `promisedAmountLater`, `promisedDate`, `currency`, `isConditional`, `amountInferred`, `dateInferred`, `needsClarification`, `confidenceLabel`, `evidenceSpans`, `reasoningSummary`, `suggestedNextAction`. `firstPaymentDate` was added to the suggested schema so "₹5,000 tomorrow, rest Friday" can carry two dates.
* Prompt-injection handling: the message is wrapped in `<buyer_message>` tags and declared untrusted; instructions inside it are never followed; a deterministic pattern check also flags such messages for manual review.
* **Deterministic checks after extraction** (`validateInterpretation`): schema and enum coercion · negative amounts removed · every amount must appear in the message or be a permitted derivation (half, remaining, full) of the supplied outstanding, otherwise it is removed · amounts above the outstanding force clarification · dates must be valid, not before the message date, ≤120 days out, and supported by a date expression in the message · weekday dates are re-resolved from the message date · vague dates ("agle hafte", "Diwali ke baad") are nulled · conditional or incomplete promises cannot be confirmed · payment claims are never verified and are routed to reconciliation · disputes are routed to dispute review · evidence spans must be substrings of the message.
* Failure handling: missing key → 503 `AI_NOT_CONFIGURED`; timeout (default 12 s) → 504; provider 429 → 429; other provider errors → 502; invalid model output → 502. Per-instance rate limit of 20 requests per minute per IP. Errors never echo the buyer message, and nothing about messages or amounts is logged.
* `claimedAmount` (added in this build): the amount a buyer says they already paid. It is always an unverified claim, must be stated in the message (never derived), and a message such as "मैंने 5000 भेज दिए हैं, बाकी सोमवार को दूँगा।" becomes a payment claim of ₹5,000 plus a promise of the remaining balance by Monday.
* **Hinglish and Devanagari.** `normalizeMessage()` maps common Devanagari words and digits to romanised Hinglish at word level (keeping a map back to the original text), so one rule set validates both scripts and evidence spans stay exact substrings of the original message. Dates are resolved in IST from the message date (the demo clock, Mon 5 Oct 2026): "kal", "parso", weekdays (Hindi and English), "20 ko"/"20 tarikh", "month end". Self-corrections ("kal, nahi parso") and alternatives ("kal ya parso") force clarification; "abhi nahi, kal" does not.
* **Data minimisation.** The model receives the message, invoice id, outstanding amount and dates; the buyer name, phone, GSTIN and any other distributor's data are not sent.
* **UI labels (exact):** "Live AI · provider/model" when a model answered; "Rule-based fallback · AI not configured" when no provider is set; "AI unavailable · Rule-based fallback" (with the reason) when a configured call failed; "Needs merchant confirmation" until the merchant confirms. Rule-based output is never shown as AI. Nothing reaches the ledger until the merchant confirms, and a claim only ever becomes `PAYMENT_CLAIMED` (balance unchanged, reminders held).
* `/api/ask` additionally discards any model answer that cites a rupee amount not present in the data it was given (`502 UNSUPPORTED_AMOUNT`), and the page then falls back with the "AI unavailable · Rule-based fallback" label.
* **Rate limiting caveat:** both endpoints allow 20 requests per minute per IP, counted in memory per warm serverless instance. Instances do not share counts and a cold start resets them; production needs a shared store (for example Redis or Vercel KV).

## 5. Credit policy (illustrative)

`lib/policy.js → POLICY`, version **RAY-TC-0.4**. An illustrative trade-credit policy, **not a validated credit score**; it produces no default probabilities.

**Risk index** = sum of signal points, clamped to 0–100.

| Signal | Rule (points) |
|---|---|
| Average days to pay vs the buyer's usual | ≥10 days slower +20 · 6–9 +12 · 3–5 +6 · 2+ faster −4 |
| Invoices paid on time, 6 months | <50% +8 · 50–74% +4 · ≥90% −4 |
| Trajectory, last 3 invoices | each slower +6 · each faster −2 |
| Oldest undisputed overdue | ≥30 days +10 · 15–29 +5 (disputed amounts excluded) |
| Monthly orders vs 3 months ago | ≤−25% +8 · −10 to −24% +4 · ≥+10% −2 |
| Exposure vs reference limit | ≥90% +6 · 75–89% +3 |
| Buying from you | <6 months +4 · ≥3 years −2 |
| Missed payment promises, 90 days (merchant-confirmed) | 1 +4 · 2 +8 · 3+ +14 (disputed invoices never count) |
| Autopay / eNACH failures, 60 days | 1 +4 · 2 +10 · 3+ +14 (never marked as default) |
| Consecutive on-time automatic collections | ≥6 −6 |
| GST registration inactive (unverified) | +8 and hold the limit until verified |
| Partial payments, payment claims, disputes | 0 points (balance and routing only) |

**Bands:** Reliable < 25 · Watch 25–59 · Risky ≥ 60.

**Limits:** Reliable keeps the reference limit; Watch 75%; Risky 50%; rounded to ₹5,000; floor ₹10,000. The reference limit is the buyer's established line; risk reductions are overlays on it and never compound on earlier RAY-adjusted limits.

**Terms:** ladder 30 → 21 → 14 → 7 days. Watch at most 21; Risky 7; a Reliable buyer who is slowing (≥3 days slower, worsening trajectory) moves one step shorter with no limit change.

**Reference vs current vs proposed.** Every record carries reference (contract) values `refLimit` and `refTerms`, separately from the current approved `limit` and `terms`. Proposals derive from the reference only, so approving ₹60,000 · 14 days re-evaluates to ₹60,000 · 14 days, not 7 (the bug fixed in this build: Watch terms used to be `min(currentTerms, 21)` and the network step then shortened the already-approved 14). An approved increase becomes the new reference (limit and terms); a reduction never does. Evaluation is idempotent: re-running it any number of times after an approval returns the same proposal.

**Increases:** only for Reliable buyers with ≥90% on time, no failures, no missed promises and delay within 2 days of usual, and only with a trigger (a credit request, or ≥6 consecutive on-time automatic collections). Up to +⅓ of the reference limit per review, sized to the request when there is one (rounded up to ₹10,000); one increase per 90 days.

**Consented network evidence** (used only if the distributor participates AND the buyer's consent is available AND ≥4 participating distributors AND the signal is ≤45 days old AND the buyer has not disputed it):
* adverse (typical days to pay up ≥5) and your own data already shows Watch/Risky → *corroborated*: limit −20%, terms one step shorter;
* adverse but your own data says Reliable → *uncorroborated*: move to Watch, hold limit and terms, no increases, early follow-up, human review;
* stable or improving → no adjustment (supports the recommendation).

**New buyers:** starter ₹50,000 · 15 days. With eligible consented network evidence showing payment within 21 days: ×3 (≥5 distributors) or ×2 (4 distributors), capped at ₹1,50,000, 21 days.

**Confidence** = evidence sufficiency (High ≥6 points, Medium 3–5, Low ≤2): repayment history (≥6 invoices 2, 3–5 1), ≥2 promises 1, ≥4 automatic collection attempts 1, order history 1, network evidence that agrees 1; stale ledger −2; unverified GST −1. It is not a probability.

**Human review** is flagged for: Risky band, any limit reduction, own data and network disagreeing, Low confidence, unverified GST, open disputes, a ledger older than 24 hours, first credit for a new buyer.

**Guardrails in every output:** applies prospectively to new credit only; any amount already outstanding above a lower limit stays due; supply is never suspended automatically; no rejection or change without merchant approval.

Featured scenarios produced by these rules (not special-cased; tests check the policy source never mentions a buyer):

| Buyer | Your data only | With eligible network | Rule that makes the difference |
|---|---|---|---|
| Gupta Traders | Watch · ₹75,000 · 21 days | Watch · ₹60,000 · 14 days | corroborated adverse network −20% |
| Chawla Enterprises | Reliable · ₹60,000 · 30 days | Watch · limit held | uncorroborated adverse network |
| New Life Stores (no consent / consent) | ₹50,000 · 15 days | ₹1,50,000 · 21 days | new-buyer network uplift |
| Sethi Mart | Reliable · ₹80,000 (increase) | same | 6 on-time Autopay collections |
| Gupta after failed Autopay + ₹5,000 partial + missed promise | Risky · ₹50,000 · 7 days | Risky · ₹40,000 · 7 days | risk index crosses 60 |

Two showcase numbers changed because the rules now compute them: Bansal General Store ₹80,000 → ₹60,000 (Risky = 50% of ₹1,20,000), Mehta Enterprises' request is offered on 21-day terms (one step shorter) instead of 14.

### Live dates

The scenario was authored against an anchor of **Mon 5 Oct 2026**. `lib/dataset.js` computes `TODAY` from the real IST clock, `SHIFT = diffDays(TODAY, ANCHOR)`, and exports `D(iso) = addDays(iso, SHIFT)`. Every authored date — invoice issued and due dates, the seeded `AUTOPAY_FAILED` event, seeded outbox entries and activity rows — passes through `D()`, so relative timing is preserved exactly (an invoice two days overdue at the anchor is two days overdue today) while the workspace always reads as of today. `TREND_MONTHS` derives the six-month repayment-trend labels from the current month. The header chip shows today's date and the current IST time, refreshed every 30 seconds; the session clock (`nowT()`) starts at the real time of day. Relationship start dates (`since`) are historical and are not shifted.

Pin the date for deterministic tests: `RAY_TODAY=YYYY-MM-DD` (Node) or `?date=YYYY-MM-DD` (browser). All four browser suites load the page with `?date=2026-10-05`, so their assertions stay anchored while the deployed app runs on the real date. Reader checks on the Checks page resolve against the Monday of the current week, so weekday phrases ("Monday", "Friday") and relative ones ("kal", "parso") behave as written.

### Credit-release arithmetic

`lib/credit-math.js` `releasePlan({outstanding, requested, limit, collected?})` is the only place that computes how much of a requested order can go on credit: headroom = max(0, limit − outstanding); collect before the full order = outstanding + requested − limit (null when the order exceeds the limit itself); `after(c)` gives the balance and releasable amount after a collection. Outstanding always comes from the ledger (`outOf`). Every surface prints the sentence built from this plan (`releaseLine`, `releaseBreakdown`, `nextOrderLine` in `credit-requests.js`). Gupta: ₹78,400 + ₹50,000 − ₹60,000 = ₹68,400; after ₹38,400, ₹20,000 can be released.

## 6. Consent and data restrictions

* Two separate permissions: the **distributor's participation** (Controls → Razorpay network signal) and **each buyer's consent** (available, pending, denied, revoked, expired, none) plus **coverage** (≥4 participating distributors) and **recency** (≤45 days).
* Consent changes are events (`CONSENT_REQUESTED/GRANTED/DENIED/REVOKED`, `NETWORK_DISPUTED/…RESOLVED`). Revocation excludes network evidence from the next evaluation immediately; earlier decisions keep their audit record; access is never restored silently (a new request and acceptance are required).
* Only aggregated bands are shown ("10–14 → 24–30 days across 7 distributors"). No other distributor is named and no cross-distributor transactions are displayed. All network data in this prototype is synthetic.
* Cross-distributor repayment-data use remains subject to consent, privacy and legal review, potentially including applicable credit-information regulation. Calling the output a band rather than a score is not a regulatory safe harbour. Any regulated lending or invoice financing is separate from trade-credit decision support and needs its own lending and compliance framework.
* When adverse network information influences a decision, the buyer can ask to review it (simulated "buyer disputes this information"), which excludes it until the review is closed.
* **Evidence quality is an event too:** `NETWORK_SIGNAL_UPDATED` (simulated) changes a buyer's signal age or coverage, so "signal goes stale" or "coverage drops below 4" is recorded, recomputed and reversible ("restore signal").
* **The network card** (`netStory`, buyer profile and New Life credit check) shows the same policy run twice, *your ledger only* vs *with eligible network signals* (Gupta: ₹75,000 · 21 days vs ₹60,000 · 14 days), the six-step causal chain (history → eligible signal → corroboration → policy rule → adjustment → your approval), the five gates that decide inclusion (participation, consent, coverage, freshness, dispute) with the reason when excluded, controls to simulate each state, and the regulatory boundary. When participation is off the network column is shown as a comparison only and is not used.
* **Production pathway (proposed, not built):** participating-distributor data-sharing agreements; a legal basis and user permissions (consent alone does not authorise access to another distributor's data); data minimisation; identity matching with error handling; consent revocation and audit; privacy and credit-information regulation; fairness checks and a buyer dispute route; legal and compliance review. No RBI Account Aggregator access is assumed.

## 7. Repayment event model

`lib/events.js`. Each event has `id, type, buyerId, date (IST), invoice, amount, source, verification, actor, meta`.

Types: `CREDIT_APPROVED, CREDIT_KEPT, CREDIT_REVERSED, PROMISE_RECORDED, PROMISE_EDITED, PROMISE_KEPT, PROMISE_PARTIALLY_KEPT, PROMISE_MISSED, PROMISE_REOPENED, PAYMENT_RECEIVED, PAYMENT_PARTIALLY_RECEIVED, PAYMENT_CLAIMED, PAYMENT_RECONCILED, CLAIM_REJECTED, PAYMENT_REVERSED, AUTOPAY_FAILED, AUTOPAY_SUCCEEDED, DISPUTE_OPENED, DISPUTE_RESOLVED, CONSENT_REQUESTED, CONSENT_GRANTED, CONSENT_DENIED, CONSENT_REVOKED, NETWORK_DISPUTED, NETWORK_DISPUTE_RESOLVED, NETWORK_SIGNAL_UPDATED, GST_VERIFIED`.

**Payment correction (`PAYMENT_REVERSED`).** A recorded payment is never edited or deleted. Reversing it appends a compensating event with `meta.reverses` (the original id) and a required reason. The ledger rejects: an unknown payment, a non-payment event, a second reversal of the same payment, a different amount, buyer or invoice, and any reversal that would take an invoice above its invoice amount (stale or conflicting state). A reference becomes reusable only after its payment is reversed, so "recorded against the wrong invoice" is corrected by reversing and re-recording. A bank credit split across invoices (`meta.allocation`) is reversed as one group, all or nothing. The policy skips reversed payments (they are not on-time evidence), and a "promise kept" outcome reopened by a reversal (`PROMISE_REOPENED`) no longer counts as kept. In the UI (`src/modules/payment-reversal.js`): "Reverse recorded payment" on the buyer profile, the recovery screen and Activity opens a confirmation with the reference, amount, invoices, balance now and after, and the effect on recovery; confirming records the event, logs it in Activity ("ledger correction, not a refund"), reopens any payment review, commitment or reminder the payment had closed, and every surface re-reads the ledger. No money moves.

`applyRepaymentEvent(ledger, event)` is pure: verified payments reduce invoice balances and can never exceed them; a payment reference can only be applied once; `PAYMENT_RECEIVED` that leaves a balance becomes `PAYMENT_PARTIALLY_RECEIVED`; unverified payments must be `PAYMENT_CLAIMED` and never change balances; failed debits mark the invoice and change nothing else; disputes mark an amount as disputed.

## 8. How recommendations update

```
event → applyRepaymentEvent() → ledger
      → deriveBuyerSignals(record, ledger) → evaluateCredit(signals, {network}, POLICY, ctx)
      → compared with the last decision snapshot → "What changed since the last decision?"
      → merchant approves (CREDIT_APPROVED, limit applied) or keeps the current limit (CREDIT_KEPT)
```

* Every screen (Overview, Portfolio, buyer profile, request review, approval modal, Ray AI, RAY on WhatsApp, mobile) reads `recOf(id)`; values are memoised on a state signature and re-derived on every render.
* A partial payment reduces the balance and adds no risk; a verified on-time payment is positive evidence; an unverified claim changes nothing; a missed promise is negative; a disputed invoice is excluded; a failed debit is counted, never labelled a default.
* **Approval** (`creditProposal` → `holdProposal` → `creditApprove` → `applyCredit`): the confirmation captures the proposal with a one-time key; confirming applies exactly those values once (a second click or a second confirm of the same key is a no-op); if RAY's recommendation changed after the confirmation was shown, nothing is applied and the merchant is asked to review again.
* **Undo** (`undoCredit`) restores the complete prior state captured at approval time (limit, terms, reference raise, credit-request decision, decision snapshot and status, saved-for-later flag, legacy screen state) and records `CREDIT_REVERSED` with `meta.reverses`. The original approval stays in the ledger and Activity. A reversed increase no longer counts toward the 90-day increase cooldown. Request decisions (extend, offer terms, keep, follow up) go through the same path, so their Undo reverses the credit change too.
* **Payments** (`ledgerPay`): verified source, whole-rupee amount, never above the invoice balance (rejected, not clamped), and a payment reference that can be applied only once. Bank credits that span invoices are allocated oldest first (`ledgerPayAllocate`) and rejected if they exceed everything owed. A verified payment that clears an invoice cancels scheduled or queued reminders for it. Claims never change balances; a claim is closed only by a bank match (bank connected) or the merchant confirming receipt with a reference.
* **Recovery** status is derived, never stored: `recoveryOf(id)` reads the failed invoice's balance and the verified payments after the failure → open, action, partial, claimed or completed. A completed recovery drops out of every active list (Actions, Overview, mobile, answers) and its remaining steps stop; the next unpaid invoice is handled by the daily plan.
* **Sends** (`sendMessage` → `trySend` → `sendGate`) re-check every control at execution time for desktop single and bulk sends, recovery links, payment-review reminders, retailer payment links, mobile and WhatsApp follow-ups and scheduled sends. Every outbox item is marked `simulated`.
* **Payment sources** (`payCheck`, `sourcesLine`) list what was checked and what was not (bank not connected, paused, or a stale ledger), with freshness, and never turn "no matching payment found" into "the buyer has not paid".
* **Repayment setup after approval** belongs to one approved decision (`opId`). It opens only if that decision is still the applied one and the screen has not changed (`scheduleSetup`), reads the limit and terms from live state, and re-checks the decision before every step and before activating a mandate (`rsValid`). Undo cancels a pending setup and withdraws an open one (logged as "Repayment setup withdrawn"); a withdrawn setup cannot be re-rendered or confirmed. Undo buttons carry the decision id, so a double click reverses once. After navigating away, setup stays available from "Set up repayment" next to Undo.
* **Network comparison is a preview.** "With eligible network evidence" / "Your data only" is held in a page variable (not app state, not saved, not logged) and never changes participation, consent, approvals or actions. The recommendation you would approve is always shown alongside from the actual settings. Participation changes only in Controls. When the merchant does not participate, no network figures are computed for display.
* **Possible-payment override.** A reminder paused for an unreviewed possible payment can be sent only with a reason and an explicit confirmation (`A.overrideStart`), logged with approver, invoice, unresolved evidence and result. The override clears only that pause: Do not contact, paused automation, a stale ledger, a paid invoice, an unverified buyer claim, channel and weekly limits and quiet hours still apply, and the payment review stays open.
* **One evidence source for buyer facts.** `partialEvidence(id)` (part-paid promise history + partial payments verified in this demo) feeds the credit assessment, the recovery rationale and answers. With no evidence, recovery says "Allowing partial payment gives the buyer a way to start clearing the outstanding amount." Days to pay (invoice → payment) is labelled separately from days overdue, and a part-paid invoice shows what is already recorded before saying what is still being searched for.
* **Payment reversal** (`payReverse`) is idempotent (op key per payment), validated before anything is written, and applies to every part of a split payment or none; see section 7.
* Events and decisions live in app state and, by default, in this browser's `localStorage` (toggle in "What is real"). **Reset workspace** asks for confirmation, then clears both and restores today's baseline.

## 9. Testing approach and results

| Suite | Command | What it covers |
|---|---|---|
| Unit: policy, ledger, controls, dataset, interpreter | `npm test` | policy rules, feedback loop, request verdicts, interpreter checks, no special-casing |
| Unit: reported journeys | `npm test` (`tests/journeys.test.js`) | exact ₹60,000 · 14 days, no compounding, reversed increase, partial and full repayment, overpayment and duplicates, claims, link minimums, every send safeguard |
| API with mocked providers | `npm test` (`api.test.js`, `ask-api.test.js`) | configuration status, missing key, timeouts, invalid output, cleaned actions |
| Browser journeys (real clicks) | `npm run test:e2e` | the 12 reported journeys across desktop, Actions, Overview, WhatsApp, mobile and Ray AI, plus AI fallback honesty and every route |
| Browser smoke and guided demos | `npm run test:ui` | install, network toggle, approval, recovery, promise editing, DNC, reset, every route, both guided demos |
| Unit: reversal and network | `npm test` (`reversal.test.js`, `network.test.js`) | compensating events, duplicates, unknown and partial reversals, split payments, ref reuse, policy effects; network on/off, consent states, coverage, staleness, disputes, disagreement, new buyer, no special-casing |
| Live provider | `npm test` (`live-provider.test.js`) | runs only when a provider key is set; otherwise **skipped and reported as not run** |
| Browser journeys, extra | `npm run test:e2e` | payment reversal by clicks across surfaces, interpreter (rule-based), the live-AI UI path against a **mocked** endpoint over http, network consent states by clicks, walkthrough never acting on navigation, the main journey twice from reset |
| Responsive layout | `npm run test:responsive` | 1440×900, 1280×800, 768×1024, 390×844: no page-level horizontal overflow, headings and buttons inside the viewport, modals fit, mobile surface opens |
| Record everything for the Checks page | `npm run test:all` | runs all of the above against the current build and embeds the results |

Results for this build are in `tests/results/*.json` and on the in-app **Checks** page, which separates: (1) live in-browser journey checks and (2) live policy checks, run in the viewer's browser; (3) recorded unit tests; (4) recorded Playwright tests; (5) AI endpoint tests with a mocked provider; (6) the live-provider test, shown as "Not run" unless a key was configured; and (7) what no test covers. Counts come from the runs; failures are listed, never hidden. See `docs/QA-REPORT.md` for the current numbers.

Interpreter evaluation (`tests/eval/RESULTS.md`, 54 hand-labelled Hinglish and Devanagari messages), rule-based fallback only. The fallback was written and tuned alongside the dataset, so its scores there show it is safe for the demo, not that it generalises, and they are not an AI result. **The live model evaluation was not run** because no API key was available in the build environment.

## 10. Local setup

```bash
python3 scripts/build.py          # bundle lib/ + src/ into index.html
open index.html                   # works offline; the interpreter uses the labelled fallback
npm test                          # unit + API tests (Node 18+, no dependencies)
pip install playwright && npm run test:e2e   # browser journey tests (Chromium)
npm run test:all                  # every suite, results embedded into the Checks page
npm run eval                      # interpreter evaluation; live model only if a key is set
```

To try the live endpoint locally, run `vercel dev` with `OPENAI_API_KEY` in your environment.

## 11. Vercel deployment

The project still deploys as static `index.html` at the repository root, plus one serverless function in `api/`. No framework preset, build command or output directory is needed (Vercel detects `api/*.js` automatically; `package.json` has no `build` script on purpose).

## 12. Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | for live AI | none | OpenAI key, server-side only |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | any model that supports JSON-schema structured outputs |
| `ANTHROPIC_API_KEY` | optional | none | alternative provider |
| `ANTHROPIC_MODEL` | no | `claude-haiku-5-5` | |
| `AI_PROVIDER` | no | OpenAI if its key is set | `openai` or `anthropic` |
| `AI_TIMEOUT_MS` | no | `12000` | provider timeout |

Set them in Vercel → Project → Settings → Environment Variables (Production), then redeploy.

## 13. Known limitations

* All portfolio data is sample data. Integrations (ERP, bank feed, WhatsApp, mandates, network) are simulated in the browser; "approvals written to the ledger" update browser state only.
* The policy weights are illustrative and were calibrated so the scenarios are plausible; they have not been validated on real repayment data.
* Signals for the 626 generated buyers are deliberately steady background; only the 16 scenario buyers carry recent changes and detailed history.
* The 30-day collections forecast is a rule (Reliable buyers' invoices due in 30 days plus approved commitments), not a prediction model.
* The live LLM paths (`/api/parse-promise`, `/api/ask`) have been tested with mocked provider responses only (server functions and the browser UI path); they have not been run against a real model in this build, and live AI is off on the public deployment until a key is set.
* In-browser journey checks call the same commands as the buttons but do not click; real clicks are covered by the Playwright suite, whose results are recorded at build time.
* Payment reversal corrects the synthetic ledger only. A real product would also need bank-side reconciliation, maker-checker approval for corrections, and reversal of downstream accounting entries in the ERP.
* The rule-based fallback parser handles common Hinglish and Devanagari forms; it uses a fixed vocabulary and will miss unseen phrasings (the live model path is meant for those).
* The in-memory API rate limit is per warm serverless instance, not global.
* Reminder-policy suggestion: of 1,350 synthetic reminder outcomes, 176 are for Watch buyers (65 at 3 days, 49 at 7, 62 at 10 days before due); the 56 % vs 47 % comparison is an observed 9-point difference in example cohorts, not a causal result, and needs a pilot.
* The guided demo still advances a simulated clock and calendar (Mon 5 Oct, IST) for quiet hours, scheduled messages and missed promises. The top bar labels it **Demo clock**.
* The desktop dashboard is designed for desktop; below 900 px the sidebar collapses behind a menu button and grids stack. Phone users get the best experience in RAY Credit for Mobile.
* Some scenario copy remains illustrative by design (Razorpay dashboard sample KPIs, the buyer's original request text, salesperson names); amounts that change with user actions are read from state.
