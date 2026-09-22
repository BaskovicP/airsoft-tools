/* Pure, dependency-free conservative lumped model. See docs/MODEL.md. */
(function (root) {
  "use strict";
  const VERSION = "3.4.0";
  const R = 287.05, GAMMA = 1.4, CV = R / (GAMMA - 1), CP = CV + R;
  const area = d => Math.PI * (d / 2000) ** 2;
  const DEFAULTS = Object.freeze({
    cylinderBore: 23.157256696, strokeLength: 85, barrelLength: 430, barrelDiameter: 6.01,
    pistonMass: 71, bbMass: .46, bbDiameter: 5.95,
    // Start with an explicitly labelled no-pin reference, not an invented AMP brake fit.
    airbrakeLength: 0, airbrakeDiameter: 3.8, airbrakeTipDiameter: 2, airbrakeTaper: 0,
    headBore: 4, headLength: 12, nozzleBore: 4, nozzleLength: 15,
    // Added annular pad ahead of the rigid head. Zero thickness preserves the
    // bare-head geometry; its bore remains explicit for installed pads.
    bumperThickness: 0, bumperBore: 4,
    // Kelvin-Voigt loading model. These values are illustrative until measured;
    // with a zero-thickness bumper they are inactive and the rigid stop remains.
    bumperStiffness: 250, bumperDamping: 160, bumperMaxCompression: 1,
    deadVolume: .55, breechVolume: .45, dischargeCoefficient: .75, muzzleDischargeCoefficient: .85,
    pistonLeak: .005, nozzleLeak: .005, bbLeakCoefficient: .15,
    springStiffness: 550, springPreload: 50, springMass: 0, springCurve: [],
    springLengthMode: 0, springFreeLength: 0, springInstalledLength: 0, springCutLength: 0,
    springActiveCoils: 0, springRemovedCoils: 0, springSolidLength: 0,
    pistonFriction: 3.2, sealFriction: .01, rearDamping: 0, bbBreakaway: 1.35, barrelDrag: .11,
    restitution: .05, heatTransfer: 0, ambientPressure: 101.3, airTemperature: 20,
    usefulFraction: .95, decelThreshold: 1000, maxTime: 60
  });
  function normalize(raw = {}) { return { ...DEFAULTS, ...raw }; }
  function contactStroke(raw) {
    const p = normalize(raw);
    return (p.strokeLength - p.bumperThickness) / 1000;
  }
  function bumperLimit(raw) {
    const p = normalize(raw);
    return Math.min(p.bumperThickness, p.bumperMaxCompression) / 1000;
  }
  // Lengths are axial mm, not wire length. Rate scaling is a uniform-coil estimate.
  // The entered front seat/preload refers to the rigid-head plane before an
  // added bumper. A bumper moves piston contact rearward while leaving cocked
  // compression unchanged for the same physical spring seats.
  function springState(p) {
    const lengths = p.springLengthMode === 1;
    const cut = lengths ? p.springCutLength : 0;
    const freeLength = lengths ? p.springFreeLength - cut : null;
    const installedLength = lengths ? p.springInstalledLength - p.bumperThickness : null;
    const preload = lengths ? freeLength - installedLength : p.springPreload + p.bumperThickness;
    const travel = (p.strokeLength - p.bumperThickness);
    const rateRatio = cut > 0 ? p.springActiveCoils / (p.springActiveCoils - p.springRemovedCoils) : 1;
    return { freeLength, preload, contactTravel: travel, installedLength,
      cockedCompression: preload + travel,
      cockedLength: lengths ? installedLength - travel : null,
      stiffness: p.springStiffness * rateRatio, rateRatio,
      coilBindChecked: lengths && p.springSolidLength > 0 };
  }
  function validate(raw) {
    const p = normalize(raw), errors = [];
    const positive = ["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "pistonMass", "bbMass", "bbDiameter", "bumperBore", "headBore", "headLength", "nozzleBore", "nozzleLength", "deadVolume", "breechVolume", "ambientPressure", "maxTime"];
    for (const key of Object.keys(DEFAULTS)) if (key !== "springCurve" && !Number.isFinite(p[key])) errors.push(`${key}:finite`);
    for (const key of positive) if (!(p[key] > 0)) errors.push(`${key}:positive`);
    for (const key of ["airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "bumperThickness", "bumperStiffness", "bumperDamping", "bumperMaxCompression", "springStiffness", "springPreload", "springMass", "pistonLeak", "nozzleLeak", "pistonFriction", "sealFriction", "rearDamping", "bbBreakaway", "barrelDrag", "heatTransfer", "decelThreshold"]) if (p[key] < 0) errors.push(`${key}:nonnegative`);
    if (p.bbDiameter >= p.barrelDiameter) errors.push("bb:clearance");
    if ((p.bumperThickness > 0 && p.cylinderBore <= p.bumperBore) || p.cylinderBore <= p.headBore || p.cylinderBore <= p.airbrakeDiameter) errors.push("cylinder:clearance");
    const maximumPinReach = p.airbrakeLength + Math.min(p.bumperThickness, p.bumperMaxCompression);
    if (p.airbrakeLength > 0 && (
      (p.bumperThickness > 0 && p.airbrakeDiameter >= p.bumperBore) ||
      (maximumPinReach > p.bumperThickness && p.airbrakeDiameter >= p.headBore) ||
      (maximumPinReach > p.bumperThickness + p.headLength && p.airbrakeDiameter >= p.nozzleBore)
    )) errors.push("pin:clearance");
    if (!(p.bumperThickness < p.strokeLength)) errors.push("bumper:thickness");
    if (p.bumperThickness > 0 && p.bumperMaxCompression > 0 && !(p.bumperStiffness > 0)) errors.push("bumper:stiffness");
    const travel = p.strokeLength - p.bumperThickness;
    if (p.airbrakeLength > travel || maximumPinReach > p.bumperThickness + p.headLength + p.nozzleLength) errors.push("pin:length");
    if (p.airbrakeTipDiameter > p.airbrakeDiameter || p.airbrakeTaper > p.airbrakeLength && p.airbrakeLength > 0) errors.push("pin:profile");
    if (!(p.dischargeCoefficient > 0 && p.dischargeCoefficient <= 1) || !(p.muzzleDischargeCoefficient > 0 && p.muzzleDischargeCoefficient <= 1) || !(p.bbLeakCoefficient >= 0 && p.bbLeakCoefficient <= 1) || !(p.restitution >= 0 && p.restitution <= 1)) errors.push("coefficient:range");
    if (!(p.usefulFraction > 0 && p.usefulFraction <= 1) || p.airTemperature <= -273.15 || p.maxTime > 250) errors.push("range:invalid");
    if (![0, 1].includes(p.springLengthMode)) errors.push("spring:mode");
    for (const key of ["springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"]) if (p[key] < 0) errors.push(`${key}:nonnegative`);
    const spring = springState(p);
    if (p.springLengthMode === 1) {
      if (!(p.springFreeLength > 0 && p.springInstalledLength > p.strokeLength && spring.freeLength > 0)) errors.push("spring:lengths");
      if (spring.preload < 0) errors.push("spring:slack");
      if (p.springCutLength > 0 && !(p.springActiveCoils > 0 && p.springRemovedCoils < p.springActiveCoils)) errors.push("spring:coils");
      if (p.springCutLength === 0 && p.springRemovedCoils > 0) errors.push("spring:cut-length");
      if (p.springSolidLength > 0 && spring.cockedLength <= p.springSolidLength) errors.push("spring:coil-bind");
      if (p.springCutLength > 0 && p.springCurve?.length) errors.push("spring:cut-curve");
    }
    if (!Array.isArray(p.springCurve)) errors.push("spring:curve");
    else if (p.springCurve.length) {
      if (p.springCurve.length < 2 || p.springCurve.some((v, i, a) => !Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite) || v[0] < 0 || v[1] < 0 || i > 0 && v[0] <= a[i - 1][0])) errors.push("spring:curve");
      else if (p.springCurve[0][0] > spring.preload - bumperLimit(p) * 1000 || p.springCurve.at(-1)[0] < spring.cockedCompression) errors.push("spring:coverage");
    }
    if (!errors.length) {
      const g = geometry(p, contactStroke(p) + bumperLimit(p), 0);
      if (g.vc <= 0 || g.vb <= 0) errors.push("volume:pin");
    }
    return [...new Set(errors)];
  }
  function pinDiameter(p, distanceFromTip) {
    if (distanceFromTip <= 0 || p.airbrakeLength === 0) return 0;
    const f = p.airbrakeTaper > 0 ? Math.min(1, distanceFromTip * 1000 / p.airbrakeTaper) : 1;
    return p.airbrakeTipDiameter + (p.airbrakeDiameter - p.airbrakeTipDiameter) * f;
  }
  function pinVolume(p, length) {
    const l = Math.max(0, Math.min(length, p.airbrakeLength / 1000));
    const taper = Math.min(p.airbrakeTaper, p.airbrakeLength) / 1000;
    const c = Math.min(l, taper), d0 = p.airbrakeTipDiameter / 1000;
    const slope = taper > 0 ? (p.airbrakeDiameter / 1000 - d0) / taper : 0;
    return Math.PI / 4 * (d0 * d0 * c + d0 * slope * c * c + slope * slope * c ** 3 / 3) + area(p.airbrakeDiameter) * Math.max(0, l - taper);
  }
  function geometry(raw, x, y) {
    const p = normalize(raw), ac = area(p.cylinderBore), ab = area(p.barrelDiameter), stroke = contactStroke(p);
    const hardStop = stroke + bumperLimit(p);
    const bumper = p.bumperThickness / 1000;
    const bumperSolidVolume = Math.max(0, ac - area(p.bumperBore)) * bumper;
    const insertion = Math.max(0, p.airbrakeLength / 1000 - (stroke - x));
    const pinLength = p.airbrakeLength / 1000, inserted = Math.min(insertion, pinLength);
    const displaced = pinVolume(p, inserted);
    // Once the whole pin is downstream, further piston travel no longer moves
    // pin volume between the two control volumes.
    const ap = insertion > 0 && insertion < pinLength ? area(pinDiameter(p, insertion)) : 0;
    return {
      ac, ab, stroke, hardStop, insertion, inserted, pinArea: ap,
      vc: p.deadVolume * 1e-6 + ac * (p.strokeLength / 1000 - x) - bumperSolidVolume - pinVolume(p, p.airbrakeLength / 1000) + displaced,
      vb: p.breechVolume * 1e-6 + ab * y - displaced,
      dvc: -ac + ap, dvb: -ap,
      sweptVolume: ac * stroke, barrelVolume: ab * p.barrelLength / 1000,
      bumperSolidVolume,
      bumperGap: (p.bumperBore - p.airbrakeDiameter) / 2,
      bumperAnnulus: Math.PI / 4 * ((p.bumperBore / 1000) ** 2 - (p.airbrakeDiameter / 1000) ** 2),
      gap: (p.headBore - p.airbrakeDiameter) / 2,
      annulus: Math.PI / 4 * ((p.headBore / 1000) ** 2 - (p.airbrakeDiameter / 1000) ** 2)
    };
  }
  function springForce(p, x) {
    const spring = springState(p), c = spring.preload + spring.contactTravel - x * 1000;
    if (!p.springCurve?.length) return spring.stiffness * Math.max(0, c) / 1000;
    const pairs = p.springCurve;
    for (let i = 1; i < pairs.length; i++) if (c <= pairs[i][0]) {
      const a = pairs[i - 1], b = pairs[i];
      return a[1] + (b[1] - a[1]) * (c - a[0]) / (b[0] - a[0]);
    }
    return pairs.at(-1)[1];
  }
  function springEnergy(p, x) {
    const end = contactStroke(p);
    const direction = x <= end ? 1 : -1, low = Math.min(x, end), high = Math.max(x, end);
    const points = [low, high];
    const spring = springState(p);
    for (const pair of p.springCurve || []) {
      const at = (spring.preload + spring.contactTravel - pair[0]) / 1000;
      if (at > low && at < high) points.push(at);
    }
    points.sort((a, b) => a - b);
    let sum = 0;
    for (let i = 1; i < points.length; i++) sum += (springForce(p, points[i - 1]) + springForce(p, points[i])) / 2 * (points[i] - points[i - 1]);
    return direction * sum;
  }
  // Isentropic reservoir-to-reservoir short restriction; signed, including choking.
  function massFlow(pa, ta, pb, tb, effectiveArea) {
    if (pa === pb || effectiveArea <= 0) return 0;
    const forward = pa > pb, pu = forward ? pa : pb, pd = forward ? pb : pa, temp = forward ? ta : tb;
    const r = pd / pu, critical = (2 / (GAMMA + 1)) ** (GAMMA / (GAMMA - 1));
    const f = r <= critical
      ? Math.sqrt(GAMMA) * (2 / (GAMMA + 1)) ** ((GAMMA + 1) / (2 * (GAMMA - 1)))
      : Math.sqrt(2 * GAMMA / (GAMMA - 1) * (r ** (2 / GAMMA) - r ** ((GAMMA + 1) / GAMMA)));
    return (forward ? 1 : -1) * effectiveArea * pu / Math.sqrt(R * temp) * f;
  }
  function annularPoiseuille(diameterRatio) {
    const r = Math.max(0, Math.min(.999999, diameterRatio));
    if (r < 1e-6) return 64;
    if (1 - r < 1e-3) return 96;
    const r2 = r * r;
    const denominator = 1 - r2 * r2 - (1 - r2) ** 2 / Math.log(1 / r);
    return 64 * (1 - r) ** 2 * (1 - r2) / denominator;
  }
  // Series loss approximation. The actually overlapped pin interval is sliced
  // along its taper, so each axial element uses its local annular clearance.
  // This is still not a resolved nozzle/pressure-wave model: see limitations.
  function passage(p, insertion, pc, tc, pb, tb) {
    const parts = [];
    const bumperLength = p.bumperThickness / 1000, headLength = p.headLength / 1000;
    const pinLength = p.airbrakeLength / 1000, pinTip = insertion, pinBase = pinTip - pinLength;
    const pushOpen = (length, bore) => {
      if (length > 1e-12) parts.push({ a: area(bore), dh: bore / 1000, l: length, annular: false, poiseuille: 64 });
    };
    for (const [start, length, bore] of [[0, bumperLength, p.bumperBore], [bumperLength, headLength, p.headBore], [bumperLength + headLength, p.nozzleLength / 1000, p.nozzleBore]]) {
      if (length <= 0) continue;
      const end = start + length, lo = Math.max(start, pinBase), hi = Math.min(end, pinTip);
      if (!(hi > lo)) { pushOpen(length, bore); continue; }
      pushOpen(lo - start, bore);
      // A 0.25 mm maximum slice resolves the entered taper without making the
      // ODE cost depend excessively on an unusually long passage.
      const count = Math.min(64, Math.max(1, Math.ceil((hi - lo) / .00025)));
      const slice = (hi - lo) / count;
      for (let index = 0; index < count; index++) {
        const axial = lo + (index + .5) * slice;
        const d = pinDiameter(p, pinTip - axial), a = area(bore) - area(d), dh = (bore - d) / 1000;
        parts.push({ a, dh, l: slice, annular: true, poiseuille: annularPoiseuille(d / bore) });
      }
      pushOpen(end - hi, bore);
    }
    const minArea = Math.min(...parts.map(v => v.a));
    const temp = pc >= pb ? tc : tb;
    const mu = 1.716e-5 * (temp / 273.15) ** 1.5 * (273.15 + 111) / (temp + 111);
    const flux = massFlow(pc, tc, pb, tb, 1);
    if (flux === 0) return { mdot: 0, minArea };
    const k0 = 1 / (minArea * p.dischargeCoefficient) ** 2;
    const c = parts.reduce((sum, q) => sum + q.poiseuille * mu * q.l / (q.dh ** 2 * q.a), 0);
    // Stable positive root of k0*m² + c*m = flux² (all-laminar branch).
    const laminarFlow = 2 * flux ** 2 / (c + Math.sqrt(c * c + 4 * k0 * flux ** 2));
    if (parts.every(q => laminarFlow * q.dh / (q.a * mu) <= 2000)) return { mdot: Math.sign(flux) * laminarFlow, minArea };
    let lo = 0, hi = Math.abs(flux) / Math.sqrt(k0);
    for (let j = 0; j < 32; j++) {
      const mdot = (lo + hi) / 2;
      let resistance = k0;
      for (const q of parts) {
        const re = mdot * q.dh / (q.a * mu);
        const laminar = q.poiseuille / re;
        const blend = Math.max(0, Math.min(1, (re - 2000) / 2000));
        const f = laminar * (1 - blend) + Math.max(laminar, .3164 / re ** .25) * blend;
        resistance += f * q.l / q.dh / q.a ** 2;
      }
      if (mdot * mdot * resistance > flux * flux) hi = mdot; else lo = mdot;
    }
    return { mdot: Math.sign(flux) * (lo + hi) / 2, minArea };
  }
  function frictionForce(force, velocity, friction) {
    if (Math.abs(velocity) < 1e-8 && Math.abs(force) <= friction) return force;
    return friction * Math.sign(Math.abs(velocity) < 1e-8 ? force : velocity);
  }
  function simulate(raw = {}, options = {}) {
    const p = normalize(raw), errors = validate(p);
    if (errors.length) return { version: VERSION, valid: false, errors, frames: [], exitTime: null, pistonHitTime: null };
    const g0 = geometry(p, 0, 0), pa = p.ambientPressure * 1000, ta = p.airTemperature + 273.15;
    const mp = (p.pistonMass + p.springMass / 3) / 1000, mbb = p.bbMass / 1000, L = p.barrelLength / 1000;
    // x,v,y,w,mc,Uc,mb,Ub, friction dissipation, external enthalpy,
    // wall heat, ambient boundary work, external mass, BB positive/negative net
    // work, and energy dissipated by the compliant bumper.
    let s = [0, 0, 0, 0, pa * g0.vc / (R * ta), pa * g0.vc / (GAMMA - 1), pa * g0.vb / (R * ta), pa * g0.vb / (GAMMA - 1), 0, 0, 0, 0, 0, 0, 0, 0];
    let t = 0, exited = false, hit = false, contactLoss = 0, rigidContactLoss = 0, muzzleMass = 0, peakOutflow = 0, peakPressure = pa;
    let exitTime = null, exitVelocity = null, exitPressure = null, exitGasMass = null, pistonHitTime = null, impactVelocity = null;
    let engageTime = null, decelTime = null, strongBrakeTime = null, momentumAtEngage = null, brakeEnergy = null, reboundTime = null;
    let preContactReversalTime = null, contactReboundTime = null, peakPistonX = 0, maxPistonRetreat = 0, maxPreContactRetreat = 0;
    const pistonImpacts = [];
    let activeContact = null, maxBumperCompression = 0, peakBumperForce = 0;
    let maxBbEnergy = 0, maxBbTime = 0, peakPistonV = 0, peakCylinderPressure = pa, rejectedSteps = 0, steps = 0, nextStore = 0;
    const frames = [], history = [], maxTime = (options.maxTime ?? p.maxTime) / 1000;
    const maxDt = options.dt ?? 1e-5, tolerance = options.tolerance ?? 2e-5;
    let dt = maxDt;
    const initialEnergy = s[5] + s[7] + springEnergy(p, 0), initialMass = s[4] + s[6];
    function evaluate(v) {
      const g = geometry(p, v[0], exited ? L : v[2]);
      const pc = (GAMMA - 1) * v[5] / g.vc, pb = (GAMMA - 1) * v[7] / g.vb;
      const tc = v[5] / (v[4] * CV), tb = v[7] / (v[6] * CV);
      const pass = passage(p, g.insertion, pc, tc, pb, tb);
      const lc = massFlow(pc, tc, pa, ta, p.pistonLeak * 1e-6);
      const gap = Math.max(0, g.ab - area(p.bbDiameter));
      const nozzleLeak = massFlow(pb, tb, pa, ta, p.nozzleLeak * 1e-6);
      const bbFlow = massFlow(pb, tb, pa, ta, exited ? g.ab * p.muzzleDischargeCoefficient : gap * p.bbLeakCoefficient);
      const lb = nozzleLeak + bbFlow;
      const hc = lc * CP * (lc >= 0 ? tc : ta), hb = lb * CP * (lb >= 0 ? tb : ta);
      const h = pass.mdot * CP * (pass.mdot >= 0 ? tc : tb);
      const fs = springForce(p, v[0]), gasForce = pa * g.ac + pc * g.dvc + pb * g.dvb;
      const fp = frictionForce(fs + gasForce, v[1], p.pistonFriction + p.sealFriction * Math.max(0, pc - pa) * g.ac);
      const rear = p.rearDamping * v[1];
      const bumperCompression = Math.max(0, v[0] - g.stroke);
      const bumperElasticForce = p.bumperStiffness * 1000 * bumperCompression;
      // Kelvin-Voigt damping is capped on unloading so the pad can push but
      // never pull the piston. The corresponding loss term keeps the energy
      // ledger closed while the deformed pad relaxes.
      const bumperEffectiveDamping = bumperCompression <= 0 ? 0 : v[1] >= 0 ? p.bumperDamping : Math.min(p.bumperDamping, bumperElasticForce / Math.max(1e-12, -v[1]));
      const bumperDampingForce = bumperEffectiveDamping * v[1];
      const bumperForce = bumperElasticForce + bumperDampingForce;
      let ap = (fs + gasForce - fp - rear - bumperForce) / mp;
      if (v[0] <= 0 && v[1] <= 0 && ap < 0 || v[0] >= g.hardStop && v[1] >= 0 && ap > 0) ap = 0;
      const thrust = (pb - pa) * g.ab;
      const fb = exited ? 0 : frictionForce(thrust, v[3], v[2] <= 1e-10 ? p.bbBreakaway : p.barrelDrag);
      let ab = exited ? 0 : (thrust - fb) / mbb;
      if (v[2] <= 0 && v[3] <= 0 && ab < 0) ab = 0;
      const vx = v[1], vy = exited ? 0 : v[3];
      const qc = p.heatTransfer * (ta - tc), qb = p.heatTransfer * (ta - tb);
      const power = exited ? 0 : (thrust - fb) * vy;
      return {
        d: [vx, ap, vy, ab, -pass.mdot - lc, -pc * g.dvc * vx - h - hc + qc,
          pass.mdot - lb, -pb * (g.dvb * vx + g.ab * vy) + h - hb + qb,
          fp * vx + rear * vx + fb * vy, -hc - hb, qc + qb, pa * g.ac * vx - pa * g.ab * vy, -lc - lb, Math.max(0, power), Math.max(0, -power),
          bumperEffectiveDamping * vx ** 2],
        pc, pb, tc, tb, g, fs, ap, ab, bumperCompression, bumperForce,
        flow: pass.mdot, outflow: exited ? bbFlow : 0, minArea: pass.minArea
      };
    }
    const validState = v => v.every(Number.isFinite) && v[4] > 0 && v[5] > 0 && v[6] > 0 && v[7] > 0 && geometry(p, v[0], exited ? L : v[2]).vc > 0 && geometry(p, v[0], exited ? L : v[2]).vb > 0;
    const bumperEnergy = v => .5 * p.bumperStiffness * 1000 * Math.max(0, v[0] - g0.stroke) ** 2;
    const totalEnergy = v => v[5] + v[7] + springEnergy(p, v[0]) + .5 * mp * v[1] ** 2 + .5 * mbb * v[3] ** 2 + bumperEnergy(v);
    function frame(e) {
      return { t, pistonX: s[0], pistonV: s[1], pistonA: e.ap, bbX: s[2], bbV: s[3], bbA: e.ab, pressure: e.pb, cylinderPressure: e.pc, cylinderTemperature: e.tc, bbTemperature: e.tb,
        insertion: e.g.insertion, flow: e.flow, outflow: e.outflow, openArea: e.minArea,
        bumperCompression: e.bumperCompression, bumperForce: e.bumperForce, pistonHit: hit, bbExited: exited,
        energyResidual: totalEnergy(s) + s[8] + contactLoss + s[15] - initialEnergy - s[9] - s[10] - s[11] };
    }
    const compliantBumper = g0.hardStop > g0.stroke + 1e-12;
    function beginContact(contactState, incomingVelocity) {
      if (pistonHitTime === null) { pistonHitTime = t; impactVelocity = incomingVelocity; }
      hit = true;
      const event = { index: pistonImpacts.length + 1, time: t, incomingVelocity, reboundVelocity: null,
        pistonEnergy: .5 * p.pistonMass / 1000 * incomingVelocity ** 2,
        effectiveMovingEnergy: .5 * mp * incomingVelocity ** 2, dissipatedEnergy: 0,
        peakCompression: 0, peakForce: 0, duration: null, bottomedOut: false,
        cylinderPressure: contactState.pc, bbPressure: contactState.pb,
        _dampingStart: s[15], _hardLossStart: rigidContactLoss };
      pistonImpacts.push(event); activeContact = event;
      return event;
    }
    function updateContact(contactState) {
      if (!activeContact) return;
      activeContact.peakCompression = Math.max(activeContact.peakCompression, contactState.bumperCompression);
      activeContact.peakForce = Math.max(activeContact.peakForce, contactState.bumperForce);
      activeContact.dissipatedEnergy = s[15] - activeContact._dampingStart + rigidContactLoss - activeContact._hardLossStart;
      maxBumperCompression = Math.max(maxBumperCompression, contactState.bumperCompression);
      peakBumperForce = Math.max(peakBumperForce, contactState.bumperForce);
    }
    function finishContact(reboundVelocity, endTime = t) {
      if (!activeContact) return;
      activeContact.reboundVelocity = reboundVelocity;
      activeContact.duration = Math.max(0, endTime - activeContact.time);
      activeContact.settledInContact = reboundVelocity === null;
      activeContact.dissipatedEnergy = s[15] - activeContact._dampingStart + rigidContactLoss - activeContact._hardLossStart;
      delete activeContact._dampingStart; delete activeContact._hardLossStart;
      activeContact = null;
    }
    while (t < maxTime && steps < 300000) {
      let e = evaluate(s), h = Math.min(dt, maxTime - t);
      // Limit steps at geometric transitions and approximate event crossings.
      for (const [at, pos, vel] of [[g0.stroke - p.airbrakeLength / 1000, s[0], s[1]], [g0.stroke, s[0], s[1]], [g0.hardStop, s[0], s[1]], [0, s[0], s[1]], [L, s[2], exited ? 0 : s[3]], [0, s[2], exited ? 0 : s[3]]]) {
        const eta = (at - pos) / vel;
        if (eta > 1e-9 && eta < h) h = eta;
      }
      if (t >= nextStore || t === 0) { frames.push(frame(e)); nextStore = t + (options.sampleInterval ?? .00005); }
      const mid = s.map((v, i) => v + e.d[i] * h / 2);
      if (!validState(mid)) { dt = h / 2; rejectedSteps++; if (dt < 1e-10) break; continue; }
      const em = evaluate(mid), next = s.map((v, i) => v + em.d[i] * h);
      const scales = [g0.hardStop, 10, L, 100, initialMass, initialEnergy, initialMass, initialEnergy, 1, 1, 1, 1, initialMass, 1, 1, 1];
      let error = 0;
      for (let i = 0; i < 8; i++) error = Math.max(error, Math.abs((em.d[i] - e.d[i]) * h) / Math.max(scales[i] * .01, Math.abs(s[i]), Math.abs(next[i])));
      if (!validState(next) || error > tolerance && h > 1e-9) { dt = h * Math.max(.15, .8 * Math.sqrt(tolerance / Math.max(error, tolerance))); rejectedSteps++; if (dt < 1e-10) break; continue; }
      const prev = s;
      s = next; t += h; steps++;
      dt = Math.min(maxDt, h * Math.max(1.02, Math.min(2, .9 * Math.sqrt(tolerance / Math.max(error, 1e-14)))));
      // Remove infinitesimal friction overshoot at zero speed; this loss is accounted for.
      for (const [pos, vel, mass] of [[0, 1, mp], [2, 3, mbb]]) {
        if (pos === 2 && exited) continue;
        if (prev[vel] * s[vel] < 0 && Math.abs(s[vel]) < .001) { contactLoss += .5 * mass * s[vel] ** 2; s[vel] = 0; }
        if (s[pos] < 0) { s[pos] = 0; contactLoss += .5 * mass * s[vel] ** 2; s[vel] = 0; }
      }
      // Compliant pads begin a finite contact episode at the undeformed face.
      // A zero-compression pad retains the exact rigid-boundary event model.
      if (compliantBumper && !activeContact && prev[0] < g0.stroke - 1e-11 && s[0] >= g0.stroke - 1e-11 && s[1] > 0) {
        s[0] = g0.stroke;
        const contactState = evaluate(s);
        beginContact(contactState, s[1]); frames.push(frame(contactState));
      }
      if (compliantBumper && activeContact && s[0] >= g0.hardStop - 1e-11 && s[1] > 0) {
        s[0] = g0.hardStop;
        const contactState = evaluate(s), incomingVelocity = s[1];
        frames.push(frame(contactState)); activeContact.bottomedOut = true;
        const hardLoss = .5 * mp * incomingVelocity ** 2 * (1 - p.restitution ** 2);
        contactLoss += hardLoss; rigidContactLoss += hardLoss; s[1] *= -p.restitution;
        if (Math.abs(s[1]) < .005) { const settleLoss = .5 * mp * s[1] ** 2; contactLoss += settleLoss; rigidContactLoss += settleLoss; s[1] = 0; }
        updateContact(evaluate(s)); frames.push(frame(evaluate(s)));
      } else if (!compliantBumper && s[0] >= g0.stroke - 1e-11 && s[1] > 0) {
        s[0] = g0.stroke;
        const contactState = evaluate(s), incomingVelocity = s[1];
        frames.push(frame(contactState)); beginContact(contactState, incomingVelocity);
        const hardLoss = .5 * mp * incomingVelocity ** 2 * (1 - p.restitution ** 2);
        contactLoss += hardLoss; rigidContactLoss += hardLoss; s[1] *= -p.restitution;
        if (Math.abs(s[1]) < .005) { const settleLoss = .5 * mp * s[1] ** 2; contactLoss += settleLoss; rigidContactLoss += settleLoss; s[1] = 0; }
        finishContact(s[1]); frames.push(frame(evaluate(s)));
      }
      e = evaluate(s);
      updateContact(e);
      if (compliantBumper && activeContact && prev[0] > g0.stroke + 1e-11 && s[0] <= g0.stroke + 1e-11 && s[1] < 0) {
        s[0] = g0.stroke; e = evaluate(s); updateContact(e); finishContact(s[1]); frames.push(frame(e));
      }
      if (!exited && s[2] >= L - 1e-11 && s[3] > 0) {
        s[2] = L; exited = true; exitTime = t; exitVelocity = s[3]; exitPressure = e.pb; exitGasMass = s[4] + s[6];
        e = evaluate(s);
      }
      if (p.airbrakeLength > 0 && engageTime === null && e.g.insertion > 0) { engageTime = t; momentumAtEngage = p.pistonMass / 1000 * s[1]; }
      if (decelTime === null && s[1] > .05 && e.ap < 0) decelTime = t;
      if (strongBrakeTime === null && e.g.insertion > 0 && e.bumperCompression <= 1e-12 && s[1] > .05 && e.ap < -p.decelThreshold) { strongBrakeTime = t; brakeEnergy = .5 * mbb * s[3] ** 2; }
      if (reboundTime === null && s[1] < -.005) reboundTime = t;
      if (!hit && preContactReversalTime === null && s[1] < -.005) preContactReversalTime = t;
      if (hit && contactReboundTime === null && s[1] < -.005) contactReboundTime = t;
      peakPistonX = Math.max(peakPistonX, s[0]);
      maxPistonRetreat = Math.max(maxPistonRetreat, peakPistonX - s[0]);
      if (!hit) maxPreContactRetreat = Math.max(maxPreContactRetreat, peakPistonX - s[0]);
      const ke = .5 * mbb * s[3] ** 2;
      if (!exited || exitTime === t) { history.push([t, ke]); if (ke > maxBbEnergy) { maxBbEnergy = ke; maxBbTime = t; } }
      peakPressure = Math.max(peakPressure, e.pb); peakCylinderPressure = Math.max(peakCylinderPressure, e.pc); peakPistonV = Math.max(peakPistonV, s[1]);
      peakOutflow = Math.max(peakOutflow, e.outflow); muzzleMass += Math.max(0, em.outflow) * h;
      if (exited && hit && t > Math.max(exitTime, pistonHitTime) + .004 && Math.abs(e.pc - pa) < .002 * pa && Math.abs(e.pb - pa) < .002 * pa && Math.abs(s[1]) < .005) break;
    }
    const final = evaluate(s); updateContact(final); finishContact(null); frames.push(frame(final));
    const numericalFailure = t < maxTime - 1e-9 && !(exited && hit && Math.abs(final.pc - pa) < .002 * pa && Math.abs(final.pb - pa) < .002 * pa && Math.abs(s[1]) < .005);
    let usefulTime = null;
    if (exitTime !== null && maxBbEnergy > 1e-9) {
      const i = history.findIndex(v => v[1] >= p.usefulFraction * maxBbEnergy);
      if (i >= 0) {
        const b = history[i], a = history[Math.max(0, i - 1)];
        usefulTime = b[1] === a[1] ? b[0] : a[0] + (b[0] - a[0]) * (p.usefulFraction * maxBbEnergy - a[1]) / (b[1] - a[1]);
      }
    }
    const exitEnergy = exitVelocity === null ? null : .5 * mbb * exitVelocity ** 2;
    const massResidual = s[4] + s[6] - initialMass - s[12];
    return { version: VERSION, params: p, valid: !numericalFailure, errors: numericalFailure ? ["solver:convergence"] : [], frames,
      duration: t, stroke: g0.stroke, hardStop: g0.hardStop, nominalStroke: p.strokeLength / 1000, bumperThickness: p.bumperThickness / 1000,
      barrelLength: L, barrelVolume: g0.barrelVolume, cylinderVolume: g0.sweptVolume, ratio: g0.sweptVolume / g0.barrelVolume,
      ambientPressure: pa, engageTime, decelTime, strongBrakeTime, reboundTime, usefulTime, exitTime, pistonHitTime,
      preContactReversalTime, contactReboundTime, maxPistonRetreat, maxPreContactRetreat,
      pistonImpacts, maxBumperCompression, peakBumperForce, bumperDissipatedEnergy: s[15],
      exitVelocity, exitEnergy, exitPressure, exitGasMass, pistonImpactVelocity: impactVelocity,
      impactEnergy: impactVelocity === null ? null : .5 * p.pistonMass / 1000 * impactVelocity ** 2,
      momentumAtEngage, preBrakeShare: brakeEnergy === null || !exitEnergy ? null : brakeEnergy / exitEnergy,
      maxBbEnergy, maxBbTime, bbEnergyLoss: exitEnergy === null ? null : Math.max(0, maxBbEnergy - exitEnergy),
      positiveBbWork: s[13], negativeBbWork: s[14], peakPressure, peakCylinderPressure, peakPistonV, peakOutflow, muzzleMass,
      energyResidual: frame(final).energyResidual, massResidual, releasedSpringEnergy: springEnergy(p, 0) - springEnergy(p, s[0]),
      energyScale: Math.max(.01, springEnergy(p, 0)), steps, rejectedSteps,
      soundCrossingTime: L / Math.sqrt(GAMMA * R * ta), complete: exited && hit,
      dischargeComplete: exited && Math.abs(final.pc - pa) < .01 * pa && Math.abs(final.pb - pa) < .01 * pa
    };
  }
  const api = { VERSION, DEFAULTS, R, GAMMA, CV, normalize, validate, contactStroke, bumperLimit, geometry, pinVolume, pinDiameter, springState, springForce, springEnergy, massFlow, passage, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PneumaticPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
