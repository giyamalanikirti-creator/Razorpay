/** Approximation of the Razorpay wordmark for prototype use. */
export function RazorpayLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} aria-label="Razorpay">
      <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden>
        <path d="M8.2 6.6 6.9 11.3l7.5-4.9L9.5 24h4.9L20 0z" fill="#3395FF" />
        <path d="M2.9 16.5 0 24h4.9l5.3-17.6z" fill="#fff" />
      </svg>
      <span className="text-[25px] font-bold italic leading-none tracking-[-0.02em] text-white">Razorpay</span>
    </span>
  );
}

export function RazorpayGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 20 24" aria-hidden>
      <path d="M8.2 6.6 6.9 11.3l7.5-4.9L9.5 24h4.9L20 0z" fill="#3395FF" />
      <path d="M2.9 16.5 0 24h4.9l5.3-17.6z" fill="#fff" />
    </svg>
  );
}

/** RAY four-petal mark, as seen on the RAY AI surfaces. */
export function RayMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="#1DB57A">
        <path d="M12 1.5c2.2 0 4 1.8 4 4v2.6c0 .9-.7 1.6-1.6 1.6H9.6C8.7 9.7 8 9 8 8.1V5.5c0-2.2 1.8-4 4-4z" />
        <path d="M12 22.5c-2.2 0-4-1.8-4-4v-2.6c0-.9.7-1.6 1.6-1.6h4.8c.9 0 1.6.7 1.6 1.6v2.6c0 2.2-1.8 4-4 4z" />
      </g>
      <g fill="#27C98A">
        <path d="M1.5 12c0-2.2 1.8-4 4-4h2.6c.9 0 1.6.7 1.6 1.6v4.8c0 .9-.7 1.6-1.6 1.6H5.5c-2.2 0-4-1.8-4-4z" />
        <path d="M22.5 12c0 2.2-1.8 4-4 4h-2.6c-.9 0-1.6-.7-1.6-1.6V9.6c0-.9.7-1.6 1.6-1.6h2.6c2.2 0 4 1.8 4 4z" />
      </g>
      <circle cx="12" cy="12" r="1.6" fill="#fff" />
    </svg>
  );
}

/** Small UsageLeak agent glyph — a ledger with a detection marker. */
export function UsageLeakMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#CFE3DA] bg-gradient-to-br from-[#EAF7EF] to-[#E8F1FE]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="#0B66F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5a1 1 0 0 1 1-1h10l5 5v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
        <path d="M8 12h5M8 16h3" />
        <circle cx="16.5" cy="15.5" r="2.5" stroke="#128A50" />
        <path d="m18.5 17.5 1.8 1.8" stroke="#128A50" />
      </svg>
    </span>
  );
}
