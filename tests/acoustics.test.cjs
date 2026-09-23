const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/physics.js");
const A = require("../src/acoustics.js");

function shotFor(impactEnergy, gasEnergy) {
  const ambient = 100000, pressure = 200000, temperature = 300;
  const specific = A.idealExpansionSpecificEnergy(pressure, temperature, ambient);
  const massFlow = gasEnergy / specific;
  const frame = (t, flow) => ({ t, bbExited: true, outflow: flow, frontOutflow: 0, silencerOutflow: 0,
    pressure, frontPressure: ambient, silencerPressure: ambient,
    bbTemperature: temperature, frontTemperature: temperature, silencerTemperature: temperature });
  return { valid: true, duration: 1, ambientPressure: ambient, exitTime: 0, pistonHitTime: .2,
    dischargeComplete: true, params: { silencerEnabled: 0 },
    pistonImpacts: [{ time: .2, pistonEnergy: impactEnergy, dissipatedEnergy: impactEnergy * .7, duration: .001, peakForce: 120 }],
    frames: [frame(0, massFlow), frame(1, massFlow)] };
}

test("ideal expansion term is a thermodynamic upper energy pool", () => {
  assert.equal(A.idealExpansionSpecificEnergy(100000, 300, 100000), 0);
  assert.equal(A.idealExpansionSpecificEnergy(90000, 300, 100000), 0);
  assert.ok(A.idealExpansionSpecificEnergy(200000, 300, 100000) > 0);
});

test("source terms integrate outlet power and keep contact energy distinct", () => {
  const terms = A.sourceTerms(shotFor(.003, .012));
  assert.ok(Math.abs(terms.incidentContactEnergy - .003) < 1e-12);
  assert.ok(Math.abs(terms.dissipatedContactEnergy - .0021) < 1e-12);
  assert.ok(Math.abs(terms.jetExpansionEnergy - .012) < 1e-12);
  assert.ok(Math.abs(terms.peakJetPower - .012) < 1e-12);
  assert.equal(terms.complete, true);
});

test("actual atmospheric outlet switches to the silencer end cap", () => {
  const shot = shotFor(.001, .001); shot.params.silencerEnabled = 1;
  const frame = { ...shot.frames[0], outflow: 9, silencerOutflow: .004, silencerPressure: 180000, silencerTemperature: 290 };
  const outlet = A.atmosphericOutlet(shot, frame);
  assert.equal(outlet.massFlow, .004);
  assert.equal(outlet.pressure, 180000);
});

test("relative source dB is logarithmic and never invents zero references", () => {
  assert.ok(Math.abs(A.relativeDb(.02, .01) - 3.0102999566) < 1e-9);
  assert.equal(A.relativeDb(0, .01), null);
  assert.equal(A.relativeDb(.01, 0), null);
});

test("three varied measured setups can separate empirical impact and gas response", () => {
  const impactCoefficient = 2.4, gasCoefficient = .7;
  const rows = [[.002, .008, .5], [.008, .002, 1], [.004, .012, 2], [.011, .006, 1]].map(([impact, gas, distance], index) => {
    const target = impactCoefficient * impact / A.SOURCE_SCALE + gasCoefficient * gas / A.SOURCE_SCALE;
    return { id: `r${index}`, confirmed: true, solverVersion: P.VERSION, provenance: { geometry: "measured", spring: "measured" },
      setup: { impact, gas }, soundPeakDb: A.DB_ANCHOR + 10 * Math.log10(target) - 20 * Math.log10(distance), soundDistanceM: distance, soundSigmaDb: 1 };
  });
  const fit = A.fitCalibration(rows, setup => shotFor(setup.impact, setup.gas));
  assert.equal(fit.status, "ready"); assert.equal(fit.mode, "separate");
  assert.ok(Math.abs(fit.impactCoefficient - impactCoefficient) < 1e-9);
  assert.ok(Math.abs(fit.gasCoefficient - gasCoefficient) < 1e-9);
  const prediction = A.predict(shotFor(.006, .004), fit);
  assert.equal(prediction.available, true);
  const expected = A.DB_ANCHOR + 10 * Math.log10(impactCoefficient * .6 + gasCoefficient * .4);
  assert.ok(Math.abs(prediction.levelAtOneMetre - expected) < 1e-9);
});

test("one measurement provides only a combined empirical factor", () => {
  const row = { id: "one", confirmed: true, solverVersion: P.VERSION, provenance: { geometry: "measured", spring: "measured" },
    setup: { impact: .002, gas: .006 }, soundPeakDb: 92, soundDistanceM: 1, soundSigmaDb: 2 };
  const fit = A.fitCalibration([row], setup => shotFor(setup.impact, setup.gas));
  assert.equal(fit.status, "ready"); assert.equal(fit.mode, "combined"); assert.equal(fit.rmseDb, null);
});

test("stored source terms avoid re-running historical simulations", () => {
  const row = { id: "stored", confirmed: true, solverVersion: P.VERSION, provenance: { geometry: "measured", spring: "measured" },
    setup: { deliberately: "not simulated" }, soundPeakDb: 94, soundDistanceM: 1, soundSigmaDb: 2,
    soundImpactSourceJ: .002, soundGasSourceJ: .006 };
  const fit = A.fitCalibration([row], () => { throw new Error("should not simulate"); });
  assert.equal(fit.status, "ready"); assert.equal(fit.mode, "combined");
});

test("sound calibration requires confirmed measured hardware and reports caveats", () => {
  const row = { confirmed: false, setup: {}, solverVersion: P.VERSION, provenance: { geometry: "measured", spring: "measured" }, soundPeakDb: 90, soundDistanceM: 1 };
  assert.equal(A.soundEligible(row), false);
  const t = en => en, fmt = (value, digits, unit = "") => Number.isFinite(value) ? `${value.toFixed(digits)} ${unit}` : "—";
  const html = A.markup(shotFor(.002, .006), shotFor(.003, .007), null, { status: "no-data" }, t, fmt);
  assert.match(html, /calibration required/);
  assert.match(html, /not acoustic power radiated to the listener/);
  assert.match(html, /Three or more varied setups/);
});
