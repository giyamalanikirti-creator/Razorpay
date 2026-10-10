# RAY Credit: technical notes

RAY Credit is a concept prototype for Razorpay Agent Studio (Razorpay x ISB AI PM Build Challenge, track: Recover and Grow with AI). It runs on synthetic data and connects to no real account, bank or WhatsApp number. This document explains what is actually implemented, what is simulated, and how a recommendation is produced.

## 1. Architecture

```
DATA SOURCES (synthetic / mocked)
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
| Claude in the page | `src/modules/engine.js` (`claudeSample`) | Working when the page is opened in Claude (artifact `sample` capability); rule-based fallback otherwise |
| Daily chase plan | `src/modules/core.js` (`planItem`, `syncChase`) | Working logic, rebuilt on every ledger change |
| Ask RAY (open questions) | `src/modules/whatsapp-and-ray-ai.js` (`askRay`) | Working with Claude; read-only page tools; amounts checked against data |
| Computed collection lists | `src/modules/collections.js` (`syncLists`) | Working logic over ledger events, mandates and payment signals |
| Checks, learning loop, How it works | `src/modules/workspace.js` (`runChecks`, `policyProposal`, `vHow`) | Working logic; outcome history is synthetic |
| Synthetic portfolio | `lib/dataset.js` | Synthetic data, seeded |
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
| Razorpay network repayment signals | | ✓ synthetic, aggregated | production network |
| Credit approvals written to the ledger | | ✓ mock ledger in browser state | |
| RAY Payment Passport | | | ✓ |
| Regulated financing via a lending partner | | | ✓ (separate from trade-credit decisions) |
| WhatsApp Business inbox integration | | ✓ concept screen | ✓ |

The same manifest is visible in the app: **Concept prototype ⓘ** in the surface switcher opens "About this demo"; "Behind RAY" shows the architecture with each stage tagged.

## 3. Where the LLM is used, and where it is not

* **LLM (Claude in the page, or `/api/parse-promise` when self-hosted):** reads unstructured buyer replies into structured JSON, drafts reminder messages, and answers open questions in Ask RAY from read-only page data. Drafts must contain the exact amount, no link, no threats and no mention of other distributors; Ask RAY answers flag any rupee amount not found in the data; reply readings are checked against the message. It never sets a limit, a band, a balance or a policy, and never sends anything.
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
* In the UI, when the endpoint is unavailable the clearly labelled **"Rule-based demo parser · not AI"** runs instead, with the reason (for example "AI is not configured on this deployment").

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

## 6. Consent and data restrictions

* Two separate permissions: the **distributor's participation** (Controls → Razorpay network signal) and **each buyer's consent** (available, pending, denied, revoked, expired, none) plus **coverage** (≥4 participating distributors) and **recency** (≤45 days).
* Consent changes are events (`CONSENT_REQUESTED/GRANTED/DENIED/REVOKED`, `NETWORK_DISPUTED/…RESOLVED`). Revocation excludes network evidence from the next evaluation immediately; earlier decisions keep their audit record; access is never restored silently (a new request and acceptance are required).
* Only aggregated bands are shown ("10–14 → 24–30 days across 7 distributors"). No other distributor is named and no cross-distributor transactions are displayed. All network data in this prototype is synthetic.
* Cross-distributor repayment-data use remains subject to consent, privacy and legal review, potentially including applicable credit-information regulation. Calling the output a band rather than a score is not a regulatory safe harbour. Any regulated lending or invoice financing is separate from trade-credit decision support and needs its own lending and compliance framework.
* When adverse network information influences a decision, the buyer can ask to review it (simulated "buyer disputes this information"), which excludes it until the review is closed.

## 7. Repayment event model

`lib/events.js`. Each event has `id, type, buyerId, date (IST), invoice, amount, source, verification, actor, meta`.

Types: `CREDIT_APPROVED, CREDIT_KEPT, PROMISE_RECORDED, PROMISE_EDITED, PROMISE_KEPT, PROMISE_PARTIALLY_KEPT, PROMISE_MISSED, PAYMENT_RECEIVED, PAYMENT_PARTIALLY_RECEIVED, PAYMENT_CLAIMED, PAYMENT_RECONCILED, CLAIM_REJECTED, AUTOPAY_FAILED, AUTOPAY_SUCCEEDED, DISPUTE_OPENED, DISPUTE_RESOLVED, CONSENT_REQUESTED, CONSENT_GRANTED, CONSENT_DENIED, CONSENT_REVOKED, NETWORK_DISPUTED, NETWORK_DISPUTE_RESOLVED, GST_VERIFIED`.

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
* Events and decisions live in app state and, by default, in this browser's `localStorage` (toggle in About this demo). **Reset demo** clears both and restores the Monday 9 AM baseline.

## 9. Testing approach and results

| Suite | Command | What it covers | Result (this build) |
|---|---|---|---|
| Unit: policy, ledger, controls, dataset | `npm test` | the 20 required functional checks that are pure logic, feedback loop, request verdicts, no special-casing | 37 tests, 37 passed (with the two suites below) |
| Unit: interpreter rules | `npm test` | the six spec examples, injection, fabricated amounts and dates, past dates, weekday resolution, request validation | included above |
| API with mocked provider | `npm test` | GET status, missing key, valid output, fabricated output, invalid JSON, timeout, 429, 5xx, size limits, Anthropic path | included above |
| Browser smoke | `python3 tests/ui_smoke.py` | open, install, Gupta, network toggle, approval, recovery, promise edit, DNC, reset, every route, both demos, no uncaught errors | 20 checks, 20 passed |
| Interpreter evaluation | `npm run eval` | 40 hand-labelled Hinglish messages | see `tests/eval/RESULTS.md` |

Interpreter evaluation (`tests/eval/RESULTS.md`), rule-based fallback only: intent 97.5%, amounts 100%, dates 95.0%, clarification behaviour 97.5%, never confirmable when clarification was needed 100%. The fallback was written alongside the dataset, so this shows it is safe for the demo; it is not an AI result. **The live model evaluation was not run** because no API key was available in the build environment. Set `OPENAI_API_KEY` and run `npm run eval` to produce it.

Required checks 15 (promise edit saves the real values), 18 (approval required), 19 (reset) are covered in the browser suite; the rest in the unit suites.

## 10. Local setup

```bash
python3 scripts/build.py          # bundle lib/ + src/ into index.html
open index.html                   # works offline; the interpreter uses the labelled fallback
npm test                          # unit + API tests (Node 18+, no dependencies)
pip install playwright && python3 tests/ui_smoke.py   # browser smoke tests (Chromium)
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
| `ANTHROPIC_MODEL` | no | `claude-haiku-4-5` | |
| `AI_PROVIDER` | no | OpenAI if its key is set | `openai` or `anthropic` |
| `AI_TIMEOUT_MS` | no | `12000` | provider timeout |

Set them in Vercel → Project → Settings → Environment Variables (Production), then redeploy.

## 13. Known limitations

* All data is synthetic. Integrations (ERP, bank feed, WhatsApp, mandates, network) are simulated in the browser; "approvals written to the ledger" update browser state only.
* The policy weights are illustrative and were calibrated so the scenarios are plausible; they have not been validated on real repayment data.
* Signals for the 626 generated buyers are deliberately steady background; only the 16 scenario buyers carry recent changes and detailed history.
* The 30-day collections forecast is a rule (Reliable buyers' invoices due in 30 days plus approved commitments), not a prediction model.
* The live LLM path has been tested with mocked provider responses only; it has not been evaluated against a real model in this build.
* The rule-based fallback parser handles common Hinglish forms but misses some (for example "20 ko 12000", conditionals with "ho gaya to kal").
* The in-memory API rate limit is per warm serverless instance, not global.
* The guided demo still advances a simulated clock and calendar (Mon 5 Oct, IST) for quiet hours, scheduled messages and missed promises.
