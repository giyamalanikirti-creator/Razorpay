import type { ReactNode } from "react";
import type { Confidence, OpportunityStatus } from "@/lib/data";

type Tone = "green" | "amber" | "red" | "blue" | "grey";

const tones: Record<Tone, string> = {
  green: "bg-ok-bg text-ok",
  amber: "bg-warn-bg text-warn",
  red: "bg-crit-bg text-crit",
  blue: "bg-rzp-soft text-rzp",
  grey: "bg-[#F0F2F4] text-ink-2",
};

export function Badge({ tone = "grey", children, className = "", dot = false }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium leading-4 ${tones[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function ConfidenceBadge({ label, score }: { label: Confidence; score?: number }) {
  const tone: Tone = label === "High" ? "green" : label === "Medium" ? "amber" : "grey";
  return (
    <Badge tone={tone}>
      {label}
      {score !== undefined && <span className="font-normal opacity-80">· {score}%</span>}
    </Badge>
  );
}

const statusTone: Record<OpportunityStatus, Tone> = {
  "Needs review": "blue",
  "Needs validation": "amber",
  Investigating: "grey",
  Corrected: "green",
  Exception: "grey",
  Dismissed: "grey",
};

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <Badge tone={statusTone[status]} dot>
      {status}
    </Badge>
  );
}
