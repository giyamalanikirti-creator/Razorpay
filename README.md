# RAY Credit

**Network-powered credit intelligence for B2B distributors**

> Decide credit using how buyers actually repay across the Razorpay network.

RAY Credit combines your own ledger and payment history with consented repayment signals across participating Razorpay distributors to recommend credit limits, spot deterioration early, and guide collections.

This repository contains a clickable product prototype of RAY Credit as an agent inside **Razorpay Agent Studio**, across three surfaces:

- **Desktop:** the Razorpay merchant dashboard
- **RAY on WhatsApp:** alerts, questions and forwarded buyer credit requests
- **RAY Credit for Mobile:** one decision at a time inside the Razorpay app

> Prototype built on a seeded sample portfolio (Agarwal Distributors, Ludhiana). It is not a live Razorpay product and connects to no real account, bank or WhatsApp number. Dates are live: the scenario is shifted onto today's calendar, so an invoice that is two days overdue stays two days overdue whenever you open it.

**What actually works:** a deterministic, explainable credit policy engine that evaluates all 642 buyers; an event-driven repayment ledger that re-runs the policy when payments, failures, promises or disputes are recorded; merchant controls enforced at send time; per-buyer network consent; a daily chase plan rebuilt from every buyer with dues (amount due × repayment risk × urgency); failed collections, payment reviews and scheduled autopays computed from ledger events and mandates; one rule-based answer engine for Ray AI, RAY on WhatsApp and mobile that reads the current ledger (live AI, server-side, with Gemini configured on the public deployment; OpenAI and Anthropic also supported; a labelled rule-based fallback runs when the provider is unavailable); one validated command path for approvals with exact values, double-click protection and full-state undo; recovery status derived from the ledger so every surface agrees; a learning loop that suggests follow-up policy changes from outcomes for the owner to approve, version and undo; a Checks page that shows only tests that ran: live journey and policy checks in the browser, plus the recorded unit and Playwright runs for this build; and a secure `/api/parse-promise` endpoint for self-hosted deployments with an API key. Everything else (ERP, bank feed, WhatsApp, mandates, the cross-distributor network) is simulated and labelled. Full details: [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

## Why the network matters

A distributor's ledger only sees how a buyer pays *them*. With consent, RAY also learns how that buyer repays other distributors on Razorpay:

| Case | What RAY sees | What changes |
|---|---|---|
| **Earlier warning** (Gupta Traders) | Slowed with 7 other distributors in July, while your ledger showed it in September | Your data: ₹75,000 · 21 days. With consented network evidence that agrees: ₹60,000 · 14 days (rule: −20%, one step shorter terms) |
| **Hidden risk** (Chawla Enterprises) | On time with you, slipping with 4 other distributors | Reliable on your data; Watch with the network, limit held (rule: uncorroborated network evidence) |
| **Day-one credit** (New Life Stores) | No history with you, pays 7 distributors in about 18 days | ₹50,000 starter without consent; ₹1,50,000 · 21 days once the buyer consents |

All three come out of the same reusable policy (`lib/policy.js`), not per-buyer rules. Turn the network off, or revoke a buyer's consent, and every screen recalculates. Signals are consented, aggregated and synthetic. No other distributor is ever named. Production use would need participation, consent, privacy and legal review, potentially including credit-information regulation.

## The credit lifecycle

```
Request credit → Assess → Approve limit & terms → Set repayment method → Monitor
→ Collect → Recover if needed → Reconcile → Learn → Next credit decision
```

- **Assess:** an illustrative, rule-based policy (RAY-TC-0.4) scores payment behaviour, orders and exposure, promise reliability, collection reliability, identity and consented network evidence. Every recommendation opens a "How RAY reached this recommendation" panel with each signal, its source, the rule and its effect. Not a validated credit score.
- **Approve:** the merchant approves every limit and terms change.
- **Set repayment method:** UPI Autopay, eNACH mandate or manual payment links, authorised by the buyer. RAY never debits beyond the mandate.
- **Collect:** pre-due reminders, then collection on the due date, matched automatically.
- **Recover:** a failed debit starts a staged plan with partial-payment links. Buyers are never marked as defaulted automatically.
- **Reconcile:** confirm payment first, chase second. RAY checks Razorpay payments, the connected bank account (RazorpayX Connected Banking+), unmatched credits and salesperson collections before any reminder.
- **Learn:** outcomes are recorded as events, update the buyer's signals and re-run the same policy. Example: after a failed Autopay, a ₹5,000 partial payment and a missed promise, Gupta Traders moves Watch → Risky and ₹60,000 → ₹40,000 on 7-day terms; a "What changed since the last decision?" card shows the evidence and rule, and nothing changes until the merchant approves. Six on-time Autopay collections trigger an increase proposal for Sethi Mart (₹60,000 → ₹80,000). No model is trained.

## One payment journey, both sides

The kirana never installs anything or logs in. It only sees an enhanced Razorpay payment link that the distributor sends on WhatsApp after approving RAY's drafted message.

1. Distributor opens an at-risk invoice (Gupta Kirana Store, INV-2048, ₹40,000) and RAY recommends a payment link with a payment-plan option.
2. The link (route `#pay/INV-2048`) offers **Pay full amount now**, **Pay part now, balance later**, or **Raise an invoice dispute**.
3. RAY suggests a plan from the retailer's pattern (₹15,000 now, ₹25,000 on the next 4th). The retailer can edit the amount and date; the two always add up to the invoice.
4. The later amount is a **proposed payment commitment**, not an automatic debit. Dates within the distributor's plan rules (14 days) are confirmed; later dates need the distributor's approval.
5. The commitment appears in the distributor's Overview, Actions and invoice detail. Once approved, it enters the collections forecast as an expected inflow, not guaranteed revenue.
6. RAY records whether the commitment is kept, as a behaviour signal for future recommendations. A "RAY Payment Passport" is shown only as a V2 teaser.

All payments in the prototype are simulated and labelled as such. No money moves.

## Trust rules built into the product

- Credit limits, terms, supply, bulk messages and lending always need merchant approval
- RAY never messages buyers about credit decisions and never pauses supply on its own
- RAY reads only forwarded messages or a connected WhatsApp Business inbox, never personal chats
- Trade credit stays separate from lending; any financing comes from a regulated lending partner
- Controls are enforced at the moment of sending, not just when a list is drawn: Do not contact, weekly reminder limit, quiet hours (IST), allowed channels, a stale ledger and pending payment reviews all block or queue a message, with the reason shown

## AI: honestly scoped

Questions on every surface are answered first by rules, from the current ledger: buyer, invoice, balance, credit and payment status. Ambiguous names get a clarifying question; anything else gets "I won’t guess" with examples. Only those unmatched questions go to live AI, and only when it is really configured. The LLM is also used for reading replies: reading unstructured buyer replies such as *"Aadha abhi bhej raha hoon, baaki Monday pakka"* and returning structured JSON (intent, amounts, dates, conditionality, evidence). Deterministic checks then remove any amount or date the message does not support, resolve relative dates from the message date (IST), route disputes and payment claims separately, and block confirmation of ambiguous promises. The merchant always reviews, can edit, and confirms before anything is saved. It reads English, Hinglish and common Devanagari ("मैंने 5000 भेज दिए हैं, बाकी सोमवार को दूँगा।" → an unverified ₹5,000 claim plus a promise of the rest by Monday). Every result carries one of four labels: **Live AI · provider/model**, **Rule-based fallback · AI not configured**, **AI unavailable · Rule-based fallback**, and **Needs merchant confirmation** until you confirm. Credit limits are never set by the LLM: LLMs interpret language and explain; the deterministic policy recommends; the merchant approves; only verified payment events change balances.

## Running it

No install needed. Open `index.html` in a browser, or visit the deployed link. Opening the deployed URL lands on the Agent Studio page for RAY Credit with the **Install Agent** CTA — click it to install (Marg ERP → bank connection → ready) and enter the workspace. Deep links such as `#ray-credit/overview` still work.

Live AI is on, with Gemini (`gemini-3.5-flash-lite`) configured on the deployment; setting `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` switches providers. Verify it with `GET /api/parse-promise?selftest=1` — one fixed Hinglish message goes through the configured provider and the response is either the parse or the real upstream error.

**Walkthrough** (the **Walkthrough** button in the bottom bar, or `Shift` + `D`), the main story in 8 steps: the buyer asks for more credit → RAY explains the repayment evidence and a read-only network comparison (₹75,000 · 21 days on your data vs ₹60,000 · 14 days with eligible network evidence) → you approve or reject → a failed ₹20,000 collection gets an approved partial-payment link → a simulated ₹5,000 payment leaves ₹15,000 → the rest completes recovery → ledger, mobile, WhatsApp and Activity agree → what changed in RAY's inputs. Every outcome is an explicit, labelled button; navigating never acts. Each step has Previous, Next and Exit, and the reset icon restarts it. **Explore all features** (25 steps) is still there. Navigating a step never approves, sends or records money on its own; simulated outcomes are explicit buttons. **Prototype · sample data** opens the disclosure (logic running here, sample portfolio, simulated integrations, live AI, proposed). The reset icon asks before resetting. The eight-week pilot plan and its success measures are on **How it works**. Script and fix list: [`docs/QA-REPORT.md`](docs/QA-REPORT.md).


**Presenter controls**

| Key | Action |
|---|---|
| `Shift` + `D` | Open the guided walkthrough |
| `→` or `N` | Next step |
| `←` | Previous step |
| `Esc` | Close the story panel |

The pill at the bottom switches between **Desktop**, **RAY on WhatsApp** and **RAY Credit for Mobile**.

## Project structure

```
.
├── index.html                  # built, self-contained prototype (what gets deployed)
├── api/
│   ├── parse-promise.js        # Vercel function: LLM interpretation + deterministic checks
│   └── ask.js                  # Vercel function: live AI for free-form questions (explains only)
├── lib/                        # pure logic shared by the browser, the API and the tests
│   ├── policy.js               # deriveBuyerSignals() + evaluateCredit(): the credit policy engine
│   ├── events.js               # applyRepaymentEvent(): event model and invoice ledger
│   ├── guards.js               # sendGate(): DNC, weekly limit, quiet hours, channels, stale data
│   ├── promise-rules.js        # schema, prompt, validation, labelled rule-based fallback
│   ├── dataset.js              # seeded sample portfolio: 642 buyers, 1,184 open invoices (dates shifted onto today)
│   └── dates.js                # IST calendar helpers
├── src/
│   ├── template.html · styles.css · assets/
│   └── modules/                # screens (core, engine bridge, explain, workspace, ...)
├── tests/
│   ├── engine · journeys · interpreter · reversal · network · api · ask-api · live-provider .test.js   # node --test
│   ├── e2e_journeys.py         # Playwright: journeys with real clicks, reversal, mocked live-AI UI, repeatability
│   ├── responsive.py           # Playwright: 1440, 1280, 768 and 390 px layout checks
│   ├── ui_smoke.py             # Playwright: smoke, every route, both guided walkthroughs
│   └── results/                # last recorded run of every suite (embedded in the Checks page)
│   └── eval/                   # 57 labelled Hinglish and Devanagari messages + RESULTS.md
├── scripts/
│   ├── build.py                # bundles lib/ + src/ into index.html
│   ├── eval_interpreter.js     # interpreter evaluation
│   └── smoke_test.py           # runs every walkthrough step
└── docs/TECHNICAL.md           # architecture, policy rules, mock manifest, tests, limitations
```

Plain JavaScript with string templates and a hash router. No framework and no runtime dependencies.

## Building and testing

```bash
python3 scripts/build.py        # writes index.html
npm test                        # unit, journey and API tests (Node 18+)
npm run test:e2e                # browser journeys (pip install playwright)
npm run test:ui                 # browser smoke + guided walkthroughs
npm run test:responsive         # layout at 1440, 1280, 768 and 390 px
npm run test:all                # all suites, results embedded into the Checks page
npm run eval                    # interpreter evaluation; live model only with an API key
```


