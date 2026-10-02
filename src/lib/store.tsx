"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { acme, acmeCalc, connectors as seedConnectors, opportunities, seedAudit, summarize, type AuditEntry, type Connector, type Opportunity, type OpportunityStatus } from "./data";

export type EffectiveOption = "next" | "following";

export interface CorrectionDraft {
  recoverCurrent: boolean;
  preventFuture: boolean;
  seats: number;
  amount: number;
  effective: EffectiveOption;
}

export interface AcmeException {
  reason: string;
  note: string;
  applyToFuture: boolean;
  at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ray";
  text: string;
  kind?: "usageleak-summary" | "acme-followup" | "acme-pending" | "generic";
}

export interface AppState {
  acmeStatus: OpportunityStatus;
  draft: CorrectionDraft;
  executed: { invoiceAmount: number; invoiceSeats: number; seatsFrom: number; seatsTo: number; recoverCurrent: boolean; preventFuture: boolean; at: string } | null;
  exception: AcmeException | null;
  paused: boolean;
  reviewMode: boolean;
  connectors: Connector[];
  audit: AuditEntry[];
  chat: ChatMessage[];
  rules: { minOpportunity: number; excluded: string[]; high: string; medium: string; low: string };
}

export const defaultDraft: CorrectionDraft = {
  recoverCurrent: true,
  preventFuture: true,
  seats: acmeCalc.additionalSeats,
  amount: acmeCalc.additionalAmount,
  effective: "next",
};

const initialState: AppState = {
  acmeStatus: "Needs review",
  draft: defaultDraft,
  executed: null,
  exception: null,
  paused: false,
  reviewMode: true,
  connectors: seedConnectors,
  audit: seedAudit,
  chat: [],
  rules: {
    minOpportunity: 2500,
    excluded: ["Internal sandbox (NovaStack)"],
    high: "Surface immediately",
    medium: "Require manual validation",
    low: "Do not recommend billing actions",
  },
};

const STORAGE_KEY = "usageleak-prototype-v1";

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  log: (entry: Omit<AuditEntry, "id" | "at"> & { at?: string }) => void;
  reset: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* storage unavailable — keep in-memory state */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const log = useCallback<Store["log"]>((entry) => {
    setState((s) => ({
      ...s,
      audit: [
        ...s.audit,
        { ...entry, id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: entry.at ?? new Date().toISOString() },
      ],
    }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo(() => ({ state, update, log, reset }), [state, update, log, reset]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Opportunity rows with Acme's live status applied. */
export function useOpportunities(): Opportunity[] {
  const { state } = useStore();
  return useMemo(() => opportunities.map((o) => (o.id === "acme" ? { ...o, status: state.acmeStatus } : o)), [state.acmeStatus]);
}

/** Headline metrics, recomputed from the rows and what the merchant has approved. */
export function useSummary() {
  const rows = useOpportunities();
  const { state } = useStore();
  const acmeInvoiced = state.acmeStatus === "Corrected" ? (state.executed?.invoiceAmount ?? 0) : 0;
  return useMemo(() => summarize(rows, acmeInvoiced), [rows, acmeInvoiced]);
}

/** Validation for merchant edits on the corrective action. */
export function validateDraft(d: CorrectionDraft) {
  const verified = acmeCalc.additionalSeats;
  const expectedAmount = d.seats * acme.seatRate;
  const issues: { level: "error" | "warning" | "info"; field: "seats" | "amount" | "actions"; text: string }[] = [];

  if (!d.recoverCurrent && !d.preventFuture) {
    issues.push({ level: "error", field: "actions", text: "Select at least one action to continue." });
  }
  if (!Number.isFinite(d.seats) || d.seats < 1 || !Number.isInteger(d.seats)) {
    issues.push({ level: "error", field: "seats", text: "Seat quantity must be a whole number of at least 1." });
  } else if (d.seats > verified) {
    issues.push({
      level: "warning",
      field: "seats",
      text: `${d.seats} seats conflicts with verified September usage. Review before continuing.`,
    });
  } else if (d.seats < verified) {
    issues.push({
      level: "info",
      field: "seats",
      text: `${verified - d.seats} verified seat${verified - d.seats > 1 ? "s" : ""} will stay unbilled. You can mark them as an exception instead.`,
    });
  }
  if (!Number.isFinite(d.amount) || d.amount <= 0) {
    issues.push({ level: "error", field: "amount", text: "Amount must be greater than ₹0." });
  } else if (d.amount !== expectedAmount && Number.isInteger(d.seats) && d.seats > 0) {
    issues.push({
      level: "warning",
      field: "amount",
      text: `Amount doesn't match ${d.seats} × ₹1,500 contract rate (₹${expectedAmount.toLocaleString("en-IN")}).`,
    });
  }
  return {
    issues,
    hasError: issues.some((i) => i.level === "error"),
    hasWarning: issues.some((i) => i.level === "warning"),
    edited: d.seats !== verified || d.amount !== acmeCalc.additionalAmount,
  };
}
