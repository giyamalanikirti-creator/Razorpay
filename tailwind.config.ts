import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        nav: "#070707",
        rzp: { DEFAULT: "#0B66F6", hover: "#0956D1", soft: "#EAF2FE" },
        ink: { DEFAULT: "#111111", 2: "#5B6472", 3: "#7A8493" },
        page: "#F6F7F8",
        line: "#E2E5E9",
        ok: { DEFAULT: "#128A50", bg: "#EAF7EF" },
        warn: { DEFAULT: "#A65A00", bg: "#FFF7E6", line: "#F3D9A6" },
        crit: { DEFAULT: "#C73737", bg: "#FFF0F0" },
        ray: { green: "#1DB57A" },
      },
      maxWidth: { content: "1360px" },
      boxShadow: { card: "0 1px 2px rgba(16,24,40,0.04)" },
    },
  },
  plugins: [],
};
export default config;
