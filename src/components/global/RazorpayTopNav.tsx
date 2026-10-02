"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight, ChevronDown, CreditCard, Handshake, Landmark, Megaphone, Search, Wallet } from "lucide-react";
import { RazorpayLogo, RayMark } from "./Brand";
import { merchant } from "@/lib/data";

const items = [
  { label: "Payments", icon: CreditCard },
  { label: "Partners", icon: Handshake },
  { label: "Banking+", icon: Landmark },
  { label: "Payroll", icon: Wallet, external: true },
];

export function RazorpayTopNav() {
  const pathname = usePathname();
  const rayActive = pathname.startsWith("/ray") || pathname.startsWith("/agents");
  const showSearch = !pathname.startsWith("/ray");

  return (
    <header className="sticky top-0 z-40 h-16 bg-nav">
      <div className="flex h-full items-center gap-6 px-6">
        <Link href="/ray" className="mr-4 shrink-0" aria-label="Razorpay home">
          <RazorpayLogo />
        </Link>

        <nav className="flex h-full min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Primary">
          <Link
            href="/ray"
            aria-current={rayActive ? "page" : undefined}
            className={`relative flex h-full shrink-0 items-center gap-1.5 px-3 text-[15px] font-medium ${rayActive ? "text-white" : "text-white/70 hover:text-white"}`}
          >
            {rayActive && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-[-14px] bottom-0 h-full bg-[radial-gradient(55%_75%_at_50%_100%,rgba(64,214,160,0.42),rgba(40,130,255,0.22)_50%,transparent_78%)] after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#5FE3A9] after:to-transparent"
              />
            )}
            <RayMark size={15} className="relative" />
            <span className="relative">RAY AI</span>
            <span className="relative rounded-[3px] bg-white/10 px-1 py-px text-[9px] font-semibold tracking-wider text-[#5FE3A9]">BETA</span>
          </Link>
          {items.map(({ label, icon: Icon, external }) => (
            <button key={label} className="flex h-full shrink-0 items-center gap-1.5 px-3 text-[15px] text-white/70 hover:text-white">
              <Icon size={17} strokeWidth={1.6} />
              {label}
              {external && <ArrowUpRight size={14} />}
            </button>
          ))}
          <button className="flex h-full shrink-0 items-center gap-1 px-3 text-[15px] text-white/70 hover:text-white">
            More <ChevronDown size={15} />
          </button>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showSearch && (
            <label className="hidden h-10 w-[300px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-white/50 xl:flex">
              <Search size={17} />
              <input
                placeholder="Search payment products, settings, and more"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
              />
            </label>
          )}
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/80 hover:text-white" aria-label="Activity">
            <Activity size={18} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/80 hover:text-white" aria-label="Announcements">
            <Megaphone size={18} />
          </button>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] text-[13px] font-semibold text-white" title={merchant.name}>
            {merchant.userInitials}
          </span>
        </div>
      </div>
    </header>
  );
}
