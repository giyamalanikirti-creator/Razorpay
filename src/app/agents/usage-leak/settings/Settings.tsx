"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Lock, PauseCircle, PlayCircle, Plus, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { Breadcrumb, Card, Notice, PageContainer, PageHeader } from "@/components/global/Page";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import { Modal } from "@/components/global/Modal";
import { UsageLeakMark } from "@/components/global/Brand";
import { useToast } from "@/components/global/Toast";
import { AuditLog, ConnectorLogo, UsageLeakBadge } from "@/components/usageleak/UsageLeakParts";
import { availableConnectors, merchant, type Connector } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { useStore } from "@/lib/store";

const TABS = [
  { id: "sources", label: "Data sources" },
  { id: "permissions", label: "Permissions" },
  { id: "rules", label: "Rules" },
  { id: "activity", label: "Activity" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Settings() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useStore();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "sources") as TabId;

  return (
    <PageContainer width="max-w-[1120px]">
      <Breadcrumb items={[{ label: "RAY AI", href: "/ray" }, { label: "Agents" }, { label: "UsageLeak", href: "/agents/usage-leak" }, { label: "Settings" }]} />
      <PageHeader
        leading={<UsageLeakMark size={40} />}
        title="UsageLeak settings"
        badges={<UsageLeakBadge paused={state.paused} />}
        subtitle="Control what UsageLeak can read, what it may prepare, and what always needs your approval."
      />

      <div role="tablist" aria-label="Settings sections" className="mb-6 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => router.replace(`${pathname}?tab=${t.id}`, { scroll: false })}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 text-[14.5px] ${tab === t.id ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sources" && <SourcesTab />}
      {tab === "permissions" && <PermissionsTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "activity" && <ActivityTab />}
    </PageContainer>
  );
}

/* ---------------- Data sources ---------------- */

function ConnectorRow({ c, onManage }: { c: Connector; onManage: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <ConnectorLogo id={c.id} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[14.5px] font-medium text-ink">
          {c.name}
          {c.native && <Badge tone="blue">Native</Badge>}
        </p>
        <p className="text-[13px] text-ink-2">Access: {c.access}</p>
      </div>
      <div className="w-36 text-[13px]">
        {c.status === "Connected" ? (
          <Badge tone="green" dot>
            Connected
          </Badge>
        ) : c.status === "Connecting" ? (
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <Loader2 size={13} className="animate-spin" /> Connecting…
          </span>
        ) : (
          <Badge tone="grey" dot>
            Disconnected
          </Badge>
        )}
        {c.status === "Connected" && <p className="mt-0.5 text-xs text-ink-3">Synced {c.lastSync}</p>}
      </div>
      <Button size="sm" onClick={onManage} disabled={c.status === "Connecting"}>
        {c.status === "Disconnected" ? "Reconnect" : "Manage access"}
      </Button>
    </li>
  );
}

function SourcesTab() {
  const { state, update, log } = useStore();
  const toast = useToast();
  const [managing, setManaging] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = state.connectors.find((c) => c.id === managing) ?? null;

  const patch = (id: string, fn: (c: Connector) => Connector) => update((s) => ({ ...s, connectors: s.connectors.map((c) => (c.id === id ? fn(c) : c)) }));

  const connect = (id: string, name: string, access: string) => {
    const exists = state.connectors.some((c) => c.id === id);
    if (exists) patch(id, (c) => ({ ...c, status: "Connecting" }));
    else
      update((s) => ({
        ...s,
        connectors: [...s.connectors, { id, name, access, status: "Connecting", lastSync: "just now", scopes: [{ label: access, enabled: true }] }],
      }));
    setTimeout(() => {
      patch(id, (c) => ({ ...c, status: "Connected", lastSync: "just now" }));
      log({ customer: "—", action: `${name} connected (read-only)`, actor: merchant.userInitials, status: "Updated" });
      toast({ title: `${name} connected`, body: "Read-only access. UsageLeak will include it in the next reconciliation run." });
    }, 1100);
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Connected sources</h2>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Connect source
        </Button>
      </div>
      <Card>
        <ul className="divide-y divide-line">
          {state.connectors.map((c) => (
            <ConnectorRow key={c.id} c={c} onManage={() => (c.status === "Disconnected" ? connect(c.id, c.name, c.access) : setManaging(c.id))} />
          ))}
        </ul>
      </Card>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
        <Lock size={14} className="text-ink-3" /> UsageLeak only uses data you explicitly authorise.
      </p>

      <Modal
        open={!!current}
        onClose={() => setManaging(null)}
        title={current ? `${current.name} access` : ""}
        description="Choose what UsageLeak can read from this source."
        footer={
          current && !current.native ? (
            <div className="flex w-full items-center justify-between">
              <Button
                variant="ghost"
                className="!text-crit"
                onClick={() => {
                  patch(current.id, (c) => ({ ...c, status: "Disconnected" }));
                  log({ customer: "—", action: `${current.name} disconnected`, actor: merchant.userInitials, status: "Updated" });
                  setManaging(null);
                }}
              >
                Disconnect
              </Button>
              <Button variant="primary" onClick={() => setManaging(null)}>
                Done
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => setManaging(null)}>
              Done
            </Button>
          )
        }
      >
        {current && (
          <div className="space-y-2">
            {current.scopes.map((sc, i) => (
              <label key={sc.label} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-[14px]">
                {sc.label}
                <Toggle
                  checked={sc.enabled}
                  onChange={(on) =>
                    patch(current.id, (c) => ({ ...c, scopes: c.scopes.map((x, j) => (j === i ? { ...x, enabled: on } : x)) }))
                  }
                  label={sc.label}
                />
              </label>
            ))}
            {current.native && <p className="pt-1 text-xs text-ink-3">Razorpay Billing is native. UsageLeak can never send invoices or change subscriptions without your approval.</p>}
          </div>
        )}
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Connect a source" description="Connections are read-only by default.">
        <ul className="divide-y divide-line rounded-lg border border-line">
          {availableConnectors.map((a) => {
            const connected = state.connectors.find((c) => c.id === a.id);
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <ConnectorLogo id={a.id} />
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-ink">{a.name}</p>
                  <p className="text-xs text-ink-3">{a.access}</p>
                </div>
                {connected ? (
                  <Badge tone={connected.status === "Connected" ? "green" : "grey"}>{connected.status}</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      connect(a.id, a.name, a.access);
                      setAdding(false);
                    }}
                  >
                    Connect
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}

/* ---------------- Permissions ---------------- */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-rzp" : "bg-[#CBD1D9]"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

const PERMISSIONS: { title: string; tone: "ok" | "approval" | "no"; items: string[]; note?: string }[] = [
  { title: "Read", tone: "ok", items: ["Read subscriptions", "Read invoices", "Read selected contract files", "Read CRM account data", "Read product usage"] },
  { title: "Actions", tone: "ok", items: ["Draft invoices", "Suggest subscription changes"] },
  { title: "Requires approval", tone: "approval", items: ["Send invoice", "Update subscription quantity"] },
  {
    title: "Not allowed",
    tone: "no",
    items: ["Change product pricing", "Create discounts", "Access unrelated customer folders", "Issue refunds", "Move funds"],
  },
];

function PermissionsTab() {
  const { state, update, log } = useStore();
  const toast = useToast();

  const togglePause = () => {
    const paused = !state.paused;
    update((s) => ({ ...s, paused }));
    log({ customer: "—", action: paused ? "UsageLeak paused" : "UsageLeak resumed", actor: merchant.userInitials, status: paused ? "Paused" : "Resumed" });
    toast({ title: paused ? "UsageLeak paused" : "UsageLeak resumed", body: paused ? "No new checks or recommendations will run." : "Reconciliation will run before the next billing cycle.", tone: "info" });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">Agent permissions</h2>
          <p className="text-[13px] text-ink-3">Set by Razorpay for UsageLeak beta. Scope narrows further with your data-source settings.</p>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2">
          {PERMISSIONS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">{g.title}</p>
              <ul className="space-y-1.5">
                {g.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 text-[14px] text-ink">
                    {g.tone === "no" ? (
                      <X size={15} className="shrink-0 text-crit" />
                    ) : g.tone === "approval" ? (
                      <ShieldCheck size={15} className="shrink-0 text-warn" />
                    ) : (
                      <Check size={15} className="shrink-0 text-ok" />
                    )}
                    <span className={g.tone === "no" ? "text-ink-2" : ""}>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">Review mode</h3>
              <p className="mt-0.5 text-[13.5px] text-ink-2">Require my approval before every external or billing-changing action.</p>
            </div>
            <Toggle
              checked={state.reviewMode}
              onChange={(on) => {
                update((s) => ({ ...s, reviewMode: on }));
                log({ customer: "—", action: `Review mode turned ${on ? "on" : "off"}`, actor: merchant.userInitials, status: "Updated" });
              }}
              label="Review mode"
            />
          </div>
          {!state.reviewMode && (
            <Notice tone="warning" className="mt-3">
              UsageLeak may prepare invoice drafts without asking first. Sending an invoice or changing a subscription still requires your approval.
            </Notice>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-ink">Pause agent</h3>
          <p className="mt-0.5 text-[13.5px] text-ink-2">
            {state.paused
              ? "UsageLeak is paused. It won't read new data or create recommendations."
              : "Stops all reconciliation runs and recommendations. Your existing findings and audit log are kept."}
          </p>
          <Button className="mt-3" onClick={togglePause}>
            {state.paused ? (
              <>
                <PlayCircle size={16} /> Resume UsageLeak
              </>
            ) : (
              <>
                <PauseCircle size={16} /> Pause UsageLeak
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Rules ---------------- */

const THRESHOLD_OPTIONS = ["Surface immediately", "Require manual validation", "Do not recommend billing actions"];

function RulesTab() {
  const { state, update, log } = useStore();
  const [newExcluded, setNewExcluded] = useState("");
  const r = state.rules;
  const setRules = (patch: Partial<typeof r>) => update((s) => ({ ...s, rules: { ...s.rules, ...patch } }));

  return (
    <div className="space-y-4">
      <Card>
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">Confidence threshold</h2>
          <p className="text-[13px] text-ink-3">Confidence combines contract clarity, usage quality, billing mismatch and conflicting CRM signals.</p>
        </div>
        <div className="divide-y divide-line">
          {(
            [
              ["high", "High-confidence findings", "≥ 85%"],
              ["medium", "Medium-confidence", "60 – 84%"],
              ["low", "Low-confidence", "< 60%"],
            ] as const
          ).map(([key, label, range]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-[14px] font-medium text-ink">{label}</p>
                <p className="text-xs text-ink-3">{range}</p>
              </div>
              <select
                value={r[key]}
                disabled={key === "low"}
                onChange={(e) => setRules({ [key]: e.target.value })}
                className="h-9 w-72 rounded-md border border-line bg-white px-3 text-[13.5px] text-ink focus:border-rzp focus:outline-none disabled:bg-page disabled:text-ink-2"
                title={key === "low" ? "Low-confidence findings can never trigger billing actions" : undefined}
              >
                {THRESHOLD_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-semibold text-ink">Minimum opportunity</h2>
        <label className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-ink-2">
          Only alert me if impact is greater than
          <span className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₹</span>
            <input
              type="number"
              min={0}
              step={500}
              value={r.minOpportunity}
              onChange={(e) => setRules({ minOpportunity: Number(e.target.value) })}
              className="h-9 w-32 rounded-md border border-line pl-7 pr-2 text-[14px] tabular-nums text-ink focus:border-rzp focus:outline-none"
            />
          </span>
          <span className="text-xs text-ink-3">Currently {formatINR(r.minOpportunity || 0)}</span>
        </label>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">Excluded accounts</h2>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newExcluded.trim();
              if (!name || r.excluded.includes(name)) return;
              setRules({ excluded: [...r.excluded, name] });
              log({ customer: name, action: "Excluded from UsageLeak checks", actor: merchant.userInitials, status: "Updated" });
              setNewExcluded("");
            }}
          >
            <input
              value={newExcluded}
              onChange={(e) => setNewExcluded(e.target.value)}
              placeholder="Customer name"
              className="h-9 w-48 rounded-md border border-line px-3 text-[13.5px] focus:border-rzp focus:outline-none"
            />
            <Button size="sm" type="submit">
              <Plus size={14} /> Add customer
            </Button>
          </form>
        </div>
        <ul className="divide-y divide-line">
          {r.excluded.map((name) => (
            <li key={name} className="flex items-center justify-between px-5 py-2.5 text-[14px] text-ink">
              {name}
              <button
                aria-label={`Remove ${name}`}
                onClick={() => setRules({ excluded: r.excluded.filter((x) => x !== name) })}
                className="rounded p-1 text-ink-3 hover:bg-page hover:text-crit"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {r.excluded.length === 0 && <li className="px-5 py-3 text-[13px] text-ink-3">No excluded accounts.</li>}
        </ul>
      </Card>

      <Card>
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Sparkles size={15} className="text-ok" /> Learned account context
          </h2>
          <p className="text-[13px] text-ink-3">Merchant-approved exceptions UsageLeak applies in future checks. They never change contracts or pricing.</p>
        </div>
        {state.exception?.applyToFuture ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[14px]">
            <div>
              <p className="font-medium text-ink">Acme Ltd · {state.exception.reason}</p>
              {state.exception.note && <p className="text-[13px] text-ink-2">“{state.exception.note}”</p>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                update((s) => ({ ...s, exception: s.exception ? { ...s.exception, applyToFuture: false } : null }));
                log({ customer: "Acme Ltd", action: "Learned context removed", actor: merchant.userInitials, status: "Updated" });
              }}
            >
              Remove
            </Button>
          </div>
        ) : (
          <p className="px-5 py-3 text-[13px] text-ink-3">
            Nothing yet. When you mark a finding as an exception and choose to apply it to future checks, it appears here.
          </p>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Activity ---------------- */

function ActivityTab() {
  const { state, reset } = useStore();
  const toast = useToast();
  return (
    <>
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Audit log</h2>
          <p className="text-[13px] text-ink-3">Every finding, review and action — who, what, when and status.</p>
        </div>
        <Badge tone="grey">{state.audit.length} events</Badge>
      </div>
      <AuditLog entries={state.audit} />
    </Card>
    <p className="mt-4 text-right text-xs text-ink-3">
      Prototype:{" "}
      <button
        className="font-medium text-rzp hover:underline"
        onClick={() => {
          reset();
          toast({ title: "Demo data reset", body: "Acme is back to “Needs review”.", tone: "info" });
        }}
      >
        Reset demo data
      </button>
    </p>
    </>
  );
}
