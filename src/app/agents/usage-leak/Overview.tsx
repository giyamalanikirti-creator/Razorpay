"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Calendar, ChevronDown, MessageSquare, PauseCircle, Plus, Search, Settings, ShieldCheck } from "lucide-react";
import { Breadcrumb, Card, MetricCard, Notice, PageContainer, PageHeader, SectionTitle } from "@/components/global/Page";
import { Button, ButtonLink } from "@/components/global/Button";
import { ConfidenceBadge, StatusBadge } from "@/components/global/Badge";
import { Modal } from "@/components/global/Modal";
import { UsageLeakMark } from "@/components/global/Brand";
import { UsageLeakBadge } from "@/components/usageleak/UsageLeakParts";
import { opportunities, type Confidence, type Opportunity } from "@/lib/data";
import { formatINR, formatINRCompact } from "@/lib/format";
import { useOpportunities, useStore, useSummary } from "@/lib/store";

const FILTERS: ("All confidence" | Confidence)[] = ["All confidence", "High", "Medium", "Low"];

export function Overview() {
  const router = useRouter();
  const { state, update, log } = useStore();
  const [conf, setConf] = useState<(typeof FILTERS)[number]>("All confidence");
  const [query, setQuery] = useState("");
  const [peek, setPeek] = useState<Opportunity | null>(null);

  const allRows = useOpportunities();
  const summary = useSummary();
  const rows = useMemo(
    () =>
      allRows
        .filter((o) => conf === "All confidence" || o.confidenceLabel === conf)
        .filter((o) => o.customer.toLowerCase().includes(query.trim().toLowerCase())),
    [allRows, conf, query],
  );


  const open = (o: Opportunity) => (o.id === "acme" ? router.push("/agents/usage-leak/acme") : setPeek(o));

  return (
    <PageContainer>
      <Breadcrumb items={[{ label: "RAY AI", href: "/ray" }, { label: "Agents" }, { label: "UsageLeak" }]} />
      <PageHeader
        leading={<UsageLeakMark size={44} />}
        title="UsageLeak"
        badges={<UsageLeakBadge paused={state.paused} />}
        subtitle={
          <>
            <span className="font-medium text-ink">AI Revenue Assurance</span>
            <span className="mx-2 text-line">|</span>
            Find revenue you've earned but never billed.
          </>
        }
        actions={
          <>
            <ButtonLink href="/ray">
              <MessageSquare size={16} /> Ask RAY
            </ButtonLink>
            <ButtonLink href="/agents/usage-leak/settings">
              <Settings size={16} /> Settings
            </ButtonLink>
            <ButtonLink href="/agents/usage-leak/acme" variant="primary">
              Review opportunities
            </ButtonLink>
          </>
        }
      />

      {state.paused && (
        <Notice tone="neutral" icon={<PauseCircle size={16} />} className="mb-5">
          <span className="font-medium text-ink">UsageLeak is paused.</span> No new reconciliation runs or recommendations will be created. Existing findings stay
          available for review.{" "}
          <button
            className="font-medium text-rzp hover:underline"
            onClick={() => {
              update((s) => ({ ...s, paused: false }));
              log({ customer: "—", action: "UsageLeak resumed", actor: "KG", status: "Resumed" });
            }}
          >
            Resume
          </button>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Potential leakage" value={formatINRCompact(summary.potentialLeakage)} hint={`this billing cycle · ${summary.accountsAffected} accounts`} />
        <MetricCard label="Validated leakage" value={formatINRCompact(summary.validatedLeakage)} hint="this billing cycle · high-confidence findings" />
        <MetricCard label="Corrected billing" value={formatINRCompact(summary.correctedBilling)} hint="this billing cycle · approved by you" />
        <MetricCard label="False-positive rate" value={`${summary.falsePositiveRate}%`} hint="last 90 days · findings you rejected" />
      </div>

      <section className="mt-8">
        <SectionTitle
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-[13px] text-ink">
                <Calendar size={15} className="text-ink-2" /> September 2026 <ChevronDown size={14} className="text-ink-3" />
              </button>
              <label className="relative">
                <span className="sr-only">Confidence</span>
                <select
                  value={conf}
                  onChange={(e) => setConf(e.target.value as typeof conf)}
                  className="h-9 appearance-none rounded-md border border-line bg-white pl-3 pr-8 text-[13px] text-ink focus:border-rzp focus:outline-none"
                >
                  {FILTERS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              </label>
              <label className="flex h-9 w-56 items-center gap-2 rounded-md border border-line bg-white px-3 focus-within:border-rzp">
                <Search size={15} className="text-ink-3" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer"
                  className="w-full bg-transparent text-[13px] placeholder:text-ink-3 focus:outline-none"
                />
              </label>
            </div>
          }
        >
          Revenue opportunities
        </SectionTitle>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[14px]">
              <thead className="bg-[#FAFBFC]">
                <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.04em] text-ink-3">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Issue</th>
                  <th className="px-3 py-3 text-right font-medium">Potential impact</th>
                  <th className="px-3 py-3 font-medium">Confidence</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const done = o.status === "Corrected" || o.status === "Exception" || o.status === "Dismissed" || o.status === "Investigating";
                  return (
                    <tr key={o.id} onClick={() => open(o)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-[#FAFBFC]">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink">{o.customer}</p>
                        <p className="text-xs text-ink-3">{o.plan}</p>
                      </td>
                      <td className="px-3 py-3.5 text-ink">{o.issue}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right font-medium tabular-nums text-ink">
                        {formatINR(o.leakage)}
                        {o.recurring && <span className="font-normal text-ink-3"> / month</span>}
                      </td>
                      <td className="px-3 py-3.5">
                        <ConfidenceBadge label={o.confidenceLabel} />
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={done ? "secondary" : "primary"}
                          onClick={(e) => {
                            e.stopPropagation();
                            open(o);
                          }}
                        >
                          {done ? "View" : "Review"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-ink-3">
                      No opportunities match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-[#FAFBFC] px-5 py-2.5 text-xs text-ink-3">
            <span>
              Showing {rows.length} of {opportunities.length} accounts with a discrepancy · 212 accounts reconciled with no issue
            </span>
            <span>Prioritised by ₹ impact × confidence × recurrence · last run 02 Oct 2026, 11:42 AM</span>
          </div>
        </Card>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.9fr_1fr]">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-ink">How UsageLeak works</h2>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[12.5px]">
            {["Contract", "CRM", "Product usage", "Razorpay Billing"].map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                {i > 0 && <Plus size={13} className="text-ink-3" />}
                <span className="rounded-md border border-line bg-page px-2 py-1.5 text-ink">{s}</span>
              </span>
            ))}
            <ArrowRight size={15} className="text-ink-3" />
            <span className="rounded-md border border-[#CFE0FD] bg-rzp-soft px-2 py-1.5 font-medium text-[#0A3E8F]">Commercial truth</span>
            <ArrowRight size={15} className="text-ink-3" />
            <span className="rounded-md border border-warn-line bg-warn-bg px-2 py-1.5 font-medium text-warn">Revenue discrepancy</span>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[13px] text-ink-2">
            <ShieldCheck size={16} className="mt-px shrink-0 text-ok" />
            AI interprets commercial terms. Razorpay validates the calculations before any action.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-3">
            <div>
              <p className="font-medium text-ink">High confidence</p>
              <p className="text-ink-3">Surfaced with a recommended correction.</p>
            </div>
            <div>
              <p className="font-medium text-ink">Medium confidence</p>
              <p className="text-ink-3">Needs your validation before any billing action.</p>
            </div>
            <div>
              <p className="font-medium text-ink">Low confidence</p>
              <p className="text-ink-3">Flagged for investigation only. No billing action.</p>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[15px] font-semibold text-ink">Recent activity</h2>
            <Link href="/agents/usage-leak/settings?tab=activity" className="text-[13px] text-rzp hover:underline">
              View audit log
            </Link>
          </div>
          <ul className="flex-1 divide-y divide-line/70">
            {[...state.audit]
              .sort((a, b) => +new Date(b.at) - +new Date(a.at))
              .slice(0, 4)
              .map((e) => (
                <li key={e.id} className="px-5 py-2.5 text-[13px]">
                  <p className="text-ink">
                    <span className="font-medium">{e.customer}</span> · {e.action}
                  </p>
                  <p className="text-xs text-ink-3">
                    {e.actor} · {new Date(e.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </p>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Modal
        open={!!peek}
        onClose={() => setPeek(null)}
        title={peek ? `${peek.customer} · ${peek.issue}` : ""}
        description={peek ? peek.plan : undefined}
        width="max-w-xl"
        footer={
          <>
            <Button onClick={() => setPeek(null)}>Close</Button>
            <ButtonLink href="/agents/usage-leak/acme" variant="primary">
              Open Acme investigation
            </ButtonLink>
          </>
        }
      >
        {peek && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold text-ink">
                {formatINR(peek.leakage)}
                {peek.recurring && <span className="text-sm font-normal text-ink-3"> / month</span>}
              </p>
              <ConfidenceBadge label={peek.confidenceLabel} score={peek.confidence} />
              <StatusBadge status={peek.status} />
            </div>
            <p className="text-[14px] leading-6 text-ink">{peek.summary}</p>
            <p className="text-xs text-ink-3">Sources checked: {peek.sources.join(" · ")}</p>
            {peek.confidenceLabel === "Low" && (
              <Notice tone="neutral">Low-confidence findings are never turned into billing actions. Resolve the source conflict first.</Notice>
            )}
            <Notice tone="info">The full evidence view is built out for Acme Ltd in this prototype.</Notice>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
