"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleCheck, Loader2, PauseCircle, TriangleAlert } from "lucide-react";
import { Breadcrumb, Card, Notice, PageContainer, PageHeader } from "@/components/global/Page";
import { Badge } from "@/components/global/Badge";
import { Button, ButtonLink } from "@/components/global/Button";
import { ApprovalGuardrail } from "@/components/usageleak/UsageLeakParts";
import { InvoicePreviewModal } from "@/components/usageleak/Modals";
import { acme, acmeCalc, merchant } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { useStore, validateDraft } from "@/lib/store";
import { EFFECTIVE_LABEL } from "../action/ActionSelection";

export function Review() {
  const params = useSearchParams();
  const { state, update, log } = useStore();
  const d = state.draft;
  const v = validateDraft(d);
  const [confirmed, setConfirmed] = useState(false);
  const [whyOpen, setWhyOpen] = useState(true);
  const [phase, setPhase] = useState<"review" | "executing" | "done">("review");
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const executed = state.executed;
  const showSuccess = phase === "done" || (phase === "review" && state.acmeStatus === "Corrected" && !!executed);

  useEffect(() => {
    if (params.get("invoice") && executed) setInvoiceOpen(true);
  }, [params, executed]);

  const futureSeats = acme.currentBilledSeats + d.seats;

  const approve = () => {
    setPhase("executing");
    setTimeout(() => {
      const now = new Date().toISOString();
      update((s) => ({
        ...s,
        acmeStatus: "Corrected",
        executed: {
          invoiceAmount: d.recoverCurrent ? d.amount : 0,
          invoiceSeats: d.seats,
          seatsFrom: acme.currentBilledSeats,
          seatsTo: futureSeats,
          recoverCurrent: d.recoverCurrent,
          preventFuture: d.preventFuture,
          at: now,
        },
      }));
      log({ customer: "Acme Ltd", action: "Recommendation reviewed", actor: merchant.userInitials, status: "Reviewed", at: now });
      if (v.edited)
        log({
          customer: "Acme Ltd",
          action: `Recommendation edited: ${acmeCalc.additionalSeats} → ${d.seats} seats, ${formatINR(acmeCalc.additionalAmount)} → ${formatINR(d.amount)}`,
          actor: merchant.userInitials,
          status: "Updated",
          at: now,
        });
      if (d.recoverCurrent)
        log({ customer: "Acme Ltd", action: `${formatINR(d.amount)} invoice draft created`, actor: `${merchant.userInitials} approved`, status: "Created", at: now });
      if (d.preventFuture)
        log({
          customer: "Acme Ltd",
          action: `Subscription quantity scheduled: ${acme.currentBilledSeats} → ${futureSeats}`,
          actor: `${merchant.userInitials} approved`,
          status: "Scheduled",
          at: now,
        });
      setPhase("done");
    }, 800);
  };

  if (showSuccess && executed) {
    return (
      <PageContainer width="max-w-[880px]">
        <Breadcrumb items={[{ label: "UsageLeak", href: "/agents/usage-leak" }, { label: "Acme Ltd", href: "/agents/usage-leak/acme" }, { label: "Approved" }]} />
        <Card className="animate-[rise_240ms_ease-out] overflow-hidden">
          <div className="flex flex-col items-center px-8 pb-6 pt-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-bg text-ok">
              <Check size={30} strokeWidth={2.4} />
            </span>
            <h1 className="mt-4 text-[26px] font-semibold text-ink">Billing corrected</h1>
            <p className="mt-1.5 max-w-[520px] text-[15px] text-ink-2">
              {executed.recoverCurrent
                ? `${formatINR(executed.invoiceAmount)} of previously unbilled revenue has been converted into billing.`
                : "Acme's subscription has been corrected for future billing cycles."}
            </p>
          </div>
          <div className="mx-8 grid grid-cols-1 divide-y divide-line rounded-lg border border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-5 py-4">
              <p className="text-xs text-ink-3">Invoice draft</p>
              {executed.recoverCurrent ? (
                <>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{formatINR(executed.invoiceAmount)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge tone="green">Created</Badge>
                    <span className="text-xs text-ink-3">Not sent · awaiting your send</span>
                  </div>
                </>
              ) : (
                <p className="mt-0.5 text-[15px] text-ink-2">Not selected</p>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-ink-3">Subscription</p>
              {executed.preventFuture ? (
                <>
                  <p className="mt-0.5 flex items-center gap-2 text-xl font-semibold tabular-nums text-ink">
                    {executed.seatsFrom} <ArrowRight size={16} className="text-ink-3" /> {executed.seatsTo} seats
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge tone="green">Updated for next cycle</Badge>
                    <span className="text-xs text-ink-3">{EFFECTIVE_LABEL[d.effective].split(" · ")[1]}</span>
                  </div>
                </>
              ) : (
                <p className="mt-0.5 text-[15px] text-ink-2">Not selected</p>
              )}
            </div>
          </div>
          <div className="mx-8 mt-4">
            <Notice tone="neutral">
              Payment status: <span className="font-medium text-ink">Not yet collected.</span> UsageLeak will mark this opportunity as{" "}
              <span className="font-medium text-ink">Collected</span> once Acme pays the invoice.
            </Notice>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#FAFBFC] px-8 py-4">
            <div className="flex gap-2">
              {executed.recoverCurrent && <Button onClick={() => setInvoiceOpen(true)}>View invoice</Button>}
              <ButtonLink href="/agents/usage-leak/settings?tab=activity">View audit log</ButtonLink>
            </div>
            <ButtonLink href="/agents/usage-leak" variant="primary">
              Back to UsageLeak <ArrowRight size={15} />
            </ButtonLink>
          </div>
        </Card>
        <InvoicePreviewModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} seats={executed.invoiceSeats} amount={executed.invoiceAmount} status="Draft" />
      </PageContainer>
    );
  }

  const blocked = state.paused || v.hasError || state.acmeStatus === "Exception" || state.acmeStatus === "Dismissed";

  return (
    <PageContainer width="max-w-[880px]">
      <Breadcrumb
        items={[
          { label: "UsageLeak", href: "/agents/usage-leak" },
          { label: "Acme Ltd", href: "/agents/usage-leak/acme" },
          { label: "Correct billing", href: "/agents/usage-leak/acme/action" },
          { label: "Review" },
        ]}
      />
      <PageHeader title="Review before approving" subtitle="UsageLeak will only execute the actions shown below." />

      <Card>
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">Acme Ltd</p>
          <p className="text-xs text-ink-3">{acme.subscriptionId}</p>
        </div>
        <ol className="divide-y divide-line">
          {d.recoverCurrent && (
            <li className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-page text-xs font-semibold text-ink-2">1</span>
                <div>
                  <p className="text-[13px] text-ink-3">Current-cycle correction</p>
                  <p className="text-[16px] font-semibold text-ink">Create invoice</p>
                  <p className="mt-0.5 text-[13.5px] text-ink-2">
                    {d.seats} additional seats × {formatINR(acme.seatRate)} · September 2026 · {acme.contract.clause}
                  </p>
                  <button onClick={() => setInvoiceOpen(true)} className="mt-1 text-[13px] font-medium text-rzp hover:underline">
                    Preview invoice
                  </button>
                </div>
              </div>
              <p className="text-[24px] font-semibold tabular-nums text-ink">{formatINR(d.amount)}</p>
            </li>
          )}
          {d.preventFuture && (
            <li className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-page text-xs font-semibold text-ink-2">{d.recoverCurrent ? 2 : 1}</span>
                <div>
                  <p className="text-[13px] text-ink-3">Future correction</p>
                  <p className="text-[16px] font-semibold text-ink">Subscription seats</p>
                  <p className="mt-0.5 text-[13.5px] text-ink-2">Effective: {EFFECTIVE_LABEL[d.effective]}</p>
                </div>
              </div>
              <p className="flex items-center gap-2 text-[24px] font-semibold tabular-nums text-ink">
                {acme.currentBilledSeats} <ArrowRight size={18} className="text-ink-3" /> {futureSeats}
              </p>
            </li>
          )}
        </ol>
        {v.edited && (
          <div className="border-t border-line px-6 py-3">
            <Notice tone={v.hasWarning ? "warning" : "neutral"} icon={<TriangleAlert size={15} />}>
              You edited UsageLeak's verified recommendation ({acmeCalc.additionalSeats} seats · {formatINR(acmeCalc.additionalAmount)}). The edit will be recorded
              in the audit log.
              {v.issues
                .filter((i) => i.level === "warning")
                .map((i) => (
                  <span key={i.text} className="block">
                    {i.text}
                  </span>
                ))}
            </Notice>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <button onClick={() => setWhyOpen((o) => !o)} className="flex w-full items-center justify-between px-6 py-3.5 text-left" aria-expanded={whyOpen}>
          <span className="text-[14.5px] font-semibold text-ink">Why is UsageLeak recommending this?</span>
          <ChevronDown size={17} className={`text-ink-3 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
        </button>
        {whyOpen && (
          <div className="border-t border-line px-6 pb-4 pt-3">
            <ul className="space-y-1.5 text-[14px] text-ink">
              {[
                "Contract permits monthly seat true-up",
                `${acmeCalc.qualifyingSeats} qualifying seats observed`,
                `${acme.currentBilledSeats} currently billed`,
                "No conflicting amendment found",
                "Calculation validated",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CircleCheck size={15} className="text-ok" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/agents/usage-leak/acme" className="mt-3 inline-block text-[13px] font-medium text-rzp hover:underline">
              View all evidence
            </Link>
          </div>
        )}
      </Card>

      <div className="mt-4">
        <ApprovalGuardrail>
          <p>UsageLeak cannot send invoices or modify subscriptions outside the permissions you granted.</p>
          <p>Every action will be recorded in the audit log.</p>
        </ApprovalGuardrail>
      </div>

      {state.paused && (
        <Notice tone="neutral" icon={<PauseCircle size={16} />} className="mt-4">
          UsageLeak is paused. Resume it in{" "}
          <Link className="font-medium text-rzp hover:underline" href="/agents/usage-leak/settings?tab=permissions">
            settings
          </Link>{" "}
          to execute actions.
        </Notice>
      )}
      {(state.acmeStatus === "Exception" || state.acmeStatus === "Dismissed") && (
        <Notice tone="neutral" className="mt-4">
          This finding is marked as {state.acmeStatus === "Exception" ? "an exception" : "dismissed"}. Re-open it from the{" "}
          <Link className="font-medium text-rzp hover:underline" href="/agents/usage-leak/acme">
            Acme investigation
          </Link>{" "}
          to approve a correction.
        </Notice>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-rzp" />
          I have reviewed the evidence and billing changes.
        </label>
        <div className="flex items-center gap-2">
          <ButtonLink href="/agents/usage-leak/acme/action">Back</ButtonLink>
          <Button variant="primary" disabled={!confirmed || blocked || phase === "executing"} onClick={approve} className="min-w-[160px]">
            {phase === "executing" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Executing…
              </>
            ) : (
              "Approve & execute"
            )}
          </Button>
        </div>
      </div>

      <InvoicePreviewModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} seats={d.seats} amount={d.amount} />
    </PageContainer>
  );
}
