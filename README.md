# UsageLeak — AI Revenue Assurance Agent (Razorpay prototype)

> Find revenue you've earned but never billed.

A high-fidelity, clickable prototype of **UsageLeak**, imagined as an agent inside the Razorpay Merchant Dashboard and its RAY AI experience. UsageLeak reconciles customer **contracts**, **CRM**, **product usage** and **Razorpay billing**. It explains each discrepancy with evidence and prepares a corrective action. Nothing happens until the merchant approves it.

**All data is synthetic.** The companies, contracts and figures are made up, there is no backend, and nothing calls an external API.

**Brand marks.** The Razorpay mark uses the official geometry from Razorpay's brand assets (as published in simple-icons, CC0). The RAY icon uses the `RayIcon` path from Razorpay's Blade design system (`@razorpay/blade`). The "Razorpay" wordmark next to the mark is set in type. To use the official wordmark file, save it as `public/brand/razorpay-logo-white.svg` and set `USE_OFFICIAL_LOGO_FILE = true` in `src/components/global/Brand.tsx`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /ray
# or
npm run build && npm start
```

## Routes

| Route | Screen |
| --- | --- |
| `/ray` | RAY AI home with the proactive UsageLeak insight card and conversational flow |
| `/agents/usage-leak` | UsageLeak overview: metrics, opportunity table, how it works |
| `/agents/usage-leak/acme` | Acme Ltd revenue leak investigation: evidence, calculation, reasoning |
| `/agents/usage-leak/acme/action` | Corrective action selection with merchant edits and guardrails |
| `/agents/usage-leak/acme/review` | Final review, explicit approval, success state |
| `/agents/usage-leak/settings` | Data sources, permissions, rules, activity (audit log). Use `?tab=` to pick a tab |

## 90-second demo script

1. **/ray**: point to the *Revenue opportunity* card (₹1.84L). Click into the prompt, press **Tab** to fill *"Did I miss any revenue this month?"*, then press **Enter**. RAY replies with a structured UsageLeak card.
2. Click **Review UsageLeak findings**, then **Review** on Acme Ltd.
3. On the investigation screen: 17 qualifying seats vs 12 billed means ₹7,500/month. Walk through the contract clause, product usage, Razorpay subscription, and the validated calculation.
4. Click **Correct billing**. Both actions are pre-selected. Optionally set seats to 6 to show the guardrail warning, then reset.
5. Click **Review changes**, tick the confirmation, then **Approve & execute**. Success says *"converted into billing"*, not "collected".
6. Click **View audit log**. Optionally return to `/ray` and ask *"What happened with Acme?"*.

Other flows: **Mark as exception** (the learning loop; saved context appears under Settings → Rules), **Ignore** with undo, **Pause UsageLeak**, the review-mode toggle, and connector manage/connect. To start over, use **Reset demo data** at the bottom of Settings → Activity.

## Design notes

- **AI interprets, code calculates.** Every rupee figure comes from `src/lib/calc.ts` (`computeSeatTrueUp`), never from model output. The UI labels contract terms as *Extracted by UsageLeak* and the calculation as *Deterministic rules engine*.
- **Review-first.** No invoice or subscription change happens without the explicit confirmation checkbox and an approval click. Pausing the agent blocks execution.
- **Auditability.** Every detection, review, edit, approval, exception, pause and connector change is written to the audit log.
- **Numbers always reconcile.** Headline metrics are computed from the opportunity rows (`summarize()` in `src/lib/data.ts`):
  - Potential leakage = all six rows = ₹1,84,000
  - High-confidence awaiting review = Acme ₹7,500 + Nova AI ₹54,000 = ₹61,500
  - Validated leakage = high-confidence findings, excluding any you reject = ₹70,500
  - Corrected billing = Nimbus ₹9,000, plus the Acme invoice amount once you approve it (₹16,500)

  After approval, the RAY card updates to ₹54,000 high-confidence remaining.
- State lives in `src/lib/store.tsx`, a React context persisted to `sessionStorage`, so it survives navigation within a session.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · lucide-react. Charts are dependency-free SVG sparklines.
