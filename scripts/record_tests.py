"""Run every test suite against the current build and record the results for the Checks page.

Usage:  python3 scripts/record_tests.py      (npm run test:all)
Order:  build → node unit tests → browser journeys → browser smoke/demos → rebuild to embed results.
Results are embedded after the build id is computed, so the build id does not change when results do.
Exit code is non-zero if any suite failed. Nothing is hidden: failures are recorded and shown.
"""
import json, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "results"; OUT.mkdir(parents=True, exist_ok=True)
build_id = lambda: re.search(r"const BUILD_ID = '([^']+)'", (ROOT / "index.html").read_text()).group(1)
run = lambda cmd: subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)

subprocess.run([sys.executable, "scripts/build.py"], cwd=ROOT, check=True)
subprocess.run(["node", "scripts/check_bundle.js"], cwd=ROOT, check=True)
bid = build_id()

files = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "tests").glob("*.test.js"))
r = run(["node", "--test", "--test-reporter=tap", *files])
cases = []
for line in r.stdout.splitlines():
    m = re.match(r"^(not ok|ok) \d+ - (.+?)(?: # .*)?$", line)   # top-level tests only (subtests are indented)
    if m: cases.append({"name": m.group(2).strip(), "pass": m.group(1) == "ok", "detail": ""})
passed = sum(c["pass"] for c in cases)
(OUT / "unit.json").write_text(json.dumps({"suite": "Unit and API tests (node --test)", "file": "tests/*.test.js", "ranAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "build": bid, "total": len(cases), "passed": passed, "failed": len(cases) - passed, "cases": cases}, indent=1, ensure_ascii=False))
print(f"unit: {passed}/{len(cases)}")

codes = []
for script in ("tests/e2e_journeys.py", "tests/ui_smoke.py"):
    p = run([sys.executable, script]); codes.append(p.returncode)
    print(script, (p.stdout.strip().splitlines() or ["(no output)"])[-1])

subprocess.run([sys.executable, "scripts/build.py"], cwd=ROOT, check=True)
assert build_id() == bid, "build id changed while embedding results"
print(f"Embedded results for build {bid}")
sys.exit(0 if passed == len(cases) and not any(codes) else 1)
