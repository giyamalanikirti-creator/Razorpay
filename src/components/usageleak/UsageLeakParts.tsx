"use client";

import type { ReactNode } from "react";
import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/global/Page";
import { Badge } from "@/components/global/Badge";
import { formatINR } from "@/lib/format";
import { acme, type AuditEntry } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { RazorpayGlyph } from "@/components/global/Brand";

export function UsageLeakBadge({ paused }: { paused?: boolean }) {
  return paused ? (
    <Badge tone="grey" dot>
      Paused
    </Badge>
  ) : (
    <Badge tone="green" dot>
      Active
    </Badge>
  );
}

export function SourceBadge({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded border border-line bg-page px-2 py-0.5 text-xs text-ink-2">
      {icon ?? <FileText size={12} className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function AiExtracted({ label = "Extracted by UsageLeak" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0F7A48]">
      <Sparkles size={12} />
      {label}
    </span>
  );
}

/* ---------------- Leakage summary ---------------- */

export function LeakageMetric({
  currentMonthly,
  currentSeats,
  expectedMonthly,
  expectedSeats,
  leakage,
}: {
  currentMonthly: number;
  currentSeats: number;
  expectedMonthly: number;
  expectedSeats: number;
  leakage: number;
}) {
  return (
    <Card className="grid grid-cols-1 items-stretch overflow-hidden md:grid-cols-[1fr_auto_1fr_minmax(260px,0.9fr)]">
      <div className="px-6 py-5">
        <p className="text-[13px] font-medium text-ink-2">Current billing</p>
        <p className="mt-1.5 text-[32px] font-semibold leading-10 tracking-[-0.01em] text-ink">
          {formatINR(currentMonthly)}
          <span className="text-base font-normal text-ink-3"> / month</span>
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">{currentSeats} seats billed</p>
      </div>
      <div className="hidden items-center text-ink-3 md:flex">
        <ArrowRight size={22} strokeWidth={1.5} />
      </div>
      <div className="px-6 py-5">
        <p className="text-[13px] font-medium text-ink-2">Expected billing</p>
        <p className="mt-1.5 text-[32px] font-semibold leading-10 tracking-[-0.01em] text-ink">
          {formatINR(expectedMonthly)}
          <span className="text-base font-normal text-ink-3"> / month</span>
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">{expectedSeats} qualifying seats</p>
      </div>
      <div className="m-2 rounded-lg border border-warn-line bg-warn-bg px-5 py-4">
        <p className="text-[13px] font-medium text-warn">Potential leakage</p>
        <p className="mt-1.5 text-[32px] font-semibold leading-10 tracking-[-0.01em] text-[#7A4300]">
          {formatINR(leakage)}
          <span className="text-base font-normal text-warn"> / month</span>
        </p>
        <p className="mt-0.5 text-[13px] text-warn">Not yet invoiced · recurring</p>
      </div>
    </Card>
  );
}

/* ---------------- Evidence ---------------- */

export function EvidenceCard({
  step,
  title,
  source,
  children,
  footer,
}: {
  step: number;
  title: string;
  source: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-page text-[11px] font-semibold text-ink-2">{step}</span>
          {title}
        </p>
      </div>
      <div className="flex-1 px-5 py-4">
        <div className="mb-3">{source}</div>
        {children}
      </div>
      {footer && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-2.5 text-[13px]">{footer}</div>}
    </Card>
  );
}

/* ---------------- Calculation ---------------- */

export interface CalcLine {
  label: ReactNode;
  value: number;
  strong?: boolean;
  highlight?: boolean;
  divider?: boolean;
}

export function CalculationBreakdown({ lines }: { lines: CalcLine[] }) {
  return (
    <div>
      {lines.map((l, i) => (
        <div key={i}>
          {l.divider && <div className="my-2 border-t border-dashed border-[#CBD1D9]" />}
          <div
            className={`flex items-baseline justify-between gap-6 rounded px-2 py-1.5 text-[14px] ${l.highlight ? "bg-warn-bg font-semibold text-[#7A4300]" : l.strong ? "font-semibold text-ink" : "text-ink-2"}`}
          >
            <span>{l.label}</span>
            <span className="tabular-nums">{formatINR(l.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VerifiedNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[13px] text-ok">
      <ShieldCheck size={16} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* ---------------- Reasoning ---------------- */

export function ReasoningPanel({ children, confidence, sources }: { children: ReactNode; confidence: ReactNode; sources: string[] }) {
  return (
    <div className="rounded-[10px] border border-[#CFE6DA] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3EFE8] bg-[#F6FBF8] px-5 py-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Sparkles size={15} className="text-ok" />
          UsageLeak's reasoning
        </p>
        <span className="text-[13px] text-ink-2">Confidence: {confidence}</span>
      </div>
      <div className="px-5 py-4 text-[14px] leading-6 text-ink">{children}</div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-5 py-2.5 text-xs text-ink-3">
        Sources checked:
        {sources.map((s, i) => (
          <span key={s} className="text-ink-2">
            {s}
            {i < sources.length - 1 && <span className="ml-1.5 text-ink-3">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Approval guardrail ---------------- */

export function ApprovalGuardrail({ children, title = "Merchant approval required" }: { children: ReactNode; title?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-line bg-page px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-white text-rzp">
        <ShieldCheck size={17} />
      </span>
      <div className="text-[13px] leading-5 text-ink-2">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Connector logos ---------------- */

const logoColors: Record<string, { bg: string; fg: string; text: string }> = {
  salesforce: { bg: "#E6F4FC", fg: "#00A1E0", text: "SF" },
  "usage-api": { bg: "#F1F0FF", fg: "#5B4FD6", text: "API" },
  gdrive: { bg: "#FFF6E0", fg: "#C98B00", text: "GD" },
  hubspot: { bg: "#FFEFE8", fg: "#E8592B", text: "HS" },
  docusign: { bg: "#FFF8DC", fg: "#B58A00", text: "DS" },
  snowflake: { bg: "#E8F7FC", fg: "#1AA6D9", text: "SN" },
  upload: { bg: "#F0F2F4", fg: "#5B6472", text: "PDF" },
};

export function ConnectorLogo({ id }: { id: string }) {
  if (id === "razorpay") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nav">
        <RazorpayGlyph size={17} />
      </span>
    );
  }
  const c = logoColors[id] ?? logoColors.upload;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold" style={{ background: c.bg, color: c.fg }}>
      {c.text}
    </span>
  );
}

/* ---------------- Audit log ---------------- */

const auditTone: Record<AuditEntry["status"], "green" | "blue" | "amber" | "grey"> = {
  Detected: "amber",
  Reviewed: "blue",
  Approved: "green",
  Created: "green",
  Scheduled: "green",
  Updated: "blue",
  Exception: "grey",
  Paused: "grey",
  Resumed: "blue",
  Dismissed: "grey",
};

export function AuditLog({ entries, limit }: { entries: AuditEntry[]; limit?: number }) {
  const rows = [...entries].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, limit);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.04em] text-ink-3">
            <th className="px-5 py-2.5 font-medium">When</th>
            <th className="px-3 py-2.5 font-medium">Customer</th>
            <th className="px-3 py-2.5 font-medium">What</th>
            <th className="px-3 py-2.5 font-medium">Who</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-line/70 last:border-0">
              <td className="whitespace-nowrap px-5 py-3 text-ink-2">{formatDateTime(e.at)}</td>
              <td className="px-3 py-3 text-ink">{e.customer}</td>
              <td className="px-3 py-3 text-ink">{e.action}</td>
              <td className="whitespace-nowrap px-3 py-3 text-ink-2">{e.actor}</td>
              <td className="px-5 py-3">
                <Badge tone={auditTone[e.status]}>{e.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const acmeSources = ["Contract", "CRM", "Product usage", "Razorpay Subscription"];
export const acmeClauseRef = `${acme.contract.file} · ${acme.contract.clause}`;
