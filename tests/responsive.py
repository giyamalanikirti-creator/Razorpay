"""Responsive layout checks (Playwright + Chromium) at 1440×900, 1280×800, 768×1024 and 390×844.

Usage:  python3 scripts/build.py && python3 tests/responsive.py
For each viewport and key screen: no horizontal page overflow, the main heading and primary buttons are inside the
viewport width, modals fit the viewport, and there are no uncaught errors. Screenshots go to tests/results/screens/
(not committed). This checks layout mechanically; visual quality is still reviewed by eye.
"""
import asyncio, json, sys
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
SHOTS = ROOT / "tests" / "results" / "screens"; SHOTS.mkdir(parents=True, exist_ok=True)
VIEWPORTS = [(1440, 900), (1280, 800), (768, 1024), (390, 844)]
ROUTES = ["raahi/overview", "raahi/request/gupta", "raahi/buyer/gupta", "raahi/recover/gupta", "raahi/actions", "raahi/activity", "raahi/how", "raahi/checks", "raahi/payment/verma"]
results = []
def check(name, cond, detail=""):
    results.append({"name": name, "pass": bool(cond), "detail": "" if cond else str(detail)[:200]})
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))

OVERFLOW = """() => { const w = window.innerWidth; const doc = document.documentElement.scrollWidth;
  const bad = [...document.querySelectorAll('#main button, #main h1, #main .h1, #main .h2')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
    let p = e.parentElement; while (p) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) return false; p = p.parentElement; }
    return r.right > w + 1 || r.left < -1; }).slice(0, 3).map(e => (e.id || e.className || e.tagName) + ':' + (e.innerText || '').slice(0, 30));
  return { doc, w, bad }; }"""
MODAL = """() => { const m = document.querySelector('#modal .modal'); if (!m) return null; const r = m.getBoundingClientRect(); return { w: window.innerWidth, h: window.innerHeight, left: r.left, right: r.right, top: r.top, scroll: getComputedStyle(m).overflowY }; }"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for (w, h) in VIEWPORTS:
            page = await browser.new_page(viewport={"width": w, "height": h})
            errors = []; page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(PAGE); await page.wait_for_timeout(500)
            await page.evaluate("()=>{A.reset();S.installed=true}"); await page.wait_for_timeout(200)
            for r in ROUTES:
                await page.evaluate(f"()=>go('{r}')"); await page.wait_for_timeout(350)
                o = await page.evaluate(OVERFLOW)
                check(f"{w}×{h} {r}: no horizontal overflow, headings and buttons inside the viewport", o["doc"] <= o["w"] + 1 and not o["bad"], o)
                await page.screenshot(path=str(SHOTS / f"{w}x{h}_{r.replace('/', '_')}.png"))
            # modals: recovery link and credit approval
            await page.evaluate("()=>go('raahi/recover/gupta')"); await page.wait_for_timeout(250)
            await page.evaluate("()=>A.recLink('gupta')"); await page.wait_for_timeout(250)
            m = await page.evaluate(MODAL)
            check(f"{w}×{h} recovery-link sheet fits the viewport width", m is None or (m["left"] >= -1 and m["right"] <= m["w"] + 1), m)
            await page.evaluate("()=>{closeModal();A.approveGupta&&A.approveGupta()}"); await page.wait_for_timeout(250)
            m = await page.evaluate(MODAL)
            check(f"{w}×{h} approval modal fits the viewport width", m is None or (m["left"] >= -1 and m["right"] <= m["w"] + 1), m)
            await page.evaluate("()=>{closeModal();A.reset();S.installed=true;go('raahi/activity')}"); await page.wait_for_timeout(300)
            await page.evaluate("()=>A.overrideStart('verma')"); await page.wait_for_timeout(250)
            m = await page.evaluate(MODAL)
            check(f"{w}×{h} possible-payment override sheet fits the viewport width", m is None or (m["left"] >= -1 and m["right"] <= m["w"] + 1), m)
            await page.screenshot(path=str(SHOTS / f"{w}x{h}_override.png"))
            await page.evaluate("()=>closeModal()")
            # mobile surface
            await page.evaluate("()=>A.openMobile('ask')"); await page.wait_for_timeout(300)
            o = await page.evaluate("() => ({doc: document.documentElement.scrollWidth, w: window.innerWidth})")
            check(f"{w}×{h} RAY Credit for Mobile opens without page overflow", o["doc"] <= o["w"] + 1, o)
            await page.screenshot(path=str(SHOTS / f"{w}x{h}_mobile.png"))
            await page.evaluate("()=>A.closeMobile()")
            check(f"{w}×{h} no uncaught errors", not errors, "; ".join(errors[:2]))
            await page.close()
        await browser.close()
    passed = sum(r["pass"] for r in results)
    bid = __import__("re").search(r"const BUILD_ID = '([^']+)'", (ROOT / "index.html").read_text()).group(1)
    (ROOT / "tests" / "results" / "responsive.json").write_text(json.dumps({"suite": "Responsive layout (Playwright): 1440, 1280, 768, 390 px", "file": "tests/responsive.py", "ranAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "build": bid, "total": len(results), "passed": passed, "failed": len(results) - passed, "cases": results}, indent=1, ensure_ascii=False))
    print(f"\n{passed}/{len(results)} passed"); sys.exit(0 if passed == len(results) else 1)

asyncio.run(main())
