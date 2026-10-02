/**
 * Synthetic data for the UsageLeak prototype.
 * Every company, contract and number below is fictional sample data.
 */
import { computeSeatTrueUp } from "./calc";

export const merchant = {
  name: "NovaStack Technologies",
  userName: "Kirti G",
  userInitials: "KG",
};

export type Confidence = "High" | "Medium" | "Low";
export type OpportunityStatus =
  | "Needs review"
  | "Needs validation"
  | "Investigating"
  | "Corrected"
  | "Exception"
  | "Dismissed";

export interface Opportunity {
  id: string;
  customer: string;
  issue: string;
  leakage: number;
  recurring: boolean;
  confidence: number;
  confidenceLabel: Confidence;
  status: OpportunityStatus;
  plan: string;
  summary: string;
  sources: string[];
}

/* ---------------- Acme Ltd — the hero account ---------------- */

export const acme = {
  id: "acme",
  customer: "Acme Ltd",
  plan: "Seat-based subscription",
  contractSeats: 12,
  actualActiveUsers: 19,
  excludedContractors: 2,
  seatRate: 1500,
  currentBilledSeats: 12,
  currentBilling: 18000,
  confidence: 94,
  confidenceLabel: "High" as Confidence,
  period: "September 2026",
  periodShort: "Sep 2026",
  nextCycle: "01 Nov 2026",
  subscriptionId: "sub_acme_2026",
  subscriptionUpdated: "03 Jan 2026",
  contract: {
    file: "Acme_MSA_2026.pdf",
    clause: "Clause 4.2",
    signed: "18 Dec 2025",
    text: "12 seats included. Additional qualifying seats are billed monthly at ₹1,500 per seat.",
    fullClause:
      "4.2 Seats. The Subscription Fee includes twelve (12) Named User seats. Additional qualifying seats shall be billed monthly in arrears at ₹1,500 per seat per month, reconciled at the end of each calendar month (\"monthly true-up\"). Users designated by the Customer as contractors shall not constitute qualifying seats.",
  },
  crm: {
    system: "Salesforce",
    account: "Acme Ltd · Enterprise",
    owner: "Rohan Mehta",
    amendments: "None after 18 Dec 2025",
    exceptions: "No complimentary-seat exception",
  },
  usage: {
    source: "Production usage API",
    definition: "Active user = logged in at least once in the month",
  },
};

export const acmeCalc = computeSeatTrueUp(
  { includedSeats: acme.contractSeats, additionalSeatRate: acme.seatRate, excludeContractors: true },
  { activeUsers: acme.actualActiveUsers, contractorUsers: acme.excludedContractors },
  { billedSeats: acme.currentBilledSeats, monthlyAmount: acme.currentBilling },
);
// acmeCalc → qualifyingSeats 17, additionalSeats 5, leakage ₹7,500, expected ₹25,500

/* ---------------- Opportunity feed ---------------- */

export const opportunities: Opportunity[] = [
  {
    id: "acme",
    customer: "Acme Ltd",
    issue: "5 unbilled seats",
    leakage: acmeCalc.leakage,
    recurring: true,
    confidence: acme.confidence,
    confidenceLabel: "High",
    status: "Needs review",
    plan: "Seat-based subscription",
    summary: "17 qualifying seats are active, but only 12 are currently billed.",
    sources: ["Contract", "CRM", "Product usage", "Razorpay Subscription"],
  },
  {
    id: "nova-ai",
    customer: "Nova AI",
    issue: "API overage not invoiced",
    leakage: 54000,
    recurring: false,
    confidence: 96,
    confidenceLabel: "High",
    status: "Needs review",
    plan: "Usage-based · 10M API calls included",
    summary:
      "11.35M API calls metered in September against a 10M allowance. The overage of 1.35M calls at ₹0.04/call (₹54,000) was not added to the September invoice.",
    sources: ["Contract", "Product usage", "Razorpay Invoice"],
  },
  {
    id: "orbit-cloud",
    customer: "Orbit Cloud",
    issue: "Analytics add-on missing",
    leakage: 15000,
    recurring: true,
    confidence: 72,
    confidenceLabel: "Medium",
    status: "Needs validation",
    plan: "Growth plan + add-ons",
    summary:
      "CRM shows the Analytics module sold on 12 Sep 2026, and usage events confirm access. No signed order form was found, so the add-on needs manual validation before billing.",
    sources: ["CRM", "Product usage", "Razorpay Subscription"],
  },
  {
    id: "kiteworks",
    customer: "KiteWorks",
    issue: "Discount may have expired",
    leakage: 23500,
    recurring: true,
    confidence: 68,
    confidenceLabel: "Medium",
    status: "Needs validation",
    plan: "Enterprise · annual",
    summary:
      "The 15% launch discount in the contract ended on 31 Aug 2026, but Razorpay still applies it. A renewal note in CRM may extend it — confirm with the account owner.",
    sources: ["Contract", "CRM", "Razorpay Subscription"],
  },
  {
    id: "nimbus",
    customer: "Nimbus",
    issue: "Seat true-up mismatch",
    leakage: 9000,
    recurring: true,
    confidence: 97,
    confidenceLabel: "High",
    status: "Corrected",
    plan: "Seat-based subscription",
    summary: "6 additional seats at ₹1,500 were added to billing on 24 Sep 2026 after your approval.",
    sources: ["Contract", "Product usage", "Razorpay Subscription"],
  },
  {
    id: "zephyr",
    customer: "Zephyr Labs",
    issue: "Minimum commit shortfall",
    leakage: 75000,
    recurring: false,
    confidence: 41,
    confidenceLabel: "Low",
    status: "Investigating",
    plan: "Annual commitment ₹5L",
    summary:
      "Year-to-date billing is below the ₹5L minimum commitment, but CRM and the contract disagree on the commitment start date. UsageLeak will not recommend a billing action until the conflict is resolved.",
    sources: ["Contract", "CRM", "Razorpay Invoice"],
  },
];

/**
 * Every headline number is derived from the opportunity rows so the
 * dashboard, RAY and the table always agree.
 *
 * - potentialLeakage: everything detected this billing cycle
 * - validatedLeakage: High-confidence findings (evidence confirmed), excluding ones the merchant rejected
 * - highConfidenceLeakage: High-confidence findings still awaiting review
 * - correctedBilling: amounts converted into billing after merchant approval
 */
export function summarize(rows: Opportunity[], acmeInvoiced = 0) {
  const total = (xs: Opportunity[]) => xs.reduce((acc, o) => acc + o.leakage, 0);
  const rejected = (o: Opportunity) => o.status === "Exception" || o.status === "Dismissed";
  return {
    potentialLeakage: total(rows),
    validatedLeakage: total(rows.filter((o) => o.confidenceLabel === "High" && !rejected(o))),
    highConfidenceLeakage: total(rows.filter((o) => o.confidenceLabel === "High" && o.status === "Needs review")),
    correctedBilling: total(rows.filter((o) => o.status === "Corrected" && o.id !== "acme")) + acmeInvoiced,
    accountsAffected: rows.length,
    falsePositiveRate: 3.2, // last 90 days: rejected findings ÷ findings surfaced
  };
}

export type Summary = ReturnType<typeof summarize>;

/** Summary before the merchant has acted on anything. */
export const summary = summarize(opportunities);

/* ---------------- RAY home cards ---------------- */

export const rayInsights = {
  successRate: 96.8,
  successSeries: [95.9, 96.4, 96.1, 97.2, 96.6, 96.9, 96.3, 97.4, 96.8, 97.1, 96.5, 96.9, 97.3, 96.8],
  collected: 1967575,
  collectedSeries: [14, 18, 16, 22, 19, 24, 21, 26, 23, 25, 22, 27, 24, 28],
};

/* ---------------- Connectors ---------------- */

export type ConnectorStatus = "Connected" | "Disconnected" | "Connecting";

export interface Connector {
  id: string;
  name: string;
  access: string;
  scopes: { label: string; enabled: boolean }[];
  status: ConnectorStatus;
  native?: boolean;
  lastSync: string;
}

export const connectors: Connector[] = [
  {
    id: "razorpay",
    name: "Razorpay Billing",
    access: "Subscriptions, invoices",
    scopes: [
      { label: "Read subscriptions", enabled: true },
      { label: "Read invoices", enabled: true },
      { label: "Draft invoices (approval required to send)", enabled: true },
    ],
    status: "Connected",
    native: true,
    lastSync: "2 min ago",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    access: "Accounts, opportunities, amendments",
    scopes: [
      { label: "Accounts", enabled: true },
      { label: "Opportunities", enabled: true },
      { label: "Contract amendments", enabled: true },
      { label: "Contacts", enabled: false },
    ],
    status: "Connected",
    lastSync: "14 min ago",
  },
  {
    id: "usage-api",
    name: "Product Usage API",
    access: "Seat and usage events",
    scopes: [
      { label: "Seat activity events", enabled: true },
      { label: "Metered API usage", enabled: true },
      { label: "User role attributes", enabled: true },
    ],
    status: "Connected",
    lastSync: "6 min ago",
  },
  {
    id: "gdrive",
    name: "Google Drive",
    access: "Selected contract folder only",
    scopes: [
      { label: "Finance / Customer Contracts (read-only)", enabled: true },
      { label: "All other folders", enabled: false },
    ],
    status: "Connected",
    lastSync: "1 hr ago",
  },
];

export const availableConnectors = [
  { id: "hubspot", name: "HubSpot", access: "Companies, deals" },
  { id: "docusign", name: "DocuSign", access: "Completed envelopes" },
  { id: "snowflake", name: "Snowflake", access: "Usage tables (read-only)" },
  { id: "upload", name: "Upload contracts", access: "PDF files you upload" },
];

/* ---------------- Audit log ---------------- */

export interface AuditEntry {
  id: string;
  at: string; // ISO
  customer: string;
  action: string;
  actor: string;
  status: "Detected" | "Reviewed" | "Approved" | "Created" | "Scheduled" | "Exception" | "Paused" | "Resumed" | "Updated" | "Dismissed";
}

export const seedAudit: AuditEntry[] = [
  { id: "a1", at: "2026-09-24T10:12:00+05:30", customer: "Nimbus", action: "Seat true-up mismatch identified", actor: "UsageLeak", status: "Detected" },
  { id: "a2", at: "2026-09-24T15:30:00+05:30", customer: "Nimbus", action: "₹9,000 invoice draft created", actor: "KG approved", status: "Created" },
  { id: "a3", at: "2026-09-24T15:30:00+05:30", customer: "Nimbus", action: "Subscription quantity scheduled: 25 → 31", actor: "KG approved", status: "Scheduled" },
  { id: "a4", at: "2026-10-02T11:42:00+05:30", customer: "Acme Ltd", action: "Revenue mismatch identified", actor: "UsageLeak", status: "Detected" },
];
