# RAY Credit

**Network-powered credit intelligence for B2B distributors**

> Decide credit using how buyers actually repay across the Razorpay network.

RAY Credit combines your own ledger and payment history with consented repayment signals across participating Razorpay distributors to recommend credit limits, spot deterioration early, and guide collections.

This repository contains a clickable product prototype of RAY Credit as an agent inside **Razorpay Agent Studio**, across three surfaces:

- **Desktop:** the Razorpay merchant dashboard
- **RAY on WhatsApp:** alerts, questions and forwarded buyer credit requests
- **RAY Credit for Mobile:** one decision at a time inside the Razorpay app

> Concept prototype built on synthetic data (Agarwal Distributors, Ludhiana). It is not a live Razorpay product and does not connect to any real account, bank or WhatsApp number.

## Why the network matters

A distributor's ledger only sees how a buyer pays *them*. With consent, RAY also learns how that buyer repays other distributors on Razorpay:

| Case | What RAY sees | What changes |
|---|---|---|
| **Earlier warning** (Gupta Traders) | Slowed with 7 other distributors in July, while your ledger showed it in September | Limit lowered to ₹60,000 about 5 weeks earlier |
| **Hidden risk** (Chawla Enterprises) | On time with you, slipping with 4 other distributors | Moved to Watch before the next eNACH debit |
| **Day-one credit** (New Life Stores) | No history with you, pays 7 distributors in 18 days | ₹1.5L starting limit instead of ₹50,000 |

Signals are consented and aggregated. No other distributor is ever named.

## The credit lifecycle

```
Request credit → Assess → Approve limit & terms → Set repayment method → Monitor
→ Collect → Recover if needed → Reconcile → Learn → Next credit decision
```

- **Assess:** explainable signals (repayment across the network, payment behaviour, relationship, collection reliability, exposure, seasonal context). No opaque score.
- **Approve:** the merchant approves every limit and terms change.
- **Set repayment method:** UPI Autopay, eNACH mandate or manual payment links, authorised by the buyer. RAY never debits beyond the mandate.
- **Collect:** pre-due reminders, then collection on the due date, matched automatically.
- **Recover:** a failed debit starts a staged plan with partial-payment links. Buyers are never marked as defaulted automatically.
- **Reconcile:** confirm payment first, chase second. RAY checks Razorpay payments, the connected bank account (RazorpayX Connected Banking+), unmatched credits and salesperson collections before any reminder.
- **Learn:** collection outcomes update the next recommendation (for example ₹60,000 → ₹40,000 after repeated Autopay failures, or ₹60,000 → ₹80,000 after six on-time repayments).

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

## Running it

No install needed. Open `index.html` in a browser, or visit the deployed link.

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
├── scripts/
│   ├── build.py                # bundles src/ into index.html
│   └── smoke_test.py           # runs every demo step in a headless browser
└── src/
    ├── template.html           # page shell
    ├── styles.css              # Razorpay / Blade-style design tokens and components
    ├── assets/                 # logo and mark (inlined at build time)
    └── modules/
        ├── core.js             # icons, formatting, synthetic data, state, hash router
        ├── identity.js         # GSTIN and business identity
        ├── dashboard.js        # Razorpay dashboard pages, Agent Studio
        ├── agent-studio.js     # RAY Credit agent page and install flow
        ├── workspace.js        # workspace tabs: actions, activity, controls
        ├── credit-intelligence.js  # overview, credit portfolio, buyer profiles
        ├── actions.js          # approvals, limits, reminders
        ├── bank-feed.js        # bank account via RazorpayX Connected Banking
        ├── whatsapp-and-ray-ai.js  # RAY on WhatsApp, Ray AI answers
        ├── credit-requests.js  # incoming buyer credit requests
        ├── reconciliation.js   # review payment flow
        ├── collections.js      # repayment setup, mandates, recovery, learning
        ├── network.js          # Razorpay network signal
        ├── kirana-payment-link.js  # retailer-side payment link and payment plans
        ├── mobile.js           # RAY Credit for Mobile
        └── demo.js             # guided demo story
```

Plain JavaScript with string templates and a hash router. No framework and no runtime dependencies.

## Building

```bash
python3 scripts/build.py        # writes index.html
python3 scripts/smoke_test.py   # optional: needs `pip install playwright`
```

## Deploying

The repo deploys as a static site. On Vercel: **Add New → Project → Import** this repository, set **Framework Preset** to **Other**, leave build settings empty, and deploy. Every push to `main` redeploys automatically.
