"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { ButtonLink } from "@/components/global/Button";
import {
  AgentActionCard,
  KV,
  RayHero,
  RayInsightRow,
  RayPromptBox,
  RayResponse,
  RayThinking,
  SuggestionChip,
  UserBubble,
} from "@/components/ray/RayParts";
import { acme, acmeCalc, summary } from "@/lib/data";
import { formatINR, formatINRCompact } from "@/lib/format";
import { useStore, type AppState, type ChatMessage } from "@/lib/store";

const CHIPS = ["Transactions", "Settlements", "Growing my business", "Account related"];

function classify(q: string, state: AppState): { kind: ChatMessage["kind"]; thinking: string } {
  const t = q.toLowerCase();
  if (t.includes("acme")) {
    return {
      kind: state.executed ? "acme-followup" : "acme-pending",
      thinking: "Fetching Acme Ltd activity from UsageLeak",
    };
  }
  if (/(miss|revenue|leak|unbilled|underbill|billing)/.test(t)) {
    return { kind: "usageleak-summary", thinking: "Fetching your UsageLeak findings from the server" };
  }
  return { kind: "generic", thinking: "Looking into your account" };
}

export function RayHome() {
  const { state, update } = useStore();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const chat = state.chat;
  const inChat = chat.length > 0 || pending !== null;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, pending]);

  const ask = (q: string) => {
    if (pending) return;
    const { kind, thinking } = classify(q, state);
    const id = `${Date.now()}`;
    update((s) => ({ ...s, chat: [...s.chat, { id: `u${id}`, role: "user", text: q }] }));
    setInput("");
    setPending(thinking);
    setTimeout(() => {
      update((s) => ({ ...s, chat: [...s.chat, { id: `r${id}`, role: "ray", text: q, kind }] }));
      setPending(null);
    }, 1300);
  };

  const newChat = () => {
    setPending(null);
    update((s) => ({ ...s, chat: [] }));
  };

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] bg-white">
      {/* Atmospheric RAY background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,rgba(226,240,255,0.95)_0%,rgba(236,247,252,0.7)_45%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute -left-20 -top-24 h-[460px] w-[1200px] rotate-[-8deg] bg-[repeating-linear-gradient(100deg,rgba(150,200,255,0.0)_0px,rgba(150,200,255,0.28)_40px,rgba(190,230,255,0.0)_90px,rgba(255,255,255,0)_150px)] blur-[18px]" />
        <div className="absolute -right-32 top-[-60px] h-[380px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(180,240,215,0.55),rgba(180,240,215,0))]" />
        <div className="absolute left-[-120px] top-[140px] h-[300px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(185,225,255,0.5),rgba(185,225,255,0))]" />
      </div>

      {/* Thin RAY rail */}
      <aside className="relative z-10 hidden w-12 shrink-0 flex-col items-center gap-2 border-r border-line/70 bg-white/60 pt-3 backdrop-blur-sm sm:flex">
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-page" aria-label="Conversations">
          <Menu size={17} />
        </button>
        <button onClick={newChat} className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink-2 hover:text-ink" aria-label="New chat" title="New chat">
          <Plus size={16} />
        </button>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {!inChat ? (
          <div className="mx-auto flex w-full max-w-[880px] flex-col items-center px-6 pb-16 pt-[72px]">
            <RayHero />
            <div className="mt-7 w-full max-w-[600px]">
              <RayPromptBox value={input} onChange={setInput} onSubmit={ask} />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CHIPS.map((c) => (
                <SuggestionChip key={c} onClick={() => ask(c)}>
                  {c}
                </SuggestionChip>
              ))}
            </div>
            <div className="mt-12 w-full">
              <RayInsightRow onPaymentsClick={ask} />
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto w-full max-w-[760px] flex-1 space-y-6 px-6 pb-8 pt-10">
              {chat.map((m) =>
                m.role === "user" ? <UserBubble key={m.id}>{m.text}</UserBubble> : <RayAnswer key={m.id} message={m} onAsk={ask} />,
              )}
              {pending && <RayThinking label={pending} />}
              <div ref={bottom} />
            </div>
            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 px-6 pb-3 pt-6">
              <div className="mx-auto max-w-[620px]">
                <RayPromptBox value={input} onChange={setInput} onSubmit={ask} compact disabled={!!pending} autoFocus />
                <p className="mt-2 text-center text-[11px] text-ink-3">RAY is AI and can make mistakes. Please check important information.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RayAnswer({ message, onAsk }: { message: ChatMessage; onAsk: (q: string) => void }) {
  const { state } = useStore();

  if (message.kind === "usageleak-summary") {
    return (
      <RayResponse>
        <p>
          Yes. UsageLeak found <strong className="font-semibold">₹1.84 lakh</strong> of potential unbilled revenue across {summary.accountsAffected} accounts.
        </p>
        <p>{formatINR(summary.highConfidenceLeakage)} is high-confidence and can be reviewed now.</p>
        <p>
          The largest recurring mismatch is {acme.customer}, where {acmeCalc.qualifyingSeats} qualifying seats are active but only {acme.currentBilledSeats} are
          currently billed.
          {state.executed && <span className="text-ink-2"> You've already approved a correction for Acme.</span>}
        </p>
        <AgentActionCard eyebrow="UsageLeak — Revenue assurance" title="Unbilled revenue · September 2026" meta="Contract · CRM · Product usage · Razorpay Billing">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <KV label="Potential leakage" value={formatINR(summary.potentialLeakage)} />
            <KV label="High-confidence" value={formatINR(summary.highConfidenceLeakage)} accent />
            <KV label="Accounts affected" value={summary.accountsAffected} />
            <KV label="Largest recurring mismatch" value={`${acme.customer} — ${formatINR(acmeCalc.leakage)}/month`} />
          </div>
          <p className="mt-4 text-xs text-ink-3">AI interprets commercial terms. Razorpay validates the calculation before any action.</p>
        </AgentActionCard>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/agents/usage-leak" variant="primary" size="sm">
            Review UsageLeak findings
          </ButtonLink>
          <ButtonLink href="/agents/usage-leak/acme" size="sm">
            Open Acme Ltd
          </ButtonLink>
        </div>
      </RayResponse>
    );
  }

  if (message.kind === "acme-followup" && state.executed) {
    const ex = state.executed;
    return (
      <RayResponse>
        <p>UsageLeak found a {acmeCalc.additionalSeats}-seat billing mismatch for Acme.</p>
        <div>
          <p>You approved:</p>
          <ul className="ml-5 list-disc">
            {ex.recoverCurrent && <li>{formatINR(ex.invoiceAmount)} September true-up invoice</li>}
            {ex.preventFuture && (
              <li>
                subscription update from {ex.seatsFrom} to {ex.seatsTo} seats
              </li>
            )}
          </ul>
        </div>
        <p>
          The invoice has been created. <strong className="font-semibold">Payment has not yet been collected.</strong>
        </p>
        <AgentActionCard eyebrow="UsageLeak — Acme Ltd" title="Billing corrected" meta="Approved by KG · audit logged">
          <div className="grid grid-cols-3 gap-4">
            <KV label="Invoice draft" value={formatINR(ex.invoiceAmount)} />
            <KV label="Subscription" value={`${ex.seatsFrom} → ${ex.seatsTo} seats`} />
            <KV label="Collection" value={<span className="text-warn">Not yet paid</span>} />
          </div>
        </AgentActionCard>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/agents/usage-leak/acme/review?invoice=1" size="sm">
            View invoice
          </ButtonLink>
          <ButtonLink href="/agents/usage-leak" variant="primary" size="sm">
            Open UsageLeak
          </ButtonLink>
        </div>
      </RayResponse>
    );
  }

  if (message.kind === "acme-pending" || message.kind === "acme-followup") {
    if (state.exception) {
      return (
        <RayResponse>
          <p>
            You marked Acme's {acmeCalc.additionalSeats} additional seats as an exception (<em>{state.exception.reason}</em>). UsageLeak saved this context and will
            use it in future Acme checks. No billing change was made.
          </p>
          <ButtonLink href="/agents/usage-leak" size="sm">
            Open UsageLeak
          </ButtonLink>
        </RayResponse>
      );
    }
    return (
      <RayResponse>
        <p>
          UsageLeak flagged Acme Ltd: {acmeCalc.qualifyingSeats} qualifying seats are active, but only {acme.currentBilledSeats} are currently billed. That's{" "}
          {formatINR(acmeCalc.leakage)}/month of potential leakage at High confidence (94%).
        </p>
        <p>No action has been taken yet — it's waiting for your review.</p>
        <ButtonLink href="/agents/usage-leak/acme" variant="primary" size="sm">
          Review Acme
        </ButtonLink>
      </RayResponse>
    );
  }

  return (
    <RayResponse>
      <p>
        I can help with {message.text.toLowerCase()}. In this prototype, RAY's detailed answers are wired up for revenue assurance — try one of these:
      </p>
      <div className="flex flex-wrap gap-2">
        <SuggestionChip onClick={() => onAsk("Did I miss any revenue this month?")}>Did I miss any revenue this month?</SuggestionChip>
        <SuggestionChip onClick={() => onAsk("What happened with Acme?")}>What happened with Acme?</SuggestionChip>
      </div>
      <p className="text-xs text-ink-3">
        Revenue opportunity this cycle: {formatINRCompact(summary.potentialLeakage)} across {summary.accountsAffected} accounts.
      </p>
    </RayResponse>
  );
}
