"""Click through every step of both guided demos and fail on any JavaScript error.

Requires: pip install playwright && playwright install chromium
Usage:    python3 scripts/smoke_test.py
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

PAGE = (Path(__file__).resolve().parent.parent / "index.html").as_uri()

async def main() -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(PAGE)
        await page.wait_for_timeout(600)
        steps = 0
        for lst, arr in (("core", "CORE"), ("all", "STEPS")):
            n = await page.evaluate(f"{arr}.length")
            print(f"\n{'Core Journey' if lst == 'core' else 'Explore all features'}")
            for i in range(n):
                await page.evaluate(f"A.step({i},'{lst}')")
                await page.wait_for_timeout(1200)
                name = await page.evaluate(f"{arr}[{i}][0]")
                print(f"{i + 1:>2}. {name}")
            steps += n
        await browser.close()
    if errors:
        print("\nErrors:\n" + "\n".join(errors))
        return 1
    print(f"\nAll {steps} demo steps ran without errors.")
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
