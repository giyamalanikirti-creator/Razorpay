# QA report: live AI, network evidence, payment correction and judgeability

Scope: the master implementation pass on top of commit `0dd63ba`. Everything below was run in the build environment (Linux, Node 22, Python 3.13, Playwright Chromium) against the built `index.html`. Numbers come from `tests/results/*.json`; nothing is typed in by hand.

## 1. Baseline (before changes, commit 0dd63ba)

| Suite | Result |
|---|---|
| `npm test` (unit + mocked API) | 52 / 52 |
| `npm run test:e2e` | 96 / 96 |
| `npm run test:ui` | 23 / 23 |
| `npm run eval` (rule-based, 40 items) | intent 97.5 %, amounts 100 %, dates 95 %; misses on items 15, 39, 40 |

Gaps found in the audit: rule-based labels did not match the required wording; Devanagari replies were read as "unclear"; "20 ko 12000" was read as today; a claimed-plus-promised reply had no place for the claimed amount; Ask RAY could not answer "why is the reminder on hold", "what changed after the failed payment", "what if I turn off network data" or "which recovery actions need my approval"; there was no way to reverse a recorded payment; the network comparison had hardcoded months, lead time and the Chawla debit amount; consent states existed but stale or insufficient evidence could not be simulated; the pilot did not separate thresholds from results; the desktop overflowed horizontally at 1280 px and was unusable at 768 and 390 px.

## 2. Results for this build

| Suite | Command | Total | Passed | Failed | Skipped / not run | Where |
|---|---|---:|---:|---:|---:|---|
| Unit: policy, ledger, reversal, network, interpreter, journeys | `npm test` | 62 | 62 | 0 | 0 | `tests/results/unit.json` |
| AI endpoints with a **mocked** provider | `npm test` | 17 | 17 | 0 | 0 | `tests/results/api.json` |
| Live AI provider | `npm test` | 0 | 0 | 0 | 1 skipped (no key) | `tests/results/live.json` |
| Browser journeys (Playwright, real clicks) | `npm run test:e2e` | 142 | 142 | 0 | 0 | `tests/results/e2e.json` |
| Browser smoke + both guided demos | `npm run test:ui` | 23 | 23 | 0 | 0 | `tests/results/smoke.json` |
| Responsive layout (1440, 1280, 768, 390 px) | `npm run test:responsive` | 48 | 48 | 0 | 0 | `tests/results/responsive.json` |
| Live in-browser checks (Checks page) | open **Checks** | 16 journeys + 36 policy | 52 | 0 | 0 | run at page load |
| Interpreter eval, rule-based fallback (54 items) | `npm run eval` | 54 | all metrics 100 % | none | live model not run | `tests/eval/RESULTS.md` |

`npm run test:all` ran every suite above, then rebuilt `index.html` with the results embedded (the build id does not change when results are embedded).

**What these do not show.** No real AI model was called (no key in the build environment); the live-AI UI path and both endpoints were exercised against mocked responses only. The rule-based eval set was extended alongside the parser, so 100 % there shows the fallback is safe on these phrasings, not that it generalises. Layout checks are mechanical (overflow, viewport fit); visual quality was reviewed by eye on screenshots.

## 3. What changed, and the evidence

* **Live AI, honest states.** Exact labels: "Live AI · provider/model", "Rule-based fallback · AI not configured", "AI unavailable · Rule-based fallback" (with reason), "Needs merchant confirmation". Evidence: e2e `MOCK-AI` (7 checks, mocked endpoint over http), `AI-RULE` (8 checks), unit tests in `interpreter.test.js`, `api.test.js`, `ask-api.test.js`.
* **Hinglish and Devanagari.** Word-level Devanagari normalisation with a map back to the original text; `claimedAmount`; "20 ko"; conditional "agar … ho gaya to kal"; corrections and alternatives force clarification. All 8 required messages are in the eval set (items 41–54) and unit tests.
* **Ask RAY.** New deterministic intents: why a reminder is on hold (same send gate), what changed after a failed payment, network-off counterfactual (same engine, network off), what needs my approval. Answers show their basis (ledger, policy version, network synthetic). Model answers are discarded if they cite rupee amounts that are not in the data.
* **Network.** One card computed by the engine: own ledger vs eligible network, six-step causal chain, inclusion gates with reasons, simulation controls for every consent and evidence-quality state, regulatory boundary. Unit `network.test.js` (7), e2e `NET` (14), live check J14.
* **Payment reversal.** `PAYMENT_REVERSED` compensating event, idempotent, validated, split payments as a group, ref reuse only after reversal, policy and promise effects. Unit `reversal.test.js` (9), e2e `REV` (11 checks across recovery, Activity, WhatsApp, mobile, Overview), live check J13.
* **Pilot and feasibility.** Pilot with segment, scope, owner, baseline, 8 weeks, seven metric definitions, thresholds labelled as hypotheses and an empty "Measured result" column; status chips (Proposed pilot · Not yet executed · Metrics to be measured · No validated lift currently available); a without/with RAY mechanism table with live figures and links; a blank user-evaluation template with CSV download; a three-column production-readiness breakdown and the AI / policy / merchant / verified-payment separation.
* **Walkthrough.** Nine steps matching the brief, numbered, Previous / Next / Exit, notes computed from state, no action on navigation (e2e `WALK`).
* **Hardcoded state removed.** WhatsApp morning brief, Chawla debit, Gupta lead time and months, Verma amounts on desktop/WhatsApp/mobile, kirana overview line, Mehta collection line, request amount on WhatsApp.
* **Responsive.** Top bar fits at 1280; below 900 px the sidebar collapses behind a menu button, grids stack, tables scroll inside their cards; phone mock-ups fill phone screens.
* **Repeatability.** e2e `REPEAT`: the main journey run twice from reset gives identical state, one approval, two payments, recovery completed, surfaces agree.

## 4. Live AI: how to turn it on

1. Vercel → Project → Settings → Environment Variables (Production): `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY` with `AI_PROVIDER=anthropic`). Optional `OPENAI_MODEL` (default `gpt-4o-mini`), `AI_TIMEOUT_MS`.
2. Redeploy. `GET /api/parse-promise` should return `{"configured":true,…}` and the app shows "Live AI · openai/gpt-4o-mini".
3. Locally: `OPENAI_API_KEY=… npm test` runs the live-provider test; `OPENAI_API_KEY=… npm run eval` adds a live section to `tests/eval/RESULTS.md`. Neither has been run for this report.

## 5. Remaining limitations

See `docs/TECHNICAL.md` section 13. In short: synthetic data and simulated integrations; no real model tested; in-memory rate limit per instance; illustrative, unvalidated credit policy; payment correction affects only the synthetic ledger; the desktop dashboard is desktop-first; no user testing has been run.

## 6. Final revision (prototype freeze)

Root cause of the approve → undo → stale repayment popup: the repayment-setup dialog captured ₹60,000 · 14 days in its own state when it opened. Undo restored the limit but left that state alive, so the dialog (still open, open on mobile, or re-rendered) showed the cancelled decision and could still send a mandate request. Reproduced on the previous build; fixed by binding setup to the decision id and re-validating it at every step (see TECHNICAL.md §8).

Other fixes in this pass: read-only network preview (participation only in Controls); shared partial-payment evidence; days-to-pay vs days-overdue labels; recorded-vs-searched payment wording; mechanism wording instead of "never chases a buyer who has paid"; reason-required possible-payment override on every path; reply analysis shows missing information and the suggested next step and flags ambiguous buyer names; label "Rule-based fallback · AI not configured"; reminder-policy figures reconciled (1,350 total, 176 Watch) and described as an observed difference; pilot cohort, primary outcome, hypothesis threshold, guardrails and pause criteria; 8-step walkthrough.

| Suite | Total | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|
| Unit (`npm test`) | 62 | 62 | 0 | 0 |
| Mocked-provider API | 17 | 17 | 0 | 0 |
| Live provider | 0 | 0 | 0 | 1 (no key) |
| Browser journeys (Playwright) | 187 | 187 | 0 | 0 |
| Smoke + demos | 24 | 24 | 0 | 0 |
| Responsive (1440, 1280, 768, 390) | 56 | 56 | 0 | 0 |
| Live Checks page | 18 journeys + 36 policy | 54 | 0 | 0 |
| Eval, rule-based (57 items) | 57 | 100 % on all metrics | — | live model not run |
