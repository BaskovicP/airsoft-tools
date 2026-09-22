/* Pure, dependency-free conservative lumped model. See docs/MODEL.md. */
(function (root) {
  "use strict";
  const VERSION = "4.0.0";
  const R = 287.05, GAMMA = 1.4, CV = R / (GAMMA - 1), CP = CV + R;
  const STICK_SPEED = 1e-5;
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
    bumperCurve: [],
    deadVolume: .55, breechVolume: .45, frontDeadVolume: .05, dischargeCoefficient: .75, muzzleDischargeCoefficient: .85,
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
    const positive = ["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "pistonMass", "bbMass", "bbDiameter", "bumperBore", "headBore", "headLength", "nozzleBore", "nozzleLength", "deadVolume", "breechVolume", "frontDeadVolume", "ambientPressure", "maxTime"];
    for (const key of Object.keys(DEFAULTS)) if (!["springCurve", "bumperCurve"].includes(key) && !Number.isFinite(p[key])) errors.push(`${key}:finite`);
    for (const key of positive) if (!(p[key] > 0)) errors.push(`${key}:positive`);
    for (const key of ["airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "bumperThickness", "bumperStiffness", "bumperDamping", "bumperMaxCompression", "springStiffness", "springPreload", "springMass", "pistonLeak", "nozzleLeak", "pistonFriction", "sealFriction", "rearDamping", "bbBreakaway", "barrelDrag", "heatTransfer", "decelThreshold"]) if (p[key] < 0) errors.push(`${key}:nonnegative`);
    if (p.bbDiameter >= p.barrelDiameter) errors.push("bb:clearance");
    if ((p.bumperThickness > 0 && p.cylinderBore <= p.bumperBore) || p.cylinderBore <= p.headBore || p.cylinderBore <= p.airbrakeDiameter) errors.push("cylinder:clearance");
    const maximumPinReach = p.airbrakeLength + Math.min(p.bumperThickness, p.bumperMaxCompression);
    const reachedPinDiameter = start => maximumPinReach > start
      ? pinDiameter(p, Math.min(p.airbrakeLength, maximumPinReach - start) / 1000)
      : 0;
    if (p.airbrakeLength > 0 && (
      (p.bumperThickness > 0 && reachedPinDiameter(0) >= p.bumperBore) ||
      (maximumPinReach > p.bumperThickness && reachedPinDiameter(p.bumperThickness) >= p.headBore) ||
      (maximumPinReach > p.bumperThickness + p.headLength && reachedPinDiameter(p.bumperThickness + p.headLength) >= p.nozzleBore)
    )) errors.push("pin:clearance");
    if (!(p.bumperThickness < p.strokeLength)) errors.push("bumper:thickness");
    if (p.bumperThickness > 0 && p.bumperMaxCompression > 0 && !p.bumperCurve?.length && !(p.bumperStiffness > 0)) errors.push("bumper:stiffness");
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
    if (!Array.isArray(p.bumperCurve)) errors.push("bumper:curve");
    else if (p.bumperCurve.length) {
      const limit = Math.min(p.bumperThickness, p.bumperMaxCompression);
      if (p.bumperCurve.length < 2 || p.bumperCurve.some((v, i, a) => !Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite) || v[0] < 0 || v[1] < 0 || i > 0 && (v[0] <= a[i - 1][0] || v[1] < a[i - 1][1]))) errors.push("bumper:curve");
      else if (p.bumperCurve[0][0] !== 0 || p.bumperCurve[0][1] !== 0 || p.bumperCurve.at(-1)[0] < limit) errors.push("bumper:coverage");
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
      vf: p.frontDeadVolume * 1e-6 + ab * Math.max(0, p.barrelLength / 1000 - y),
      dvc: -ac + ap, dvb: -ap, dvf: y < p.barrelLength / 1000 ? -ab : 0,
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
  function bumperElasticForce(p, compression) {
    const mm = Math.max(0, compression * 1000), pairs = p.bumperCurve || [];
    if (!pairs.length) return p.bumperStiffness * mm;
    for (let i = 1; i < pairs.length; i++) if (mm <= pairs[i][0]) {
      const a = pairs[i - 1], b = pairs[i];
      return a[1] + (b[1] - a[1]) * (mm - a[0]) / (b[0] - a[0]);
    }
    return pairs.at(-1)[1];
  }
  function bumperPotential(p, compression) {
    const mm = Math.max(0, compression * 1000), pairs = p.bumperCurve || [];
    if (!pairs.length) return .5 * p.bumperStiffness * mm * mm / 1000;
    const points = [[0, 0], ...pairs.filter(pair => pair[0] > 0 && pair[0] < mm), [mm, bumperElasticForce(p, compression)]];
    let energy = 0;
    for (let i = 1; i < points.length; i++) energy += (points[i - 1][1] + points[i][1]) / 2 * (points[i][0] - points[i - 1][0]) / 1000;
    return energy;
  }
  // Isentropic reservoir-to-reservoir short restriction; signed, including choking.
  function massFlow(pa, ta, pb, tb, effectiveArea) {
    // Treat machine-scale pressure equality as equilibrium. The analytic
    // unchoked expression loses significance when its pressure ratio rounds
    // around one and can otherwise seed artificial flow in a static shot.
    if (Math.abs(pa - pb) <= 1e-12 * Math.max(pa, pb) || effectiveArea <= 0) return 0;
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
    if (Math.abs(velocity) < STICK_SPEED && Math.abs(force) <= friction) return force;
    return friction * Math.sign(Math.abs(velocity) < STICK_SPEED ? force : velocity);
  }
  function simulate(raw = {}, options = {}) {
    const p = normalize(raw), errors = validate(p);
    if (errors.length) return { version: VERSION, valid: false, errors, frames: [], exitTime: null, pistonHitTime: null };
    const g0 = geometry(p, 0, 0), pa = p.ambientPressure * 1000, ta = p.airTemperature + 273.15;
    const mp = (p.pistonMass + p.springMass / 3) / 1000, mbb = p.bbMass / 1000, L = p.barrelLength / 1000;
    // x,v,y,w,mc,Uc,mb,Ub, friction dissipation, external enthalpy,
    // wall heat, ambient boundary work, external mass, BB positive/negative net
    // work, and energy dissipated by the compliant bumper.
    let s = [0, 0, 0, 0, pa * g0.vc / (R * ta), pa * g0.vc / (GAMMA - 1), pa * g0.vb / (R * ta), pa * g0.vb / (GAMMA - 1), 0, 0, 0, 0, 0, 0, 0, 0,
      pa * g0.vf / (R * ta), pa * g0.vf / (GAMMA - 1)];
    let t = 0, exited = false, hit = false, contactLoss = 0, rigidContactLoss = 0, muzzleMass = 0, peakOutflow = 0, peakPressure = pa, peakFrontPressure = pa;
    let exitTime = null, exitVelocity = null, exitPressure = null, exitFrontPressure = null, exitGasMass = null, pistonHitTime = null, impactVelocity = null;
    let engageTime = null, decelTime = null, strongBrakeTime = null, momentumAtEngage = null, brakeEnergy = null, reboundTime = null;
    let preContactReversalTime = null, contactReboundTime = null, peakPistonX = 0, maxPistonRetreat = 0, maxPreContactRetreat = 0;
    const pistonImpacts = [];
    let activeContact = null, maxBumperCompression = 0, peakBumperForce = 0;
    let maxBbEnergy = 0, maxBbTime = 0, peakPistonV = 0, peakCylinderPressure = pa, rejectedSteps = 0, steps = 0, nextStore = 0;
    const frames = [], history = [], maxTime = (options.maxTime ?? p.maxTime) / 1000;
    const maxDt = options.dt ?? 1e-5, tolerance = options.tolerance ?? 2e-5;
    let dt = maxDt;
    const initialEnergy = s[5] + s[7] + s[17] + springEnergy(p, 0), initialMass = s[4] + s[6] + s[16];
    function evaluate(v) {
      const g = geometry(p, v[0], exited ? L : v[2]);
      const pc = (GAMMA - 1) * v[5] / g.vc, pb = (GAMMA - 1) * v[7] / g.vb, pf = (GAMMA - 1) * v[17] / g.vf;
      const tc = v[5] / (v[4] * CV), tb = v[7] / (v[6] * CV), tf = v[17] / (v[16] * CV);
      const pass = passage(p, g.insertion, pc, tc, pb, tb);
      const lc = massFlow(pc, tc, pa, ta, p.pistonLeak * 1e-6);
      const gap = Math.max(0, g.ab - area(p.bbDiameter));
      const nozzleLeak = massFlow(pb, tb, pa, ta, p.nozzleLeak * 1e-6);
      const bbBypass = exited ? 0 : massFlow(pb, tb, pf, tf, gap * p.bbLeakCoefficient);
      const behindMuzzle = exited ? massFlow(pb, tb, pa, ta, g.ab * p.muzzleDischargeCoefficient) : 0;
      const frontMuzzle = exited ? 0 : massFlow(pf, tf, pa, ta, g.ab * p.muzzleDischargeCoefficient);
      const hc = lc * CP * (lc >= 0 ? tc : ta);
      const hn = nozzleLeak * CP * (nozzleLeak >= 0 ? tb : ta);
      const hbb = bbBypass * CP * (bbBypass >= 0 ? tb : tf);
      const hbm = behindMuzzle * CP * (behindMuzzle >= 0 ? tb : ta);
      const hfm = frontMuzzle * CP * (frontMuzzle >= 0 ? tf : ta);
      const h = pass.mdot * CP * (pass.mdot >= 0 ? tc : tb);
      const fs = springForce(p, v[0]), gasForce = pa * g.ac + pc * g.dvc + pb * g.dvb;
      const rear = p.rearDamping * v[1];
      const bumperCompression = Math.max(0, v[0] - g.stroke);
      const bumperElastic = bumperElasticForce(p, bumperCompression);
      // Kelvin-Voigt damping is capped on unloading so the pad can push but
      // never pull the piston. The corresponding loss term keeps the energy
      // ledger closed while the deformed pad relaxes.
      const bumperEffectiveDamping = bumperCompression <= 0 ? 0 : v[1] >= 0 ? p.bumperDamping : Math.min(p.bumperDamping, bumperElastic / Math.max(1e-12, -v[1]));
      const bumperDampingForce = bumperEffectiveDamping * v[1];
      const bumperForce = bumperElastic + bumperDampingForce;
      const pistonDrive = fs + gasForce - rear - bumperForce;
      const fp = frictionForce(pistonDrive, v[1], p.pistonFriction + p.sealFriction * Math.max(0, pc - pa) * g.ac);
      let ap = (pistonDrive - fp) / mp;
      if (v[0] <= 0 && v[1] <= 0 && ap < 0 || v[0] >= g.hardStop && v[1] >= 0 && ap > 0) ap = 0;
      const thrust = (pb - pf) * g.ab;
      const fb = exited ? 0 : frictionForce(thrust, v[3], v[2] <= 1e-10 ? p.bbBreakaway : p.barrelDrag);
      let ab = exited ? 0 : (thrust - fb) / mbb;
      if (v[2] <= 0 && v[3] <= 0 && ab < 0) ab = 0;
      const vx = v[1], vy = exited ? 0 : v[3];
      const qc = p.heatTransfer * (ta - tc), qb = p.heatTransfer * (ta - tb), qf = p.heatTransfer * (ta - tf);
      const power = exited ? 0 : (thrust - fb) * vy;
      return {
        d: [vx, ap, vy, ab, -pass.mdot - lc, -pc * g.dvc * vx - h - hc + qc,
          pass.mdot - nozzleLeak - bbBypass - behindMuzzle, -pb * (g.dvb * vx + g.ab * vy) + h - hn - hbb - hbm + qb,
          fp * vx + rear * vx + fb * vy, -hc - hn - hbm - hfm, qc + qb + qf, pa * g.ac * vx, -lc - nozzleLeak - behindMuzzle - frontMuzzle, Math.max(0, power), Math.max(0, -power),
          bumperEffectiveDamping * vx ** 2,
          bbBypass - frontMuzzle, -pf * g.dvf * vy + hbb - hfm + qf],
        pc, pb, pf, tc, tb, tf, g, fs, ap, ab, bumperCompression, bumperForce,
        flow: pass.mdot, bbBypass, hbb, hfm, qf, frontOutflow: frontMuzzle,
        outflow: exited ? behindMuzzle + frontMuzzle : 0, minArea: pass.minArea
      };
    }
    // The small gas pocket in front of the BB becomes numerically stiff near
    // the muzzle. Advance its mass/internal energy with a local implicit solve
    // while the coupled piston/BB states retain the adaptive midpoint method.
    function advanceFront(start, target, h, workPressure) {
      if (exited) return { mass: start[16], energy: start[17], bypassMass: 0, muzzleMass: 0, bypassEnergy: 0, muzzleEnergy: 0, heatEnergy: 0 };
      const gStart = geometry(p, start[0], exited ? L : start[2]);
      const gEnd = geometry(p, target[0], exited ? L : target[2]);
      const pb = (GAMMA - 1) * target[7] / gEnd.vb, tb = target[7] / (target[6] * CV);
      const gap = Math.max(0, gEnd.ab - area(p.bbDiameter));
      const dVolume = gEnd.vf - gStart.vf;
      const m0 = start[16], u0 = start[17];
      const transport = (m, u) => {
        const pf = (GAMMA - 1) * u / gEnd.vf, tf = u / (m * CV);
        const bypass = exited ? 0 : massFlow(pb, tb, pf, tf, gap * p.bbLeakCoefficient);
        const muzzle = massFlow(pf, tf, pa, ta, gEnd.ab * p.muzzleDischargeCoefficient);
        const hb = bypass * CP * (bypass >= 0 ? tb : tf);
        const hm = muzzle * CP * (muzzle >= 0 ? tf : ta);
        const q = p.heatTransfer * (ta - tf);
        return { pf, bypass, muzzle, hb, hm, q };
      };
      const residual = (m, u) => {
        const transfer = transport(m, u);
        return [m - m0 - h * (transfer.bypass - transfer.muzzle), u - u0 + workPressure * dVolume - h * (transfer.hb - transfer.hm + transfer.q)];
      };
      let m = Math.max(1e-14, m0), u = Math.max(1e-9, u0 * (gStart.vf / gEnd.vf) ** (GAMMA - 1));
      for (let iteration = 0; iteration < 24; iteration++) {
        const f = residual(m, u), norm = Math.max(Math.abs(f[0]) / Math.max(m0, 1e-12), Math.abs(f[1]) / Math.max(u0, 1e-8));
        if (norm < 1e-9) {
          const transfer = transport(m, u);
          return { mass: m, energy: u, bypassMass: h * transfer.bypass, muzzleMass: h * transfer.muzzle,
            bypassEnergy: h * transfer.hb, muzzleEnergy: h * transfer.hm, heatEnergy: h * transfer.q };
        }
        const dm = Math.max(1e-13, Math.abs(m) * 1e-6), du = Math.max(1e-9, Math.abs(u) * 1e-6);
        const fm = residual(m + dm, u), fu = residual(m, u + du);
        const a = (fm[0] - f[0]) / dm, b = (fu[0] - f[0]) / du;
        const c = (fm[1] - f[1]) / dm, d = (fu[1] - f[1]) / du, det = a * d - b * c;
        if (!Number.isFinite(det) || Math.abs(det) < 1e-24) return null;
        const stepM = (-f[0] * d + b * f[1]) / det, stepU = (c * f[0] - a * f[1]) / det;
        let damping = 1;
        while (damping > 1 / 1024 && (m + damping * stepM <= 1e-14 || u + damping * stepU <= 1e-9)) damping /= 2;
        m += damping * stepM; u += damping * stepU;
        if (!Number.isFinite(m) || !Number.isFinite(u) || m <= 0 || u <= 0) return null;
      }
      const f = residual(m, u);
      if (Math.max(Math.abs(f[0]) / Math.max(m0, 1e-12), Math.abs(f[1]) / Math.max(u0, 1e-8)) >= 1e-9) return null;
      const transfer = transport(m, u);
      return { mass: m, energy: u, bypassMass: h * transfer.bypass, muzzleMass: h * transfer.muzzle,
        bypassEnergy: h * transfer.hb, muzzleEnergy: h * transfer.hm, heatEnergy: h * transfer.q };
    }
    const validState = v => v.every(Number.isFinite) && v[4] > 0 && v[5] > 0 && v[6] > 0 && v[7] > 0 && v[16] > 0 && v[17] > 0 && geometry(p, v[0], exited ? L : v[2]).vc > 0 && geometry(p, v[0], exited ? L : v[2]).vb > 0 && geometry(p, v[0], exited ? L : v[2]).vf > 0;
    const bumperEnergy = v => bumperPotential(p, Math.max(0, v[0] - g0.stroke));
    const totalEnergy = v => v[5] + v[7] + v[17] + springEnergy(p, v[0]) + .5 * mp * v[1] ** 2 + .5 * mbb * v[3] ** 2 + bumperEnergy(v);
    function frame(e) {
      return { t, pistonX: s[0], pistonV: s[1], pistonA: e.ap, bbX: s[2], bbV: s[3], bbA: e.ab, pressure: e.pb, frontPressure: e.pf, cylinderPressure: e.pc, cylinderTemperature: e.tc, bbTemperature: e.tb, frontTemperature: e.tf,
        insertion: e.g.insertion, flow: e.flow, frontOutflow: e.frontOutflow, outflow: e.outflow, openArea: e.minArea,
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
    function finishContact(reboundVelocity, endTime = t, settled = false) {
      if (!activeContact) return;
      activeContact.reboundVelocity = reboundVelocity;
      activeContact.duration = Math.max(0, endTime - activeContact.time);
      activeContact.settledInContact = settled;
      activeContact.complete = reboundVelocity !== null || settled;
      activeContact.dissipatedEnergy = s[15] - activeContact._dampingStart + rigidContactLoss - activeContact._hardLossStart;
      delete activeContact._dampingStart; delete activeContact._hardLossStart;
      activeContact = null;
    }
    const maxSteps = options.maxSteps ?? 300000;
    let convergenceFailure = false, terminationReason = "max-time", settledSince = null;
    while (t < maxTime && steps < maxSteps) {
      let e = evaluate(s), h = Math.min(dt, maxTime - t);
      // Limit steps at geometric transitions and approximate event crossings.
      for (const [at, pos, vel] of [[g0.stroke - p.airbrakeLength / 1000, s[0], s[1]], [g0.stroke, s[0], s[1]], [g0.hardStop, s[0], s[1]], [0, s[0], s[1]], [L, s[2], exited ? 0 : s[3]], [0, s[2], exited ? 0 : s[3]]]) {
        const eta = (at - pos) / vel;
        if (eta > 1e-9 && eta < h) h = eta;
      }
      if (t >= nextStore || t === 0) { frames.push(frame(e)); nextStore = t + (options.sampleInterval ?? .00005); }
      const mid = s.map((v, i) => v + e.d[i] * h / 2), frontMid = advanceFront(s, mid, h / 2, e.pf);
      if (frontMid) { mid[16] = frontMid.mass; mid[17] = frontMid.energy; }
      if (!frontMid || !validState(mid)) { dt = h / 2; rejectedSteps++; if (dt < 1e-10) { convergenceFailure = true; terminationReason = "minimum-step"; break; } continue; }
      const em = evaluate(mid), next = s.map((v, i) => v + em.d[i] * h);
      const frontFull = advanceFront(s, next, h, em.pf);
      if (frontFull) {
        // Replace only the stiff front-volume update, then distribute its
        // transport corrections to the actual connected reservoirs. This
        // preserves mass/energy without disguising solver correction as an
        // arbitrary external source.
        next[6] -= frontFull.bypassMass - h * em.bbBypass;
        next[7] -= frontFull.bypassEnergy - h * em.hbb;
        next[12] -= frontFull.muzzleMass - h * em.frontOutflow;
        next[9] -= frontFull.muzzleEnergy - h * em.hfm;
        next[10] += frontFull.heatEnergy - h * em.qf;
        next[16] = frontFull.mass; next[17] = frontFull.energy;
      }
      const scales = [g0.hardStop, 10, L, 100, initialMass, initialEnergy, initialMass, initialEnergy, 1, 1, 1, 1, initialMass, 1, 1, 1, initialMass, initialEnergy];
      let error = 0;
      for (let i = 0; i < 8; i++) error = Math.max(error, Math.abs((em.d[i] - e.d[i]) * h) / Math.max(scales[i] * .01, Math.abs(s[i]), Math.abs(next[i])));
      if (!frontFull || !validState(next) || error > tolerance && h > 1e-9) { dt = h * Math.max(.15, .8 * Math.sqrt(tolerance / Math.max(error, tolerance))); rejectedSteps++; if (dt < 1e-10) { convergenceFailure = true; terminationReason = "minimum-step"; break; } continue; }
      const prev = s;
      s = next; t += h; steps++;
      dt = Math.min(maxDt, h * Math.max(1.02, Math.min(2, .9 * Math.sqrt(tolerance / Math.max(error, 1e-14)))));
      // Remove infinitesimal friction overshoot at zero speed; this loss is accounted for.
      for (const [pos, vel, mass] of [[0, 1, mp], [2, 3, mbb]]) {
        if (pos === 2 && exited) continue;
        if (prev[vel] * s[vel] < 0 && Math.abs(s[vel]) < .001) { contactLoss += .5 * mass * s[vel] ** 2; s[vel] = 0; }
        if (s[pos] < 0) { s[pos] = 0; contactLoss += .5 * mass * s[vel] ** 2; s[vel] = 0; }
      }
      // Capture the static-friction branch after finite-step roundoff has left
      // an otherwise force-balanced body with a microscopic residual speed.
      const sticking = evaluate(s);
      for (const [vel, mass, acceleration] of [[1, mp, sticking.ap], [3, mbb, exited ? 0 : sticking.ab]]) {
        if (Math.abs(s[vel]) < STICK_SPEED && Math.abs(acceleration) < 1e-12) {
          contactLoss += .5 * mass * s[vel] ** 2; s[vel] = 0;
        }
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
        s[2] = L; exited = true; exitTime = t; exitVelocity = s[3]; exitPressure = e.pb; exitFrontPressure = e.pf; exitGasMass = s[4] + s[6] + s[16];
        // Once the BB clears the crown, the tiny front pocket is no longer a
        // bounded control volume. Replace it with ambient gas and book the
        // exact mass/energy exchange before continuing the post-exit solution.
        const exitGeometry = geometry(p, s[0], L);
        const ambientFrontMass = pa * exitGeometry.vf / (R * ta), ambientFrontEnergy = pa * exitGeometry.vf / (GAMMA - 1);
        s[12] += ambientFrontMass - s[16]; s[9] += ambientFrontEnergy - s[17];
        s[16] = ambientFrontMass; s[17] = ambientFrontEnergy;
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
      peakPressure = Math.max(peakPressure, e.pb); peakFrontPressure = Math.max(peakFrontPressure, e.pf); peakCylinderPressure = Math.max(peakCylinderPressure, e.pc); peakPistonV = Math.max(peakPistonV, s[1]);
      peakOutflow = Math.max(peakOutflow, e.outflow); muzzleMass += Math.max(0, em.outflow) * h;
      const quietGas = exited && hit && t > Math.max(exitTime, pistonHitTime) + .004 && Math.abs(e.pc - pa) < .002 * pa && Math.abs(e.pb - pa) < .002 * pa;
      const stablePiston = Math.abs(s[1]) < .005 && Math.abs(e.ap) < 1;
      if (quietGas && stablePiston) {
        if (settledSince === null) settledSince = t;
        if (t - settledSince >= .00025) { terminationReason = "settled"; break; }
      } else settledSince = null;
    }
    if (steps >= maxSteps && t < maxTime - 1e-12) { convergenceFailure = true; terminationReason = "step-limit"; }
    const final = evaluate(s), pistonSettled = Math.abs(s[1]) < .005 && Math.abs(final.ap) < 1;
    updateContact(final); finishContact(null, t, pistonSettled && terminationReason === "settled"); frames.push(frame(final));
    const numericalFailure = convergenceFailure;
    let usefulTime = null;
    if (exitTime !== null && maxBbEnergy > 1e-9) {
      const i = history.findIndex(v => v[1] >= p.usefulFraction * maxBbEnergy);
      if (i >= 0) {
        const b = history[i], a = history[Math.max(0, i - 1)];
        usefulTime = b[1] === a[1] ? b[0] : a[0] + (b[0] - a[0]) * (p.usefulFraction * maxBbEnergy - a[1]) / (b[1] - a[1]);
      }
    }
    const exitEnergy = exitVelocity === null ? null : .5 * mbb * exitVelocity ** 2;
    const massResidual = s[4] + s[6] + s[16] - initialMass - s[12];
    for (const value of frames) { value.waveTransit = 0; value.wavePressureEstimate = value.pressure; }
    const waveFrames = frames.filter(value => exitTime === null || value.t <= exitTime + 1e-12);
    const interpolatePressure = time => {
      if (time <= waveFrames[0].t) return waveFrames[0].pressure;
      let lo = 0, hi = waveFrames.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (waveFrames[mid].t <= time) lo = mid + 1; else hi = mid; }
      const a = waveFrames[Math.max(0, lo - 1)], b = waveFrames[Math.min(lo, waveFrames.length - 1)];
      return b.t === a.t ? b.pressure : a.pressure + (b.pressure - a.pressure) * (time - a.t) / (b.t - a.t);
    };
    let maxWaveTransit = 0, maxWavePressureDelta = 0, exitWavePressure = null;
    const breechEquivalentLength = p.breechVolume * 1e-6 / g0.ab;
    for (const value of waveFrames) {
      const soundSpeed = Math.sqrt(GAMMA * R * Math.max(1, value.bbTemperature));
      const transit = Math.min(L, breechEquivalentLength + Math.max(0, value.bbX)) / soundSpeed;
      const delayed = interpolatePressure(Math.max(0, value.t - transit));
      value.waveTransit = transit; value.wavePressureEstimate = delayed;
      maxWaveTransit = Math.max(maxWaveTransit, transit);
      maxWavePressureDelta = Math.max(maxWavePressureDelta, Math.abs(delayed - value.pressure));
    }
    const timingGap = strongBrakeTime !== null && usefulTime !== null ? Math.abs(strongBrakeTime - usefulTime)
      : engageTime !== null && exitTime !== null ? Math.abs(exitTime - engageTime)
        : usefulTime !== null && exitTime !== null ? Math.abs(exitTime - usefulTime) : null;
    if (exitTime !== null && waveFrames.length) {
      const last = waveFrames.at(-1), soundSpeed = Math.sqrt(GAMMA * R * Math.max(1, last.bbTemperature));
      const transit = Math.min(L, breechEquivalentLength + L) / soundSpeed;
      exitWavePressure = interpolatePressure(Math.max(0, exitTime - transit));
    }
    const pressureScale = Math.max(10000, peakPressure - pa);
    const waveDiagnostics = {
      // This is a causal travel-time comparison against the lumped trace. The
      // 24-cell value is only a reference resolution for a future 1D model; it
      // must not be presented as though 24 conservation cells were solved here.
      method: "causal-travel-envelope", referenceCellCount: 24, maxTransit: maxWaveTransit, referenceCellTransit: maxWaveTransit / 24,
      maxPressureDelta: maxWavePressureDelta, relativePressureSpan: maxWavePressureDelta / pressureScale,
      exitPressureEstimate: exitWavePressure, timingGap, timingRatio: timingGap > 0 ? maxWaveTransit / timingGap : null
    };
    waveDiagnostics.risk = waveDiagnostics.relativePressureSpan < .1 && (waveDiagnostics.timingRatio === null || waveDiagnostics.timingRatio < .1) ? "low"
      : waveDiagnostics.relativePressureSpan < .35 && (waveDiagnostics.timingRatio === null || waveDiagnostics.timingRatio < .5) ? "moderate" : "high";
    return { version: VERSION, params: p, valid: !numericalFailure, errors: numericalFailure ? ["solver:convergence"] : [], frames,
      duration: t, stroke: g0.stroke, hardStop: g0.hardStop, nominalStroke: p.strokeLength / 1000, bumperThickness: p.bumperThickness / 1000,
      barrelLength: L, barrelVolume: g0.barrelVolume, cylinderVolume: g0.sweptVolume, ratio: g0.sweptVolume / g0.barrelVolume,
      ambientPressure: pa, engageTime, decelTime, strongBrakeTime, reboundTime, usefulTime, exitTime, pistonHitTime,
      preContactReversalTime, contactReboundTime, maxPistonRetreat, maxPreContactRetreat,
      pistonImpacts, maxBumperCompression, peakBumperForce, bumperDissipatedEnergy: s[15],
      exitVelocity, exitEnergy, exitPressure, exitFrontPressure, exitGasMass, pistonImpactVelocity: impactVelocity,
      impactEnergy: impactVelocity === null ? null : .5 * p.pistonMass / 1000 * impactVelocity ** 2,
      momentumAtEngage, preBrakeShare: brakeEnergy === null || !exitEnergy ? null : brakeEnergy / exitEnergy,
      maxBbEnergy, maxBbTime, bbEnergyLoss: exitEnergy === null ? null : Math.max(0, maxBbEnergy - exitEnergy),
      positiveBbWork: s[13], negativeBbWork: s[14], peakPressure, peakFrontPressure, peakCylinderPressure, peakPistonV, peakOutflow, muzzleMass,
      energyResidual: frame(final).energyResidual, massResidual, releasedSpringEnergy: springEnergy(p, 0) - springEnergy(p, s[0]),
      energyScale: Math.max(.01, springEnergy(p, 0)), steps, rejectedSteps,
      soundCrossingTime: L / Math.sqrt(GAMMA * R * ta), complete: exited && hit,
      terminationReason, pistonSettled, waveDiagnostics,
      dischargeComplete: exited && Math.abs(final.pc - pa) < .01 * pa && Math.abs(final.pb - pa) < .01 * pa
    };
  }
  const api = { VERSION, DEFAULTS, R, GAMMA, CV, normalize, validate, contactStroke, bumperLimit, geometry, pinVolume, pinDiameter, springState, springForce, springEnergy, bumperElasticForce, bumperPotential, massFlow, passage, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PneumaticPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
