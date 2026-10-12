"""Run every test suite against the current build and record the results for the Checks page.

Usage:  python3 scripts/record_tests.py      (npm run test:all)
Order:  build → node unit tests → mocked-provider API tests → live-provider test (skipped without a key)
        → interpreter eval → browser journeys → browser smoke/demos → responsive layout → rebuild to embed results.
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

def node_suite(key, suite, files, label):
    r = run(["node", "--test", "--test-reporter=tap", *files])
    cases = []
    for line in r.stdout.splitlines():
        m = re.match(r"^(not ok|ok) \d+ - (.+?)(?: # (SKIP|skip)\b.*)?$", line)   # top-level tests only (subtests are indented)
        if m: cases.append({"name": m.group(2).strip(), "pass": m.group(1) == "ok" and not m.group(3), "skipped": bool(m.group(3)), "detail": "skipped: not run" if m.group(3) else ""})
    ran = [c for c in cases if not c["skipped"]]
    passed = sum(c["pass"] for c in ran)
    (OUT / f"{key}.json").write_text(json.dumps({"suite": suite, "file": label, "ranAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "build": bid, "total": len(ran), "passed": passed, "failed": len(ran) - passed, "skipped": len(cases) - len(ran), "cases": cases}, indent=1, ensure_ascii=False))
    print(f"{key}: {passed}/{len(ran)}" + (f" ({len(cases) - len(ran)} skipped)" if len(cases) != len(ran) else ""))
    return len(ran) - passed

all_files = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "tests").glob("*.test.js"))
API = ["tests/api.test.js", "tests/ask-api.test.js"]; LIVE = ["tests/live-provider.test.js"]
UNIT = [f for f in all_files if f not in API + LIVE]
fails = node_suite("unit", "Unit tests: policy, ledger, reversal, network, interpreter (node --test)", UNIT, ", ".join(UNIT))
fails += node_suite("api", "API tests with a mocked AI provider (no network, no key)", API, ", ".join(API))
fails += node_suite("live", "Live AI provider test (runs only when a key is configured)", LIVE, LIVE[0])
ev = run(["node", "scripts/eval_interpreter.js"]); print("eval:", "ok" if ev.returncode == 0 else "failed")
passed = 0; cases = []  # kept for the exit code below

codes = []
for script in ("tests/e2e_journeys.py", "tests/ui_smoke.py", "tests/responsive.py"):
    p = run([sys.executable, script]); codes.append(p.returncode)
    print(script, (p.stdout.strip().splitlines() or ["(no output)"])[-1])

subprocess.run([sys.executable, "scripts/build.py"], cwd=ROOT, check=True)
assert build_id() == bid, "build id changed while embedding results"
print(f"Embedded results for build {bid}")
sys.exit(0 if fails == 0 and not any(codes) else 1)
