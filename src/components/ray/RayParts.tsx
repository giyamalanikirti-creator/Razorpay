"use client";

import Link from "next/link";
import { ArrowRight, ArrowUp, Plus } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { RayMark, UsageLeakMark } from "@/components/global/Brand";
import { Sparkline } from "@/components/global/Sparkline";
import { rayInsights, summary } from "@/lib/data";
import { formatINR, formatINRCompact } from "@/lib/format";

export const DEMO_PROMPT = "Did I miss any revenue this month?";

// Fixed to match the demo script; RAY normally greets by local time of day.
export function greeting() {
  return "Good afternoon";
}

/* ---------------- Hero ---------------- */

export function RayHero({ name }: { name?: string }) {
  return (
    <div className="text-center">
      <p className="text-[15px] text-ink-2">
        {greeting()}
        {name ? `, ${name}` : ""}
      </p>
      <h1 className="mt-2 flex items-center justify-center gap-3 text-[30px] font-semibold tracking-[-0.015em] text-ink">
        <RayMark size={30} />
        What can I do for you today?
      </h1>
    </div>
  );
}

/* ---------------- Prompt box ---------------- */

export function RayPromptBox({
  value,
  onChange,
  onSubmit,
  compact = false,
  disabled = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  compact?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && !value) {
      e.preventDefault();
      onChange(DEMO_PROMPT);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit(value.trim());
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit(value.trim());
      }}
      className={`relative w-full rounded-xl border border-[#D9DEE5] bg-white shadow-[0_2px_10px_rgba(16,24,40,0.05)] transition-shadow focus-within:border-[#8DB6F9] focus-within:shadow-[0_0_0_3px_rgba(11,102,246,0.10)] ${compact ? "min-h-[104px]" : "min-h-[115px]"}`}
    >
      <label htmlFor="ray-input" className="sr-only">
        Ask RAY
      </label>
      <textarea
        id="ray-input"
        ref={ref}
        rows={2}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={compact ? "Ask anything..." : "Ask RAY about payments, revenue, settlements and more..."}
        className="block w-full resize-none bg-transparent px-4 pb-10 pt-3.5 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
      />
      {!value && !compact && (
        <span className="pointer-events-none absolute left-4 top-[38px] flex items-center gap-1.5 text-[13px] text-ink-3/80">
          Try “{DEMO_PROMPT}”
          <kbd className="rounded border border-line bg-page px-1 font-sans text-[10px] font-medium text-ink-2">Tab</kbd>
        </span>
      )}
      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between">
        <button type="button" className="flex items-center gap-1 rounded px-1 py-0.5 text-[13px] text-ink-2 hover:text-ink">
          <Plus size={14} /> Upload file
        </button>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-rzp text-white transition-colors disabled:bg-[#DCE7FB] disabled:text-white"
        >
          <ArrowUp size={15} strokeWidth={2.2} />
        </button>
      </div>
    </form>
  );
}

export function SuggestionChip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-[#DADFE6] bg-white/80 px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-[#B9C3D0] hover:text-ink"
    >
      {children}
    </button>
  );
}

/* ---------------- Insight cards ---------------- */

function CardFooter({ href, children, onClick }: { href?: string; children: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex items-center gap-2">
        <RayMark size={14} />
        {children}
      </span>
      <ArrowRight size={15} className="text-ink-2 transition-transform group-hover:translate-x-0.5" />
    </>
  );
  const cls = "group mt-auto flex items-center justify-between border-t border-line/80 px-4 py-3 text-[13px] font-medium text-ink hover:text-rzp";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={`${cls} w-full`}>
      {inner}
    </button>
  );
}

export function RayInsightCard({
  title,
  children,
  footer,
  href,
  onClick,
  tinted = false,
}: {
  title: ReactNode;
  children: ReactNode;
  footer: string;
  href?: string;
  onClick?: () => void;
  tinted?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[214px] flex-col rounded-[10px] border ${
        tinted ? "border-[#CFE6DA] bg-gradient-to-br from-[#F2FBF6] via-white to-[#EFF5FF]" : "border-line bg-white"
      } shadow-card`}
    >
      <div className="px-4 pb-3 pt-4">
        <div className="text-[13px] font-medium text-ink-2">{title}</div>
        {children}
      </div>
      <CardFooter href={href} onClick={onClick}>
        {footer}
      </CardFooter>
    </div>
  );
}

export function RayInsightRow({ onPaymentsClick }: { onPaymentsClick: (q: string) => void }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
      <RayInsightCard title="Payment success" footer="Payment health" onClick={() => onPaymentsClick("How is my payment health?")}>
        <p className="mt-1.5 text-[28px] font-semibold tracking-[-0.01em] text-ink">{rayInsights.successRate}%</p>
        <p className="text-xs text-ink-3">Last 14 days</p>
        <Sparkline data={rayInsights.successSeries} className="mt-2" />
      </RayInsightCard>

      <RayInsightCard
        tinted
        href="/agents/usage-leak"
        footer="Review opportunities"
        title={
          <span className="flex items-center gap-1.5">
            <UsageLeakMark size={18} />
            <span className="text-ok">Revenue opportunity</span>
            <span className="ml-auto text-[11px] font-normal text-ink-3">UsageLeak</span>
          </span>
        }
      >
        <p className="mt-1.5 text-[28px] font-semibold tracking-[-0.01em] text-ink">{formatINRCompact(summary.potentialLeakage)}</p>
        <p className="text-[13px] text-ink-2">potential unbilled revenue found</p>
        <p className="mt-0.5 text-xs text-ink-3">Across {summary.accountsAffected} customer accounts</p>
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-ok-bg px-2 py-1 text-xs font-medium text-ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          {formatINR(summary.highConfidenceLeakage)} is high-confidence
        </p>
      </RayInsightCard>

      <RayInsightCard title="Collected payments" footer="See payments" onClick={() => onPaymentsClick("Show today's collected payments")}>
        <p className="mt-1.5 text-[28px] font-semibold tracking-[-0.01em] text-ink">
          {formatINR(rayInsights.collected)}
          <span className="text-base text-ink-3">.00</span>
        </p>
        <p className="text-xs text-ok">↗ 6% above usual</p>
        <Sparkline data={rayInsights.collectedSeries} stroke="#E8853B" fill="rgba(232,133,59,0.10)" className="mt-2" />
      </RayInsightCard>
    </div>
  );
}

/* ---------------- Responses ---------------- */

export function RayThinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2 text-[13px]" role="status">
      <RayMark size={16} className="animate-pulse" />
      <span className="shimmer-text font-medium">{label}</span>
    </div>
  );
}

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md border border-line bg-white px-4 py-2 text-[14px] text-ink shadow-card">{children}</div>
    </div>
  );
}

export function RayResponse({ children }: { children: ReactNode }) {
  return <div className="animate-[rise_220ms_ease-out] space-y-3 text-[14.5px] leading-6 text-ink">{children}</div>;
}

/** Structured response card, styled like RAY's analytics cards. */
export function AgentActionCard({
  eyebrow,
  title,
  meta,
  children,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="max-w-[560px] rounded-[10px] border border-line bg-white shadow-card">
      <div className="border-b border-line px-5 py-3.5">
        {eyebrow && <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{eyebrow}</p>}
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {meta && <p className="text-xs text-ink-3">{meta}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
      {actions && <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">{actions}</div>}
    </div>
  );
}

export function KV({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-3">{label}</p>
      <p className={`mt-0.5 text-[17px] font-semibold ${accent ? "text-ok" : "text-ink"}`}>{value}</p>
    </div>
  );
}
