const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹7,500 · ₹19,67,575 (Indian digit grouping) */
export function formatINR(value: number): string {
  return `₹${inr.format(Math.round(value))}`;
}

/** ₹1.84L · ₹86.5K · ₹7,500 — compact form used in metric cards. */
export function formatINRCompact(value: number): string {
  if (value >= 10_000_000) return `₹${trim(value / 10_000_000)}Cr`;
  if (value >= 100_000) return `₹${trim(value / 100_000)}L`;
  if (value >= 10_000) return `₹${trim(value / 1_000)}K`;
  return formatINR(value);
}

function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date}, ${time}`;
}
