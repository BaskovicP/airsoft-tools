const test = require("node:test");
const assert = require("node:assert/strict");
const Stalker = require("../src/stalker-wizard.js");

test("maps each supported cylinder-head system to the documented air-brake diameter", () => {
  assert.equal(Stalker.PROFILES.tac41_stock.diameter, 3.8);
  assert.equal(Stalker.PROFILES.tac41_gbb.diameter, 4);
  assert.equal(Stalker.PROFILES.srs.diameter, 3.8);
  assert.equal(Stalker.PROFILES.ssg10.diameter, 4.4);
  assert.equal(Stalker.PROFILES.ssg10_kraken.diameter, 4);
  assert.equal(Stalker.PROFILES.other.diameter, null);
});

test("selects platform-specific guide rings without inventing dimensions or mass", () => {
  const ssg = Stalker.guideRingSpec("ssg10");
  const ssgKraken = Stalker.guideRingSpec("ssg10_kraken");
  const vsr = Stalker.guideRingSpec("vsr_tm");
  assert.equal(ssg.key, "ssg10");
  assert.equal(ssgKraken.key, "ssg10");
  assert.equal(vsr.key, "vsr10");
  assert.notEqual(ssg.source, vsr.source);
  assert.match(ssg.comparison.en, /not the VSR10\/TM-spec set/i);
  assert.equal(ssg.outerDiameter, null);
  assert.equal(ssg.mass, null);
});

test("checks measured nozzle bore against the selected published brake", () => {
  assert.equal(Stalker.nozzleFit(4, "").status, "unmeasured");
  assert.deepEqual(Stalker.nozzleFit(null, "4.15"), { status: "measured-only", bore: 4.15, brake: null, clearance: null, radialClearance: null });
  const fit = Stalker.nozzleFit(4, 4.12);
  assert.equal(fit.status, "positive");
  assert.ok(Math.abs(fit.clearance - .12) < 1e-12);
  assert.ok(Math.abs(fit.radialClearance - .06) < 1e-12);
  assert.equal(Stalker.nozzleFit(4.4, 4.4).status, "blocked");
  assert.equal(Stalker.nozzleFit(4.4, 4.35).status, "blocked");
});

test("calculates published modular mass combinations", () => {
  assert.equal(Stalker.bodyMass("small", "aluminum", 0), 43);
  assert.equal(Stalker.bodyMass("small", "steel", 5), 90);
  assert.equal(Stalker.bodyMass("large", "aluminum", 0), 62);
  assert.equal(Stalker.bodyMass("large", "steel", 5), 145);
});

test("uses current plug and play mass as a starting point and nearest Ultimate combination", () => {
  const tac = Stalker.recommend({ profile: "tac41_stock", targetJ: 2.3, barrelLength: 420, edition: "ultimate" });
  assert.equal(tac.targetMass, 100);
  assert.equal(tac.combination.mass, 102);
  const vsr = Stalker.recommend({ profile: "vsr_tm", targetJ: 2.3, barrelLength: 430, edition: "ultimate" });
  assert.equal(vsr.targetMass, 71);
  assert.equal(vsr.combination.mass, 72);
});

test("creates a practical three-mass test ladder around published references", () => {
  const tac = Stalker.weightPlan("tac41_stock");
  assert.deepEqual(tac.candidateMasses, [80, 89, 102]);
  assert.deepEqual(tac.references.map(item => item.mass), [82, 100]);
  const ssg = Stalker.weightPlan("ssg10");
  assert.deepEqual(ssg.candidateMasses, [68, 72, 76]);
  assert.deepEqual(ssg.references.map(item => item.mass), [71]);
});

test("weight trials reject over-limit results and prefer a clean consistent safe mass", () => {
  const result = Stalker.analyzeWeightTrials([
    { mass: 68, readings: "2.18 2.19 2.18 2.19 2.18", sound: "clean" },
    { mass: 72, readings: "2.24 2.25 2.24 2.25 2.24", sound: "clean" },
    { mass: 76, readings: "2.29 2.30 2.29 2.30 2.29", sound: "bounce" }
  ], 2.3, .05, "balanced");
  assert.equal(result.ceiling, 2.25);
  assert.equal(result.valid[2].overLimit, true);
  assert.equal(result.recommendation.mass, 72);
});

test("weight trials detect when added mass causes a meaningful energy reversal", () => {
  const result = Stalker.analyzeWeightTrials([
    { mass: 80, readings: "2.20 2.21 2.20 2.21 2.20", sound: "clean" },
    { mass: 89, readings: "2.28 2.29 2.28 2.29 2.28", sound: "clean" },
    { mass: 102, readings: "2.21 2.22 2.21 2.22 2.21", sound: "clean" }
  ], 2.4, .05, "output");
  assert.equal(result.reversal.previous.mass, 89);
  assert.equal(result.reversal.current.mass, 102);
});

test("chooses documented air-brake starting direction by energy", () => {
  assert.deepEqual(Stalker.recommend({ profile: "srs", targetJ: 1.8 }).airbrake, { length: "long", start: "low" });
  assert.deepEqual(Stalker.recommend({ profile: "srs", targetJ: 2.3 }).airbrake, { length: "short", start: "fully-out" });
  assert.deepEqual(Stalker.recommend({ profile: "srs", targetJ: 3 }).airbrake, { length: "short", start: "fully-in" });
});

test("chrono sequence detects the first meaningful energy drop and selects the previous step", () => {
  const result = Stalker.analyzeChronoSteps([
    { position: 1, readings: "2.28 2.29 2.28 2.30 2.29" },
    { position: 2, readings: "2.31 2.30 2.32 2.31 2.30" },
    { position: 3, readings: "2.24 2.25 2.23 2.24 2.25" }
  ]);
  assert.equal(result.status, "drop");
  assert.equal(result.drop.index, 2);
  assert.equal(result.best.position, 2);
});

test("empty chrono fields stay empty instead of becoming zero-joule shots", () => {
  assert.deepEqual(Stalker.parseReadings(""), []);
  assert.equal(Stalker.stats(""), null);
  assert.equal(Stalker.analyzeChronoSteps([{ position: 0, readings: "" }]).status, "empty");
});

test("troubleshooter covers the principal Scorpion symptoms", () => {
  assert.deepEqual(Object.keys(Stalker.TROUBLESHOOTING), ["low", "loud", "inconsistent", "drag", "feed"]);
  for (const symptom of Object.values(Stalker.TROUBLESHOOTING)) assert.ok(symptom.checks.length >= 5);
});

test("piston-drag checks include specific test, pass and fail guidance", () => {
  const checks = Stalker.TROUBLESHOOTING.drag.checks;
  assert.equal(checks.length, 5);
  for (const check of checks) {
    assert.ok(check.title.en);
    assert.ok(check.why.en);
    assert.ok(check.how.en);
    assert.ok(check.pass.en);
    assert.ok(check.fail.en);
  }
});

test("every Stalker symptom check includes why, how, pass and fail guidance", () => {
  for (const symptom of Object.values(Stalker.TROUBLESHOOTING)) {
    for (const check of symptom.checks) {
      assert.ok(check.title?.en);
      assert.ok(check.why?.en);
      assert.ok(check.how?.en);
      assert.ok(check.pass?.en);
      assert.ok(check.fail?.en);
    }
  }
});

test("spring-guide check measures real clearance without inventing a Stalker target", () => {
  const clearance = Stalker.TROUBLESHOOTING.drag.checks[3];
  assert.match(clearance.title.en, /compatibility class/i);
  assert.match(clearance.why.en, /nominal 9\.00 mm shaft/i);
  assert.match(clearance.how.en, /largest guide OD and smallest spring ID/i);
  assert.match(clearance.pass.en, /greater than maximum measured OD/i);
  assert.match(clearance.fail.en, /zero\/negative calculated clearance/i);
  assert.match(clearance.measurement.en, /9\.20 − 9\.00 = 0\.20 mm/);
  assert.match(clearance.measurement.en, /not a Stalker target specification/i);
  assert.equal(clearance.source, "https://skirmshopusa.com/products/vsr-10-ssg10-9mm-stainless-steel-spring-guide");
});

test("spring-guide identity follows the selected rifle platform", () => {
  const vsr = Stalker.springGuideAdvice("ssg10");
  const tac = Stalker.springGuideAdvice("tac41_stock");
  const srs = Stalker.springGuideAdvice("srs");
  const unknown = Stalker.springGuideAdvice("other");
  assert.match(vsr.why.en, /9\.00 mm shaft, 90 mm total length and 21\.75 mm base/);
  assert.match(tac.title.en, /TAC-41 spring guide/);
  assert.match(tac.why.en, /does not publish a shaft diameter/);
  assert.match(srs.title.en, /made for the SRS Scorpion piston/);
  assert.match(srs.why.en, /Do not treat the VSR\/SSG10 .9 mm. dimension as an SRS specification/);
  assert.match(unknown.title.en, /Identify the exact piston and spring guide/);
  assert.equal(unknown.source, null);
});
