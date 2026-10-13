/* Credit-release arithmetic (lib/credit-math.js): the single calculation every surface uses. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { releasePlan } = require('../lib/credit-math.js');

test('Gupta: ₹78,400 owed + ₹50,000 requested − ₹60,000 limit = ₹68,400 to collect for the full order', () => {
  const p = releasePlan({ outstanding: 78400, requested: 50000, limit: 60000 });
  assert.equal(p.ok, true);
  assert.equal(p.collectForFull, 68400);
  assert.equal(p.headroom, 0);
  assert.equal(p.releasableNow, 0);
  assert.equal(p.overLimitBy, 18400);
  assert.equal(p.fullFits, true);
});

test('Gupta: collecting only ₹38,400 leaves ₹40,000 owed and frees ₹20,000 of the order', () => {
  const a = releasePlan({ outstanding: 78400, requested: 50000, limit: 60000 }).after(38400);
  assert.deepEqual([a.outstanding, a.headroom, a.releasable, a.shortBy], [40000, 20000, 20000, 30000]);
  const b = releasePlan({ outstanding: 78400, requested: 50000, limit: 60000, collected: 38400 }).collectedResult;
  assert.equal(b.releasable, 20000, 'the collected input gives the same answer as after()');
});

test('Collecting exactly the required amount releases the full order, and never more than owed', () => {
  const p = releasePlan({ outstanding: 78400, requested: 50000, limit: 60000 });
  assert.equal(p.after(68400).releasable, 50000);
  const over = p.after(100000);
  assert.equal(over.collected, 78400, 'a collection cannot exceed what is owed');
  assert.equal(over.releasable, 50000);
});

test('Balance already below the limit: part fits today, the rest needs a collection', () => {
  const p = releasePlan({ outstanding: 30000, requested: 50000, limit: 60000 });
  assert.deepEqual([p.headroom, p.releasableNow, p.collectForFull, p.withinLimitNow], [30000, 30000, 20000, false]);
});

test('Order fits fully within the limit: nothing to collect first', () => {
  const p = releasePlan({ outstanding: 10000, requested: 20000, limit: 60000 });
  assert.equal(p.withinLimitNow, true);
  assert.equal(p.collectForFull, 0);
});

test('No additional credit requested', () => {
  const p = releasePlan({ outstanding: 78400, requested: 0, limit: 60000 });
  assert.equal(p.noRequest, true);
  assert.equal(p.collectForFull, 0);
  assert.equal(p.releasableNow, 0);
});

test('Requested amount above the limit itself, even with nothing owed: no impossible collection figure', () => {
  const p = releasePlan({ outstanding: 0, requested: 80000, limit: 60000 });
  assert.equal(p.fullFits, false);
  assert.equal(p.collectForFull, null);
  assert.equal(p.maxReleasable, 60000);
  assert.equal(p.upfrontIfAllCleared, 20000);
});

test('Zero limit: nothing can go on credit', () => {
  const p = releasePlan({ outstanding: 0, requested: 10000, limit: 0 });
  assert.deepEqual([p.headroom, p.releasableNow, p.fullFits, p.maxReleasable], [0, 0, false, 0]);
});

test('Invalid or negative values are rejected, not computed', () => {
  for (const bad of [{ outstanding: -1, requested: 1, limit: 1 }, { outstanding: 1, requested: 'abc', limit: 1 }, { outstanding: 1, requested: 1 }, { outstanding: 1, requested: 1, limit: NaN }, { outstanding: 1, requested: 1, limit: 1, collected: -5 }]) {
    const r = releasePlan(bad);
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.match(r.error, /must be a number|cannot be negative/);
  }
  assert.equal(releasePlan({ outstanding: 1, requested: 1, limit: 1 }).after(-1).ok, false);
});
