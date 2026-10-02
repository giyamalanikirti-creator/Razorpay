"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CircleAlert, CircleCheck, Info, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Breadcrumb, Card, Notice, PageContainer, PageHeader } from "@/components/global/Page";
import { Button, ButtonLink } from "@/components/global/Button";
import { InvoicePreviewModal } from "@/components/usageleak/Modals";
import { acme, acmeCalc } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { defaultDraft, useStore, validateDraft, type CorrectionDraft } from "@/lib/store";

export const EFFECTIVE_LABEL: Record<CorrectionDraft["effective"], string> = {
  next: `Next billing cycle · ${acme.nextCycle}`,
  following: "Following billing cycle · 01 Dec 2026",
};

function ActionCard({
  checked,
  onToggle,
  title,
  description,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className={`relative transition-colors ${checked ? "!border-rzp ring-1 ring-rzp" : ""}`}>
      <label className="flex cursor-pointer items-start gap-3 px-5 pt-4">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 shrink-0 accent-rzp" />
        <span>
          <span className="block text-[16px] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-[14px] text-ink-2">{description}</span>
        </span>
      </label>
      <div className={`px-5 pb-4 pl-12 pt-3 ${checked ? "" : "opacity-50"}`}>{children}</div>
    </Card>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

const inputCls = (tone?: "error" | "warning" | "info") =>
  `h-10 w-full rounded-md border bg-white px-3 text-[14px] tabular-nums text-ink focus:outline-none focus:ring-2 ${
    tone === "error"
      ? "border-crit focus:ring-crit/15"
      : tone === "warning"
        ? "border-[#E0A040] focus:ring-[#E0A040]/20"
        : "border-line focus:border-rzp focus:ring-rzp/15"
  }`;

export function ActionSelection() {
  const router = useRouter();
  const { state, update } = useStore();
  const d = state.draft;
  const [preview, setPreview] = useState(false);
  const v = validateDraft(d);
  const seatIssue = v.issues.find((i) => i.field === "seats");
  const amountIssue = v.issues.find((i) => i.field === "amount");
  const actionsIssue = v.issues.find((i) => i.field === "actions");
  const futureSeats = acme.currentBilledSeats + (Number.isFinite(d.seats) ? d.seats : 0);

  const set = (patch: Partial<CorrectionDraft>) => update((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
  const setSeats = (raw: string) => {
    const seats = raw === "" ? NaN : Number(raw);
    // Amount follows the contract rate unless the merchant has overridden it.
    const linked = d.amount === d.seats * acme.seatRate;
    set({ seats, ...(linked && Number.isFinite(seats) ? { amount: seats * acme.seatRate } : {}) });
  };

  if (state.acmeStatus === "Corrected") {
    return (
      <PageContainer>
        <Breadcrumb items={[{ label: "UsageLeak", href: "/agents/usage-leak" }, { label: "Acme Ltd", href: "/agents/usage-leak/acme" }, { label: "Correct billing" }]} />
        <Notice tone="success" icon={<CircleCheck size={16} />}>
          Acme's billing has already been corrected. <ButtonLink href="/agents/usage-leak/acme/review" variant="link">View the approved changes</ButtonLink>
        </Notice>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer width="max-w-[1040px]" className="pb-32">
        <Breadcrumb
          items={[
            { label: "UsageLeak", href: "/agents/usage-leak" },
            { label: "Opportunities", href: "/agents/usage-leak" },
            { label: "Acme Ltd", href: "/agents/usage-leak/acme" },
            { label: "Correct billing" },
          ]}
        />
        <PageHeader
          title="Correct Acme's billing"
          subtitle={
            <>
              UsageLeak has prepared two recommended changes. <span className="font-medium text-ink">Nothing will be sent without your approval.</span>
            </>
          }
        />

        <div className="space-y-4">
          <ActionCard
            checked={d.recoverCurrent}
            onToggle={() => set({ recoverCurrent: !d.recoverCurrent })}
            title="Recover current leakage"
            description={`Create a ${formatINR(d.amount || 0)} seat true-up invoice for September.`}
          >
            <dl className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-page px-4 py-3 text-[13.5px] sm:grid-cols-4">
              <div>
                <dt className="text-xs text-ink-3">Quantity</dt>
                <dd className="font-medium tabular-nums text-ink">{Number.isFinite(d.seats) ? d.seats : "—"} seats</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Rate</dt>
                <dd className="font-medium tabular-nums text-ink">{formatINR(acme.seatRate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Amount</dt>
                <dd className="font-medium tabular-nums text-ink">{formatINR(d.amount || 0)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Contract basis</dt>
                <dd className="font-medium text-ink">{acme.contract.clause}</dd>
              </div>
            </dl>
            <button
              onClick={() => setPreview(true)}
              disabled={!d.recoverCurrent || v.hasError}
              className="mt-3 text-[13px] font-medium text-rzp hover:underline disabled:text-ink-3 disabled:no-underline"
            >
              Preview invoice
            </button>
          </ActionCard>

          <ActionCard
            checked={d.preventFuture}
            onToggle={() => set({ preventFuture: !d.preventFuture })}
            title="Prevent future leakage"
            description={
              <>
                Update the next billing cycle from {acme.currentBilledSeats} → {futureSeats} qualifying seats.
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-line bg-page px-4 py-3 text-[13.5px]">
              <div>
                <p className="text-xs text-ink-3">Subscription</p>
                <p className="font-medium text-ink">{acme.subscriptionId}</p>
              </div>
              <div className="flex items-center gap-2 font-medium tabular-nums text-ink">
                {acme.currentBilledSeats} seats <ArrowRight size={14} className="text-ink-3" /> {futureSeats} seats
              </div>
              <div>
                <p className="text-xs text-ink-3">New monthly billing</p>
                <p className="font-medium tabular-nums text-ink">{formatINR(futureSeats * acme.seatRate)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-3">Effective</p>
                <p className="font-medium text-ink">{EFFECTIVE_LABEL[d.effective].split(" · ")[0]}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-2">
              <Info size={14} className="text-ink-3" /> UsageLeak will continue checking usage before future cycles.
            </p>
          </ActionCard>
          {actionsIssue && (
            <Notice tone="warning" icon={<CircleAlert size={15} />}>
              {actionsIssue.text}
            </Notice>
          )}
        </div>

        <Card className="mt-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Want to change this?</h2>
              <p className="text-[13px] text-ink-3">
                Verified recommendation: {acmeCalc.additionalSeats} seats × {formatINR(acme.seatRate)} = {formatINR(acmeCalc.additionalAmount)}
              </p>
            </div>
            {v.edited && (
              <Button variant="ghost" size="sm" onClick={() => set({ seats: defaultDraft.seats, amount: defaultDraft.amount })}>
                <RotateCcw size={14} /> Reset to verified values
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Amount">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={Number.isFinite(d.amount) ? d.amount : ""}
                  onChange={(e) => set({ amount: e.target.value === "" ? NaN : Number(e.target.value) })}
                  className={`${inputCls(amountIssue?.level)} pl-7`}
                  aria-invalid={amountIssue?.level === "error"}
                />
              </div>
            </Field>
            <Field label="Seat quantity">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={Number.isFinite(d.seats) ? d.seats : ""}
                onChange={(e) => setSeats(e.target.value)}
                className={inputCls(seatIssue?.level)}
                aria-invalid={seatIssue?.level === "error"}
              />
            </Field>
            <Field label="Effective date">
              <select value={d.effective} onChange={(e) => set({ effective: e.target.value as CorrectionDraft["effective"] })} className={inputCls()}>
                {Object.entries(EFFECTIVE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {(seatIssue || amountIssue) && (
            <div className="mt-4 space-y-2">
              {[seatIssue, amountIssue].filter(Boolean).map((i) => (
                <Notice
                  key={i!.text}
                  tone={i!.level === "info" ? "neutral" : "warning"}
                  icon={i!.level === "info" ? <Info size={15} /> : i!.level === "error" ? <CircleAlert size={15} /> : <TriangleAlert size={15} />}
                  className={i!.level === "error" ? "!border-[#F3C4C4] !bg-crit-bg !text-crit" : ""}
                >
                  {i!.text}
                </Notice>
              ))}
            </div>
          )}
        </Card>
      </PageContainer>

      <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-3 px-6 py-3.5 md:px-8">
          <p className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <ShieldCheck size={16} className="text-ok" />
            These actions are currently in review-first mode.
          </p>
          <div className="flex items-center gap-2">
            <ButtonLink href="/agents/usage-leak/acme">Back</ButtonLink>
            <Button variant="primary" disabled={v.hasError} onClick={() => router.push("/agents/usage-leak/acme/review")}>
              Review changes
            </Button>
          </div>
        </div>
      </div>

      <InvoicePreviewModal open={preview} onClose={() => setPreview(false)} seats={d.seats} amount={d.amount} />
    </>
  );
}
