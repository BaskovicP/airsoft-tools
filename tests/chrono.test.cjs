const test = require("node:test");
const assert = require("node:assert/strict");
const Chrono = require("../src/chrono.js");

test("parses line, space, semicolon and decimal-comma readings", () => {
  const parsed = Chrono.parseReadings("330\n329 331;328\n100,5;101,2\nnot-a-shot");
  assert.deepEqual(parsed.values, [330, 329, 331, 328, 100.5, 101.2]);
  assert.deepEqual(parsed.invalid, ["not-a-shot"]);
  assert.equal(parsed.truncated, false);
});

test("calculates velocity and energy statistics", () => {
  const result = Chrono.analyze([330, 329, 331, 330], .4, "fps", false);
  assert.equal(result.all.count, 4);
  assert.equal(result.all.meanFps, 330);
  assert.equal(result.all.spreadFps, 2);
  assert.ok(Math.abs(result.all.meanEnergyJ - 2.02378) < .001);
  assert.ok(result.all.sampleSdFps > 0);
});

test("converts m/s and conserves the energy calculation", () => {
  const result = Chrono.analyze([100], .2, "mps", false);
  assert.ok(Math.abs(result.all.meanFps - 328.0839895) < 1e-6);
  assert.equal(result.all.meanEnergyJ, 1);
});

test("flags Tukey potential outliers and can exclude them from headlines", () => {
  const result = Chrono.analyze([330, 330, 330, 330, 500], .4, "fps", true);
  assert.equal(result.outlierCount, 1);
  assert.equal(result.rows.at(-1).outlier, true);
  assert.equal(result.active.meanFps, 330);
  assert.equal(result.excludingOutliers, true);
});

test("compares mean energy between BB weights", () => {
  const light = Chrono.analyze([400, 400], .2, "fps");
  const heavy = Chrono.analyze([330, 330], .4, "fps");
  const comparison = Chrono.compare(light, heavy);
  assert.ok(comparison.deltaJ > 0);
  assert.ok(comparison.percent > 0);
});

test("comparison index follows the selected priority and exposes metric winners", () => {
  const consistent = Chrono.analyze([329, 330, 330, 330, 331], .2, "fps", false);
  const powerful = Chrono.analyze([390, 400, 410, 400, 400], .4, "fps", false);
  const consistencyFirst = Chrono.comparisonScores(consistent, powerful, "consistency");
  const outputFirst = Chrono.comparisonScores(consistent, powerful, "output");
  assert.equal(consistencyFirst.winner, "a");
  assert.equal(outputFirst.winner, "b");
  assert.equal(consistencyFirst.metrics.cv.winner, "a");
  assert.equal(outputFirst.metrics.speed.winner, "b");
  assert.ok(consistencyFirst.scores.a <= 100 && consistencyFirst.scores.a >= 0);
  assert.ok(outputFirst.scores.b <= 100 && outputFirst.scores.b >= 0);
});

test("rejects impossible speeds without losing their shot positions", () => {
  const result = Chrono.analyze([330, 0, -2, 4000], .4, "fps");
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rejected.map(row => row.index), [2, 3, 4]);
});
