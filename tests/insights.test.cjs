const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("../src/insights.js"), P = require("../src/physics.js");
const t = en => en, fmt = (v, digits = 2, unit = "") => Number.isFinite(v) ? `${v.toFixed(digits)} ${unit}`.trim() : "—", stamp = v => v === null ? "—" : fmt(v * 1000, 2, "ms");
const fixture = (overrides = {}) => ({ valid: true, duration: .1, usefulTime: .01, exitTime: .02, strongBrakeTime: .025, pistonHitTime: .03,
  impactEnergy: .002, peakOutflow: .008, pistonImpactVelocity: .3, ambientPressure: 101325, exitPressure: 151325, exitGasMass: 1e-5,
  muzzleMass: 2e-5, dischargeComplete: true, exitEnergy: 2, exitVelocity: 100, params: { pistonMass: 71, airbrakeLength: 10 }, ...overrides });
const setup = { airbrakeLength: 10, usefulFraction: .95 };

test("timing uses actual ordered solver timestamps and a disclosed linear event window", () => {
  const info = I.timing(fixture(), setup);
  assert.equal(info.verdict, "after-exit"); assert.ok(Math.abs(info.marginMs - 15) < 1e-12);
  assert.ok(info.events[0].percent < info.events[1].percent); assert.ok(info.events[1].percent < info.events[2].percent);
  assert.ok(Math.abs(info.events[2].time / info.end * 100 - info.events[2].percent) < 1e-12);
  assert.ok(info.end < .1 && info.end > .025);
});

test("early, intermediate and coincident timing events never claim a later brake", () => {
  assert.equal(I.timing(fixture({ strongBrakeTime: .005 }), setup).verdict, "early");
  assert.equal(I.timing(fixture({ strongBrakeTime: .015 }), setup).verdict, "after-threshold");
  assert.equal(I.timing(fixture({ strongBrakeTime: .01 }), setup).verdict, "same-threshold");
  const sameExit = I.timing(fixture({ strongBrakeTime: .02 }), setup);
  assert.equal(sameExit.verdict, "same-exit"); assert.equal(sameExit.events[1].percent, sameExit.events[2].percent);
});

test("missing or invalid events have no marker and no successful timing verdict", () => {
  const noExit = I.timing(fixture({ exitTime: null, usefulTime: null }), setup);
  assert.equal(noExit.verdict, "no-exit"); assert.equal(noExit.end, .1); assert.equal(noExit.events[1].percent, null);
  assert.equal(I.timing(fixture({ strongBrakeTime: null }), setup).verdict, "no-slowing");
  assert.equal(I.timing(fixture({ strongBrakeTime: null }), { ...setup, airbrakeLength: 0 }).verdict, "no-pin");
  assert.equal(I.timing(fixture({ usefulTime: null }), setup).verdict, "unavailable");
  for (const value of [NaN, Infinity, -.01, .101]) assert.equal(I.timing(fixture({ usefulTime: value }), setup).events[0].percent, null);
});

test("timeline labels use the selected energy threshold and preserve native event seeking", () => {
  const html = I.timingMarkup(fixture(), { ...setup, usefulFraction: .9 }, t, fmt, stamp);
  assert.match(html, /90% peak BB energy/); assert.match(html, /Linear event window/);
  for (const key of ["usefulTime", "exitTime", "strongBrakeTime"]) assert.match(html, new RegExp(`data-event="${key}"`));
  assert.match(html, /data-preserve-open/);
  const missing = I.timingMarkup(fixture({ strongBrakeTime: null }), { ...setup, airbrakeLength: 0 }, t, fmt, stamp);
  assert.match(missing, /data-event="strongBrakeTime" disabled/); assert.doesNotMatch(missing, /class="event-tick brake"/);
  assert.match(missing, /airbrake off/);
  assert.equal(I.thresholdPercent(.955), 95.5); assert.equal(I.thresholdPercent(.999), 99.9);
  assert.match(I.timingMarkup(fixture(), { ...setup, usefulFraction: .955 }, t, fmt, stamp), /95\.5% peak BB energy/);
  assert.match(I.timingMarkup(fixture(), { ...setup, usefulFraction: .999 }, t, fmt, stamp), /99\.9% peak BB energy/);
});

test("relative bars represent ratios with 100% halfway along a 0–200% scale", () => {
  assert.deepEqual(I.compare(.02, .04), { status: "lower", percent: 50, width: 25 });
  assert.deepEqual(I.compare(.04, .04), { status: "same", percent: 100, width: 50 });
  assert.deepEqual(I.compare(0, .04), { status: "lower", percent: 0, width: 0 });
  assert.deepEqual(I.compare(.12, .04), { status: "higher", percent: 300, width: 100 });
});

test("unknown, zero-reference and invalid comparisons never become zero impact", () => {
  for (const value of [null, undefined, NaN, Infinity, -1]) assert.equal(I.compare(value, .04).status, "unknown");
  for (const value of [null, undefined, NaN, Infinity, -1]) assert.equal(I.compare(.04, value).status, "no-reference");
  for (const value of [0, 1]) assert.equal(I.compare(value, 0).status, "zero-reference");
  assert.equal(I.compare(1, Number.MIN_VALUE).percent, null);
});

test("comparison requires actual contact/exit, not just zero-valued result fields", () => {
  const result = I.soundQuantities(fixture({ pistonHitTime: null, impactEnergy: 0, exitTime: null, peakOutflow: 0 }), fixture());
  assert.equal(result.impact, null); assert.equal(result.flow, null); assert.equal(result.impactComparison.status, "unknown");
  const invalidReference = I.soundQuantities(fixture(), fixture({ valid: false }));
  assert.equal(invalidReference.impactComparison.status, "no-reference"); assert.equal(invalidReference.flowComparison.status, "no-reference");
});

test("muzzle bar compares observed mass flow, not exit pressure or acoustic intensity", () => {
  const current = fixture({ peakOutflow: .004, exitPressure: 401325 }), baseline = fixture({ peakOutflow: .008, exitPressure: 151325 });
  const result = I.soundQuantities(current, baseline);
  assert.equal(result.flowComparison.percent, 50);
  const html = I.soundMarkup(current, baseline, t, fmt);
  assert.match(html, /4\.00 g\/s/); assert.match(html, /50\.0 %/); assert.match(html, /3\.00 bar\(g\)/);
  assert.match(html, /not measured loudness/); assert.doesNotMatch(html, /0–100|SOFT MECHANICAL|quiet setup/i);
});

test("cap is disclosed, numbers stay uncapped, and unfinished discharge remains explicit", () => {
  const html = I.soundMarkup(fixture({ impactEnergy: .006, dischargeComplete: false }), fixture(), t, fmt);
  assert.match(html, /300\.0 %/); assert.match(html, /Bar capped at 200%/); assert.match(html, /width:100\.00000%/);
  assert.match(html, /unfinished discharge is not silence/);
});

test("Croatian explanations and unavailable quantities do not introduce NaN or null labels", () => {
  const html = I.soundMarkup(fixture({ pistonHitTime: null, impactEnergy: null, exitTime: null, peakOutflow: 0, exitGasMass: null }), null, (en, hr) => hr, fmt);
  assert.match(html, /Što to znači/); assert.match(html, /veličina nepoznata, nije nula/);
  assert.doesNotMatch(html, /NaN|Infinity|null|undefined/);
});

test("real no-airbrake reference stays at 100% and does not invent a brake event", () => {
  const p = P.normalize(), s = P.simulate(p), q = I.soundQuantities(s, s);
  assert.equal(q.impactComparison.percent, 100); assert.equal(q.flowComparison.percent, 100);
  assert.equal(I.timing(s, p).verdict, "no-pin"); assert.equal(I.timing(s, p).events[2].percent, null);
});

test("before/after snapshot identifies changed inputs and preserves signed outcome deltas", () => {
  const before = fixture({ params: { pistonMass: 58, springCurve: [] }, exitEnergy: 2, exitVelocity: 100, impactEnergy: .004, peakOutflow: .008, strongBrakeTime: .02 });
  const after = fixture({ params: { pistonMass: 82, springCurve: [] }, exitEnergy: 2.1, exitVelocity: 105, impactEnergy: .003, peakOutflow: .01, strongBrakeTime: .018 });
  const result = I.comparisonSnapshot(before, after);
  assert.deepEqual(result.changes, [{ key: "pistonMass", before: 58, after: 82 }]);
  assert.ok(Math.abs(result.metrics.energy.delta - .1) < 1e-12); assert.ok(Math.abs(result.metrics.energy.percent - 5) < 1e-12);
  assert.equal(result.metrics.impact.delta, -1); assert.equal(result.metrics.flow.delta, 2);
  assert.ok(result.metrics.timingMargin.delta < 0);
  assert.equal(I.comparisonSnapshot({ valid: false }, after), null);
});

test("action plan prioritizes timing, impact, muzzle flow and unmeasured inputs", () => {
  const baseline = fixture({ impactEnergy: .002, peakOutflow: .008 });
  const early = fixture({ strongBrakeTime: .005, impactEnergy: .003, peakOutflow: .01 });
  const plan = I.actionPlan(early, baseline, setup, { geometry: "assumed", spring: "measured" });
  assert.deepEqual(plan.map(v => v.code), ["delay-braking", "impact-higher", "muzzle-higher", "measure-first"]);
  assert.deepEqual(plan.map(v => v.category || v.view), ["airbrake", "airbrake", "geometry", "calibration"]);
  assert.equal(I.actionPlan(fixture({ strongBrakeTime: null }), baseline, { ...setup, airbrakeLength: 0 }, { geometry: "measured", spring: "measured" })[0].code, "measure-pin");
});

test("feedback markup explains one-variable causality, deltas and actionable bilingual links", () => {
  const before = fixture({ params: { pistonMass: 58 }, impactEnergy: .003 }), after = fixture({ params: { pistonMass: 82 }, impactEnergy: .002 });
  const snapshot = I.comparisonSnapshot(before, after), labels = { pistonMass: ["Assembled piston mass", "Masa sastavljenog pistona", "g"] };
  const html = I.feedbackMarkup(snapshot, after, fixture(), setup, { geometry: "assumed", spring: "assumed" }, labels, t, fmt);
  assert.match(html, /One modeled input changed/); assert.match(html, /58\.000 g → 82\.000 g/);
  assert.match(html, /Piston contact energy/); assert.match(html, /data-feedback-category="airbrake"/);
  assert.match(html, /data-feedback-view="optimizer"/); assert.match(html, /not guaranteed/);
  const hr = I.feedbackMarkup(null, after, fixture(), setup, { geometry: "measured", spring: "measured" }, labels, (en, hr) => hr, fmt);
  assert.match(hr, /Napravite jednu promjenu/); assert.match(hr, /Sljedeći koraci/); assert.doesNotMatch(hr, /NaN|Infinity|null|undefined/);
});
