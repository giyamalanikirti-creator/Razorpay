"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/global/Modal";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import { Notice } from "@/components/global/Page";
import { acme, acmeCalc, merchant } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/global/Toast";

export const EXCEPTION_REASONS = [
  "Contractor seats",
  "Complimentary seats",
  "Contract amendment not uploaded",
  "Usage data is incorrect",
  "One-time commercial exception",
  "Other",
];

export function ExceptionModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { update, log } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [apply, setApply] = useState(true);
  const [saved, setSaved] = useState(false);

  const close = () => {
    onClose();
    setTimeout(() => {
      setSaved(false);
      setReason("");
      setNote("");
      setApply(true);
    }, 200);
  };

  const save = () => {
    update((s) => ({
      ...s,
      acmeStatus: "Exception",
      exception: { reason, note, applyToFuture: apply, at: new Date().toISOString() },
    }));
    log({ customer: "Acme Ltd", action: `Marked as exception: ${reason}${apply ? " (applies to future checks)" : ""}`, actor: merchant.userInitials, status: "Exception" });
    setSaved(true);
    toast({ title: "Exception saved", body: "No billing change was made for Acme Ltd." });
    onSaved?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={saved ? "Exception saved" : "Why shouldn't these seats be billed?"}
      description={saved ? undefined : `${acmeCalc.additionalSeats} additional seats · ${formatINR(acmeCalc.leakage)}/month · Acme Ltd`}
      footer={
        saved ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" disabled={!reason || (reason === "Other" && !note.trim())} onClick={save}>
              Save exception
            </Button>
          </>
        )
      }
    >
      {saved ? (
        <div className="space-y-4">
          <Notice tone="success" icon={<Sparkles size={15} />}>
            <p className="font-medium">UsageLeak will use this context when evaluating future Acme billing.</p>
          </Notice>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13.5px]">
            <dt className="text-ink-3">Reason</dt>
            <dd className="text-ink">{reason}</dd>
            {note && (
              <>
                <dt className="text-ink-3">Note</dt>
                <dd className="text-ink">{note}</dd>
              </>
            )}
            <dt className="text-ink-3">Future checks</dt>
            <dd className="text-ink">{apply ? "Applied to Acme when the same condition occurs" : "This finding only"}</dd>
          </dl>
          <p className="text-xs text-ink-3">
            Stored as merchant-approved account context. It does not change Acme's contract or pricing, and you can remove it any time in UsageLeak settings → Rules.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="sr-only">Reason</legend>
            <div className="grid gap-1.5">
              {EXCEPTION_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] ${reason === r ? "border-rzp bg-rzp-soft/60" : "border-line hover:bg-page"}`}
                >
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-rzp" />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-ink">Add a note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Sales agreed 5 pilot seats free until 31 Dec 2026"
              className="w-full rounded-md border border-line px-3 py-2 text-[14px] placeholder:text-ink-3 focus:border-rzp focus:outline-none focus:ring-2 focus:ring-rzp/15"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-[14px] text-ink">
            <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rzp" />
            Apply this rule to future Acme checks when applicable.
          </label>
        </div>
      )}
    </Modal>
  );
}

export function InvoicePreviewModal({
  open,
  onClose,
  seats,
  amount,
  status = "Preview",
}: {
  open: boolean;
  onClose: () => void;
  seats: number;
  amount: number;
  status?: "Preview" | "Draft";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={status === "Draft" ? "Invoice draft · inv_acme_sep26_tu" : "Invoice preview"}
      description={status === "Draft" ? "Created in Razorpay Invoices. Not sent to the customer." : "This is a preview. Nothing has been created yet."}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="rounded-lg border border-line">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.06em] text-ink-3">From</p>
            <p className="font-semibold text-ink">{merchant.name}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.06em] text-ink-3">Bill to</p>
            <p className="font-semibold text-ink">Acme Ltd</p>
          </div>
          <div className="text-right">
            <Badge tone={status === "Draft" ? "amber" : "grey"}>{status === "Draft" ? "Draft · not sent" : "Preview"}</Badge>
            <p className="mt-2 text-xs text-ink-3">Service period</p>
            <p className="text-[13px] text-ink">01 – 30 Sep 2026</p>
          </div>
        </div>
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="px-5 py-2 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-5 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="px-5 py-3">
                <p className="text-ink">Additional qualifying seats — September true-up</p>
                <p className="text-xs text-ink-3">
                  Per {acme.contract.file}, {acme.contract.clause}
                </p>
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{seats}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatINR(acme.seatRate)}</td>
              <td className="px-5 py-3 text-right tabular-nums">{formatINR(amount)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-5 py-3 text-right font-semibold text-ink">
                Total (excl. taxes)
              </td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatINR(amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-3">Taxes are applied by Razorpay Invoices as per your existing settings. UsageLeak does not calculate tax.</p>
    </Modal>
  );
}

export function ContractSourceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={acme.contract.file}
      description={`Google Drive · Finance / Customer Contracts · signed ${acme.contract.signed}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-3 rounded-lg border border-line bg-page p-5 font-serif text-[14px] leading-6 text-ink-2">
        <p className="text-ink-3">4.1 Subscription Fee. Customer shall pay the Subscription Fee of ₹18,000 per month, billed monthly in advance.</p>
        <p className="rounded border-l-[3px] border-ok bg-white px-3 py-2 text-ink">{acme.contract.fullClause}</p>
        <p className="text-ink-3">4.3 Taxes. All fees are exclusive of applicable taxes.</p>
      </div>
      <div className="mt-4 rounded-lg border border-line">
        <p className="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-ink-3">Structured rule extracted by UsageLeak</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-[13.5px] sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-3">Included seats</dt>
            <dd className="font-medium">12</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Additional seat rate</dt>
            <dd className="font-medium">₹1,500 / month</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">True-up</dt>
            <dd className="font-medium">Monthly</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Contractors</dt>
            <dd className="font-medium">Not billable</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
