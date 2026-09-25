const test = require("node:test");
const assert = require("node:assert/strict");
const BB = require("../src/bb-advisor.js");

test("compares the standard set of common BB weights", () => {
  const comparison = BB.compare();
  assert.deepEqual(comparison.results.map(row => row.weightGrams), BB.COMMON_WEIGHTS);
  assert.ok(comparison.recommendation.hopSupported);
  assert.ok(comparison.recommendation.overallScore >= 0 && comparison.recommendation.overallScore <= 100);
});

test("equal muzzle energy produces the physically corresponding muzzle speeds", () => {
  const comparison = BB.compare({ weights: [.2, .4], muzzleEnergyJ: 2 });
  const light = comparison.results[0], heavy = comparison.results[1];
  assert.ok(Math.abs(.5 * light.massKg * light.muzzleSpeedMps ** 2 - 2) < 1e-10);
  assert.ok(Math.abs(.5 * heavy.massKg * heavy.muzzleSpeedMps ** 2 - 2) < 1e-10);
  assert.ok(light.muzzleSpeedMps > heavy.muzzleSpeedMps);
});

test("heavier supported BB retains more energy and drifts less in the same crosswind", () => {
  const comparison = BB.compare({ weights: [.2, .4], muzzleEnergyJ: 2.3, targetDistanceM: 50, windKmh: 10, hopLimitGrams: .48 });
  const light = comparison.results[0], heavy = comparison.results[1];
  assert.ok(heavy.retainedEnergyJ > light.retainedEnergyJ);
  assert.ok(heavy.windDriftM < light.windDriftM);
  assert.ok(Number.isFinite(light.flightTimeS));
  assert.ok(Number.isFinite(heavy.flightTimeS));
  assert.equal(comparison.categoryWinners.flightTimeS.weightGrams, light.flightTimeS < heavy.flightTimeS ? light.weightGrams : heavy.weightGrams);
});

test("mass-based package cost rises with BB weight", () => {
  const comparison = BB.compare({ weights: [.2, .4], packagePrice: 20, packageMassGrams: 1000, magazineCapacity: 50 });
  const light = comparison.results[0], heavy = comparison.results[1];
  assert.ok(Math.abs(light.costPerMagazine - .2) < 1e-12);
  assert.ok(Math.abs(heavy.costPerMagazine - .4) < 1e-12);
});

test("weights above the reliable hop limit remain visible but cannot become the recommendation", () => {
  const comparison = BB.compare({ weights: [.32, .4, .48, .5], hopLimitGrams: .4, priority: "range" });
  const unsupported = comparison.results.filter(row => !row.hopSupported);
  assert.deepEqual(unsupported.map(row => row.weightGrams), [.48, .5]);
  assert.ok(comparison.recommendation.weightGrams <= .4);
  assert.ok(comparison.categoryWinners.expectedRangeM.weightGrams <= .4);
});

test("priority changes the transparent recommendation index", () => {
  const options = { weights: [.2, .25, .32, .4, .48], hopLimitGrams: .48, targetDistanceM: 50, windKmh: 10 };
  const range = BB.compare({ ...options, priority: "range" });
  const budget = BB.compare({ ...options, priority: "budget" });
  assert.notEqual(range.recommendation.weightGrams, budget.recommendation.weightGrams);
  assert.deepEqual(range.priorityWeights, BB.PRIORITY_WEIGHTS.range);
  assert.deepEqual(budget.priorityWeights, BB.PRIORITY_WEIGHTS.budget);
});

test("invalid scenarios fail rather than emitting misleading numbers", () => {
  assert.throws(() => BB.compare({ muzzleEnergyJ: 0 }), /inputs/);
  assert.throws(() => BB.compare({ weights: [] }), /inputs/);
  assert.throws(() => BB.compare({ windKmh: -1 }), /inputs/);
});
