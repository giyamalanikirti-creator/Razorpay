# RAY Credit

**Network-powered credit intelligence for B2B distributors**

> Decide credit using how buyers actually repay across the Razorpay network.

RAY Credit combines your own ledger and payment history with consented repayment signals across participating Razorpay distributors to recommend credit limits, spot deterioration early, and guide collections.

This repository contains a clickable product prototype of RAY Credit as an agent inside **Razorpay Agent Studio**, across three surfaces:

- **Desktop:** the Razorpay merchant dashboard
- **RAY on WhatsApp:** alerts, questions and forwarded buyer credit requests
- **RAY Credit for Mobile:** one decision at a time inside the Razorpay app

> Concept prototype built on synthetic data (Agarwal Distributors, Ludhiana). It is not a live Razorpay product and does not connect to any real account, bank or WhatsApp number.

**What actually works:** a deterministic, explainable credit policy engine that evaluates all 642 synthetic buyers; an event-driven repayment ledger that re-runs the policy when payments, failures, promises or disputes are recorded; merchant controls enforced at send time; per-buyer network consent; a daily chase plan rebuilt from every buyer with dues (amount due × repayment risk × urgency); failed collections, payment reviews and scheduled autopays computed from ledger events and mandates; live Claude (when the page is opened in Claude) for reading Hinglish replies, drafting reminders and answering open questions in Ask RAY, with every answer checked by rules; a learning loop that suggests follow-up policy changes from outcomes for the owner to approve, version and undo; a built-in Checks page that runs 36 rule checks in the browser; and a secure `/api/parse-promise` endpoint for self-hosted deployments with an API key. Everything else (ERP, bank feed, WhatsApp, mandates, the cross-distributor network) is simulated and labelled. Full details: [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

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

## AI: one capability, honestly scoped

The LLM is used for one job: reading unstructured buyer replies such as *"Aadha abhi bhej raha hoon, baaki Monday pakka"* and returning structured JSON (intent, amounts, dates, conditionality, evidence). Deterministic checks then remove any amount or date the message does not support, resolve relative dates from the message date (IST), route disputes and payment claims separately, and block confirmation of ambiguous promises. The merchant always reviews, can edit, and confirms before anything is saved. When no API key is configured the app says so and uses a clearly labelled **rule-based demo parser (not AI)**. Credit limits are never set by the LLM.

## Running it

No install needed. Open `index.html` in a browser, or visit the deployed link. On Vercel with `OPENAI_API_KEY` set, the interpreter runs on the live model.

**Two guided demos** (press `Shift` + `D`): **Try RAY Credit: Core Journey** (8 steps: signal → intelligence → recommendation → approval → action → outcome → updated decision) and **Explore all features** (25 steps). Navigating a step never approves, sends or records money on its own; steps that need earlier state offer a labelled "Load scenario" button.


**Presenter controls**

| Key | Action |
|---|---|
| `Shift` + `D` | Open the guided demo story |
| `→` or `N` | Next demo step |
| `←` | Previous demo step |
| `Esc` | Close the story panel |

The pill at the bottom switches between **Desktop**, **RAY on WhatsApp** and **RAY Credit for Mobile**.

## Project structure

```
.
├── index.html                  # built, self-contained prototype (what gets deployed)
├── api/
│   └── parse-promise.js        # Vercel function: LLM interpretation + deterministic checks
├── lib/                        # pure logic shared by the browser, the API and the tests
│   ├── policy.js               # deriveBuyerSignals() + evaluateCredit(): the credit policy engine
│   ├── events.js               # applyRepaymentEvent(): event model and invoice ledger
│   ├── guards.js               # sendGate(): DNC, weekly limit, quiet hours, channels, stale data
│   ├── promise-rules.js        # schema, prompt, validation, labelled rule-based fallback
│   ├── dataset.js              # seeded synthetic portfolio: 642 buyers, 1,184 open invoices
│   └── dates.js                # IST calendar helpers
├── src/
│   ├── template.html · styles.css · assets/
│   └── modules/                # screens (core, engine bridge, explain, workspace, ...)
├── tests/
│   ├── engine.test.js · interpreter.test.js · api.test.js   # node --test
│   ├── ui_smoke.py             # Playwright browser checks
│   └── eval/                   # 40 labelled Hinglish messages + RESULTS.md
├── scripts/
│   ├── build.py                # bundles lib/ + src/ into index.html
│   ├── eval_interpreter.js     # interpreter evaluation
│   └── smoke_test.py           # runs every demo step
└── docs/TECHNICAL.md           # architecture, policy rules, mock manifest, tests, limitations
```

Plain JavaScript with string templates and a hash router. No framework and no runtime dependencies.

## Building and testing

```bash
python3 scripts/build.py        # writes index.html
npm test                        # 37 unit + API tests (Node 18+)
python3 tests/ui_smoke.py       # 20 browser checks (pip install playwright)
npm run eval                    # interpreter evaluation; live model only with an API key
```

## Deploying

Static `index.html` at the root plus one serverless function in `api/`. On Vercel no framework preset or build command is needed; every push to `main` redeploys.

Environment variables (Vercel → Settings → Environment Variables):

| Variable | Needed for | Default |
|---|---|---|
| `OPENAI_API_KEY` | live AI interpretation | none (app falls back to the labelled rule-based parser) |
| `OPENAI_MODEL` | choosing the model | `gpt-4o-mini` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_PROVIDER` | optional alternative provider | |
| `AI_TIMEOUT_MS` | provider timeout | `12000` |
