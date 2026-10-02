/*
 * Razorpay mark: official geometry from Razorpay's brand assets
 * (razorpay.com/newsroom/brand-assets, as distributed by simple-icons, CC0).
 * The larger stroke is Razorpay Blue; the smaller one is navy on light
 * surfaces and white on the black dashboard nav.
 */
const MARK_MAIN = "M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24z";
const MARK_TAIL = "M14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902z";

export function RazorpayGlyph({ size = 18, onDark = true }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={MARK_MAIN} fill="#3395FF" />
      <path d={MARK_TAIL} fill={onDark ? "#FFFFFF" : "#072654"} />
    </svg>
  );
}

/**
 * Razorpay logo for the dark nav: official mark + wordmark.
 * If you have the official wordmark SVG (razorpay.com/newsroom/brand-assets),
 * drop it in public/brand/razorpay-logo-white.svg and set USE_OFFICIAL_LOGO_FILE.
 */
const USE_OFFICIAL_LOGO_FILE = false;

export function RazorpayLogo({ className = "" }: { className?: string }) {
  if (USE_OFFICIAL_LOGO_FILE) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/razorpay-logo-white.svg" alt="Razorpay" className={`h-[26px] w-auto ${className}`} />;
  }
  return (
    <span className={`inline-flex items-end gap-[2px] ${className}`} aria-label="Razorpay" role="img">
      <RazorpayGlyph size={24} />
      <span className="text-[25px] font-extrabold italic leading-[0.95] tracking-[-0.035em] text-white" aria-hidden>
        Razorpay
      </span>
    </span>
  );
}

/**
 * RAY mark: path from Razorpay's Blade design system (@razorpay/blade, RayIcon),
 * filled with the RAY green used across the RAY AI surfaces.
 */
const RAY_PATH =
  "M3 3H7.5H9.74999L12 12L14.25 3H16.5H21V7.5V9.75L12 12L21 14.25V16.5V21H16.5H14.25L12 12L9.74999 21H7.5H3V16.5V14.25L12 12L3 9.75V7.5V3Z";

export function RayMark({ size = 18, className = "", color = "#1DB57A" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d={RAY_PATH} fill={color} />
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
