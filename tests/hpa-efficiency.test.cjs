const test = require("node:test");
const assert = require("node:assert/strict");
const HPA = require("../src/hpa-efficiency.js");

test("converts common tank and pressure units", () => {
  assert.ok(Math.abs(HPA.ciToLiters(68) - 1.114320352) < 1e-9);
  assert.ok(Math.abs(HPA.psiToBar(145.037738) - 10) < 1e-7);
});

test("usable air is the standard-air equivalent above regulator reserve", () => {
  const result = HPA.calculate({ tankVolumeCi: 68, fillPressurePsi: 4500, regulatorPressurePsi: 100, regulatorHeadroomPsi: 200, deliveryEfficiencyPct: 90, measuredAirCm3PerShot: 300 });
  const expected = HPA.ciToLiters(68) * (4500 - 300) / HPA.ATM_PSI * .9;
  assert.ok(Math.abs(result.usableStandardAirLiters - expected) < 1e-10);
  assert.ok(Math.abs(result.usableShots - expected * 1000 / 300) < 1e-10);
});

test("more tank volume and fill pressure produce more usable shots", () => {
  const small = HPA.calculate({ tankVolumeCi: 13, fillPressurePsi: 3000 });
  const large = HPA.calculate({ tankVolumeCi: 68, fillPressurePsi: 4500 });
  assert.ok(large.usableShots > small.usableShots);
});

test("longer dwell scales measured consumption and reduces shot count", () => {
  const baseline = HPA.calculate({ referenceDwellMs: 1.2, targetDwellMs: 1.2, measuredAirCm3PerShot: 300 });
  const longer = HPA.calculate({ referenceDwellMs: 1.2, targetDwellMs: 1.5, measuredAirCm3PerShot: 300 });
  assert.ok(Math.abs(longer.adjustedAirCm3PerShot - 375) < 1e-10);
  assert.ok(longer.usableShots < baseline.usableShots);
});

test("barrel volume and regulator pressure define a disclosed physical floor", () => {
  const result = HPA.calculate({ barrelVolumeCm3: 12, regulatorPressurePsi: 120, measuredAirCm3PerShot: 20 });
  assert.equal(result.measurementBelowFloor, true);
  assert.ok(result.adjustedAirCm3PerShot >= result.idealBarrelAirCm3);
  assert.ok(result.barrelUtilizationPct <= 100);
});

test("uncertainty range brackets the headline estimate", () => {
  const result = HPA.calculate({ measurementUncertaintyPct: 10 });
  assert.ok(result.shotsLow < result.usableShots);
  assert.ok(result.shotsHigh > result.usableShots);
});

test("invalid pressure reserve fails instead of inventing usable shots", () => {
  assert.throws(() => HPA.calculate({ fillPressurePsi: 250, regulatorPressurePsi: 100, regulatorHeadroomPsi: 200 }), /pressure/);
  assert.throws(() => HPA.calculate({ measuredAirCm3PerShot: 0 }), /inputs/);
  assert.throws(() => HPA.calculate({ deliveryEfficiencyPct: 101 }), /inputs/);
});
