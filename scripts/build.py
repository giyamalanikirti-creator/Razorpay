"""Bundle the RAY Credit prototype into a single self-contained index.html.

Usage:  python3 scripts/build.py
Output: index.html at the repo root (served as-is by Vercel or any static host).
"""
import base64
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

# Load order matters: later modules use helpers defined in earlier ones.
# Pure logic shared with the API and the tests (no DOM, no app state).
LIB = ["dates.js", "dataset.js", "policy.js", "events.js", "guards.js", "promise-rules.js"]

MODULES = [
    "core.js",                 # icons, formatting, display records, state, router, shell
    "engine.js",               # bridge: recommendations, ledger, controls, AI status, persistence
    "identity.js",             # GSTIN / business identity lookups
    "dashboard.js",            # Razorpay dashboard pages and Agent Studio
    "agent-studio.js",         # RAY Credit agent page and install flow
    "workspace.js",            # RAY Credit workspace: actions, activity, controls
    "credit-intelligence.js",  # overview, credit portfolio, buyer profiles
    "actions.js",              # approvals, limits, reminders, promise loop
    "bank-feed.js",            # bank account via RazorpayX Connected Banking
    "whatsapp-and-ray-ai.js",  # RAY on WhatsApp and Ray AI answers
    "credit-requests.js",      # incoming buyer credit requests
    "reconciliation.js",       # review payment: confirm payment first, chase second
    "collections.js",          # repayment setup, mandates, collection, smart recovery, learning
    "network.js",              # Razorpay network signal: how buyers repay other distributors
    "explain.js",              # how RAY decides, what changed, outcomes, AI interpreter, Behind RAY, About
    "kirana-payment-link.js",  # retailer-side payment link: pay now, schedule payment, raise dispute
    "mobile.js",               # RAY Credit for Mobile inside the Razorpay app
    "demo.js",                 # guided demo story (Shift+D)
]

def data_uri(name: str) -> str:
    return "data:image/png;base64," + base64.b64encode((SRC / "assets" / name).read_bytes()).decode()

def svg(path: str, size: int = 17) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="{path}"/></svg>')

def build() -> Path:
    lib = "\n".join((ROOT / "lib" / m).read_text() for m in LIB)
    js = "\n".join((SRC / "modules" / m).read_text() for m in MODULES)
    js += "\nengBoot();shellInit();render(true);\n"
    build_id = hashlib.sha1((lib + js).encode()).hexdigest()[:10]
    js = lib + "\n" + js.replace("__BUILD__", build_id)
    js = js.replace("__LOGO__", data_uri("logo.png")).replace("__MARK__", data_uri("mark.png"))

    html = (SRC / "template.html").read_text()
    html = html.replace("/*CSS*/", (SRC / "styles.css").read_text()).replace("/*JS*/", js)
    html = (html.replace("__CAL__", svg("M3 5h18v16H3zM16 3v4M8 3v4M3 10h18", 15))
                .replace("__SEARCH__", svg("M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3", 17))
                .replace("__PULSE__", svg("M22 12h-4l-3 9L9 3l-3 9H2", 18))
                .replace("__MEGA__", svg("M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12", 18)))

    out = ROOT / "index.html"
    out.write_text(html)
    return out

if __name__ == "__main__":
    out = build()
    print(f"Built {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
