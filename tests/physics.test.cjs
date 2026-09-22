const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../src/physics.js');
const C = require('../src/calibration.js');
const RESTRICTIVE_PIN = { airbrakeLength: 20, airbrakeTaper: 2 };
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b} by ${Math.abs(a-b)}`);

test('fixed bore, stroke and cylinder/barrel geometry', () => {
  const g = P.geometry(P.DEFAULTS, 0, 0);
  close(g.sweptVolume * 1e6, 35.8, 1e-7);
  close(P.geometry({ strokeLength: 65 }, 0, 0).sweptVolume * 1e6, 27.3764705882, 1e-7);
  close(g.barrelVolume * 1e6, 12.1985238867, 1e-8);
});
test('added annular bumper moves contact, occupies volume and preserves explicit geometry', () => {
  const bare = P.normalize(), p = P.normalize({ bumperThickness: 4, bumperBore: 8 }), a = P.geometry(bare, 0, 0), g = P.geometry(p, 0, 0);
  close(P.contactStroke(p) * 1000, 81);
  close((a.sweptVolume - g.sweptVolume), g.ac * .004, 1e-15);
  close(g.bumperSolidVolume, (g.ac - Math.PI * (.008 / 2) ** 2) * .004, 1e-15);
  close(a.vc - g.vc, g.bumperSolidVolume, 1e-15);
  const s = P.simulate(p);
  assert.equal(s.valid, true); close(s.stroke, P.contactStroke(p)); close(s.bumperThickness, .004);
  assert.ok(s.pistonHitTime > 0); close(s.frames.filter(f => f.t === s.pistonHitTime).at(-1).pistonX, s.stroke);
  assert.equal(s.pistonImpacts.length, 1); assert.equal(s.pistonImpacts[0].settledInContact, true);
  assert.ok(s.maxBumperCompression > 0 && s.maxBumperCompression < P.bumperLimit(p));
  assert.ok(s.peakBumperForce > 0 && s.bumperDissipatedEnergy > 0);
  assert.ok(s.pistonImpacts[0].duration > 0); assert.equal(s.pistonImpacts[0].bottomedOut, false);
  assert.ok(P.validate({ bumperThickness: 85 }).includes('bumper:thickness'));
  assert.ok(P.validate({ bumperThickness: -1 }).includes('bumperThickness:nonnegative'));
  assert.ok(P.validate({ bumperThickness: 4, bumperBore: 24 }).includes('cylinder:clearance'));
  assert.ok(!P.validate({ bumperThickness: 0, bumperBore: 30 }).includes('cylinder:clearance'));
});
test('short pin can end entirely inside a distinct bumper bore without entering the metal head', () => {
  const p = P.normalize({ bumperThickness: 6, bumperBore: 6, headBore: 4, airbrakeLength: 5, airbrakeDiameter: 4.5, airbrakeTipDiameter: 2, airbrakeTaper: 2 });
  assert.deepEqual(P.validate(p), []);
  const atContact = P.geometry(p, P.contactStroke(p), 0);
  close(atContact.insertion * 1000, 5);
  close(atContact.bumperGap, .75);
  close(atContact.gap, -.25);
  const expectedMinimum = Math.min(
    Math.PI / 4 * ((.006) ** 2 - (.0045) ** 2),
    Math.PI / 4 * .004 ** 2,
    Math.PI / 4 * .004 ** 2
  );
  close(P.passage(p, atContact.insertion, 2e5, 293.15, 1e5, 293.15).minArea, expectedMinimum, 1e-15);
  assert.ok(P.validate({ ...p, airbrakeLength: 7 }).includes('pin:clearance'));
});
test('pin clearance fixtures and profile volume', () => {
  close(P.geometry({ airbrakeDiameter: 3.8 }, 0, 0).annulus * 1e6, 1.2252211349, 1e-9);
  close(P.geometry({ airbrakeDiameter: 3.9 }, 0, 0).annulus * 1e6, .6204645491, 1e-9);
  const p = P.normalize({ ...RESTRICTIVE_PIN, airbrakeTaper: 0 });
  close(P.pinVolume(p, .02), Math.PI * (.0038 / 2) ** 2 * .02, 1e-15);
});
test('pin volume transfer and pressure-force derivatives conserve work', () => {
  const p = P.normalize(RESTRICTIVE_PIN);
  for (const x of [.02, .0655, .07, .08]) {
    const h = 1e-8, a = P.geometry(p, x-h, .1), b = P.geometry(p, x+h, .1), g = P.geometry(p, x, .1);
    close(((b.vc+b.vb)-(a.vc+a.vb))/(2*h), -g.ac, 1e-10);
    close((b.vc-a.vc)/(2*h), g.dvc, 1e-10);
    close((b.vb-a.vb)/(2*h), g.dvb, 1e-10);
    close(3e5*g.dvc+2e5*g.dvb, (3e5*(b.vc-a.vc)+2e5*(b.vb-a.vb))/(2*h), 1e-4);
  }
});
test('orifice flow: equilibrium, reversal and choking', () => {
  assert.equal(P.massFlow(1e5, 293, 1e5, 293, 1e-6), 0);
  close(P.massFlow(2e5, 293, 1e5, 300, 1e-6), -P.massFlow(1e5, 300, 2e5, 293, 1e-6));
  close(P.massFlow(4e5, 293, 1e5, 293, 1e-6), P.massFlow(4e5, 293, .5e5, 293, 1e-6));
});
test('narrow laminar clearance matches thin-gap limit, not arbitrary iteration floor', () => {
  const p = P.normalize({ ...RESTRICTIVE_PIN, airbrakeDiameter: 3.99, airbrakeTipDiameter: 3.99, airbrakeTaper: 0 });
  const actual = P.passage(p, .02, 101335, 293.15, 101325, 293.15).mdot;
  assert.ok(actual > 4.33e-12 && actual < 4.35e-12, String(actual));
  const lessOverlap = P.passage(p, .01, 101335, 293.15, 101325, 293.15).mdot;
  assert.ok(lessOverlap > actual * 1.9);
});
test('tapered pin flow resolves the actually overlapped axial profile', () => {
  const common = { airbrakeLength: 20, airbrakeDiameter: 3.8 };
  const tapered = P.passage(P.normalize({ ...common, airbrakeTipDiameter: 2, airbrakeTaper: 6 }), .018, 2e5, 293.15, 1e5, 293.15).mdot;
  const shaft = P.passage(P.normalize({ ...common, airbrakeTipDiameter: 3.8, airbrakeTaper: 0 }), .018, 2e5, 293.15, 1e5, 293.15).mdot;
  const thin = P.passage(P.normalize({ ...common, airbrakeDiameter: 2, airbrakeTipDiameter: 2, airbrakeTaper: 0 }), .018, 2e5, 293.15, 1e5, 293.15).mdot;
  assert.ok(tapered > shaft && tapered < thin);
});
test('fully inserted pin volume stops transferring while bumper compression continues', () => {
  const p = P.normalize({ bumperThickness: 4, bumperBore: 8, airbrakeLength: 5, airbrakeDiameter: 3.8, airbrakeTipDiameter: 2, airbrakeTaper: 2 });
  const contact = P.geometry(p, P.contactStroke(p), 0), compressed = P.geometry(p, P.contactStroke(p) + .0005, 0);
  assert.equal(contact.inserted, .005); assert.equal(compressed.inserted, .005);
  assert.equal(contact.pinArea, 0); assert.equal(compressed.pinArea, 0);
  close(compressed.vb, contact.vb); close(compressed.dvc, -compressed.ac); close(compressed.dvb, 0);
});
test('spring force is invariant at fixed compression, linear and measured curves agree', () => {
  const p = P.normalize(), short = P.normalize({ strokeLength: 65 });
  close(P.springForce(p, .04), P.springForce(short, .02));
  const curve = P.normalize({ springCurve: [[0,0],[50,27.5],[150,82.5]] });
  close(P.springEnergy(p, 0), P.springEnergy(curve, 0));
  assert.ok(P.validate({ springCurve: [[50,25],[100,50]] }).includes('spring:coverage'));
});
test('silencer geometry separates measured free volume from conditional outlet loss', () => {
  const base = P.silencerGeometry(P.normalize({ silencerEnabled: 1 }));
  const packed = P.silencerGeometry(P.normalize({ silencerEnabled: 1, silencerPackingFraction: .35 }));
  const open = P.silencerGeometry(P.normalize({ silencerEnabled: 1, silencerBaffleCount: 0, silencerBaffleBore: 20, silencerEndCapBore: 20 }));
  assert.ok(base.grossVolume > base.freeVolume && base.freeVolume > 0);
  assert.ok(packed.freeVolume < base.freeVolume && packed.lossFactor > base.lossFactor);
  assert.ok(open.effectiveOutletArea > base.effectiveOutletArea);
  assert.equal(P.silencerGeometry(P.normalize()).effectiveOutletArea, 0);
  assert.ok(P.validate({ silencerEnabled: 1, silencerBaffleBore: 5.9 }).includes('silencer:bb-clearance'));
  assert.ok(P.validate({ silencerEnabled: 1, silencerLength: 20, silencerBaffleCount: 5, silencerBaffleThickness: 5 }).includes('silencer:length'));
  assert.ok(P.validate({ silencerPackingFraction: .9 }).includes('silencer:packing'));
});
test('instrumented silencer pressure remains an optional calibration residual', () => {
  const row = C.cleanRecord({ bbMass: .46, fps: 330, peakSilencerBarG: .3, peakSilencerSigmaBar: .02 });
  assert.equal(row.peakSilencerBarG, .3); assert.equal(row.peakSilencerSigmaBar, .02);
  const shot = { valid: true, exitVelocity: 100, ambientPressure: 101300, peakSilencerPressure: 141300 };
  const term = C.residualTerms(shot, row).find(value => value.kind === 'peakSilencerBarG');
  close(term.raw, .1); close(term.sigma, .02);
  assert.ok(Object.hasOwn(C.PARAMETER_SPECS, 'silencerDischargeCoefficient'));
});
test('silencer outlet coefficient cannot be fitted from only unsilenced setups', async () => {
  const setup = P.normalize();
  const row = C.cleanRecord({ id: 'unsilenced', bbMass: setup.bbMass, fps: 330, role: 'train', setup, confirmed: true,
    solverVersion: P.VERSION, provenance: { geometry: 'measured', spring: 'measured' } });
  await assert.rejects(C.fitParameters([row], ['silencerDischargeCoefficient']), /silencer-disabled/);
});
test('installed silencer conserves the fourth gas volume and spreads final atmospheric outflow', () => {
  const direct = P.simulate({ maxTime: 250 });
  const silenced = P.simulate({ silencerEnabled: 1, maxTime: 250 });
  const restricted = P.simulate({ silencerEnabled: 1, silencerEndCapBore: 6.5, maxTime: 250 });
  for (const shot of [direct, silenced, restricted]) {
    assert.equal(shot.valid, true); assert.ok(shot.exitTime !== null && shot.dischargeComplete);
    assert.ok(Math.abs(shot.massResidual) < 1e-9);
    assert.ok(Math.abs(shot.energyResidual) / shot.energyScale < .001);
  }
  assert.ok(silenced.peakSilencerPressure > silenced.ambientPressure);
  assert.ok(silenced.peakMuzzleTransfer > silenced.peakOutflow);
  assert.ok(silenced.peakOutflow < direct.peakOutflow);
  assert.ok(restricted.peakOutflow < silenced.peakOutflow);
  assert.ok(restricted.peakSilencerPressure > silenced.peakSilencerPressure);
  assert.ok(silenced.frames.some(frame => frame.silencerOutflow > 0 && frame.silencerPressure > silenced.ambientPressure));
});
for (const [name, params] of Object.entries({
  bbTooWide: { bbDiameter: 6.02 }, pinTooWide: { ...RESTRICTIVE_PIN, airbrakeDiameter: 4.1 }, negativeMass: { pistonMass: -1 }, nonfinite: { headBore: NaN },
  longPin: { airbrakeLength: 90 }, impossibleTemperature: { airTemperature: -274 }, displacedBreech: { ...RESTRICTIVE_PIN, breechVolume: .05 },
  reversedCurve: { springCurve: [[100,40],[50,20]] }, impossiblePinTip: { airbrakeTipDiameter: 4.2 }
})) test(`invalid geometry/input: ${name}`, () => { const s = P.simulate(params); assert.equal(s.valid, false); assert.equal(s.exitTime, null); assert.equal(s.pistonHitTime, null); });
test('no drive gives equilibrium, not fictional exit or contact', () => {
  const s = P.simulate({ springStiffness: 0, maxTime: 10 });
  assert.equal(s.valid, true); assert.equal(s.exitTime, null); assert.equal(s.exitVelocity, null); assert.equal(s.exitEnergy, null); assert.equal(s.impactEnergy, null);
  assert.equal(s.frames.at(-1).pistonV, 0); assert.equal(s.frames.at(-1).bbV, 0); close(s.energyResidual, 0);
});
test('restrictive-pin fixture retains signed pressure reversal and honest missing contact', () => {
  const s = P.simulate(RESTRICTIVE_PIN);
  assert.equal(s.valid, true); assert.ok(s.exitVelocity > 0); assert.ok(s.frames.some(f => f.pistonV < 0));
  assert.ok(Math.abs(s.energyResidual) / s.energyScale < 1e-4); assert.ok(Math.abs(s.massResidual) < 1e-9);
  assert.equal(s.pistonHitTime, null); assert.equal(s.impactEnergy, null); assert.ok(s.strongBrakeTime >= s.engageTime);
  assert.ok(s.usefulTime < s.exitTime); assert.ok(s.peakCylinderPressure > s.peakPressure);
  assert.ok(s.muzzleMass > 0); assert.ok(s.exitGasMass > 0);
  assert.ok(s.preContactReversalTime < s.exitTime); assert.equal(s.contactReboundTime, null);
  assert.ok(s.maxPreContactRetreat > .0115 && s.maxPreContactRetreat < .0119);
});
test('absent pin does not invent airbrake events; contact is still possible', () => {
  const s = P.simulate({ airbrakeLength: 0, airbrakeTaper: 0 });
  assert.equal(s.engageTime, null); assert.equal(s.strongBrakeTime, null); assert.equal(s.preBrakeShare, null);
  assert.ok(s.pistonHitTime > 0); assert.ok(s.impactEnergy > 0); assert.ok(s.decelTime > 0);
});
test('every front-boundary contact is recorded independently of display sampling', () => {
  const a = P.simulate(), b = P.simulate({}, { sampleInterval: 1 });
  assert.ok(a.pistonImpacts.length >= 2, 'default restitution should expose at least one recontact');
  assert.equal(a.pistonImpacts.length, b.pistonImpacts.length);
  close(a.pistonImpacts[0].time, a.pistonHitTime); close(a.pistonImpacts[0].incomingVelocity, a.pistonImpactVelocity);
  close(a.pistonImpacts[0].pistonEnergy, a.impactEnergy);
  for (let i = 0; i < a.pistonImpacts.length; i++) {
    const event = a.pistonImpacts[i], sampled = b.pistonImpacts[i];
    assert.equal(event.index, i + 1); assert.ok(event.incomingVelocity > 0); assert.ok(event.reboundVelocity <= 0);
    assert.ok(event.pistonEnergy >= 0); assert.ok(event.effectiveMovingEnergy >= event.pistonEnergy); assert.ok(event.dissipatedEnergy >= 0);
    assert.ok(Number.isFinite(event.cylinderPressure)); assert.ok(Number.isFinite(event.bbPressure));
    if (i) assert.ok(event.time > a.pistonImpacts[i - 1].time);
    close(event.time, sampled.time); close(event.pistonEnergy, sampled.pistonEnergy);
  }
});
test('zero restitution settles at one recorded contact without fabricating rebound', () => {
  const s = P.simulate({ restitution: 0 });
  assert.equal(s.pistonImpacts.length, 1); assert.equal(s.pistonImpacts[0].reboundVelocity, 0);
  close(s.pistonImpacts[0].dissipatedEnergy, s.pistonImpacts[0].effectiveMovingEnergy);
});
test('short timeout is not a muzzle velocity', () => {
  const s = P.simulate({}, { maxTime: 1 });
  assert.equal(s.valid, true); assert.equal(s.exitVelocity, null); assert.equal(s.exitTime, null); assert.equal(s.impactEnergy, null);
  assert.equal(P.simulate({}, { maxTime: 15 }).usefulTime, null);
});
test('BB can lose speed when resistance exceeds thrust', () => {
  const s = P.simulate({ airbrakeLength: 0, barrelLength: 800, barrelDrag: 1.5, springStiffness: 250 });
  assert.equal(s.valid, true); assert.ok(s.frames.some(f => f.bbA < 0 && f.bbV > 0)); assert.ok(s.negativeBbWork > 0);
});
test('heat flow and leakage are included in energy and mass accounting', () => {
  const s = P.simulate({ heatTransfer: .1, pistonLeak: .1, nozzleLeak: .1, airTemperature: 40, restitution: .2 });
  assert.equal(s.valid, true); assert.ok(Math.abs(s.energyResidual) / s.energyScale < .001); assert.ok(Math.abs(s.massResidual) < 1e-9);
});
test('near-closed cylinder recovers adiabatic pV^gamma invariant', () => {
  const p = P.normalize({ headBore: .001, airbrakeLength: 0, airbrakeTaper: 0, pistonLeak: 0, nozzleLeak: 0, bbLeakCoefficient: 0, maxTime: 5 });
  const s = P.simulate(p), invariant = s.frames[0].cylinderPressure * P.geometry(p, 0, 0).vc ** P.GAMMA;
  assert.equal(s.valid, true);
  for (const f of s.frames) assert.ok(Math.abs(f.cylinderPressure * P.geometry(p, f.pistonX, f.bbX).vc ** P.GAMMA / invariant - 1) < 1e-5);
});
test('muzzle discharge excludes nozzle-seal leakage', () => {
  const s = P.simulate({ airbrakeLength: 0, nozzleLeak: .1 });
  const f = s.frames.find(f => f.bbExited && f.pressure > 120000);
  assert.ok(f);
  const expected = P.massFlow(f.pressure, f.bbTemperature, s.ambientPressure, s.params.airTemperature + 273.15, P.geometry(s.params, f.pistonX, s.barrelLength).ab * s.params.muzzleDischargeCoefficient);
  close(f.outflow, expected, 1e-12);
});
test('muzzle Cd controls front-gas venting before exit and discharge after exit', () => {
  const restricted = P.simulate({ muzzleDischargeCoefficient: .2 }), open = P.simulate({ muzzleDischargeCoefficient: 1 });
  assert.ok(restricted.peakFrontPressure > open.peakFrontPressure);
  assert.ok(restricted.exitVelocity < open.exitVelocity); assert.notEqual(restricted.exitTime, open.exitTime);
  assert.ok(open.peakOutflow > restricted.peakOutflow * 4);
  assert.notEqual(open.pistonImpactVelocity, restricted.pistonImpactVelocity);
});
test('air ahead of the BB is a vented conservative control volume', () => {
  const s = P.simulate({ frontDeadVolume: .1 });
  assert.equal(s.valid, true); assert.ok(s.peakFrontPressure > s.ambientPressure);
  assert.ok(s.exitFrontPressure > s.ambientPressure); assert.ok(s.frames.some(frame => frame.frontOutflow > 0));
  assert.ok(Math.abs(s.energyResidual) / s.energyScale < .001); assert.ok(Math.abs(s.massResidual) < 1e-9);
});
test('pressure-wave diagnostic is finite and explicitly remains an envelope', () => {
  const s = P.simulate();
  assert.equal(s.waveDiagnostics.method, 'causal-travel-envelope');
  assert.equal(s.waveDiagnostics.referenceCellCount, 24);
  for (const key of ['maxTransit', 'referenceCellTransit', 'maxPressureDelta', 'relativePressureSpan']) assert.ok(Number.isFinite(s.waveDiagnostics[key]));
  assert.ok(s.waveDiagnostics.maxTransit > 0); assert.ok(s.frames.every(frame => Number.isFinite(frame.wavePressureEstimate)));
});
test('measured bumper curve replaces linear stiffness and integrates stored energy', () => {
  const p = P.normalize({ bumperThickness: 2, bumperMaxCompression: 1, bumperStiffness: 0,
    bumperCurve: [[0, 0], [.5, 100], [1, 300]] });
  assert.deepEqual(P.validate(p), []);
  close(P.bumperElasticForce(p, .00075), 200, 1e-12);
  close(P.bumperPotential(p, .001), .125, 1e-12);
  const h=1e-8; close((P.bumperPotential(p,.00075+h)-P.bumperPotential(p,.00075-h))/(2*h),P.bumperElasticForce(p,.00075),1e-6);
  assert.ok(P.validate({ ...p, bumperCurve: [[0, 0], [.5, 100]] }).includes('bumper:coverage'));
  assert.ok(P.validate({ ...p, bumperCurve: [[0, 0], [.5, 100], [1, 90]] }).includes('bumper:curve'));
});
test('default timestep refinement converges separately for velocity and event time', () => {
  const a = P.simulate({}, { dt: 5e-6, tolerance: 5e-6 }), b = P.simulate({}, { dt: 2.5e-6, tolerance: 1.25e-6 });
  assert.ok(Math.abs(a.exitVelocity-b.exitVelocity)/b.exitVelocity < .001);
  assert.ok(Math.abs(a.exitTime-b.exitTime) < .00002);
  assert.ok(Math.abs(a.peakPressure-b.peakPressure)/b.peakPressure < .001);
});
test('compliant bumper force, compression and dissipation converge without restitution bounce', () => {
  const p = { bumperThickness: 4, bumperBore: 8 };
  const a = P.simulate(p, { dt: 5e-6, tolerance: 5e-6 }), b = P.simulate(p, { dt: 2.5e-6, tolerance: 1.25e-6 });
  assert.equal(a.pistonImpacts.length, 1); assert.equal(b.pistonImpacts.length, 1);
  assert.equal(a.pistonImpacts[0].bottomedOut, false); assert.equal(b.pistonImpacts[0].bottomedOut, false);
  assert.equal(a.pistonImpacts[0].reboundVelocity, null); assert.equal(b.pistonImpacts[0].reboundVelocity, null);
  assert.ok(Math.abs(a.maxBumperCompression - b.maxBumperCompression) < 1e-7);
  assert.ok(Math.abs(a.peakBumperForce - b.peakBumperForce) / b.peakBumperForce < 1e-4);
  assert.ok(Math.abs(a.bumperDissipatedEnergy - b.bumperDissipatedEnergy) < 1e-4);
  assert.ok(Math.abs(b.energyResidual) / b.energyScale < .001);
  assert.equal(a.pistonSettled, true); assert.equal(b.pistonSettled, true);
  assert.ok(Math.abs(a.frames.at(-1).pistonA) < 1); assert.ok(Math.abs(b.frames.at(-1).pistonA) < 1);
});
test('a low piston speed with large acceleration is not falsely reported as settled', () => {
  const s = P.simulate({ bumperThickness: 4, bumperBore: 8 });
  assert.equal(s.valid, true); assert.equal(s.pistonSettled, true); assert.equal(s.terminationReason, 'settled');
  assert.ok(Math.abs(s.frames.at(-1).pistonA) < 1);
  assert.equal(s.pistonImpacts.at(-1).settledInContact, true);
});
test('exhausting the integration step budget is an explicit convergence failure', () => {
  const s = P.simulate({}, { maxSteps: 1 });
  assert.equal(s.valid, false); assert.deepEqual(s.errors, ['solver:convergence']); assert.equal(s.terminationReason, 'step-limit');
});
test('taper clearance validation uses the local diameter that actually reaches each segment', () => {
  const p = P.normalize({ bumperThickness: 6, bumperBore: 6, bumperMaxCompression: 1,
    headLength: 12, headBore: 5, nozzleLength: 15, nozzleBore: 3,
    airbrakeLength: 19, airbrakeDiameter: 4.5, airbrakeTipDiameter: 2, airbrakeTaper: 10 });
  assert.deepEqual(P.validate(p), []);
  assert.ok(P.passage(p, .020, 250000, 350, 150000, 320).minArea > 0);
  assert.ok(P.validate({ ...p, airbrakeTipDiameter: 3.1 }).includes('pin:clearance'));
});
test('contact before BB exit survives refinement and conserves energy within budget', () => {
  const p = { springStiffness: 1800, springPreload: 100, airbrakeLength: 0 };
  const a = P.simulate(p, { dt: 5e-6 }), b = P.simulate(p, { dt: 2.5e-6 });
  assert.ok(a.pistonHitTime < a.exitTime); assert.ok(b.pistonHitTime < b.exitTime);
  assert.ok(Math.abs(a.exitVelocity-b.exitVelocity)/b.exitVelocity < .001);
  assert.ok(Math.abs(a.pistonHitTime-b.pistonHitTime) < .00002);
  assert.ok(Math.abs(a.energyResidual)/a.energyScale < .001);
});
test('geometry, losses, spring, temperature and piston/BB mass dynamically affect predictions', () => {
  const base = P.simulate(RESTRICTIVE_PIN).exitVelocity;
  for (const changes of [{ headBore: 4.5 }, { airbrakeDiameter: 3.6 }, { springStiffness: 650 }, { pistonMass: 58 }, { bbMass: .32 }, { pistonLeak: .2 }, { airTemperature: 40 }, { barrelLength: 303 }, { strokeLength: 65 }]) {
    const s = P.simulate({ ...RESTRICTIVE_PIN, ...changes }); assert.equal(s.valid, true, JSON.stringify(changes));
    assert.ok(s.exitVelocity === null || Math.abs(s.exitVelocity-base) > .001, JSON.stringify(changes));
  }
});
test('chrono seed is a reference with derived energy only', () => {
  const r = C.reference(); assert.equal(r.setup, null); assert.equal(C.eligible(r), false);
  close(C.energy(.46, 330), 2.32694244288, 1e-12);
});
test('legacy rows preserve measurements and old setup without reusing old fits', () => {
  const old = { measurements: [{ id: 1, mass: .46, fps: 330, setup: { pistonMass: 72 } }], modelUnknowns: { driveScale: 99 } };
  const data = C.decode(old), r = data.measurements[0];
  assert.equal(r.bbMass, .46); assert.equal(r.setup, null); assert.equal(r.legacySetup.pistonMass, 72); assert.equal(r.role, 'reference'); assert.equal(data.modelUnknowns, undefined);
});
test('malformed and incomplete calibration records never become fit-eligible', () => {
  assert.throws(() => C.decode('not JSON')); assert.throws(() => C.decode({ nope: [] }));
  assert.equal(C.cleanRecord({ mass: -1, fps: 300 }), null);
  const r = C.cleanRecord({ bbMass: .46, fps: 330, confirmed: true, role: 'train', setup: { pistonMass: 71 } });
  assert.equal(r.setup, null); assert.equal(r.role, 'reference');
  assert.equal(C.eligible({ ...C.reference(), confirmed: true, setup: P.normalize(), role: 'train', solverVersion: P.VERSION }), false);
  const malformed = C.cleanRecord({ ...C.reference(), confirmed: 'false', setup: P.normalize(), role: 'train', solverVersion: P.VERSION, provenance: { geometry: 'measured', spring: 'measured' } });
  assert.equal(malformed.confirmed, false); assert.equal(C.eligible(malformed), false);
});
test('fit refuses reference-only data', async () => { await assert.rejects(C.fitLoss([C.reference()])); });
test('one-parameter fit recovers synthetic Cd; held-out shots never enter fit', async () => {
  const setup = P.normalize({ airbrakeLength: 0, dischargeCoefficient: .68 });
  const measured = P.simulate(setup).exitVelocity / .3048;
  const row = { id: 'train', bbMass: .46, fps: measured, sigma: 1, role: 'train', setup, confirmed: true, solverVersion: P.VERSION, provenance: { geometry: 'measured', spring: 'measured' } };
  const result = await C.fitLoss([row, { ...row, id: 'repeat' }, { ...row, id: 'holdout', fps: measured+10, role: 'validation' }]);
  close(result.coefficient, .68, .002); assert.equal(result.distinctTrainingSetups, 1); assert.equal(result.training.count, 2); assert.equal(result.validation.count, 1); close(result.validation.rmse, 10, .1);
});
test('multi-parameter calibration requires distinct conditions and can use instrumented observables', async () => {
  const trueValues = { dischargeCoefficient: .64, barrelDrag: .35 };
  const simulate = p => ({ valid: true, exitVelocity: (250 + 120 * p.dischargeCoefficient - p.barrelDrag * p.barrelLength / 8) * .3048,
    pistonHitTime: (.02 + p.barrelDrag * .002), peakCylinderPressure: p.ambientPressure * 1000 + (2 + p.dischargeCoefficient) * 1e5,
    ambientPressure: p.ambientPressure * 1000, peakBumperForce: 100 + p.barrelDrag * 20 });
  const make = (id, barrelLength) => {
    const setup = P.normalize({ barrelLength, ...trueValues }), shot = simulate(setup);
    return { id, bbMass: setup.bbMass, fps: shot.exitVelocity / .3048, sigma: .2, role: 'train', setup, confirmed: true,
      solverVersion: P.VERSION, provenance: { geometry: 'measured', spring: 'measured' }, pistonHitMs: shot.pistonHitTime * 1000, pistonHitSigmaMs: .1 };
  };
  const rows = [make('a', 300), make('b', 500)];
  await assert.rejects(C.fitParameters([rows[0]], Object.keys(trueValues), () => {}, simulate), /not-identifiable/);
  const result = await C.fitParameters(rows, Object.keys(trueValues), () => {}, simulate);
  close(result.parameters.dischargeCoefficient, trueValues.dischargeCoefficient, .02);
  close(result.parameters.barrelDrag, trueValues.barrelDrag, .02);
  assert.equal(result.training.observations, 4); assert.equal(result.fittedParameters.length, 2);
});
test('calibration cannot replace a measured bumper curve with fitted linear stiffness', async () => {
  const setup=P.normalize({bumperThickness:2,bumperMaxCompression:1,bumperCurve:[[0,0],[1,250]]});
  const row={id:'bumper',bbMass:setup.bbMass,fps:300,sigma:1,role:'train',setup,confirmed:true,solverVersion:P.VERSION,provenance:{geometry:'measured',spring:'measured'}};
  await assert.rejects(C.fitParameters([row],['bumperStiffness'],()=>{},()=>({valid:true,exitVelocity:100})),/measured-bumper/);
});
test('browser bundle is classic standalone JS and exports identical solver', () => {
  const html = fs.readFileSync('index.html', 'utf8'), script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(!html.includes('type="module"')); assert.ok(!html.includes('src="./app.js"'));
  const pure = script.slice(0, script.indexOf('/* UI shared'));
  const ctx = vm.createContext({ setTimeout }); vm.runInContext(pure, ctx);
  assert.equal(ctx.PneumaticPhysics.VERSION, P.VERSION);
  assert.equal(ctx.PneumaticOptimizer.VERSION, '2.1.0');
  assert.equal(typeof ctx.PneumaticPlayback.frameAt, 'function');
  close(ctx.PneumaticPhysics.simulate({ maxTime: 10 }).frames.at(-1).pistonX, P.simulate({ maxTime: 10 }).frames.at(-1).pistonX);
  assert.equal(fs.readFileSync('dist/app.js','utf8').trim(), script.trim());
});
