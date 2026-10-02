"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, CircleCheck, Database, ExternalLink, FileText, Info, Repeat, Users } from "lucide-react";
import { Breadcrumb, Card, Notice, PageContainer, PageHeader, SectionTitle } from "@/components/global/Page";
import { Badge } from "@/components/global/Badge";
import { Button, ButtonLink } from "@/components/global/Button";
import { RazorpayGlyph } from "@/components/global/Brand";
import { useToast } from "@/components/global/Toast";
import {
  AiExtracted,
  CalculationBreakdown,
  EvidenceCard,
  LeakageMetric,
  ReasoningPanel,
  SourceBadge,
  VerifiedNote,
  acmeSources,
} from "@/components/usageleak/UsageLeakParts";
import { ContractSourceModal, ExceptionModal, InvoicePreviewModal } from "@/components/usageleak/Modals";
import { acme, acmeCalc, merchant } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { useStore } from "@/lib/store";

export function Investigation() {
  const router = useRouter();
  const toast = useToast();
  const { state, update, log } = useStore();
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const status = state.acmeStatus;
  const actionable = status === "Needs review";

  const ignore = () => {
    const prev = state.acmeStatus;
    update((s) => ({ ...s, acmeStatus: "Dismissed" }));
    log({ customer: "Acme Ltd", action: "Finding dismissed without a reason", actor: merchant.userInitials, status: "Dismissed" });
    toast({
      title: "Finding dismissed",
      body: "No billing change was made. Add a reason via “Mark as exception” to improve future checks.",
      tone: "info",
      action: {
        label: "Undo",
        onClick: () => {
          update((s) => ({ ...s, acmeStatus: prev }));
          log({ customer: "Acme Ltd", action: "Dismissal undone", actor: merchant.userInitials, status: "Updated" });
        },
      },
    });
  };

  const reopen = () => {
    update((s) => ({ ...s, acmeStatus: "Needs review", exception: null }));
    log({ customer: "Acme Ltd", action: "Finding re-opened for review", actor: merchant.userInitials, status: "Updated" });
  };

  return (
    <>
      <PageContainer className="pb-36">
        <Breadcrumb items={[{ label: "UsageLeak", href: "/agents/usage-leak" }, { label: "Opportunities", href: "/agents/usage-leak" }, { label: "Acme Ltd" }]} />
        <PageHeader
          title={`${formatINR(acmeCalc.leakage)} potential monthly revenue leakage`}
          subtitle={
            <>
              {acme.customer} · {acme.plan}
            </>
          }
          actions={
            actionable && (
              <>
                <Button onClick={ignore}>Ignore</Button>
                <ButtonLink href="/agents/usage-leak/acme/action" variant="primary">
                  Correct billing
                </ButtonLink>
              </>
            )
          }
        >
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Badge tone="green">HIGH CONFIDENCE</Badge>
            <Badge tone="blue">
              <Repeat size={11} /> RECURRING
            </Badge>
            <Badge tone="grey">Detected 02 Oct 2026 · {acme.period}</Badge>
          </div>
        </PageHeader>

        {status === "Corrected" && state.executed && (
          <Notice tone="success" icon={<CircleCheck size={16} />} className="mb-5">
            <span className="font-medium">Billing corrected.</span> {formatINR(state.executed.invoiceAmount)} invoice draft created · subscription scheduled{" "}
            {state.executed.seatsFrom} → {state.executed.seatsTo} seats from the next billing cycle. Payment not yet collected.{" "}
            <button className="font-medium underline-offset-2 hover:underline" onClick={() => setInvoiceOpen(true)}>
              View invoice
            </button>
          </Notice>
        )}
        {status === "Exception" && state.exception && (
          <Notice tone="neutral" icon={<Info size={16} />} className="mb-5">
            <span className="font-medium text-ink">Marked as exception — {state.exception.reason}.</span> No billing change was made.
            {state.exception.applyToFuture && " This context will be used in future Acme checks."}{" "}
            <button className="font-medium text-rzp hover:underline" onClick={reopen}>
              Re-open
            </button>
          </Notice>
        )}
        {status === "Dismissed" && (
          <Notice tone="neutral" icon={<Info size={16} />} className="mb-5">
            <span className="font-medium text-ink">Dismissed.</span> No billing change was made.{" "}
            <button className="font-medium text-rzp hover:underline" onClick={reopen}>
              Re-open
            </button>
          </Notice>
        )}

        <LeakageMetric
          currentMonthly={acmeCalc.currentMonthly}
          currentSeats={acme.currentBilledSeats}
          expectedMonthly={acmeCalc.expectedMonthly}
          expectedSeats={acmeCalc.qualifyingSeats}
          leakage={acmeCalc.leakage}
        />
        <p className="mt-3 text-[14px] text-ink-2">
          <span className="font-medium text-ink">
            {acmeCalc.qualifyingSeats} qualifying seats are active, but only {acme.currentBilledSeats} are currently billed.
          </span>{" "}
          The {formatINR(acmeCalc.leakage)} was never invoiced, so there is no failed payment to recover — it's revenue that hasn't been billed yet.
        </p>

        <section className="mt-8">
          <SectionTitle>Why UsageLeak flagged this</SectionTitle>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <EvidenceCard
              step={1}
              title="Contract"
              source={<SourceBadge>{acme.contract.file}</SourceBadge>}
              footer={
                <>
                  <AiExtracted />
                  <button onClick={() => setSourceOpen(true)} className="inline-flex items-center gap-1 font-medium text-rzp hover:underline">
                    View source <ExternalLink size={13} />
                  </button>
                </>
              }
            >
              <p className="text-xs font-medium uppercase tracking-[0.04em] text-ink-3">Key extracted term</p>
              <blockquote className="mt-1.5 border-l-2 border-ok pl-3 text-[14.5px] leading-6 text-ink">
                12 seats included.
                <br />
                Additional qualifying seats are billed monthly at ₹1,500 per seat.
              </blockquote>
              <p className="mt-3 text-[13px] text-ink-2">
                {acme.contract.clause} · Contractors excluded · monthly true-up permitted
              </p>
            </EvidenceCard>

            <EvidenceCard
              step={2}
              title="Product usage"
              source={<SourceBadge icon={<Activity size={12} />}>{acme.usage.source}</SourceBadge>}
              footer={<span className="text-xs text-ink-3">{acme.usage.definition}</span>}
            >
              <p className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-ink">{acmeCalc.qualifyingSeats}</p>
              <p className="mt-1 text-[14px] text-ink">qualifying active seats</p>
              <p className="text-[13px] text-ink-3">{acme.period}</p>
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
                <li className="flex justify-between text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} /> Total active users
                  </span>
                  <span className="tabular-nums text-ink">{acme.actualActiveUsers}</span>
                </li>
                <li className="flex justify-between text-ink-2">
                  <span>Contractor users excluded</span>
                  <span className="tabular-nums text-ink">− {acme.excludedContractors}</span>
                </li>
              </ul>
            </EvidenceCard>

            <EvidenceCard
              step={3}
              title="Current Razorpay billing"
              source={
                <SourceBadge icon={<span className="flex h-3 w-3 items-center justify-center rounded-sm bg-nav"><RazorpayGlyph size={6} /></span>}>
                  Subscription {acme.subscriptionId}
                </SourceBadge>
              }
              footer={<span className="text-xs text-ink-3">Last updated {acme.subscriptionUpdated}</span>}
            >
              <p className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-ink">
                {acme.currentBilledSeats} <span className="text-xl font-medium text-ink-2">seats</span>
              </p>
              <p className="mt-1 text-[14px] text-ink">{formatINR(acme.currentBilling)}/month</p>
              <p className="text-[13px] text-ink-3">Billed monthly in advance · next cycle {acme.nextCycle}</p>
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[13px] text-ink-2">
                <li className="flex justify-between">
                  <span>Seat quantity changes since Jan</span>
                  <span className="text-ink">None</span>
                </li>
                <li className="flex justify-between">
                  <span>Seat true-up invoices</span>
                  <span className="text-ink">None</span>
                </li>
              </ul>
            </EvidenceCard>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Validated calculation</h2>
              <span className="inline-flex items-center gap-1 rounded bg-page px-2 py-0.5 text-[11px] font-medium text-ink-2">
                <Database size={11} /> Deterministic rules engine
              </span>
            </div>
            <CalculationBreakdown
              lines={[
                { label: `${acme.currentBilledSeats} existing billed seats`, value: acme.currentBilling },
                {
                  label: (
                    <>
                      {acmeCalc.additionalSeats} additional qualifying seats × {formatINR(acme.seatRate)}
                      <span className="ml-1.5 text-xs text-ink-3">({acmeCalc.qualifyingSeats} − {acme.currentBilledSeats})</span>
                    </>
                  ),
                  value: acmeCalc.additionalAmount,
                },
                { label: "Expected monthly billing", value: acmeCalc.expectedMonthly, strong: true, divider: true },
                { label: "Current monthly billing", value: acmeCalc.currentMonthly },
                { label: "Potential monthly leakage", value: acmeCalc.leakage, highlight: true },
              ]}
            />
            <div className="mt-4 border-t border-line pt-3">
              <VerifiedNote>
                Calculation verified against the extracted contract rule. UsageLeak's AI interpreted {acme.contract.clause}; the arithmetic was computed by
                Razorpay's rules engine, not the model.
              </VerifiedNote>
            </div>
          </Card>

          <div className="space-y-4">
            <ReasoningPanel confidence={<span className="font-medium text-ok">High · {acme.confidence}%</span>} sources={acmeSources}>
              Acme has {acme.actualActiveUsers} active users. Two are marked as contractors and excluded under {acme.contract.clause}, leaving{" "}
              {acmeCalc.qualifyingSeats} qualifying seats. Razorpay currently bills {acme.currentBilledSeats} seats. No CRM amendment or complimentary-seat
              exception was found for the additional {acmeCalc.additionalSeats} seats.
            </ReasoningPanel>
            <Card className="px-5 py-3.5">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.04em] text-ink-3">CRM check · {acme.crm.system}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-ink-3">Account</dt>
                <dd className="text-ink">{acme.crm.account}</dd>
                <dt className="text-ink-3">Amendments</dt>
                <dd className="text-ink">{acme.crm.amendments}</dd>
                <dt className="text-ink-3">Seat exceptions</dt>
                <dd className="text-ink">{acme.crm.exceptions}</dd>
                <dt className="text-ink-3">Account owner</dt>
                <dd className="text-ink">{acme.crm.owner}</dd>
              </dl>
            </Card>
          </div>
        </div>
      </PageContainer>

      {/* Sticky recommendation bar */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-6 py-3.5 md:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rzp-soft text-rzp">
              <FileText size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.04em] text-ink-3">Recommended action</p>
              <p className="text-[14.5px] text-ink">
                {status === "Corrected"
                  ? "Correction approved. UsageLeak will keep checking Acme's usage before each billing cycle."
                  : `Recover this month's ${formatINR(acmeCalc.leakage)} and prevent the mismatch from repeating.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actionable ? (
              <>
                <Button variant="ghost" onClick={ignore}>
                  Ignore
                </Button>
                <Button onClick={() => setExceptionOpen(true)}>Mark as exception</Button>
                <Button variant="primary" onClick={() => router.push("/agents/usage-leak/acme/action")}>
                  Correct billing
                </Button>
              </>
            ) : status === "Corrected" ? (
              <>
                <ButtonLink href="/agents/usage-leak/settings?tab=activity">View audit log</ButtonLink>
                <ButtonLink href="/agents/usage-leak" variant="primary">
                  Back to UsageLeak
                </ButtonLink>
              </>
            ) : (
              <Link href="/agents/usage-leak" className="text-sm font-medium text-rzp hover:underline">
                Back to UsageLeak
              </Link>
            )}
          </div>
        </div>
      </div>

      <ExceptionModal open={exceptionOpen} onClose={() => setExceptionOpen(false)} />
      <ContractSourceModal open={sourceOpen} onClose={() => setSourceOpen(false)} />
      {state.executed && (
        <InvoicePreviewModal
          open={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          seats={state.executed.invoiceSeats}
          amount={state.executed.invoiceAmount}
          status="Draft"
        />
      )}
    </>
  );
}
