import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageContainer({ children, className = "", width = "max-w-content" }: { children: ReactNode; className?: string; width?: string }) {
  return <div className={`mx-auto w-full ${width} px-6 pb-16 pt-6 md:px-8 ${className}`}>{children}</div>;
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-ink-3/70" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-rzp">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink-2" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  leading,
  badges,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em] text-ink">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  return <Tag className={`rounded-[10px] border border-line bg-white shadow-card ${className}`}>{children}</Tag>;
}

export function SectionTitle({ children, aside, className = "" }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <h2 className="text-lg font-semibold text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export function MetricCard({ label, value, hint, emphasis }: { label: string; value: string; hint: string; emphasis?: boolean }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className={`mt-2 text-[30px] font-semibold leading-9 tracking-[-0.01em] ${emphasis ? "text-ink" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-[13px] text-ink-3">{hint}</p>
    </Card>
  );
}

export function Notice({ tone = "info", icon, children, className = "" }: { tone?: "info" | "warning" | "success" | "neutral"; icon?: ReactNode; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-[#CFE0FD] bg-rzp-soft text-[#0A3E8F]",
    warning: "border-warn-line bg-warn-bg text-warn",
    success: "border-[#C5E8D3] bg-ok-bg text-ok",
    neutral: "border-line bg-page text-ink-2",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] leading-5 ${tones[tone]} ${className}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
