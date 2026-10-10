"""Browser smoke tests for RAY Credit (Playwright + Chromium).

Usage:  python3 scripts/build.py && python3 tests/ui_smoke.py
Covers: opening the app, installing RAY, Gupta Traders, network toggle, merchant approval, recovery,
promise editing, Do Not Contact, reset, both guided demos, every route, and uncaught errors.
"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

PAGE = (Path(__file__).resolve().parent.parent / "index.html").as_uri()
results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(PAGE); await page.wait_for_timeout(600)
        ev = page.evaluate
        await ev("A.reset()"); await page.wait_for_timeout(300)

        # open + install
        await ev("go('studio/raahi')"); await page.wait_for_timeout(300)
        check("App opens on Agent Studio", await ev("route()") == "studio/raahi")
        await ev("S.installed=true;go('raahi/overview')"); await page.wait_for_timeout(300)
        check("Overview KPIs come from 642 synthetic records", "642 buyers" in await page.inner_text("#main"))

        # Gupta + network toggle (TEST A)
        await ev("go('raahi/buyer/gupta')"); await page.wait_for_timeout(300)
        txt = await page.inner_text("#main")
        check("Gupta profile shows the ₹60,000 network-adjusted recommendation", "₹60,000" in txt)
        await page.click("#ncmp-gupta button:has-text('Your data only')"); await page.wait_for_timeout(300)
        check("Network off recalculates to ₹75,000 · 21 days", await ev("[S.gupta.limitRec,S.gupta.terms].join()") == "75000,21")
        await page.click("#ncmp-gupta button:has-text('Network on')"); await page.wait_for_timeout(300)
        await page.click("#modal button:has-text('Join Razorpay network signal')"); await page.wait_for_timeout(300)
        check("Rejoining with permission restores ₹60,000 · 14 days", await ev("[S.gupta.limitRec,S.gupta.terms].join()") == "60000,14")
        await ev("S.howOpen={gupta:true};rr()"); await page.wait_for_timeout(200)
        how = await page.inner_text("#how-gupta")
        check("How RAY decided shows engine rules and policy version", "Risk index" in how and "RAY-TC-0.4" in how)

        # merchant approval (TEST 18)
        before = await ev("S.gupta.limit")
        await ev("A.ocFail('gupta')"); await page.wait_for_timeout(200)
        check("Recording an outcome does not change the limit by itself", await ev("S.gupta.limit") == before)
        await page.click("#wc-gupta button:has-text('Approve')"); await page.wait_for_timeout(300)
        await page.click("#set-limit"); await page.wait_for_timeout(500)
        await ev("closeModal();if(S.rs){prClose()}")
        check("Approved limit applied only after confirmation", await ev("S.gupta.limit") != before and await ev("S.gupta.rec") == "approved")

        # recovery
        await ev("go('raahi/recover/gupta')"); await page.wait_for_timeout(300)
        await page.click("button:has-text('Send payment link')"); await page.wait_for_timeout(300)
        await page.click("button:has-text('Send on WhatsApp')"); await page.wait_for_timeout(300)
        await page.click("button:has-text('Prototype: buyer pays ₹5,000')"); await page.wait_for_timeout(300)
        check("Verified partial payment reduces INV-24790 to ₹15,000", await ev("balOf('gupta','INV-24790')") == 15000)

        # promise editing (TEST 15 / TEST B)
        await ev("go('raahi/buyer/kapoor')"); await page.wait_for_timeout(300)
        await page.fill("#ipq-kapoor", "Aaj 10k bhej raha hu baki month end"); await page.click("#ip-card-kapoor button:has-text('Interpret')"); await page.wait_for_timeout(900)
        check("Interpreter extracts ₹10,000 now and the balance by month end", await ev("JSON.stringify(S.interp['msg:kapoor'].fields)") == '{"firstAmt":10000,"firstDate":"2026-10-05","laterAmt":36500,"laterDate":"2026-10-31"}')
        check("Fallback is labelled as not AI", "not AI" in await page.inner_text("#ip-card-kapoor"))
        await ev("document.getElementById('ip-msg:kapoor-laterAmt').value='30000'"); await page.click("#ip-card-kapoor button:has-text('Confirm commitment')"); await page.wait_for_timeout(300)
        check("Edited values are what gets saved", await ev("JSON.stringify(S.promises.filter(p=>p.buyerId==='kapoor').map(p=>[p.first.amt,p.later.amt,p.edited]))") == "[[10000,30000,true]]")
        await page.click("#ip-card-kapoor button:has-text('Edit commitment')"); await page.wait_for_timeout(300)
        await page.fill("#ep-la", "25000"); await page.click("#modal button:has-text('Save changes')"); await page.wait_for_timeout(300)
        check("Editing a saved promise updates it and records PROMISE_EDITED", await ev("S.promises.find(p=>p.buyerId==='kapoor'&&p.status==='confirmed').later.amt") == 25000 and await ev("S.led.events.some(e=>e.type==='PROMISE_EDITED'&&e.buyerId==='kapoor')"))
        await ev("go('raahi/actions')"); await page.wait_for_timeout(300)
        check("Confirmed commitment appears in collections", await ev("!!document.getElementById('act-pc-kapoor')"))

        # DNC (TEST D)
        await ev("A.dncAdd('Kapoor Stores');rr()"); await page.wait_for_timeout(200)
        check("Do Not Contact blocks sending", await ev("gateFor('kapoor','whatsapp').code") == "dnc")
        await ev("A.approveOne('kapoor')"); await page.wait_for_timeout(200)
        check("Send button is disabled with the reason", await ev("document.getElementById('send-one').disabled") and "Do not contact" in await page.inner_text("#modal"))
        await ev("closeModal()")

        # reset (TEST 19)
        await ev("A.reset()"); await page.wait_for_timeout(300)
        check("Reset restores the baseline", await ev("[S.promises.length,S.led.events.length,S.ctl.dnc.length,S.gupta.limit,S.gupta.limitRec].join()") == "0,1,0,100000,60000")

        # every route
        routes = ["home","studio","studio/raahi","raahi/overview","raahi/portfolio","raahi/actions","raahi/activity","raahi/controls","raahi/check","raahi/request/gupta","raahi/request/arora","raahi/request/mehta","raahi/recover/gupta","raahi/collect/mehta","raahi/payment/verma","raahi/payment/citycare","raahi/invoice/INV-2048","raahi/buyer/gupta","raahi/buyer/chawla","raahi/buyer/newlife","raahi/buyer/syn-100","pay/INV-2048","ray"]
        for r in routes:
            await ev(f"S.installed=true;go('{r}')"); await page.wait_for_timeout(150)
        check("All routes render without errors", not errors, "; ".join(errors[:3]))
        check("Daily plan is computed for every buyer", await ev("S.planScan") == 642)
        check("Built-in Checks page: every check passes", await ev("runChecks().flatMap(g=>g.cases).every(c=>c.pass)"))
        check("Ask RAY falls back honestly without Claude", (await ev("askRay('which buyers are risky?','ray').then(r=>!!r.fallback)")) is True)

        # demos
        for lst, name in (("core", "CORE"), ("all", "STEPS")):
            n = await ev(f"{name}.length")
            for i in range(n):
                await ev(f"A.step({i},'{lst}')"); await page.wait_for_timeout(700)
            check(f"{name} demo ({n} steps) runs without errors", not errors, "; ".join(errors[:3]))
        await ev("A.reset()")
        await browser.close()
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
