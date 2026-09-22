/* Pure, dependency-free conservative lumped model. See docs/MODEL.md. */
(function (root) {
  "use strict";
  const VERSION = "3.2.0";
  const R = 287.05, GAMMA = 1.4, CV = R / (GAMMA - 1), CP = CV + R;
  const area = d => Math.PI * (d / 2000) ** 2;
  const DEFAULTS = Object.freeze({
    cylinderBore: 23.157256696, strokeLength: 85, barrelLength: 430, barrelDiameter: 6.01,
    pistonMass: 71, bbMass: .46, bbDiameter: 5.95,
    // Start with an explicitly labelled no-pin reference, not an invented AMP brake fit.
    airbrakeLength: 0, airbrakeDiameter: 3.8, airbrakeTipDiameter: 2, airbrakeTaper: 0,
    headBore: 4, headLength: 12, nozzleBore: 4, nozzleLength: 15,
    // Added annular pad ahead of the rigid head. Zero preserves the bare-head
    // geometry. The central opening is approximated by headBore.
    bumperThickness: 0,
    deadVolume: .55, breechVolume: .45, dischargeCoefficient: .75,
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
    const positive = ["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "pistonMass", "bbMass", "bbDiameter", "headBore", "headLength", "nozzleBore", "nozzleLength", "deadVolume", "breechVolume", "ambientPressure", "maxTime"];
    for (const key of Object.keys(DEFAULTS)) if (key !== "springCurve" && !Number.isFinite(p[key])) errors.push(`${key}:finite`);
    for (const key of positive) if (!(p[key] > 0)) errors.push(`${key}:positive`);
    for (const key of ["airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "bumperThickness", "springStiffness", "springPreload", "springMass", "pistonLeak", "nozzleLeak", "pistonFriction", "sealFriction", "rearDamping", "bbBreakaway", "barrelDrag", "heatTransfer", "decelThreshold"]) if (p[key] < 0) errors.push(`${key}:nonnegative`);
    if (p.bbDiameter >= p.barrelDiameter) errors.push("bb:clearance");
    if (p.cylinderBore <= p.headBore || p.cylinderBore <= p.airbrakeDiameter) errors.push("cylinder:clearance");
    if (p.airbrakeLength > 0 && (p.airbrakeDiameter >= p.headBore || (p.airbrakeLength > p.bumperThickness + p.headLength && p.airbrakeDiameter >= p.nozzleBore))) errors.push("pin:clearance");
    if (!(p.bumperThickness < p.strokeLength)) errors.push("bumper:thickness");
    const travel = p.strokeLength - p.bumperThickness;
    if (p.airbrakeLength > travel || p.airbrakeLength > p.bumperThickness + p.headLength + p.nozzleLength) errors.push("pin:length");
    if (p.airbrakeTipDiameter > p.airbrakeDiameter || p.airbrakeTaper > p.airbrakeLength && p.airbrakeLength > 0) errors.push("pin:profile");
    if (!(p.dischargeCoefficient > 0 && p.dischargeCoefficient <= 1) || !(p.bbLeakCoefficient >= 0 && p.bbLeakCoefficient <= 1) || !(p.restitution >= 0 && p.restitution <= 1)) errors.push("coefficient:range");
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
      else if (p.springCurve[0][0] > spring.preload || p.springCurve.at(-1)[0] < spring.cockedCompression) errors.push("spring:coverage");
    }
    if (!errors.length) {
      const g = geometry(p, contactStroke(p), 0);
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
    const bumper = p.bumperThickness / 1000;
    const bumperSolidVolume = Math.max(0, ac - area(p.headBore)) * bumper;
    const insertion = Math.max(0, p.airbrakeLength / 1000 - (stroke - x));
    const displaced = pinVolume(p, insertion), ap = area(pinDiameter(p, insertion));
    return {
      ac, ab, stroke, insertion, pinArea: ap,
      vc: p.deadVolume * 1e-6 + ac * (p.strokeLength / 1000 - x) - bumperSolidVolume - pinVolume(p, p.airbrakeLength / 1000) + displaced,
      vb: p.breechVolume * 1e-6 + ab * y - displaced,
      dvc: -ac + ap, dvb: -ap,
      sweptVolume: ac * stroke, barrelVolume: ab * p.barrelLength / 1000,
      bumperSolidVolume,
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
    const points = [x, end];
    const spring = springState(p);
    for (const pair of p.springCurve || []) {
      const at = (spring.preload + spring.contactTravel - pair[0]) / 1000;
      if (at > x && at < end) points.push(at);
    }
    points.sort((a, b) => a - b);
    let sum = 0;
    for (let i = 1; i < points.length; i++) sum += (springForce(p, points[i - 1]) + springForce(p, points[i])) / 2 * (points[i] - points[i - 1]);
    return sum;
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
  // Series loss approximation. Long annuli include overlap, viscosity and Re-dependent wall friction.
  // Not a resolved nozzle/pressure-wave model: see model limitations.
  function passage(p, insertion, pc, tc, pb, tb) {
    const parts = [];
    const firstLength = (p.bumperThickness + p.headLength) / 1000;
    for (const [start, length, bore] of [[0, firstLength, p.headBore], [firstLength, p.nozzleLength / 1000, p.nozzleBore]]) {
      const overlap = Math.min(length, Math.max(0, insertion - start));
      if (overlap > 0) {
        const d = pinDiameter(p, insertion - start);
        parts.push({ a: area(bore) - area(d), dh: (bore - d) / 1000, l: overlap, annular: true });
      }
      if (length > overlap) parts.push({ a: area(bore), dh: bore / 1000, l: length - overlap, annular: false });
    }
    const minArea = Math.min(...parts.map(v => v.a));
    const temp = pc >= pb ? tc : tb;
    const mu = 1.716e-5 * (temp / 273.15) ** 1.5 * (273.15 + 111) / (temp + 111);
    const flux = massFlow(pc, tc, pb, tb, 1);
    if (flux === 0) return { mdot: 0, minArea };
    const k0 = 1 / (minArea * p.dischargeCoefficient) ** 2;
    const c = parts.reduce((sum, q) => sum + (q.annular ? 96 : 64) * mu * q.l / (q.dh ** 2 * q.a), 0);
    // Stable positive root of k0*m² + c*m = flux² (all-laminar branch).
    const laminarFlow = 2 * flux ** 2 / (c + Math.sqrt(c * c + 4 * k0 * flux ** 2));
    if (parts.every(q => laminarFlow * q.dh / (q.a * mu) <= 2000)) return { mdot: Math.sign(flux) * laminarFlow, minArea };
    let lo = 0, hi = Math.abs(flux) / Math.sqrt(k0);
    for (let j = 0; j < 32; j++) {
      const mdot = (lo + hi) / 2;
      let resistance = k0;
      for (const q of parts) {
        const re = mdot * q.dh / (q.a * mu);
        const laminar = (q.annular ? 96 : 64) / re;
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
    // wall heat, ambient boundary work, external mass, BB positive/negative net work
    let s = [0, 0, 0, 0, pa * g0.vc / (R * ta), pa * g0.vc / (GAMMA - 1), pa * g0.vb / (R * ta), pa * g0.vb / (GAMMA - 1), 0, 0, 0, 0, 0, 0, 0];
    let t = 0, exited = false, hit = false, contactLoss = 0, muzzleMass = 0, peakOutflow = 0, peakPressure = pa;
    let exitTime = null, exitVelocity = null, exitPressure = null, exitGasMass = null, pistonHitTime = null, impactVelocity = null;
    let engageTime = null, decelTime = null, strongBrakeTime = null, momentumAtEngage = null, brakeEnergy = null, reboundTime = null;
    let preContactReversalTime = null, contactReboundTime = null, peakPistonX = 0, maxPistonRetreat = 0, maxPreContactRetreat = 0;
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
      const bbFlow = massFlow(pb, tb, pa, ta, exited ? g.ab * .85 : gap * p.bbLeakCoefficient);
      const lb = nozzleLeak + bbFlow;
      const hc = lc * CP * (lc >= 0 ? tc : ta), hb = lb * CP * (lb >= 0 ? tb : ta);
      const h = pass.mdot * CP * (pass.mdot >= 0 ? tc : tb);
      const fs = springForce(p, v[0]), gasForce = pa * g.ac + pc * g.dvc + pb * g.dvb;
      const fp = frictionForce(fs + gasForce, v[1], p.pistonFriction + p.sealFriction * Math.max(0, pc - pa) * g.ac);
      const rear = p.rearDamping * v[1];
      let ap = (fs + gasForce - fp - rear) / mp;
      if (v[0] <= 0 && v[1] <= 0 && ap < 0 || v[0] >= g.stroke && v[1] >= 0 && ap > 0) ap = 0;
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
          fp * vx + rear * vx + fb * vy, -hc - hb, qc + qb, pa * g.ac * vx - pa * g.ab * vy, -lc - lb, Math.max(0, power), Math.max(0, -power)],
        pc, pb, tc, tb, g, fs, ap, ab, flow: pass.mdot, outflow: exited ? bbFlow : 0, minArea: pass.minArea
      };
    }
    const validState = v => v.every(Number.isFinite) && v[4] > 0 && v[5] > 0 && v[6] > 0 && v[7] > 0 && geometry(p, v[0], exited ? L : v[2]).vc > 0 && geometry(p, v[0], exited ? L : v[2]).vb > 0;
    const totalEnergy = v => v[5] + v[7] + springEnergy(p, v[0]) + .5 * mp * v[1] ** 2 + .5 * mbb * v[3] ** 2;
    function frame(e) {
      return { t, pistonX: s[0], pistonV: s[1], pistonA: e.ap, bbX: s[2], bbV: s[3], bbA: e.ab, pressure: e.pb, cylinderPressure: e.pc, cylinderTemperature: e.tc, bbTemperature: e.tb,
        insertion: e.g.insertion, flow: e.flow, outflow: e.outflow, openArea: e.minArea, pistonHit: hit, bbExited: exited,
        energyResidual: totalEnergy(s) + s[8] + contactLoss - initialEnergy - s[9] - s[10] - s[11] };
    }
    while (t < maxTime && steps < 300000) {
      let e = evaluate(s), h = Math.min(dt, maxTime - t);
      // Limit steps at geometric transitions and approximate event crossings.
      for (const [at, pos, vel] of [[g0.stroke - p.airbrakeLength / 1000, s[0], s[1]], [g0.stroke, s[0], s[1]], [0, s[0], s[1]], [L, s[2], exited ? 0 : s[3]], [0, s[2], exited ? 0 : s[3]]]) {
        const eta = (at - pos) / vel;
        if (eta > 1e-9 && eta < h) h = eta;
      }
      if (t >= nextStore || t === 0) { frames.push(frame(e)); nextStore = t + (options.sampleInterval ?? .00005); }
      const mid = s.map((v, i) => v + e.d[i] * h / 2);
      if (!validState(mid)) { dt = h / 2; rejectedSteps++; if (dt < 1e-10) break; continue; }
      const em = evaluate(mid), next = s.map((v, i) => v + em.d[i] * h);
      const scales = [g0.stroke, 10, L, 100, initialMass, initialEnergy, initialMass, initialEnergy, 1, 1, 1, 1, initialMass, 1, 1];
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
      if (s[0] >= g0.stroke - 1e-11 && s[1] > 0) {
        s[0] = g0.stroke;
        // Preserve the contact discontinuity for playback; never interpolate a
        // negative post-impact velocity backwards into the pre-impact trajectory.
        frames.push(frame(evaluate(s)));
        if (pistonHitTime === null) { pistonHitTime = t; impactVelocity = s[1]; }
        hit = true; contactLoss += .5 * mp * s[1] ** 2 * (1 - p.restitution ** 2); s[1] *= -p.restitution;
        if (Math.abs(s[1]) < .005) { contactLoss += .5 * mp * s[1] ** 2; s[1] = 0; }
        frames.push(frame(evaluate(s)));
      }
      e = evaluate(s);
      if (!exited && s[2] >= L - 1e-11 && s[3] > 0) {
        s[2] = L; exited = true; exitTime = t; exitVelocity = s[3]; exitPressure = e.pb; exitGasMass = s[4] + s[6];
        e = evaluate(s);
      }
      if (p.airbrakeLength > 0 && engageTime === null && e.g.insertion > 0) { engageTime = t; momentumAtEngage = p.pistonMass / 1000 * s[1]; }
      if (decelTime === null && s[1] > .05 && e.ap < 0) decelTime = t;
      if (strongBrakeTime === null && e.g.insertion > 0 && s[1] > .05 && e.ap < -p.decelThreshold) { strongBrakeTime = t; brakeEnergy = .5 * mbb * s[3] ** 2; }
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
    const final = evaluate(s); frames.push(frame(final));
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
      duration: t, stroke: g0.stroke, nominalStroke: p.strokeLength / 1000, bumperThickness: p.bumperThickness / 1000,
      barrelLength: L, barrelVolume: g0.barrelVolume, cylinderVolume: g0.sweptVolume, ratio: g0.sweptVolume / g0.barrelVolume,
      ambientPressure: pa, engageTime, decelTime, strongBrakeTime, reboundTime, usefulTime, exitTime, pistonHitTime,
      preContactReversalTime, contactReboundTime, maxPistonRetreat, maxPreContactRetreat,
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
  const api = { VERSION, DEFAULTS, R, GAMMA, CV, normalize, validate, contactStroke, geometry, pinVolume, pinDiameter, springState, springForce, springEnergy, massFlow, passage, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PneumaticPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


(function (root) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const SCHEMA = 3, KEY = "ssg10-pneumatic-lab-v3", OLD_KEY = "ssg10-pneumatic-lab-v2";
  const LENGTH_FIELDS = ["springLengthMode", "springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"];
  const BUMPER_FIELDS = ["bumperThickness"];
  const fps = v => v / .3048;
  const energy = (mass, speed) => .5 * mass / 1000 * (speed * .3048) ** 2;
  function reference() {
    return { id: "supplied-reference", bbMass: .46, fps: 330, sigma: 1, role: "reference", setup: null, confirmed: false, notes: "Supplied measurement; hardware configuration incomplete.", provenance: {}, solverVersion: null };
  }
  function cleanRecord(row, legacy = false) {
    if (!row || typeof row !== "object") return null;
    const mass = Number(row.bbMass ?? row.mass ?? row.setup?.bbMass), speed = Number(row.fps ?? row.velocityFps);
    if (!(mass > 0 && mass <= 2 && speed > 0 && speed <= 2000)) return null;
    const sigma = Number(row.sigma ?? 1);
    // v3.0 had no length mode: only add inactive defaults to a complete old snapshot.
    // Preserve confirmation/role/version; the old solver version remains fit-ineligible.
    const previousComplete = row.setup && (
      row.solverVersion === "3.0.0" && [...LENGTH_FIELDS, ...BUMPER_FIELDS].every(k => !Object.hasOwn(row.setup, k)) && Object.keys(P.DEFAULTS).filter(k => ![...LENGTH_FIELDS, ...BUMPER_FIELDS].includes(k)).every(k => Object.hasOwn(row.setup, k)) ||
      row.solverVersion === "3.1.1" && BUMPER_FIELDS.every(k => !Object.hasOwn(row.setup, k)) && Object.keys(P.DEFAULTS).filter(k => !BUMPER_FIELDS.includes(k)).every(k => Object.hasOwn(row.setup, k))
    );
    const setupComplete = row.setup && (previousComplete || Object.keys(P.DEFAULTS).every(k => Object.hasOwn(row.setup, k)));
    const setup = !legacy && setupComplete && P.validate(row.setup).length === 0 ? P.normalize(row.setup) : null;
    const provenance = Object.fromEntries(Object.entries(row.provenance || {}).filter(([k, v]) => ["geometry", "spring"].includes(k) && ["assumed", "measured"].includes(v)));
    const confirmed = row.confirmed === true && Boolean(setup);
    const role = confirmed && ["train", "validation"].includes(row.role) ? row.role : "reference";
    return { id: String(row.id || `measurement-${Math.random().toString(36).slice(2)}`).slice(0, 100), bbMass: mass, fps: speed, sigma: sigma > 0 && sigma <= 100 ? sigma : 1,
      role, setup, confirmed, provenance, notes: String(row.notes || "").slice(0, 2000), solverVersion: legacy ? null : String(row.solverVersion || ""),
      legacySetup: legacy || !setup || previousComplete ? row.setup || row.legacySetup || null : row.legacySetup || null };
  }
  function decode(data) {
    const raw = typeof data === "string" ? JSON.parse(data) : data;
    if (!raw || typeof raw !== "object") throw new Error("dataset:invalid");
    const rows = Array.isArray(raw) ? raw : raw.measurements;
    if (!Array.isArray(rows) || rows.length > 2000) throw new Error("dataset:records");
    const legacy = raw.schemaVersion !== SCHEMA;
    return { schemaVersion: SCHEMA, solverVersion: P.VERSION, measurements: rows.map(r => cleanRecord(r, legacy)).filter(Boolean), migrated: legacy };
  }
  function encode(rows) { return { schemaVersion: SCHEMA, solverVersion: P.VERSION, measurements: rows }; }
  function eligible(row) { return row.confirmed && row.setup && !(row.setup.springLengthMode === 1 && row.setup.springCutLength > 0) && row.solverVersion === P.VERSION && row.provenance?.geometry === "measured" && row.provenance?.spring === "measured" && ["train", "validation"].includes(row.role); }
  function groups(rows) {
    const map = new Map();
    for (const r of rows) {
      const setup = { ...r.setup, bbMass: r.bbMass };
      const identity = Object.fromEntries(Object.entries(setup).filter(([k]) => !["dischargeCoefficient", "maxTime", "decelThreshold", "usefulFraction", ...LENGTH_FIELDS].includes(k)));
      // Only the force/compression law enters the ODE. Hidden inputs and alternate
      // ways of entering that same law cannot manufacture independent conditions.
      const spring = P.springState(setup);
      identity.springPreload = spring.preload;
      if (setup.springCurve.length) delete identity.springStiffness;
      else identity.springStiffness = spring.stiffness;
      const key = JSON.stringify(identity);
      if (!map.has(key)) map.set(key, { setup, rows: [] });
      map.get(key).setup.maxTime = Math.max(map.get(key).setup.maxTime, setup.maxTime);
      map.get(key).rows.push(r);
    }
    return [...map.values()];
  }
  async function fitLoss(rows, onProgress = () => {}) {
    const training = groups(rows.filter(r => eligible(r) && r.role === "train"));
    const validation = groups(rows.filter(r => eligible(r) && r.role === "validation"));
    if (!training.length) throw new Error("fit:no-eligible-data");
    if (training.length + validation.length > 32) throw new Error("fit:too-many-configurations");
    const profile = [];
    async function loss(cd) {
      let weighted = 0, n = 0;
      for (const group of training) {
        const s = P.simulate({ ...group.setup, dischargeCoefficient: cd }, { sampleInterval: 1 });
        if (!s.valid || s.exitVelocity === null) return Infinity;
        for (const r of group.rows) { weighted += ((fps(s.exitVelocity) - r.fps) / r.sigma) ** 2; n++; }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const value = weighted / n;
      profile.push({ coefficient: cd, weightedMSE: value });
      onProgress(profile.length);
      await new Promise(resolve => setTimeout(resolve, 0));
      return value;
    }
    const grid = [];
    for (let i = 0; i <= 12; i++) { const cd = .1 + .9 * i / 12; grid.push({ cd, loss: await loss(cd) }); }
    grid.sort((a, b) => a.loss - b.loss);
    if (!Number.isFinite(grid[0].loss)) throw new Error("fit:no-valid-exit");
    let lo = Math.max(.1, grid[0].cd - .075), hi = Math.min(1, grid[0].cd + .075);
    for (let i = 0; i < 14; i++) {
      const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
      if (await loss(a) < await loss(b)) hi = b; else lo = a;
    }
    const best = profile.filter(v => Number.isFinite(v.weightedMSE)).sort((a, b) => a.weightedMSE - b.weightedMSE)[0];
    function report(gs) {
      let squared = 0, count = 0, failures = 0;
      const residuals = [];
      for (const group of gs) {
        const s = P.simulate({ ...group.setup, dischargeCoefficient: best.coefficient }, { sampleInterval: 1 });
        if (!s.valid || s.exitVelocity === null) { failures += group.rows.length; continue; }
        for (const r of group.rows) { const error = fps(s.exitVelocity) - r.fps; squared += error ** 2; count++; residuals.push({ id: r.id, predictedFps: fps(s.exitVelocity), measuredFps: r.fps, residualFps: error }); }
      }
      return { rmse: count ? Math.sqrt(squared / count) : null, count, failures, residuals };
    }
    return { coefficient: best.coefficient, training: report(training), validation: report(validation), profile, distinctTrainingSetups: training.length,
      boundReached: best.coefficient < .101 || best.coefficient > .999,
      weaklyConstrained: profile.filter(v => v.weightedMSE <= best.weightedMSE + 1).some(v => Math.abs(v.coefficient - best.coefficient) > .15) };
  }
  const api = { SCHEMA, KEY, OLD_KEY, reference, cleanRecord, decode, encode, eligible, energy, groups, fitLoss };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PneumaticCalibration = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* Bounded hardware-only search. Rankings are engineering preferences, not acoustics. */
(function (root) {
  "use strict";
  const VERSION = "1.0.0";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const GROUPS = Object.freeze({
    cylinder: ["cylinderBore", "strokeLength", "deadVolume"],
    barrel: ["barrelLength", "barrelDiameter"],
    head: ["headBore", "headLength", "nozzleBore", "nozzleLength", "bumperThickness", "breechVolume"],
    piston: ["pistonMass"],
    airbrake: ["airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper"],
    spring: ["springStiffness", "springPreload", "springMass", "springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils"],
    bb: ["bbMass", "bbDiameter"]
  });
  const LIMITS = Object.freeze({ cylinderBore: [15,35], strokeLength: [20,150], deadVolume: [.05,5], barrelLength: [100,800], barrelDiameter: [5.8,6.5], headBore: [1,10], headLength: [1,40], nozzleBore: [1,10], nozzleLength: [1,50], bumperThickness: [0,20], breechVolume: [.05,5], pistonMass: [5,300], airbrakeLength: [0,40], airbrakeDiameter: [.5,9], airbrakeTipDiameter: [0,9], airbrakeTaper: [0,10], springStiffness: [0,4000], springPreload: [0,150], springMass: [0,100], springFreeLength: [0,500], springInstalledLength: [0,500], springCutLength: [0,400], springActiveCoils: [0,200], springRemovedCoils: [0,200], bbMass: [.1,1], bbDiameter: [5.5,6.4] });
  const WEIGHTS = Object.freeze({ balanced: [.35,.2,.15,.30], quiet: [.45,.25,.2,.10], efficient: [.15,.10,.05,.70] });
  const HORIZON_MS = 250;
  const clone = v => JSON.parse(JSON.stringify(v));
  function fixedReason(p, key) {
    if (p.springCurve.length && ["springStiffness", "springMass", "springFreeLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"].includes(key)) return "measured-spring";
    if (p.springLengthMode === 1 && key === "springPreload" || p.springLengthMode !== 1 && ["springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"].includes(key)) return "spring-mode";
    return null;
  }
  function parseValues(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("optimizer:values");
    const tokens = text.trim().split(/[,;\s]+/);
    if (tokens.length > 12 || tokens.some(v => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v))) throw new Error("optimizer:values");
    const values = [...new Set(tokens.map(Number))];
    if (values.some(v => !Number.isFinite(v))) throw new Error("optimizer:values");
    return values;
  }
  function searchSpace(raw, config = {}) {
    const base = P.normalize(raw);
    if (P.validate(base).length) throw new Error("optimizer:baseline-invalid");
    for (const key of Object.keys(config.values || {})) if (!Object.hasOwn(LIMITS, key)) throw new Error("optimizer:forbidden-parameter");
    for (const key of Object.keys(config.locks || {})) if (!Object.hasOwn(GROUPS, key)) throw new Error("optimizer:unknown-group");
    const dimensions = [], locks = {};
    let total = 1;
    for (const [group, keys] of Object.entries(GROUPS)) {
      locks[group] = config.locks?.[group] !== false;
      if (locks[group]) continue;
      for (const key of keys) {
        const entries = config.values?.[key] || [base[key]];
        if (!Array.isArray(entries) || entries.length > 12 || entries.length === 0 || entries.some(v => !Number.isFinite(v) || v < LIMITS[key][0] || v > LIMITS[key][1])) throw new Error(`optimizer:values:${key}`);
        const fixed = fixedReason(base, key);
        if (fixed && entries.some(v => v !== base[key])) throw new Error(`optimizer:${fixed}`);
        const values = [...new Set([base[key], ...entries])];
        if (values.length > 1) { dimensions.push({ key, values }); total *= values.length; }
        if (!Number.isSafeInteger(total)) throw new Error("optimizer:space-too-large");
      }
    }
    return { base: clone(base), dimensions, total, locks };
  }
  function candidateAt(space, index) {
    const p = clone(space.base);
    for (const dimension of space.dimensions) { const at = index % dimension.values.length; index = Math.floor(index / dimension.values.length); p[dimension.key] = dimension.values[at]; }
    return p;
  }
  function sampleIndices(space, budget) {
    const count = Math.min(space.total, budget);
    if (space.total <= budget) return Array.from({ length: count }, (_, i) => i);
    const chosen = new Set([0]);
    // Always try individual changes first, then deterministic multi-part samples.
    let stride = 1;
    for (const d of space.dimensions) {
      for (let i = 1; i < d.values.length && chosen.size < count; i++) chosen.add(i * stride);
      stride *= d.values.length;
    }
    let seed = 0x6d2b79f5;
    while (chosen.size < count) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      chosen.add(Math.floor(seed / 4294967296 * space.total));
    }
    return [...chosen];
  }
  function assess(params, shot, bounds) {
    if (!shot?.valid) return { reason: "invalid" };
    if (!Number.isFinite(shot.exitEnergy) || !Number.isFinite(shot.exitTime) || !Number.isFinite(shot.exitVelocity)) return { reason: "noExit" };
    if (bounds && (shot.exitEnergy < bounds.min - 1e-10 || shot.exitEnergy > bounds.max + 1e-10)) return { reason: "energy" };
    if (!Number.isFinite(shot.pistonHitTime) || !Number.isFinite(shot.impactEnergy) || shot.dischargeComplete !== true) return { reason: "unfinished" };
    const springWork = P.springEnergy(params, 0);
    if (!(springWork > 0) || !Number.isFinite(shot.peakOutflow) || !Number.isFinite(shot.exitPressure) || !Number.isFinite(shot.energyResidual) || Math.abs(shot.energyResidual) > .001 * springWork) return { reason: "numerical" };
    const efficiency = shot.exitEnergy / springWork;
    if (!(efficiency > 0 && efficiency <= 1.001) || shot.impactEnergy < 0 || shot.peakOutflow < 0) return { reason: "numerical" };
    const metrics = { energy: shot.exitEnergy, velocity: shot.exitVelocity, efficiency, springWork,
      impact: shot.impactEnergy, outflow: shot.peakOutflow, exitGauge: Math.max(0, shot.exitPressure - shot.ambientPressure),
      timingMargin: shot.strongBrakeTime !== null && shot.usefulTime !== null ? shot.strongBrakeTime - shot.usefulTime : null,
      contactTime: shot.pistonHitTime, duration: shot.duration, energyResidual: shot.energyResidual };
    return { reason: null, metrics, vector: [metrics.impact, metrics.outflow, metrics.exitGauge, -metrics.efficiency] };
  }
  function dominates(a, b) {
    return a.vector.every((v, i) => v <= b.vector[i]) && a.vector.some((v, i) => v < b.vector[i]);
  }
  function rank(candidates, priority = "balanced") {
    const weights = WEIGHTS[priority];
    if (!weights) throw new Error("optimizer:priority");
    if (!candidates.length) return [];
    const frontier = candidates.filter(a => !candidates.some(b => b !== a && dominates(b, a)));
    const lows = weights.map((_, i) => Math.min(...frontier.map(c => c.vector[i])));
    const highs = weights.map((_, i) => Math.max(...frontier.map(c => c.vector[i])));
    return frontier.map(c => ({ ...c, score: weights.reduce((sum, w, i) => sum + w * (highs[i] === lows[i] ? 0 : (c.vector[i] - lows[i]) / (highs[i] - lows[i])), 0) }))
      .sort((a, b) => a.score - b.score || Object.keys(a.changes).length - Object.keys(b.changes).length || a.index - b.index);
  }
  function changesFrom(base, next) {
    return Object.fromEntries(Object.keys(LIMITS).filter(key => base[key] !== next[key]).map(key => [key, { from: base[key], to: next[key] }]));
  }
  function applyCandidate(current, result, candidate) {
    if (JSON.stringify(P.normalize(current)) !== JSON.stringify(result.base)) throw new Error("optimizer:stale");
    const allowed = new Set(Object.entries(GROUPS).filter(([group]) => result.locks[group] === false).flatMap(([, keys]) => keys));
    const next = clone(P.normalize(current));
    for (const key of Object.keys(P.DEFAULTS)) {
      if (JSON.stringify(candidate.params[key]) !== JSON.stringify(next[key])) {
        if (!allowed.has(key)) throw new Error("optimizer:locked-change");
        if (fixedReason(next, key)) throw new Error("optimizer:fixed-spring");
        next[key] = clone(candidate.params[key]);
      }
    }
    if (P.validate(next).length) throw new Error("optimizer:candidate-invalid");
    return next;
  }
  async function search(raw, config = {}, callbacks = {}, simulate = P.simulate) {
    const space = searchSpace(raw, config), budget = config.budget ?? 120, priority = config.priority || "balanced";
    if (!Number.isInteger(budget) || budget < 1 || budget > 240 || !WEIGHTS[priority]) throw new Error("optimizer:settings");
    const cancelled = () => Boolean(callbacks.isCancelled?.());
    if (cancelled()) throw new Error("optimizer:cancelled");
    const reference = simulate(space.base, { maxTime: HORIZON_MS, sampleInterval: 1 });
    if (!reference.valid || !Number.isFinite(reference.exitEnergy) || !(reference.exitEnergy > 0) || !Number.isFinite(reference.exitTime)) throw new Error("optimizer:baseline-no-exit");
    const bounds = { min: reference.exitEnergy * .95, max: reference.exitEnergy * 1.05 };
    const indices = sampleIndices(space, budget), candidates = [], rejected = { invalid: 0, noExit: 0, energy: 0, unfinished: 0, numerical: 0 };
    const baseline = assess(space.base, reference, bounds);
    for (let n = 0; n < indices.length; n++) {
      if (cancelled()) throw new Error("optimizer:cancelled");
      const index = indices[n], params = candidateAt(space, index);
      const s = index === 0 ? reference : simulate(params, { maxTime: HORIZON_MS, sampleInterval: 1 });
      const assessed = assess(params, s, bounds);
      if (assessed.reason) rejected[assessed.reason]++;
      else candidates.push({ index, params, metrics: assessed.metrics, vector: assessed.vector, changes: changesFrom(space.base, params) });
      callbacks.onProgress?.({ completed: n + 1, planned: indices.length, eligible: candidates.length });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (cancelled()) throw new Error("optimizer:cancelled");
    return { optimizerVersion: VERSION, solverVersion: P.VERSION, base: space.base, locks: space.locks, dimensions: space.dimensions, bounds, baseline: baseline.metrics || null,
      baselineReason: baseline.reason, priority, weights: WEIGHTS[priority], horizonMs: HORIZON_MS,
      total: space.total, evaluated: indices.length, exhaustive: indices.length === space.total, rejected, eligible: candidates.length,
      frontier: rank(candidates, priority), noVariables: space.dimensions.length === 0 };
  }
  const api = { VERSION, GROUPS, LIMITS, WEIGHTS, HORIZON_MS, fixedReason, parseValues, searchSpace, candidateAt, sampleIndices, assess, dominates, rank, changesFrom, applyCandidate, search };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PneumaticOptimizer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* Presentation only: never changes solver positions, velocities, events or energy. */
(function (root) {
  "use strict";
  const clamp = v => Math.max(0, Math.min(1, v));
  function timeline(shot, uniform = false) {
    const duration = Math.max(0, shot.duration);
    const focusEnd = Number.isFinite(shot.exitTime) ? Math.min(duration, shot.exitTime + .0015) : duration;
    // Reserve most screen time for firing; still show EVERY later state through
    // the true end of the run. The clock and graphs remain physical milliseconds.
    const split = !uniform && focusEnd > 0 && focusEnd < duration * .8 ? .8 : 1;
    return { duration, focusEnd: split === 1 ? duration : focusEnd, split,
      timeAt(progress) {
        const f = clamp(progress);
        if (split === 1) return f * duration;
        return f <= split ? f / split * focusEnd : focusEnd + (f - split) / (1 - split) * (duration - focusEnd);
      },
      progressAt(time) {
        const value = Math.max(0, Math.min(duration, time));
        if (!duration) return 0;
        if (split === 1) return value / duration;
        return value <= focusEnd ? value / focusEnd * split : split + (value - focusEnd) / (duration - focusEnd) * (1 - split);
      }
    };
  }
  function frameAt(shot, time) {
    const frames = shot.frames, target = Math.max(frames[0].t, Math.min(frames.at(-1).t, time));
    // Last sample at/before target: selects the post-contact side of a duplicate timestamp.
    let lo = 0, hi = frames.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (frames[mid].t <= target) lo = mid + 1; else hi = mid; }
    const a = frames[Math.max(0, lo - 1)], b = frames[Math.min(lo, frames.length - 1)];
    const mix = b.t > a.t ? (target - a.t) / (b.t - a.t) : 0, out = { ...a, t: target };
    for (const key of Object.keys(a)) if (typeof a[key] === "number" && key !== "t") out[key] = a[key] + (b[key] - a[key]) * mix;
    out.bbExited = shot.exitTime !== null && target >= shot.exitTime;
    out.pistonHit = shot.pistonHitTime !== null && target >= shot.pistonHitTime;
    return out;
  }
  function mechanism(p, pistonX) {
    // A shared axial scale for stroke AND head passages prevents the pin from
    // entering a drawn head before the solver's actual geometric entry event.
    const face0 = 110, scale = 430 / (p.strokeLength + p.headLength + p.nozzleLength);
    const contact = face0 + (p.strokeLength - p.bumperThickness) * scale;
    const rigidHead = face0 + p.strokeLength * scale, step = rigidHead + p.headLength * scale;
    const head = contact, passageEnd = step + p.nozzleLength * scale, face = face0 + pistonX * 1000 * scale;
    return { wall: 40, face0, face, contact, rigidHead, bumperWidth: rigidHead - contact, head, step, passageEnd, barrelStart: passageEnd + 20, end: 1040,
      pinLength: p.airbrakeLength * scale, pinTip: face + p.airbrakeLength * scale, scale };
  }
  const api = { timeline, frameAt, mechanism };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PneumaticPlayback = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* Small keyed DOM reconciler: retain canvas bitmaps, focus and event handlers.
   Templates are generated locally by app.js; no untrusted HTML is accepted. */
(function (root) {
  "use strict";
  const key = node => node.nodeType === 1 ? node.getAttribute("id") || node.getAttribute("data-view-key") : null;
  const compatible = (a, b) => a && a.nodeType === b.nodeType && a.nodeName === b.nodeName && key(a) === key(b);
  function patchNode(current, next) {
    if (current.nodeType !== 1) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return;
    }
    // data-live leaves belong to the frame renderer, not the shot template.
    if (current.hasAttribute("data-live")) return;
    const preserveOpen = current.nodeName === "DETAILS" && next.hasAttribute("data-preserve-open");
    for (const attribute of Array.from(current.attributes)) {
      if (preserveOpen && attribute.name === "open") continue;
      if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
    }
    for (const attribute of Array.from(next.attributes)) {
      if (preserveOpen && attribute.name === "open") continue;
      if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
    }
    patchChildren(current, next);
  }
  function patchChildren(current, next) {
    let cursor = current.firstChild;
    for (const wanted of Array.from(next.childNodes)) {
      let match = compatible(cursor, wanted) ? cursor : null;
      if (!match && key(wanted)) match = Array.from(current.childNodes).find(node => compatible(node, wanted));
      if (!match) {
        match = wanted.cloneNode(true);
        current.insertBefore(match, cursor);
      } else {
        if (match !== cursor) current.insertBefore(match, cursor);
        patchNode(match, wanted);
      }
      cursor = match.nextSibling;
    }
    while (cursor) { const following = cursor.nextSibling; current.removeChild(cursor); cursor = following; }
  }
  const api = { patchChildren };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticView = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* Layout/navigation only. Reparents existing controls and canvases once; never
   clones them or changes physical inputs. No framework/runtime dependency. */
(function (root) {
  "use strict";
  const CATEGORIES = [
    ["geometry", "Cylinder & barrel", "Cilindar i cijev"], ["masses", "Piston & BB", "Piston i BB"],
    ["airbrake", "Airbrake, bumper & head", "Zračna kočnica, gumica i glava"], ["spring", "Spring", "Opruga"],
    ["losses", "Losses & environment", "Gubici i okoliš"], ["rifle", "Rifle presets", "Predlošci replika"],
    ["solver", "Timing & solver", "Vrijeme i rješavač"]
  ];
  const VIEWS = [["shot", "Shot", "Hitac"], ["graphs", "Graphs", "Grafovi"], ["details", "Results", "Rezultati"], ["optimizer", "Optimize", "Optimizacija"], ["calibration", "Chrono", "Kronograf"]];
  function mount(doc, state, t, onView) {
    const $ = id => doc.getElementById(id);
    const aside = doc.querySelector(".controls-panel"), main = doc.querySelector(".main");
    aside.id = "settingsPanel"; main.id = "previewPanel";
    const members = {
      rifle: [$("platformPreset").closest("section")], geometry: [$("cylinderBore").closest("section"), $("shortStrokeDynamic")],
      masses: [$("pistonMass").closest("section"), aside.querySelector(".preset-row")], airbrake: [$("pinLabel").closest("details")],
      spring: [$("springDetails")], losses: [$("dischargeCoefficient").closest("details")], solver: [$("usefulFraction").closest("details")]
    };
    const picker = doc.createElement("label"); picker.className = "settings-picker";
    picker.innerHTML = `${t("Adjust", "Podesi")}<select id="settingsCategory" aria-controls="settingsPages">${CATEGORIES.map(([id, en, hr]) => `<option value="${id}">${t(en, hr)}</option>`).join("")}</select>`;
    const pages = doc.createElement("div"); pages.id = "settingsPages"; pages.className = "settings-pages";
    for (const [id, en, hr] of CATEGORIES) {
      const page = doc.createElement("section"); page.id = "settings-" + id; page.dataset.settingsPage = id; page.className = "settings-page"; page.setAttribute("aria-label", t(en, hr));
      for (const element of members[id]) { if (element.tagName === "DETAILS") { element.open = true; element.classList.add("settings-section"); } page.append(element); }
      pages.append(page);
    }
    aside.append(picker, pages);
    // Keep explanations available without making people pass them to reach inputs.
    const helpGroups = new Map();
    pages.querySelectorAll("p.field-help, p.evidence").forEach(note => {
      const notes = helpGroups.get(note.parentElement) || []; notes.push(note); helpGroups.set(note.parentElement, notes);
    });
    for (const [parent, notes] of helpGroups) {
      const help = doc.createElement("details"); help.className = "inline-help";
      const summary = doc.createElement("summary"); summary.textContent = t("Help & assumptions", "Objašnjenja i pretpostavke"); help.append(summary, ...notes); parent.append(help);
    }
    const body = doc.createElement("div"); body.id = "workspaceBody"; body.className = "workspace-body";
    const optimizer = main.querySelector(".optimizer"), calibration = $("calibrationPanel");
    optimizer.id = "workspace-optimizer"; optimizer.dataset.workspacePanel = "optimizer";
    calibration.dataset.workspacePanel = "calibration"; calibration.open = true;
    body.append($("results"), optimizer, calibration);
    const nav = doc.createElement("nav"); nav.className = "workspace-nav"; nav.setAttribute("aria-label", t("Lab views", "Prikazi laboratorija"));
    nav.innerHTML = VIEWS.map(([id, en, hr]) => `<button type="button" data-workspace-view="${id}" aria-controls="${id === "calibration" ? "calibrationPanel" : "workspace-" + id}" aria-pressed="false">${t(en, hr)}</button>`).join("");
    main.append(nav, body);
    const jump = doc.createElement("nav"); jump.className = "mobile-workspace-jumps"; jump.setAttribute("aria-label", t("Workspace shortcuts", "Prečaci radnog prostora"));
    jump.innerHTML = `<button type="button" data-jump="settings">${t("Settings", "Postavke")}</button><button type="button" data-jump="preview">${t("Preview", "Prikaz")}</button>`;
    main.closest(".app").append(jump);
    function sync() {
      for (const panel of pages.children) panel.hidden = panel.dataset.settingsPage !== state.category;
      $("settingsCategory").value = state.category;
      main.querySelectorAll("[data-workspace-panel]").forEach(panel => { panel.hidden = panel.dataset.workspacePanel !== state.view; });
      // Pending/invalid status remains visible even in Optimize or Chrono.
      if ($("resultContent")) $("resultContent").hidden = !["shot", "graphs", "details"].includes(state.view);
      nav.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.workspaceView === state.view)));
    }
    function selectCategory(value) {
      if (!CATEGORIES.some(([id]) => id === value)) return;
      state.categoryScroll[state.category] = pages.scrollTop; state.category = value;
      sync(); pages.scrollTop = state.categoryScroll[value] || 0;
    }
    function selectView(value) {
      if (!VIEWS.some(([id]) => id === value)) return;
      state.viewScroll[state.view] = body.scrollTop; state.view = value;
      sync(); body.scrollTop = state.viewScroll[value] || 0; onView(value);
    }
    $("settingsCategory").addEventListener("change", event => selectCategory(event.target.value));
    nav.addEventListener("click", event => { const button = event.target.closest("[data-workspace-view]"); if (button && !button.disabled) selectView(button.dataset.workspaceView); });
    jump.addEventListener("click", event => {
      const button = event.target.closest("[data-jump]"); if (!button || button.disabled) return;
      if (button.dataset.jump === "settings") {
        aside.classList.remove("is-collapsed"); $("toggleControls").setAttribute("aria-expanded", "true");
        aside.scrollIntoView({ block: "start" }); $("settingsCategory").focus({ preventScroll: true });
      } else {
        selectView("shot"); body.scrollTop = 0;
        main.scrollIntoView({ block: "start" }); nav.querySelector("button").focus({ preventScroll: true });
      }
    });
    sync();
    return { sync, selectView, selectCategory,
      rememberScroll() { state.categoryScroll[state.category] = pages.scrollTop; state.viewScroll[state.view] = body.scrollTop; },
      restoreScroll() { pages.scrollTop = state.categoryScroll[state.category] || 0; body.scrollTop = state.viewScroll[state.view] || 0; }
    };
  }
  function prepareResults(next, summaryHTML, caption, incomplete) {
    const doc = next.ownerDocument, stage = next.querySelector(".stage"), graphs = next.querySelector(".graphs");
    const transport = stage.querySelector(".stage-toolbar"); transport.id = "workspace-transport"; transport.remove();
    const disclosure = (id, label) => {
      const details = doc.createElement("details"); details.id = id; details.className = "stage-disclosure"; details.setAttribute("data-preserve-open", "");
      const summary = doc.createElement("summary"); summary.textContent = label; details.append(summary); return details;
    };
    const live = disclosure("liveValuesDetails", caption.live), help = disclosure("playbackDetails", caption.help);
    live.append(stage.querySelector("#liveStrip"));
    for (const element of Array.from(stage.children)) {
      if (element.matches(".playback-reference, .playback-options, .results-note, p.small-note")) help.append(element);
    }
    const glance = doc.createElement("div"); glance.className = "tuning-summary"; glance.innerHTML = summaryHTML;
    const flag = doc.createElement("p"); flag.className = "shot-caption"; flag.textContent = caption.flag;
    stage.prepend(flag);
    if (incomplete) {
      const warning = doc.createElement("p"); warning.className = "shot-incomplete"; warning.setAttribute("role", "status"); warning.textContent = incomplete; stage.insertBefore(warning, flag.nextSibling);
    }
    if (caption.timingHTML) {
      const wrapper = doc.createElement("div"); wrapper.innerHTML = caption.timingHTML;
      stage.insertBefore(wrapper.children[0], stage.querySelector("#phaseText"));
    }
    stage.append(glance);
    if (caption.explainSound) {
      const explain = doc.createElement("button"); explain.id = "explainSound"; explain.type = "button"; explain.className = "sound-explain-link"; explain.textContent = caption.explainSound; stage.append(explain);
    }
    stage.append(live, help);
    stage.id = "workspace-shot"; stage.dataset.workspacePanel = "shot";
    graphs.id = "workspace-graphs"; graphs.dataset.workspacePanel = "graphs";
    const details = doc.createElement("section"); details.id = "workspace-details"; details.dataset.workspacePanel = "details";
    for (const child of Array.from(next.childNodes)) if (child !== stage && child !== graphs) details.append(child);
    const sound = details.querySelector("#soundExplanations"); if (sound) details.prepend(sound);
    next.append(transport, stage, graphs, details);
  }
  const api = { mount, prepareResults, CATEGORIES, VIEWS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticWorkspace = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* Presentation of solver quantities, never an acoustic model or a power fit. */
(function (root) {
  "use strict";
  const finite = Number.isFinite;
  const thresholdPercent = fraction => Number((fraction * 100).toPrecision(12));
  const eventTime = (s, key) => finite(s[key]) && s[key] >= 0 && s[key] <= s.duration ? s[key] : null;
  function timing(s, p) {
    const events = ["usefulTime", "exitTime", "strongBrakeTime"].map(key => ({ key, time: eventTime(s, key) }));
    const [useful, exit, brake] = events.map(event => event.time);
    // A linear event window, not the phase-paced playback timeline. Missing
    // exit uses the full observation interval rather than inventing an exit.
    const lastEvent = Math.max(0, ...events.map(event => event.time ?? 0));
    const end = exit === null ? s.duration : Math.min(s.duration, Math.max(.001, lastEvent * 1.12));
    for (const event of events) event.percent = event.time === null || !(end > 0) ? null : event.time / end * 100;
    let verdict = "unavailable";
    if (exit === null) verdict = "no-exit";
    else if (p.airbrakeLength === 0) verdict = "no-pin";
    else if (brake === null) verdict = "no-slowing";
    else if (useful !== null) {
      if (brake === useful) verdict = "same-threshold";
      else if (brake === exit) verdict = "same-exit";
      else if (brake > exit) verdict = "after-exit";
      else verdict = brake > useful ? "after-threshold" : "early";
    }
    return { events, end, verdict, marginMs: useful !== null && brake !== null ? (brake - useful) * 1000 : null };
  }
  function verdictText(value, t) {
    const text = {
      "no-exit": ["BB exit not reached · timing unresolved", "BB nije izašao · vremenski odnos nije riješen"],
      "no-pin": ["Airbrake off · no braking comparison", "Kočnica isključena · nema usporedbe kočenja"],
      "no-slowing": ["Slowing threshold not reached in this run", "Prag usporavanja nije dosegnut u ovoj simulaciji"],
      "same-threshold": ["Energy threshold and slowing coincide", "Prag energije i usporavanje se podudaraju"],
      "same-exit": ["Substantial slowing coincides with BB exit", "Značajno usporavanje podudara se s izlaskom BB-a"],
      "after-exit": ["Substantial slowing begins after BB exit", "Značajno usporavanje počinje nakon izlaska BB-a"],
      "after-threshold": ["Energy threshold first · BB still in barrel when slowing starts", "Prag energije prvi · BB je još u cijevi pri početku usporavanja"],
      early: ["Substantial slowing begins before the energy threshold", "Značajno usporavanje počinje prije praga energije"],
      unavailable: ["Timing comparison unavailable", "Vremenska usporedba nije dostupna"]
    };
    return t(...(text[value] || text.unavailable));
  }
  function timingMarkup(s, p, t, fmt, stamp) {
    const model = timing(s, p), labels = [
      `${thresholdPercent(p.usefulFraction)}% ${t("peak BB energy", "vršne energije BB-a")}`,
      t("BB exit", "Izlazak BB-a"), t("Strong slowing after entry", "Snažno usporavanje nakon ulaska")
    ];
    const colors = ["useful", "exit", "brake"], exit = model.events[1];
    const missing = key => key === "strongBrakeTime" && p.airbrakeLength === 0 ? t("airbrake off", "kočnica isključena") : t("not reached", "nije dosegnuto");
    return `<section id="shotTiming" class="shot-timing" data-verdict="${model.verdict}" aria-label="${t("Pneumatic timing target", "Cilj pneumatskog vremenskog odnosa")}">
      <div class="shot-timing-heading"><strong>${t("Tuning target: energy before strong slowing", "Cilj: energija prije snažnog usporavanja")}</strong><span>${verdictText(model.verdict, t)}</span></div>
      <div class="event-track" aria-hidden="true">${exit.percent === null ? "" : `<div class="event-fill" style="width:${exit.percent.toFixed(5)}%"></div>`}${model.events.map((event, i) => event.percent === null ? "" : `<i class="event-tick ${colors[i]}" style="left:${event.percent.toFixed(5)}%;--lane:${i}"></i>`).join("")}</div>
      <div class="event-scale"><span>0 ms</span><span>${t("Linear event window", "Linearni prozor događaja")} · ${stamp(model.end)}</span></div>
      <div class="event-key">${model.events.map((event, i) => `<button type="button" class="${colors[i]}" data-event="${event.key}" ${event.time === null ? "disabled" : ""}><span>${labels[i]}</span><strong>${event.time === null ? missing(event.key) : stamp(event.time)}</strong></button>`).join("")}</div>
      <details id="timingReadingHelp" class="timing-reading-help" data-preserve-open><summary>${t("How to read this", "Kako čitati prikaz")}</summary><p class="timing-caveat">${t("Tinted area: before BB exit. Green is an energy threshold, not acceleration ending. Amber marks modeled slowing—not proof that the airbrake alone caused it. Click an event to seek its actual model time.", "Obojeno područje: prije izlaska BB-a. Zelena je prag energije, ne kraj ubrzavanja. Jantarna označuje modelirano usporavanje — ne dokazuje da ga uzrokuje samo zračna kočnica. Klikom na događaj prikažite stvarno vrijeme modela.")}</p></details>
    </section>`;
  }
  function compare(value, reference) {
    if (!finite(value) || value < 0) return { status: "unknown", percent: null, width: 0 };
    if (!finite(reference) || reference < 0) return { status: "no-reference", percent: null, width: 0 };
    if (reference === 0) return { status: "zero-reference", percent: null, width: 0 };
    const percent = value / reference * 100;
    if (!finite(percent)) return { status: "no-reference", percent: null, width: 0 };
    return { status: percent < 100 ? "lower" : percent > 100 ? "higher" : "same", percent, width: Math.min(percent, 200) / 2 };
  }
  function soundQuantities(s, baseline) {
    const impact = s.valid && eventTime(s, "pistonHitTime") !== null ? s.impactEnergy : null;
    const flow = s.valid && eventTime(s, "exitTime") !== null ? s.peakOutflow : null;
    const referenceImpact = baseline?.valid && eventTime(baseline, "pistonHitTime") !== null ? baseline.impactEnergy : null;
    const referenceFlow = baseline?.valid && eventTime(baseline, "exitTime") !== null ? baseline.peakOutflow : null;
    return { impact, flow, referenceImpact, referenceFlow, impactComparison: compare(impact, referenceImpact), flowComparison: compare(flow, referenceFlow) };
  }
  function comparisonMarkup(comparison, reference, unit, kind, t, fmt) {
    const { status, percent, width } = comparison;
    const names = kind === "impact" ? {
      lower: ["Less contact energy than reference", "Manje energije kontakta od reference"],
      higher: ["More contact energy than reference", "Više energije kontakta od reference"],
      same: ["Same contact energy as reference", "Jednaka energija kontakta kao referenca"]
    } : {
      lower: ["Lower observed outflow than reference", "Manji opaženi protok od reference"],
      higher: ["Higher observed outflow than reference", "Veći opaženi protok od reference"],
      same: ["Same observed outflow as reference", "Jednak opaženi protok kao referenca"]
    };
    const unknown = status === "unknown" ? t("Event missing · quantity unknown, not zero", "Događaj nedostaje · veličina nepoznata, nije nula") : status === "zero-reference" ? t("Zero reference · percentage undefined", "Nulta referenca · postotak nije definiran") : t("Reference unavailable · no relative comparison", "Referenca nije dostupna · nema relativne usporedbe");
    return `<div class="sound-comparison" data-comparison="${status}"><div class="comparison-heading"><span>${t("Against the no-airbrake reference", "Usporedba s referencom bez kočnice")}</span><strong>${percent === null ? "—" : fmt(percent, 1, "%")}</strong></div>
      <div class="comparison-track" aria-hidden="true">${percent === null ? "" : `<div class="comparison-fill" style="width:${width.toFixed(5)}%"></div><i class="comparison-reference"></i>`}</div>
      <div class="comparison-scale" aria-hidden="true"><span>0%</span><span>100%</span><span>200%</span></div>
      <span class="comparison-meaning">${names[status] ? t(...names[status]) : unknown}</span>
      <p class="comparison-note">${t("Reference", "Referenca")}: ${fmt(reference, 3, unit)}. ${percent > 200 ? t("Bar capped at 200%; the number above is uncapped. ", "Traka je ograničena na 200%; broj iznad nije. ") : ""}${t("This compares the modeled quantity—not sound reduction.", "Uspoređuje se modelirana veličina — ne smanjenje zvuka.")}</p></div>`;
  }
  function soundMarkup(s, baseline, t, fmt) {
    const q = soundQuantities(s, baseline);
    const impact = finite(q.impact) ? q.impact * 1000 : null, referenceImpact = finite(q.referenceImpact) ? q.referenceImpact * 1000 : null;
    const flow = finite(q.flow) ? q.flow * 1000 : null, referenceFlow = finite(q.referenceFlow) ? q.referenceFlow * 1000 : null;
    return `<section id="soundExplanations" class="sound-explanations" tabindex="-1" aria-label="${t("Piston impact and muzzle blast explained", "Objašnjenje udara pistona i praska na ustima")}">
      <div class="sound-heading"><div><strong>${t("Two different sound contributors", "Dva različita doprinosa zvuku")}</strong><p>${t("The piston makes a mechanical strike; escaping air makes a muzzle blast. These bars compare modeled quantities, not measured loudness. 100% = the same inputs and piston mass, with zero airbrake projection.", "Piston stvara mehanički udarac, a izlazak zraka prasak na ustima. Trake uspoređuju modelirane veličine, ne izmjerenu glasnoću. 100% = isti ulazi i masa pistona, uz nulto izbočenje zračne kočnice.")}</p></div><span class="tag unknown">${t("not dB", "nisu dB")}</span></div>
      <div class="intensity-grid">
      <article class="intensity sound-explainer impact-primary" data-comparison="${q.impactComparison.status}"><div class="intensity-head"><strong>${t("Piston impact — mechanical strike", "Udar pistona — mehanički udarac")}</strong><output>${fmt(impact, 2, "mJ")}</output></div>
      <p class="sound-quantity">${t("Modeled energy at first contact · ½mv²", "Modelirana energija pri prvom kontaktu · ½mv²")}</p>
      ${comparisonMarkup(q.impactComparison, referenceImpact, "mJ", "impact", t, fmt)}
      <p><strong>${t("What it means:", "Što to znači:")}</strong> ${t("This is the piston energy that reaches the cylinder head—the source of the mechanical thump. More energy can feed a stronger strike, but the bumper determines how quickly it is absorbed. Energy alone does not give peak force or loudness.", "To je energija kojom piston dolazi do glave cilindra — izvor mehaničkog udarca. Više energije može doprinijeti jačem udaru, ali odbojnik određuje koliko se brzo apsorbira. Sama energija ne određuje vršnu silu ni glasnoću.")}</p>
      <p>${t("Actual sound also depends on bumper stiffness, damping, contact duration, spring vibration and receiver/stock resonance. Thickness changes geometry; restitution changes rebound. Neither value determines dB or durability.", "Stvarni zvuk ovisi i o krutosti gumice, prigušenju, trajanju kontakta, vibraciji opruge te rezonanciji kućišta i kundaka. Debljina mijenja geometriju, a koeficijent odskoka povrat. Nijedna vrijednost ne određuje dB ni trajnost.")}</p>
      <p class="sound-measured">${t("First-contact speed", "Brzina pri prvom kontaktu")}: <strong>${fmt(q.impact === null ? null : s.pistonImpactVelocity, 2, "m/s")}</strong> · ${t("Added bumper", "Dodatna gumica")}: <strong>${fmt(s.params?.bumperThickness, 1, "mm")}</strong> · ${t("restitution", "odskok")}: <strong>${fmt(s.params?.restitution, 2)}</strong></p></article>
      <article class="intensity sound-explainer muzzle-primary" data-comparison="${q.flowComparison.status}"><div class="intensity-head"><strong>${t("Muzzle blast — escaping air", "Prasak na ustima — izlazak zraka")}</strong><output>${fmt(flow, 2, "g/s")}</output></div>
      <p class="sound-quantity">${t("Peak modeled muzzle outflow observed during this run", "Najveći modelirani protok na ustima opažen tijekom simulacije")}</p>
      ${comparisonMarkup(q.flowComparison, referenceFlow, "g/s", "flow", t, fmt)}
      <p><strong>${t("What it means:", "Što to znači:")}</strong> ${t("After the BB exits, compressed air escapes from the barrel and contributes a separate air blast. Pressure, gas inventory and discharge rate describe that release. A higher outflow is not the same as a measured increase in sound.", "Nakon izlaska BB-a stlačeni zrak izlazi iz cijevi i doprinosi zasebnom zračnom prasku. Tlak, masa plina i brzina istjecanja opisuju to pražnjenje. Veći protok nije isto što i izmjeren porast glasnoće.")}</p>
      <p>${t("This is separate from the piston strike—not dB and not a suppressor prediction.", "To je odvojeno od udara pistona — nisu dB niti predviđanje učinka prigušivača.")}</p>
      <p class="sound-measured">${t("Pressure at BB exit", "Tlak pri izlasku BB-a")}: <strong>${fmt(s.exitTime === null ? null : (s.exitPressure - s.ambientPressure) / 1e5, 2, "bar(g)")}</strong> · ${t("Gas at exit", "Plin pri izlasku")}: <strong>${fmt(s.exitGasMass === null ? null : s.exitGasMass * 1e6, 1, "mg")}</strong> · ${t("Discharged in run", "Ispušteno tijekom simulacije")}: <strong>${fmt(s.exitTime === null ? null : s.muzzleMass * 1e6, 1, "mg")}</strong>.</p>
      <p>${s.dischargeComplete && baseline?.dischargeComplete ? t("Both runs relaxed to within 1% of atmospheric pressure.", "Obje simulacije približile su se atmosferskom tlaku unutar 1%.") : t("Discharge remains unresolved in one or both runs. Later outflow may change the observed comparison; unfinished discharge is not silence.", "Pražnjenje nije završeno u jednoj ili obje simulacije. Kasniji protok može promijeniti opaženu usporedbu; nezavršeno pražnjenje ne znači tišinu.")}</p></article>
      </div></section>`;
  }
  const api = { thresholdPercent, timing, verdictText, timingMarkup, compare, soundQuantities, soundMarkup };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticInsights = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* Presentation only. Geometry and timing come from the solver/playback modules.
   Light, particles and trails are schematic cues, not a fluid/acoustic solution. */
(function (root) {
  "use strict";
  const B = typeof module !== "undefined" && module.exports ? require("./playback.js") : root.PneumaticPlayback;
  const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
  function draw(ctx, w, h, p, shot, f, t, fmt) {
    const { wall, head, rigidHead, bumperWidth, face, step, passageEnd, barrelStart, end, pinLength, scale } = B.mechanism(p, f.pistonX);
    const axis = 156, top = 100, bottom = 212;
    const bb = f.bbExited ? end + (f.t - shot.exitTime) * shot.exitVelocity * (end - barrelStart) / shot.barrelLength : barrelStart + f.bbX / shot.barrelLength * (end - barrelStart);
    const radial = 26 / Math.max(p.headBore, p.nozzleBore, p.airbrakeDiameter);
    const peak = Math.max(1, shot.peakCylinderPressure - shot.ambientPressure, shot.peakPressure - shot.ambientPressure);
    const cylinderGlow = clamp((f.cylinderPressure - shot.ambientPressure) / peak);
    const barrelGlow = clamp((f.pressure - shot.ambientPressure) / peak);
    const amber = "#ffbf69", cyan = "#5de4e7";
    const gradient = (x1, y1, x2, y2, stops) => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      stops.forEach(([at, color]) => g.addColorStop(at, color)); return g;
    };
    const rect = (x, y, width, height, fill, stroke) => {
      ctx.fillStyle = fill; ctx.fillRect(x, y, Math.max(0, width), height);
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x, y, Math.max(0, width), height); }
    };
    const line = (x1, y1, x2, y2, color, width = 1) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const dot = (x, y, radius, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); };
    const clip = (x, y, width, height, body) => {
      if (width <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip(); body(); ctx.restore();
    };
    const arrow = (x, y, delta, color) => {
      if (Math.abs(delta) < 1) return;
      line(x, y, x + delta, y, color, 2);
      line(x + delta, y, x + delta - Math.sign(delta) * 7, y - 4, color, 2);
      line(x + delta, y, x + delta - Math.sign(delta) * 7, y + 4, color, 2);
    };
    // Symbols compress with their gas region. Drift indicates signed flow only;
    // it is intentionally not a particle-speed or density measurement.
    const gas = (x, y, width, height, level, color, count, flow) => {
      clip(x, y, width, height, () => {
        rect(x, y, width, height, gradient(0, y, 0, y + height, [[0, `${color}12`], [.5, `${color}${Math.round(22 + level * 82).toString(16).padStart(2, "0")}`], [1, `${color}12`]]));
        for (let i = 0; i < count; i++) {
          const phase = ((i * .61803398875 + f.t * 90 * Math.sign(flow)) % 1 + 1) % 1;
          const px = x + phase * width, py = y + 5 + ((i * .41421356237) % 1) * Math.max(1, height - 10);
          ctx.globalAlpha = .2 + level * .6;
          if (Math.abs(flow) > 1e-8) line(px - Math.sign(flow) * (2 + level * 5), py, px, py, color, 1.4);
          else dot(px, py, 1.2, color);
        }
      });
    };
    ctx.save(); ctx.scale(w / 1100, h / 330);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // Subtle drafting grid and centerline give the cutaway a stable reference.
    for (let x = 20; x < 1100; x += 30) line(x, 62, x, 227, "rgba(154,187,204,.035)");
    ctx.setLineDash([3, 6]); line(30, axis, 1080, axis, "#36505b"); ctx.setLineDash([]);
    const steel = gradient(0, top, 0, bottom, [[0, "#80949f"], [.07, "#384955"], [.45, "#18272f"], [.9, "#455b67"], [1, "#9eafb4"]]);
    rect(wall - 6, top - 5, rigidHead - wall + 12, bottom - top + 10, steel, "#597480");
    rect(wall, top + 5, head - wall, bottom - top - 10, "#0b141c", "#202f39");
    line(wall, top - 2, rigidHead, top - 2, "#afccd266");
    rect(wall - 9, top + 10, 12, 92, "#516670", "#8ba0aa");
    gas(face, top + 6, head - face, 100, cylinderGlow, amber, 34, f.flow);
    // Spring's dark/back and illuminated/front halves share the actual endpoints.
    const springLeft = wall + 9, springRight = face - 32, pitch = Math.max(1, springRight - springLeft) / 13;
    line(springLeft, axis, springRight, axis, "#73848d", 4);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? gradient(0, axis - 25, 0, axis + 25, [[0, "#ffe1a8"], [.35, amber], [1, "#96612f"]]) : "#604932";
      ctx.lineWidth = pass ? 3.3 : 3.8;
      ctx.beginPath();
      for (let i = 0; i < 13; i++) {
        const x = springLeft + pitch * i;
        ctx.moveTo(x, axis + (pass ? 23 : -23));
        ctx.bezierCurveTo(x + pitch * .35, axis + (pass ? 28 : -28), x + pitch * .65, axis + (pass ? -28 : 28), x + pitch, axis + (pass ? -23 : 23));
      }
      ctx.stroke();
    }
    // Machined piston body, guide rod and seal. Front face stays at solver x.
    const pistonMetal = gradient(face - 30, top, face, bottom, [[0, "#c3d6df"], [.25, "#5d7583"], [.48, "#d6e5e9"], [.72, "#657c89"], [1, "#30444f"]]);
    rect(face - 32, top + 7, 32, 98, pistonMetal, "#bbd0d8");
    rect(face - 7, top + 6, 5, 100, "#182e31", "#78c6bd");
    for (let i = 0; i < 3; i++) line(face - 26 + i * 5, top + 16, face - 26 + i * 5, bottom - 16, "#142a394d");
    // Stepped rigid head and nozzle. An installed bumper occupies the annular
    // space ahead of the head; its opening is approximated by headBore.
    rect(rigidHead, axis - 35, passageEnd - rigidHead, 70, gradient(0, axis - 35, 0, axis + 35, [[0, "#abbbc3"], [.1, "#526675"], [.55, "#273d49"], [1, "#758d9a"]]), "#8199a5");
    for (let x = rigidHead + 5; x < passageEnd; x += 7) line(x, axis - 34, x, axis - 26, "#a9bbc544");
    if (bumperWidth > 0) {
      const hole = p.headBore * radial, touching = f.pistonHit && Math.abs(face - head) < Math.max(.8, scale * .03);
      const bulge = touching ? Math.min(5, 1 + bumperWidth * .2) : 0;
      const rubber = gradient(head, 0, rigidHead, 0, [[0, touching ? "#7ff4ce" : "#42bca0"], [.48, "#173f3b"], [1, "#0d2828"]]);
      rect(head, top + 5 - bulge, bumperWidth, axis - hole / 2 - (top + 5) + bulge, rubber, "#72d7c3");
      rect(head, axis + hole / 2, bumperWidth, bottom - 5 - (axis + hole / 2) + bulge, rubber, "#72d7c3");
      if (touching) {
        line(head + Math.min(bumperWidth * .35, 3), top + 9, head + Math.min(bumperWidth * .35, 3), axis - hole / 2 - 3, "#c7fff0", 2);
        line(head + Math.min(bumperWidth * .35, 3), axis + hole / 2 + 3, head + Math.min(bumperWidth * .35, 3), bottom - 9, "#c7fff0", 2);
      }
    }
    for (const [x, width, height] of [[head, step - head, p.headBore * radial], [step, passageEnd - step, p.nozzleBore * radial]]) {
      rect(x, axis - height / 2, width, height, "#081119", "#738b97");
      gas(x, axis - height / 2, width, height, barrelGlow, cyan, 8, f.flow);
    }
    // The pneumatic cushion is pressure, not contact or an artificial rebound.
    if (f.insertion > 0 && f.cylinderPressure > f.pressure) {
      clip(face, top + 6, head - face, 100, () => {
        const glow = ctx.createRadialGradient(head, axis, 1, head, axis, 60);
        glow.addColorStop(0, `rgba(255,190,89,${clamp((f.cylinderPressure - f.pressure) / peak) * .85})`); glow.addColorStop(1, "rgba(255,190,89,0)");
        rect(head - 60, axis - 55, 60, 110, glow);
        for (const y of [axis - 32, axis + 32]) arrow(head - 3, y, -Math.min(28, (head - face) * .65), amber);
      });
    }
    if (p.airbrakeLength > 0) {
      const thickness = p.airbrakeDiameter * radial, tip = Math.min(pinLength, p.airbrakeTaper * scale), tipHalf = p.airbrakeTipDiameter * radial / 2;
      ctx.fillStyle = gradient(0, axis - thickness / 2, 0, axis + thickness / 2, [[0, "#eff8fb"], [.4, "#a9c0cb"], [1, "#516a77"]]);
      ctx.strokeStyle = "#d3e4e9"; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(face, axis - thickness / 2); ctx.lineTo(face + pinLength - tip, axis - thickness / 2); ctx.lineTo(face + pinLength, axis - tipHalf); ctx.lineTo(face + pinLength, axis + tipHalf); ctx.lineTo(face + pinLength - tip, axis + thickness / 2); ctx.lineTo(face, axis + thickness / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Barrel cutaway and breech connector; BB never jumps or is held at the muzzle.
    ctx.setLineDash([3, 3]); ctx.strokeStyle = "#7a949e"; ctx.strokeRect(passageEnd, axis - 13, barrelStart - passageEnd, 26); ctx.setLineDash([]);
    rect(barrelStart, axis - 22, end - barrelStart, 44, gradient(0, axis - 22, 0, axis + 22, [[0, "#a08c69"], [.12, "#544d40"], [.5, "#182830"], [1, "#a69067"]]), "#998667");
    rect(barrelStart, axis - 13, end - barrelStart, 26, "#09141c", "#526a72");
    gas(barrelStart, axis - 12, Math.max(0, Math.min(bb, end) - barrelStart), 24, barrelGlow, cyan, 30, f.flow);
    line(end, axis - 23, end, axis + 23, "#c8d9dd", 3);
    const plume = f.bbExited ? clamp(f.outflow / Math.max(shot.peakOutflow, 1e-10)) : 0;
    if (plume > .001) {
      ctx.save(); ctx.globalAlpha = plume;
      for (let i = 0; i < 5; i++) {
        const radius = 9 + i * 4, x = end + 6 + i * 10;
        const glow = ctx.createRadialGradient(x, axis, 1, x, axis, radius);
        glow.addColorStop(0, "#5de4e73d"); glow.addColorStop(1, "#5de4e700");
        dot(x, axis, radius, glow);
      }
      for (let i = 0; i < 15; i++) {
        const progress = ((f.t - shot.exitTime) * 220 + i / 15) % 1;
        const x = end + 4 + progress * 54, y = axis + (i % 5 - 2) * (2 + progress * 7);
        line(x - 3, y, x, y, "#a0fbf3", 1);
      }
      ctx.restore();
    }
    if (bb >= barrelStart && bb < 1110) {
      const direction = Math.sign(f.bbV), trail = Math.max(0, Math.min(70, Math.abs(f.bbV) * .5, direction < 0 ? end - bb : bb - barrelStart));
      const tail = bb - direction * trail;
      if (trail > 0) rect(Math.min(tail, bb), axis - 3, trail, 6, gradient(tail, 0, bb, 0, [[0, "#5de4e700"], [1, "#b8ffffbb"]]));
      const sphere = ctx.createRadialGradient(bb - 2, axis - 3, 1, bb, axis, 8);
      sphere.addColorStop(0, "#ffffff"); sphere.addColorStop(.55, "#e1f4f1"); sphere.addColorStop(1, "#68878d");
      ctx.save(); ctx.shadowColor = cyan; ctx.shadowBlur = Math.min(12, Math.abs(f.bbV) * .12); dot(bb, axis, 8, sphere); ctx.restore();
    }
    arrow(face - 22, 80, Math.sign(f.pistonV) * Math.min(60, Math.abs(f.pistonV) * 10), amber);
    if (bb < 1080) arrow(bb, 117, Math.sign(f.bbV) * Math.min(50, Math.abs(f.bbV)), cyan);
    arrow(head + (passageEnd - head) * .25, 232, Math.sign(f.flow) * Math.min(55, Math.abs(f.flow) * 25000), cyan);
    // Labels remain outside the moving machinery. Readouts below stay accessible.
    ctx.font = `${Math.max(14, 12 * 1100 / w)}px system-ui`; ctx.fillStyle = "#bdced6";
    if (w >= 650) {
      ctx.fillText(t("SPRING / PISTON", "OPRUGA / PISTON"), 40, 36);
      ctx.fillText(p.bumperThickness > 0 ? t("BUMPER / HEAD / NOZZLE", "ODBOJNIK / GLAVA / MLAZNICA") : t("HEAD / NOZZLE", "GLAVA / MLAZNICA"), 425, 36);
      ctx.fillText(t("INNER BARREL", "UNUTARNJA CIJEV"), 760, 36);
      ctx.fillStyle = amber; ctx.fillText(`${t("Cylinder", "Cilindar")}  ${fmt((f.cylinderPressure - shot.ambientPressure) / 1e5, 2)} bar(g)`, 40, 266);
      ctx.fillStyle = cyan; ctx.fillText(`${t("Behind BB", "Iza BB-a")}  ${fmt((f.pressure - shot.ambientPressure) / 1e5, 2)} bar(g)`, 660, 266);
      rect(40, 279, 270, 3, "#2c363b"); rect(40, 279, cylinderGlow * 270, 3, amber);
      rect(660, 279, 350, 3, "#2c363b"); rect(660, 279, barrelGlow * 350, 3, cyan);
      ctx.fillStyle = "#99aeb9";
      ctx.fillText(`${t("Pin overlap", "Preklapanje pina")} ${fmt(f.insertion * 1000, 2)} mm  ·  ${t("Open area", "Otvor")} ${fmt(f.openArea * 1e6, 3)} mm²`, 40, 311);
    } else {
      ctx.fillText(p.bumperThickness > 0 ? t("PISTON → BUMPER → BB", "PISTON → GUMICA → BB") : t("PISTON → HEAD → BB", "PISTON → GLAVA → BB"), 40, 36);
      ctx.fillText(`${t("Pin overlap", "Preklapanje pina")}: ${fmt(f.insertion * 1000, 2)} mm`, 40, 266);
      ctx.fillText(`${t("Open area", "Otvor")}: ${fmt(f.openArea * 1e6, 3)} mm²`, 40, 308);
    }
    ctx.restore();
  }
  const api = { draw };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticAnimation = api;
})(typeof globalThis !== "undefined" ? globalThis : this);


/* UI shared by the generated standalone file and Cloudflare build. */
(() => {
  "use strict";
  const P = globalThis.PneumaticPhysics, C = globalThis.PneumaticCalibration, O = globalThis.PneumaticOptimizer, B = globalThis.PneumaticPlayback;
  const I = globalThis.PneumaticInsights;
  const $ = id => document.getElementById(id), finite = Number.isFinite;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let language = "en";
  try { language = localStorage.getItem("ssg10-pneumatic-lab-language") === "hr" ? "hr" : "en"; } catch (_) { /* local files may disallow storage */ }
  const t = (en, hr) => language === "hr" ? hr : en;
  const fmt = (v, digits = 2, unit = "") => finite(v) ? `${v.toFixed(digits)}${unit ? " " + unit : ""}` : "—";
  const fps = v => v === null ? null : v / .3048;
  const stamp = v => fmt(v === null ? null : v * 1000, 2, "ms");
  const clone = v => JSON.parse(JSON.stringify(v));
  let p = P.normalize(), selectedPlatform = "ssg10", component = "amp", springLabel = "unspecified", pinLabel = "plug";
  let provenance = { geometry: "assumed", spring: "assumed" }, shot = null, baseline = null, fraction = 0, playing = false, animation = 0;
  let measurements = [], fit = null, status = null, diagnostic = null, busy = false, debounce = null;
  let optimizer = null;
  let playbackUniform = false, playbackSpeed = 1, calculationPending = false, playheadTime = 0;
  const chartCache = new Map();
  const workspaceState = { category: "geometry", view: "shot", categoryScroll: {}, viewScroll: {} };
  let workspace = null;
  const fields = {
    cylinderBore: ["Cylinder internal diameter", "Unutarnji promjer cilindra", "mm", 15, 35, .01],
    strokeLength: ["Nominal piston stroke before added bumper", "Nominalni hod pistona prije dodatne gumice", "mm", 20, 150, .1],
    barrelLength: ["Inner-barrel length", "Duljina unutarnje cijevi", "mm", 100, 800, 1],
    barrelDiameter: ["Inner-barrel diameter", "Promjer unutarnje cijevi", "mm", 5.8, 6.5, .01],
    pistonMass: ["Assembled piston mass", "Masa sastavljenog pistona", "g", 5, 300, .1],
    bbMass: ["BB mass", "Masa BB-a", "g", .1, 1, .01],
    bbDiameter: ["Actual BB diameter", "Stvarni promjer BB-a", "mm", 5.5, 6.4, .01],
    headBore: ["Head receiving-bore diameter", "Promjer ulaznog provrta glave", "mm", 1, 10, .01],
    headLength: ["Receiving-passage length", "Duljina ulaznog provrta", "mm", 1, 40, .1],
    nozzleBore: ["Downstream nozzle diameter", "Promjer izlaznog kanala mlaznice", "mm", 1, 10, .01],
    nozzleLength: ["Downstream nozzle length", "Duljina izlaznog kanala mlaznice", "mm", 1, 50, .1],
    bumperThickness: ["Added head-bumper thickness (0 = none)", "Debljina dodatne odbojne gumice (0 = nema)", "mm", 0, 20, .1],
    airbrakeLength: ["Pin projection from piston face", "Izbočenje pina od čela pistona", "mm", 0, 40, .1],
    airbrakeDiameter: ["Airbrake maximum / shaft diameter", "Najveći promjer / promjer tijela pina", "mm", .5, 9, .01],
    airbrakeTipDiameter: ["Airbrake tip diameter", "Promjer vrha pina", "mm", 0, 9, .01],
    airbrakeTaper: ["Tapered tip length", "Duljina konusnog vrha", "mm", 0, 10, .1],
    deadVolume: ["Cylinder-side residual cavity", "Preostali volumen na strani cilindra", "cm³", .05, 5, .01],
    breechVolume: ["Head / nozzle / breech storage", "Volumen glave, mlaznice i komore", "cm³", .05, 5, .01],
    springStiffness: ["Spring stiffness before any simulated cut", "Krutost opruge prije simuliranog skraćivanja", "N/m", 0, 4000, 10],
    springPreload: ["Spring compression at rigid-head plane before added bumper", "Stlačenje opruge na ravnini krute glave prije dodatne gumice", "mm", 0, 150, .5],
    springMass: ["Installed spring mass (after any cut)", "Masa ugrađene opruge (nakon skraćivanja)", "g", 0, 100, .1],
    springFreeLength: ["Unloaded spring length before simulated cut", "Slobodna duljina opruge prije simuliranog skraćivanja", "mm", 0, 500, .5],
    springInstalledLength: ["Spring-seat distance at rigid-head plane before added bumper", "Razmak oslonaca opruge na ravnini krute glave prije dodatne gumice", "mm", 0, 500, .5],
    springCutLength: ["Free length removed by cutting", "Smanjenje slobodne duljine rezanjem", "mm", 0, 400, .5],
    springActiveCoils: ["Active coils before cutting (0 = unknown)", "Aktivni zavoji prije rezanja (0 = nepoznato)", "turns", 0, 200, .25],
    springRemovedCoils: ["Active coils removed (0 = inactive ends only)", "Uklonjeni aktivni zavoji (0 = samo neaktivni krajevi)", "turns", 0, 200, .25],
    springSolidLength: ["Remaining spring solid height (0 = unknown)", "Duljina skraćene potpuno stisnute opruge (0 = nepoznato)", "mm", 0, 500, .5],
    pistonFriction: ["Piston sliding / static friction", "Klizno / statičko trenje pistona", "N", 0, 20, .1],
    sealFriction: ["Pressure-dependent seal friction factor", "Faktor trenja brtve ovisan o tlaku", "", 0, .2, .001],
    rearDamping: ["Rear vent / mechanical drag coefficient", "Koeficijent stražnjeg / mehaničkog otpora", "N·s/m", 0, 5, .01],
    restitution: ["Bumper restitution (not sound reduction)", "Koeficijent odskoka odbojnika (nije utišavanje)", "", 0, .8, .01],
    dischargeCoefficient: ["Head discharge coefficient Cd", "Koeficijent protoka glave Cd", "", .1, 1, .01],
    pistonLeak: ["Piston-seal effective leak area", "Efektivna površina curenja brtve pistona", "mm²", 0, .5, .001],
    nozzleLeak: ["Nozzle-to-hop effective leak area", "Efektivna površina curenja spoja mlaznice", "mm²", 0, .5, .001],
    bbLeakCoefficient: ["BB clearance leakage coefficient", "Koeficijent curenja oko BB-a", "", 0, 1, .01],
    bbBreakaway: ["Hop / bucking breakaway force", "Sila pokretanja BB-a kroz hop gumicu", "N", 0, 8, .05],
    barrelDrag: ["Moving BB resistance", "Otpor pri gibanju BB-a", "N", 0, 2, .01],
    heatTransfer: ["Heat conductance per gas chamber", "Toplinska vodljivost po plinskoj komori", "W/K", 0, .5, .001],
    ambientPressure: ["Atmospheric absolute pressure", "Apsolutni atmosferski tlak", "kPa", 70, 110, .1],
    airTemperature: ["Air / wall temperature", "Temperatura zraka / stijenke", "°C", -20, 60, 1],
    usefulFraction: ["Useful-energy threshold (convention)", "Prag korisne energije (dogovoreni kriterij)", "", .8, .999, .005],
    decelThreshold: ["Substantial piston-deceleration threshold", "Prag značajnog usporavanja pistona", "m/s²", 100, 10000, 100],
    maxTime: ["Maximum modeled time", "Najdulje vrijeme simulacije", "ms", 10, 250, 5]
  };
  const platforms = {
    ssg10: { name: "SSG10 / AMP", volume: 35.8, stroke: 85, barrel: 430, bore: 6.01, mass: 71 },
    "ssg10-short": { name: "SSG10 −20 mm", volume: 35.8 * 65 / 85, stroke: 65, barrel: 430, bore: 6.01, mass: 71 },
    tac41p: { name: "TAC-41P", volume: 41, stroke: 95, barrel: 510, bore: 6.05, mass: 65 },
    tac41ls: { name: "TAC-41 Lite Sport", volume: 41, stroke: 95, barrel: 330, bore: 6.05, mass: 65 },
    srs16: { name: "SRS A2 16″", volume: 41, stroke: 95, barrel: 420, bore: 6.05, mass: 65 },
    srs22: { name: "SRS A2 22″", volume: 41, stroke: 95, barrel: 578, bore: 6.05, mass: 65 },
    vsr: { name: "VSR-10 Pro / clone", volume: 31.8, stroke: 80, barrel: 430, bore: 6.08, mass: 45 },
    gspec: { name: "VSR-10 G-Spec", volume: 31.8, stroke: 80, barrel: 303, bore: 6.08, mass: 45 },
    l96: { name: "APS2 / L96", volume: 30, stroke: 80, barrel: 490, bore: 6.03, mass: 45 }
  };
  const events = () => [
    ["engageTime", t("Pin enters head", "Ulazak pina u glavu"), ""],
    ["decelTime", t("Piston starts slowing", "Piston počinje usporavati"), ""],
    ["usefulTime", `${I.thresholdPercent(p.usefulFraction)}% ${t("of peak BB energy", "vršne energije BB-a")}`, "useful"],
    ["strongBrakeTime", t("Substantial slowing after entry", "Značajno usporavanje nakon ulaska"), "brake"],
    ["exitTime", t("BB exit", "Izlazak BB-a"), ""],
    ["preContactReversalTime", t("Reversal before contact (model)", "Povrat prije kontakta (model)"), ""],
    ["contactReboundTime", t("Reverse motion after contact", "Povratno gibanje nakon kontakta"), ""],
    ["pistonHitTime", t("First piston contact", "Prvi kontakt pistona"), ""]
  ];
  function setStatus(en, hr) { status = [en, hr]; if ($("fitStatus")) $("fitStatus").textContent = t(en, hr); }
  function save() {
    try { localStorage.setItem(C.KEY, JSON.stringify(C.encode(measurements))); }
    catch (_) { setStatus("Browser storage unavailable. Export your measurements to keep them.", "Pohrana u pregledniku nije dostupna. Izvezite mjerenja kako biste ih sačuvali."); }
  }
  function invalidateFit() { fit = null; if ($("fitReport")) $("fitReport").innerHTML = ""; }
  try {
    const current = localStorage.getItem(C.KEY), old = localStorage.getItem(C.OLD_KEY);
    if (current || old) {
      measurements = C.decode(current || old).measurements;
      if (!current) status = ["Old measurements preserved as unverified references; previous fits were discarded.", "Stara mjerenja sačuvana su kao nepotvrđene reference; prijašnje prilagodbe nisu prenesene."];
      else if (measurements.some(row => row.legacySetup || row.setup && row.solverVersion !== P.VERSION)) status = ["Previous solver snapshots and shot metadata are preserved. Older-version shots are excluded from the current fit; record confirmed measurements with the current spring inputs.", "Konfiguracije i podaci hitaca prijašnjeg rješavača sačuvani su. Hici starije verzije isključeni su iz trenutačne prilagodbe; zabilježite potvrđena mjerenja s trenutačnim ulazima opruge."];
    } else measurements = [C.reference()];
  } catch (_) { measurements = [C.reference()]; status = ["Stored data could not be read. It has not been overwritten.", "Pohranjeni podaci nisu čitljivi. Nisu prebrisani."]; }
  function languageSwitch() { return `<div class="language-switch" role="group" aria-label="${t("Language", "Jezik")}"><button type="button" data-lang="en" aria-pressed="${language === "en"}">English</button><button type="button" data-lang="hr" aria-pressed="${language === "hr"}">Hrvatski</button></div>`; }
  function field(key) {
    const [en, hr, unit, min, max, step] = fields[key];
    return `<div class="control"><label for="${key}"><span>${t(en, hr)}</span><span class="mono">${unit === "turns" ? t("turns", "zavoja") : unit}</span></label><div class="field-entry"><input data-range="${key}" aria-label="${t(en, hr)}" type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}"><input id="${key}" data-number="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${p[key]}" required></div></div>`;
  }
  function springMarkup() {
    return `<details id="springDetails" ${p.springLengthMode ? "open" : ""}><summary>${t("Spring length, cutting & mechanical losses", "Duljina i skraćivanje opruge te mehanički gubici")}</summary>
      <label class="provenance"><input id="springLengthMode" type="checkbox" ${p.springLengthMode ? "checked" : ""}>${t("Calculate from spring lengths / simulate cutting", "Računaj iz duljina opruge / simuliraj skraćivanje")}</label>
      <p class="field-help">${t("Off: enter compression directly. On: length measurements replace that input. Zero lengths mean unknown; no SSG10 dimensions are assumed. The entered front seat/preload uses the rigid-head plane before the added bumper. If you measure at an installed pad, add its thickness back to the seat distance; the model then moves contact rearward once.", "Isključeno: izravno unesite stlačenje. Uključeno: zamjenjuju ga izmjerene duljine. Nulte duljine znače nepoznato; dimenzije SSG10 nisu pretpostavljene. Uneseni prednji razmak/prednaprezanje odnosi se na ravninu krute glave prije dodatne gumice. Ako mjerite na ugrađenoj gumici, njezinu debljinu dodajte natrag razmaku oslonaca; model zatim samo jednom pomiče kontakt unatrag.")}</p>
      <div id="springLengthFields" ${p.springLengthMode ? "" : "hidden"}>${["springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"].map(field).join("")}
      <p class="field-help">${t("Cut length is the reduction in unloaded axial length, not wire length. Count removed active coils separately; length alone cannot tell us the new stiffness. More active coils removed → higher estimated stiffness, but shorter free length → less installed compression. Actual output can go down despite higher stiffness.", "Duljina reza je smanjenje slobodne uzdužne duljine, ne duljina žice. Uklonjene aktivne zavoje unesite zasebno; sama duljina ne određuje novu krutost. Više uklonjenih aktivnih zavoja → veća procijenjena krutost, ali kraća opruga → manje ugrađeno stlačenje. Izlazna energija može pasti unatoč većoj krutosti.")}</p>
      <p class="field-help">${t("Cutting is an estimate for uniform linear coils with unchanged wire, diameter and effective end support. Progressive coils and changed ends need new force measurements. Solid height must describe the remaining spring; a positive clearance is not a certified safety margin. Slack/unseating is outside this model.", "Skraćivanje je procjena za jednolike linearne zavoje uz istu žicu, promjer i efektivni oslonac krajeva. Progresivni zavoji i promijenjeni krajevi traže novo mjerenje sile. Duljina potpuno stisnute opruge mora opisivati preostalu oprugu; pozitivan zazor nije potvrđena sigurnosna margina. Labava opruga i gubitak kontakta izvan su ovog modela.")}</p></div>
      ${["springStiffness", "springPreload", "springMass"].map(field).join("")}<div id="springSummary" class="small-note" role="status"></div>
      <p class="field-help">${t("Weigh the remaining spring: mass is not inferred from length. The optional moving-mass approximation is one third of the entered spring mass.", "Izvažite preostalu oprugu: masa se ne izvodi iz duljine. Neobavezna aproksimacija pomične mase iznosi trećinu unesene mase opruge.")}</p>
      <label for="springCurve">${t("Optional measured force curve: compression mm, force N (one pair per line)", "Neobavezna izmjerena krivulja: stlačenje mm, sila N (jedan par po retku)")}</label><textarea id="springCurve" rows="4" placeholder="50, 27.5&#10;100, 55&#10;140, 77">${p.springCurve.map(v => v.join(", ")).join("\n")}</textarea>
      <p class="field-help">${t("A curve replaces linear stiffness and must cover the installed compression range. It cannot be reused for a simulated cut. For an already cut, measured spring, enter its current free length and force curve with cut length and removed coils set to zero. Estimated cuts are excluded from calibration fitting.", "Krivulja zamjenjuje linearnu krutost i mora pokrivati raspon ugrađenog stlačenja. Ne može se ponovno koristiti za simulirani rez. Za već skraćenu i izmjerenu oprugu unesite trenutačnu slobodnu duljinu i krivulju sile, a rez i uklonjene zavoje postavite na nulu. Procijenjeni rezovi ne koriste se za kalibracijsku prilagodbu.")}</p>
      ${provenanceControl("spring", "I have measured the spring force and installed compression", "Izmjerio/la sam silu opruge i ugrađeno stlačenje")}
      ${["pistonFriction", "sealFriction", "rearDamping"].map(field).join("")}</details>`;
  }
  function syncSpringControls() {
    if (!$("springLengthFields")) return;
    $("springLengthFields").hidden = p.springLengthMode !== 1;
    for (const key of ["springPreload", "springStiffness"]) {
      const disabled = key === "springPreload" ? p.springLengthMode === 1 : Boolean(p.springCurve.length);
      $(key).disabled = disabled; document.querySelector(`[data-range="${key}"]`).disabled = disabled;
      if (key === "springPreload") {
        const value = disabled ? P.springState(p).preload : p.springPreload;
        $(key).value = finite(value) ? value : ""; document.querySelector(`[data-range="${key}"]`).value = finite(value) ? value : 0;
      }
    }
    for (const key of O.GROUPS.spring) {
      const input = $("opt-" + key);
      if (input) {
        const fixed = O.fixedReason(p, key);
        input.disabled = optimizer.locks.spring || Boolean(fixed);
        input.value = fixed ? String(p[key]) : optimizer.values[key];
        const note = input.parentElement.querySelector("small");
        if (note) note.hidden = !fixed;
      }
    }
  }
  function group(en, hr, keys, help = "") { return `<section class="control-group"><p class="group-label">${t(en, hr)}</p>${keys.map(field).join("")}${help ? `<p class="field-help">${help}</p>` : ""}</section>`; }
  function provenanceControl(key, en, hr) { return `<label class="provenance"><input type="checkbox" data-provenance="${key}" ${provenance[key] === "measured" ? "checked" : ""}>${t(en, hr)}</label>`; }
  function render() {
    workspace?.rememberScroll();
    stop();
    const lab = location.hash === "#pneumatic-timing";
    document.documentElement.lang = language;
    document.title = lab ? t("Spring Sniper Pneumatic Timing Lab", "Laboratorij pneumatike opružnih snajpera") : "Airsoft Tools";
    if (!lab) {
      workspace = null;
      $("root").innerHTML = `<main class="tool-hub"><div class="hub-shell"><nav class="hub-nav"><div class="hub-brand"><span class="hub-brand-mark">AT</span><span>Airsoft Tools</span></div>${languageSwitch()}</nav><div class="hub-content"><div class="hub-intro"><p class="eyebrow">${t("Interactive workshop", "Interaktivna radionica")}</p><h1>Airsoft Tools</h1><p>${t("Explore the mechanics behind your setup.", "Istražite mehaniku svoje konfiguracije.")}</p></div><p class="hub-count">${t("1 tool available", "Dostupan je 1 alat")}</p><div class="tool-grid"><a class="tool-card" href="#pneumatic-timing"><span class="tool-icon" aria-hidden="true">↝</span><span class="tool-copy"><span class="tool-status">${t("Available", "Dostupno")}</span><h2>${t("Spring Sniper Pneumatic Timing Lab", "Laboratorij pneumatike opružnih snajpera")}</h2><p>${t("Explore airflow, piston motion and BB timing. Compare measured setups and calibrate with chrono data.", "Istražite protok zraka, gibanje pistona i BB-a. Usporedite izmjerene konfiguracije i kalibrirajte kronografom.")}</p></span><span class="tool-arrow">→</span></a></div><p class="hub-footnote">${t("More tools will appear here later.", "Novi alati bit će dodani kasnije.")}</p></div></div></main>`;
      bindLanguage(); return;
    }
    $("root").innerHTML = `<main class="app tuning-app"><header class="lab-header"><div><a href="#">${t("← All tools", "← Svi alati")}</a><h1>${t("Spring Sniper Pneumatic Timing Lab", "Laboratorij pneumatike opružnih snajpera")}</h1></div>${languageSwitch()}</header>
      <details class="model-caveat"><summary>${t("Unvalidated model · not exact joules or dB", "Nepotvrđen model · nisu točni jouli ni dB")}</summary><p>${t("Conditional physics predictions, not measured performance. Head/pin dimensions and spring data start as assumptions. A chrono fit does not validate internal timing or sound. No exact real-world joules or dB are claimed.", "Uvjetna predviđanja fizikalnog modela, a ne izmjerene performanse. Dimenzije glave/pina i podaci opruge početne su pretpostavke. Kalibracija kronografom ne potvrđuje unutarnji vremenski odnos ni zvuk. Ne tvrdimo da su stvarni jouli ili dB točno predviđeni.")}</p></details>
      <div class="layout"><aside class="panel controls-panel" aria-label="${t("Simulation controls", "Kontrole simulacije")}"><div class="panel-heading"><h2>${t("Setup", "Postavke")}</h2><button class="secondary-button" id="toggleControls" type="button" aria-expanded="true">${t("Show / hide", "Prikaži / sakrij")}</button></div>
        <section class="control-group"><label for="platformPreset">${t("Rifle starting point", "Početna konfiguracija replike")}</label><select id="platformPreset">${Object.entries(platforms).map(([id, v]) => `<option value="${id}" ${selectedPlatform === id ? "selected" : ""}>${v.name}</option>`).join("")}<option value="custom" ${selectedPlatform === "custom" ? "selected" : ""}>${t("Custom", "Prilagođeno")}</option></select>
        <p class="evidence">${t("Preset geometry is nominal or assumed—not a measurement of your rifle. Changing platforms resets the mechanical assumptions.", "Geometrija predloška nominalna je ili pretpostavljena — nije mjerenje vaše replike. Promjena platforme vraća mehaničke pretpostavke.")}</p>
        <label for="component">${t("Piston / head identity", "Piston / glava cilindra")}</label><select id="component"><option value="amp" ${component === "amp" ? "selected" : ""}>AMP / Tridos Ultimate SSG10</option><option value="scorpion" ${component === "scorpion" ? "selected" : ""}>Stalker Scorpion</option><option value="custom" ${component === "custom" ? "selected" : ""}>${t("Other / custom", "Drugo / prilagođeno")}</option></select>
        <p class="field-help">${t("Identity labels never apply hidden power multipliers. AMP: nominal 71 g at Tridos; manufacturer lists 69–72 g depending on pin. Weigh the complete assembly. Exact head and pin dimensions remain unknown until measured.", "Naziv dijela ne uvodi skrivene množitelje snage. AMP: Tridos navodi 71 g, proizvođač 69–72 g ovisno o pinu. Izvažite cijeli sklop. Točne dimenzije glave i pina nepoznate su do mjerenja.")}</p>
        <label for="springLabel">${t("Spring identity (label only)", "Oznaka opruge (samo naziv)")}</label><select id="springLabel">${["unspecified", "M110", "M120", "M130", "M140", "M150", "M160", "M170", "M180", "M190", "M220", "custom"].map(v => `<option value="${v}" ${springLabel === v ? "selected" : ""}>${v === "unspecified" ? t("Unknown / not recorded", "Nepoznato / nije zabilježeno") : v === "custom" ? t("Other measured spring", "Druga izmjerena opruga") : v}</option>`).join("")}</select><p class="field-help">${t("Use the force data below. An M-rating alone does not determine spring stiffness or preload.", "Koristite podatke o sili u nastavku. Oznaka M ne određuje krutost ni prednaprezanje opruge.")}</p></section>
        ${group("Cylinder and barrel", "Cilindar i cijev", ["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter"], t("Short stroke changes the cocked position. Added bumper thickness below moves the front contact plane rearward instead; the app shows the resulting effective travel separately.", "Skraćeni hod mijenja zapeti položaj. Debljina dodatne gumice niže umjesto toga pomiče prednju ravninu kontakta unatrag; aplikacija zasebno prikazuje dobiveni efektivni hod."))}
        <p class="small-note" id="shortStrokeDynamic"></p>
        ${group("Moving masses", "Pomične mase", ["pistonMass", "bbMass", "bbDiameter"])}<div class="preset-row">${[58, 65, 68, 72, 76, 82].map(m => `<button class="preset" type="button" data-mass="${m}" aria-pressed="${p.pistonMass === m}">${m} g</button>`).join("")}</div>
        <details open><summary>${t("Head, bumper and airbrake geometry", "Geometrija glave, odbojne gumice i zračne kočnice")}</summary><p class="field-help">${t("Pneumatic cushioning: the pin restricts airflow before contact. The rubber bumper acts only when the piston reaches it. These are separate effects.", "Pneumatsko ublažavanje: pin ograničava protok prije kontakta. Odbojna gumica djeluje tek kad je piston dotakne. To su odvojeni učinci.")}</p>
        <section class="control-group bumper-controls"><p class="group-label">${t("Added cylinder-head bumper", "Dodatna odbojna gumica glave cilindra")}</p>${["bumperThickness", "restitution"].map(field).join("")}<p class="field-help">${t("Thickness 0 mm means no added pad. A thicker annular pad reduces piston travel and swept volume, starts its central passage earlier and leaves more spring compression at contact. The opening is approximated by the head bore. Restitution controls post-contact rebound only; it is not rubber hardness, absorbed sound, peak force or dB. Enter measured thickness and treat restitution as an unknown until tested.", "Debljina 0 mm znači da nema dodatne gumice. Deblja prstenasta gumica smanjuje hod pistona i radni volumen, ranije započinje središnji kanal te ostavlja veću stlačenost opruge pri kontaktu. Otvor se aproksimira promjerom provrta glave. Koeficijent odskoka određuje samo povrat nakon kontakta; nije tvrdoća gume, apsorbirani zvuk, vršna sila ni dB. Unesite izmjerenu debljinu, a koeficijent smatrajte nepoznatim dok ga ne ispitate.")}</p></section>
        <label for="pinLabel">${t("Installed AMP pin", "Ugrađeni AMP pin")}</label><select id="pinLabel">${[["custom", "Measured / custom", "Izmjeren / prilagođen"], ["plug", "Plug / no airbrake", "Čep / bez zračne kočnice"], ["short", "Short pin — enter measured size", "Kratki pin — unesite dimenzije"], ["medium", "Medium pin — enter measured size", "Srednji pin — unesite dimenzije"], ["long", "Long pin — enter measured size", "Dugi pin — unesite dimenzije"]].map(([v, en, hr]) => `<option value="${v}" ${pinLabel === v ? "selected" : ""}>${t(en, hr)}</option>`).join("")}</select>
        ${["headBore", "headLength", "nozzleBore", "nozzleLength", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume"].map(field).join("")}<p class="small-note" id="clearanceNote"></p><p class="field-help">${t("Internal diameters—not the outer head diameter. Model: straight shaft with tapered tip, an annular bumper using the head-bore opening and two stepped passages. Dead volume is the bare rigid-head cavity; the pad's annular solid volume is subtracted automatically. Measure real installed geometry because pad holes and deformation vary.", "Unutarnji promjeri — ne vanjski promjer glave. Model: ravno tijelo pina s konusnim vrhom, prstenasta gumica s otvorom jednakim provrtu glave i dva stepenasta kanala. Preostali volumen predstavlja šupljinu gole krute glave; puni prstenasti volumen gumice oduzima se automatski. Izmjerite stvarnu ugrađenu geometriju jer se otvori i deformacija gumica razlikuju.")}</p>${provenanceControl("geometry", "I have measured the geometry and assembled masses", "Izmjerio/la sam geometriju i mase sklopova")}</details>
        ${springMarkup()}
        <details><summary>${t("Airflow, friction and environment", "Protok, trenje i okoliš")}</summary>${["dischargeCoefficient", "pistonLeak", "nozzleLeak", "bbLeakCoefficient", "bbBreakaway", "barrelDrag", "heatTransfer", "ambientPressure", "airTemperature"].map(field).join("")}<p class="field-help">${t("Leak areas include their discharge coefficient. Zero heat conductance is an adiabatic starting approximation. All loss coefficients need evidence; they are not efficiency percentages.", "Površine curenja uključuju koeficijent protoka. Nulta toplinska vodljivost početna je adijabatska aproksimacija. Svi koeficijenti gubitaka zahtijevaju potvrdu; nisu postoci učinkovitosti.")}</p></details>
        <details><summary>${t("Timing criteria and solver", "Vremenski kriteriji i rješavač")}</summary>${["usefulFraction", "decelThreshold", "maxTime"].map(field).join("")}<p class="field-help">${t("Adaptive midpoint integration, maximum step 0.01 ms. Thresholds are user conventions, not physical switches. The model can end before contact or complete discharge.", "Adaptivna integracija metodom srednje točke, najveći korak 0,01 ms. Pragovi su dogovoreni kriteriji, a ne fizikalne sklopke. Model može završiti prije kontakta ili potpunog pražnjenja.")}</p></details>
      </aside><section class="main">${optimizerMarkup()}<div id="results"></div>${calibrationMarkup()}</section></div></main>`;
    workspace = globalThis.PneumaticWorkspace.mount(document, workspaceState, t, view => {
      if (view === "optimizer") { optimizer.open = true; $("optimizerBody").hidden = false; $("toggleOptimizer").setAttribute("aria-expanded", "true"); }
      if (view === "calibration") $("calibrationPanel").open = true;
      setFrame(fraction);
    });
    bindLanguage(); bindControls(); bindOptimizer(); syncSpringControls(); updateResults(); renderMeasurements(); renderOptimizerResults(); workspace.restoreScroll();
  }
  function calibrationMarkup() {
    return `<details class="panel calibration" id="calibrationPanel"><summary>${t("Calibration · actual chrono measurements", "Kalibracija · stvarna mjerenja kronografom")}</summary><div class="calibration-body"><p class="calibration-intro">${t("Your 0.46 g / 330 fps observation is a reference until its full setup is recorded. Energy is derived from mass and velocity, not an independent measurement. Record each shot. All data stays in this browser unless you export it.", "Mjerenje 0,46 g / 330 fps ostaje referenca dok se ne zabilježi potpuna konfiguracija. Energija se izvodi iz mase i brzine, nije neovisno mjerenje. Zabilježite svaki hitac. Podaci ostaju u ovom pregledniku osim ako ih izvezete.")}</p>
      <form id="measurementForm" class="measurement-form"><label>${t("BB mass (g)", "Masa BB-a (g)")}<input id="measurementMass" type="number" value="${p.bbMass}" min=".1" max="1" step=".01" required></label><label>${t("Measured speed (fps)", "Izmjerena brzina (fps)")}<input id="measurementFps" type="number" value="330" min="1" max="1000" step=".1" required></label><label>${t("Chrono uncertainty (fps)", "Nesigurnost kronografa (fps)")}<input id="measurementSigma" type="number" value="1" min=".1" max="100" step=".1" required></label>
      <label>${t("Use this shot as", "Namjena hica")}<select id="measurementRole"><option value="reference">${t("Reference only", "Samo referenca")}</option><option value="train">${t("Training / fit", "Podatak za prilagodbu")}</option><option value="validation">${t("Held-out validation", "Neovisna provjera")}</option></select></label><label class="wide">${t("Notes: pin, spring, hop setting, BB batch, chrono distance, temperature", "Bilješke: pin, opruga, hop, serija BB-a, udaljenost kronografa, temperatura")}<input id="measurementNotes" type="text" maxlength="2000"></label><label class="wide provenance"><input id="measurementConfirm" type="checkbox">${t("The current inputs describe the hardware used for this measured shot", "Trenutačni ulazi opisuju sklop kojim je ovaj hitac izmjeren")}</label><output id="measurementEnergy" class="wide small-note"></output><button type="submit" class="secondary-button">${t("Add shot", "Dodaj hitac")}</button></form>
      <p class="small-note">${t("Fitting is enabled only for confirmed setups with measured geometry/masses and spring data. It fits one shared head discharge coefficient (Cd), never spring strength and airflow together. Repeating one setup does not identify more parameters. Held-out shots are excluded from fitting.", "Prilagodba je omogućena samo za potvrđene konfiguracije s izmjerenom geometrijom/masama i podacima opruge. Prilagođava se jedan zajednički koeficijent protoka glave (Cd), nikad zajedno snaga opruge i protok. Ponavljanje iste konfiguracije ne određuje više parametara. Hici za neovisnu provjeru ne koriste se pri prilagodbi.")}</p>
      <div class="table-wrap"><table><thead><tr><th>BB</th><th>fps / J</th><th>${t("Use / setup", "Namjena / konfiguracija")}</th><th>${t("Notes", "Bilješke")}</th><th></th></tr></thead><tbody id="measurementRows"></tbody></table></div>
      <div class="fit-row"><button id="fitButton" class="primary-button" type="button">${t("Fit Cd to training shots", "Prilagodi Cd podacima")}</button><button id="exportMeasurements" class="secondary-button" type="button">${t("Export data", "Izvezi podatke")}</button><label class="secondary-button">${t("Import data", "Uvezi podatke")}<input id="importMeasurements" type="file" accept="application/json,.json" hidden></label></div><p id="fitStatus" class="status-line" role="status">${status ? esc(t(...status)) : t("No fit applied. References do not calibrate the solver.", "Prilagodba nije primijenjena. Reference ne kalibriraju rješavač.")}</p><div id="fitReport"></div>
      </div></details>`;
  }
  function ensureOptimizer() {
    if (optimizer) return;
    optimizer = { locks: Object.fromEntries(Object.keys(O.GROUPS).map(key => [key, !["piston", "airbrake"].includes(key)])),
      values: Object.fromEntries(Object.keys(O.LIMITS).map(key => [key, String(p[key])])), priority: "balanced", budget: 120,
      result: null, open: false, cancelled: false, running: false, status: null };
    optimizer.values.pistonMass = [...new Set([p.pistonMass, 58, 65, 68, 72, 76, 82])].join(", ");
    optimizer.values.airbrakeLength = [...new Set([p.airbrakeLength, 0, p.airbrakeLength - 2, p.airbrakeLength - 1, p.airbrakeLength + 1, p.airbrakeLength + 2].filter(v => v >= 0 && v <= 40).map(v => Number(v.toFixed(3))))].join(", ");
  }
  function optimizerMarkup() {
    ensureOptimizer();
    const labels = { cylinder: ["Cylinder", "Cilindar"], barrel: ["Barrel", "Cijev"], head: ["Head / bumper / nozzle", "Glava / gumica / mlaznica"], piston: ["Piston", "Piston"], airbrake: ["Airbrake", "Zračna kočnica"], spring: ["Spring", "Opruga"], bb: ["BB", "BB"] };
    return `<section class="panel optimizer"><div class="optimizer-heading"><div><h2>${t("Find a quieter, efficient setup", "Pronađi tišu i učinkovitiju konfiguraciju")}</h2><p class="small-note">${t("Freeze the parts you want to keep. Search only the hardware choices you can change.", "Zamrznite dijelove koje želite zadržati. Pretražujte samo zamjenjive dijelove.")}</p></div><button class="primary-button" type="button" id="toggleOptimizer" aria-expanded="${optimizer.open}" aria-controls="optimizerBody">${t("Freeze parts & optimize", "Zamrzni dijelove i optimiziraj")}</button></div>
      <div id="optimizerBody" ${optimizer.open ? "" : "hidden"}><p class="optimizer-target">${t("Performance constraint: keep 95–105% of this setup’s predicted BB exit energy.", "Uvjet performansi: zadrži 95–105% predviđene izlazne energije BB-a trenutačne konfiguracije.")}</p>
      <p class="small-note">${t("Checked = frozen. Enter actual available choices separated by commas; use a dot for decimals. The current value is always included. Example piston masses and pin lengths are hypothetical—not verified compatible AMP parts. Changing geometry can require new sealing/friction measurements.", "Označeno = zamrznuto. Unesite stvarno dostupne vrijednosti odvojene zarezima; decimalni znak je točka. Trenutačna vrijednost uvijek je uključena. Primjeri masa pistona i duljina pina hipotetski su — nisu potvrđeni kompatibilni AMP dijelovi. Promjena geometrije može zahtijevati novo mjerenje brtvljenja i trenja.")}</p>
      <div class="optimizer-locks">${Object.entries(O.GROUPS).map(([group, keys]) => `<fieldset class="optimizer-part"><legend><label><input type="checkbox" data-opt-lock="${group}" ${optimizer.locks[group] ? "checked" : ""}>${t("Freeze", "Zamrzni")} ${t(...labels[group])}</label></legend><details ${!optimizer.locks[group] ? "open" : ""}><summary>${t("Candidate values", "Vrijednosti kandidata")}</summary>${keys.map(key => {
        const fixedSpring = O.fixedReason(p, key);
        return `<label class="optimizer-field" for="opt-${key}"><span>${t(fields[key][0], fields[key][1])} (${fields[key][2] === "turns" ? t("turns", "zavoja") : fields[key][2]})</span><input type="text" id="opt-${key}" data-opt-values="${key}" value="${esc(fixedSpring ? String(p[key]) : optimizer.values[key])}" ${optimizer.locks[group] || fixedSpring ? "disabled" : ""} maxlength="180"><small ${fixedSpring ? "" : "hidden"}>${t("Fixed by the spring input mode or measured curve. Enable length mode in Setup to search spring lengths.", "Fiksno zbog načina unosa opruge ili izmjerene krivulje. Za pretragu duljina uključite taj način u Postavkama.")}</small></label>`;
      }).join("")}</details></fieldset>`).join("")}</div>
      <div class="optimizer-options"><label>${t("Ranking preference", "Prioritet rangiranja")}<select id="optimizerPriority">${[["balanced", "Balanced trade-off", "Uravnotežen kompromis"], ["quiet", "Lower sound contributors", "Niži doprinosi zvuku"], ["efficient", "Higher energy efficiency", "Viša energetska učinkovitost"]].map(([value, en, hr]) => `<option value="${value}" ${optimizer.priority === value ? "selected" : ""}>${t(en, hr)}</option>`).join("")}</select></label><label>${t("Maximum combinations", "Najviše kombinacija")}<select id="optimizerBudget">${[60, 120, 240].map(v => `<option ${optimizer.budget === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
      <p class="small-note">${t("Weather, fitted airflow/leakage, friction, damping and timing criteria stay fixed. Every candidate uses the same 250 ms observation limit, allowing delayed contact/discharge. Efficiency = BB exit energy ÷ initial available spring work. Rankings compare impact energy, peak muzzle airflow, exit pressure and efficiency—not dB or guaranteed loudness.", "Vrijeme, prilagođeni protok/curenje, trenje, prigušenje i vremenski kriteriji ostaju fiksni. Svaki kandidat koristi isti prozor promatranja od 250 ms za kasni kontakt/pražnjenje. Učinkovitost = izlazna energija BB-a ÷ početni raspoloživi rad opruge. Rangiranje uspoređuje energiju udara, vršni protok, izlazni tlak i učinkovitost — ne dB ni zajamčenu glasnoću.")}</p>
      <details><summary>${t("How ranking works", "Kako radi rangiranje")}</summary><p class="small-note">${t("Only completed, numerically acceptable shots inside the energy band qualify. Keep the non-dominated trade-offs: no other tested candidate is at least as good on all four objectives and better on one. Rank those with range-normalized weighted costs. Impact / airflow / exit pressure / inefficiency weights: balanced 35/20/15/30%; sound-biased 45/25/20/10%; efficiency-biased 15/10/5/70%. These weights are preferences, not an acoustic formula. A limited search finds the best tested choices, not a global optimum.", "Prikladni su samo završeni, numerički prihvatljivi hici unutar energetskog raspona. Zadržavaju se nedominirani kompromisi: nijedan drugi ispitani kandidat nije jednako dobar u sva četiri cilja i bolji u jednom. Rangiraju se normaliziranim ponderiranim troškovima. Udar / protok / tlak / neučinkovitost: uravnoteženo 35/20/15/30%; zvuk 45/25/20/10%; učinkovitost 15/10/5/70%. Ponderi su prioriteti, ne akustička formula. Ograničena pretraga pronalazi najbolje ispitane opcije, ne globalni optimum.")}</p></details>
      <div class="fit-row"><button class="primary-button" type="button" id="runOptimizer">${t("Find best combinations", "Pronađi najbolje kombinacije")}</button><button class="secondary-button" type="button" id="cancelOptimizer" disabled>${t("Cancel search", "Prekini pretragu")}</button></div><p class="status-line" role="status" id="optimizerStatus">${optimizer.status ? esc(t(...optimizer.status)) : ""}</p><div id="optimizerResults"></div></div></section>`;
  }
  function invalidateOptimizer() {
    if (!optimizer) return;
    optimizer.cancelled = true;
    if (optimizer.result) optimizer.status = ["Setup or search choices changed. Run the search again before applying a result.", "Konfiguracija ili odabiri pretrage promijenjeni su. Ponovite pretragu prije primjene rezultata."];
    optimizer.result = null;
    // Keep the old table's footprint so editing does not jump the animation.
    if ($("optimizerResults")) {
      $("optimizerResults").classList.add("is-stale");
      $("optimizerResults").querySelectorAll("button").forEach(button => { button.disabled = true; });
    }
    if ($("optimizerStatus")) $("optimizerStatus").textContent = optimizer.status ? t(...optimizer.status) : "";
  }
  function bindOptimizer() {
    $("toggleOptimizer").addEventListener("click", e => { optimizer.open = !optimizer.open; $("optimizerBody").hidden = !optimizer.open; e.currentTarget.setAttribute("aria-expanded", String(optimizer.open)); });
    document.querySelectorAll("[data-opt-lock]").forEach(box => box.addEventListener("change", () => {
      const group = box.dataset.optLock; optimizer.locks[group] = box.checked; invalidateOptimizer();
      for (const key of O.GROUPS[group]) $("opt-" + key).disabled = box.checked || Boolean(O.fixedReason(p, key));
      box.closest("fieldset").querySelector("details").open = !box.checked;
    }));
    document.querySelectorAll("[data-opt-values]").forEach(input => input.addEventListener("input", () => { optimizer.values[input.dataset.optValues] = input.value; invalidateOptimizer(); }));
    $("optimizerPriority").addEventListener("change", e => { optimizer.priority = e.target.value; invalidateOptimizer(); });
    $("optimizerBudget").addEventListener("change", e => { optimizer.budget = Number(e.target.value); invalidateOptimizer(); });
    $("cancelOptimizer").addEventListener("click", () => { optimizer.cancelled = true; $("cancelOptimizer").disabled = true; $("optimizerStatus").textContent = t("Cancelling after the current shot…", "Prekid nakon trenutačnog hica…"); });
    $("runOptimizer").addEventListener("click", async () => {
      if (busy) return;
      clearTimeout(debounce); stop();
      if (calculationPending || !shot) recalculate();
      const base = clone(p), config = { locks: clone(optimizer.locks), values: {}, budget: optimizer.budget, priority: optimizer.priority };
      try {
        for (const [group, keys] of Object.entries(O.GROUPS)) if (!config.locks[group]) for (const key of keys) config.values[key] = O.fixedReason(p, key) ? [p[key]] : O.parseValues(optimizer.values[key]);
        O.searchSpace(base, config);
      } catch (_) { optimizer.status = ["Check candidate lists: up to 12 numbers per field, within the normal control ranges. Use decimal dots. Confirm the starting setup is valid.", "Provjerite popise: do 12 brojeva po polju, unutar uobičajenih raspona kontrola. Koristite decimalnu točku. Početna konfiguracija mora biti valjana."]; $("optimizerStatus").textContent = t(...optimizer.status); return; }
      optimizer.cancelled = false; optimizer.running = true; optimizer.result = null;
      $("optimizerResults").innerHTML = ""; setBusy(true); $("cancelOptimizer").disabled = false;
      $("optimizerStatus").textContent = t("Capturing current energy and evaluating hardware combinations…", "Bilježenje trenutačne energije i provjera kombinacija dijelova…");
      await new Promise(resolve => setTimeout(resolve, 20));
      try {
        const result = await O.search(base, config, {
          isCancelled: () => optimizer.cancelled || JSON.stringify(p) !== JSON.stringify(base) || location.hash !== "#pneumatic-timing",
          onProgress: progress => { if ($("optimizerStatus")) $("optimizerStatus").textContent = t(`${progress.completed} / ${progress.planned} combinations checked · ${progress.eligible} eligible.`, `Provjereno ${progress.completed} / ${progress.planned} kombinacija · ${progress.eligible} prikladnih.`); }
        });
        optimizer.result = result; optimizer.status = ["Search complete. Review the trade-offs before applying a hypothetical setup.", "Pretraga je završena. Pregledajte kompromise prije primjene hipotetske konfiguracije."];
      } catch (error) {
        optimizer.result = null;
        optimizer.status = error.message === "optimizer:cancelled" ? ["Search cancelled. No setup was changed and partial results were discarded.", "Pretraga je prekinuta. Konfiguracija nije promijenjena, a djelomični rezultati odbačeni su."] : ["Search cannot start: the current setup needs a valid BB exit to define its energy target. Check inputs or spring data.", "Pretraga nije moguća: trenutačna konfiguracija mora dati valjan izlazak BB-a za ciljni energetski raspon. Provjerite ulaze ili oprugu."];
      } finally {
        optimizer.running = false; setBusy(false);
        if ($("optimizerStatus")) { $("optimizerStatus").textContent = t(...optimizer.status); $("cancelOptimizer").disabled = true; renderOptimizerResults(); }
      }
    });
  }
  function renderOptimizerResults() {
    if (!$("optimizerResults")) return;
    const r = optimizer?.result;
    if (!r) { $("optimizerResults").innerHTML = ""; return; }
    $("optimizerResults").classList.remove("is-stale");
    const rejected = r.rejected, best = r.frontier.slice(0, 5);
    const changeText = candidate => Object.entries(candidate.changes).map(([key, v]) => `${t(fields[key][0], fields[key][1])}: ${fmt(v.from, 3)} → ${fmt(v.to, 3)} ${fields[key][2]}`).join("; ") || t("Current setup — unchanged", "Trenutačna konfiguracija — nepromijenjena");
    const metricCells = m => `<td>${fmt(m.energy, 3, "J")}</td><td>${fmt(m.impact * 1000, 3, "mJ")}</td><td>${fmt(m.outflow * 1000, 3, "g/s")}</td><td>${fmt(m.exitGauge / 1e5, 3, "bar(g)")}</td><td>${fmt(m.efficiency * 100, 1, "%")}</td>`;
    $("optimizerResults").innerHTML = `<p class="optimizer-target">${t("Required model exit energy", "Tražena izlazna energija modela")}: ${fmt(r.bounds.min, 3)}–${fmt(r.bounds.max, 3, "J")}.</p>
      <p class="small-note">${t(`Checked ${r.evaluated} of ${r.total.toLocaleString("en")} combinations. ${r.exhaustive ? "All listed combinations checked." : "Sampled search; untested combinations may be better."} ${r.eligible} eligible; ${r.frontier.length} non-dominated trade-offs.`, `Provjereno ${r.evaluated} od ${r.total.toLocaleString("hr")} kombinacija. ${r.exhaustive ? "Provjerene su sve navedene kombinacije." : "Uzorkovana pretraga; neispitane kombinacije mogu biti bolje."} ${r.eligible} prikladnih; ${r.frontier.length} nedominiranih kompromisa.`)}</p>
      <p class="small-note">${t(`Excluded: ${rejected.energy} outside energy band, ${rejected.unfinished} missing contact/unfinished discharge, ${rejected.noExit} no exit, ${rejected.invalid} invalid, ${rejected.numerical} failed numerical checks. Unfinished impacts are unknown, never zero.`, `Isključeno: ${rejected.energy} izvan energije, ${rejected.unfinished} bez kontakta/nepotpuno pražnjenje, ${rejected.noExit} bez izlaska, ${rejected.invalid} nevaljanih, ${rejected.numerical} numerički neprihvatljivih. Nezavršeni udari nepoznati su, nikad nula.`)}</p>
      ${r.noVariables ? `<p class="lab-warning">${t("All values are frozen or have only the current choice. Nothing can be optimized; unfreeze a part and enter alternatives.", "Sve vrijednosti su zamrznute ili imaju samo trenutačni izbor. Nema promjenjivih veličina; odmrznite dio i unesite alternative.")}</p>` : ""}
      ${best.length ? `<div class="table-wrap"><table class="optimizer-table"><thead><tr><th>${t("Choice / changes", "Odabir / promjene")}</th><th>${t("BB energy", "Energija BB-a")}</th><th>${t("Impact energy", "Energija udara")}</th><th>${t("Peak muzzle flow", "Vršni protok")}</th><th>${t("Exit pressure", "Izlazni tlak")}</th><th>${t("Efficiency", "Učinkovitost")}</th><th></th></tr></thead><tbody>${r.baseline ? `<tr class="optimizer-baseline"><td>${t("Current setup · reference", "Trenutačno · referenca")}</td>${metricCells(r.baseline)}<td></td></tr>` : ""}${best.map((candidate, i) => {
        const m = candidate.metrics, b = r.baseline;
        const compromise = b && (m.impact > b.impact + 1e-9 || m.outflow > b.outflow + 1e-9 || m.exitGauge > b.exitGauge + 1e-4 || m.efficiency < b.efficiency - 1e-8);
        return `<tr><td><strong>${i + 1}. ${t("Best found trade-off", "Najbolji pronađeni kompromis")}</strong><p>${esc(changeText(candidate))}</p><small>${compromise ? t("At least one objective is worse than the reference.", "Najmanje jedan cilj lošiji je od reference.") : t("No listed objective is worse than the reference, if available.", "Nijedan navedeni cilj nije lošiji od reference, ako je dostupna.")} ${t("Energy threshold → slowing", "Prag energije → usporavanje")}: ${stamp(m.timingMargin)}.</small></td>${metricCells(m)}<td><button class="secondary-button" type="button" data-apply-optimizer="${i}" ${Object.keys(candidate.changes).length ? "" : "disabled"}>${t("Apply & replay", "Primijeni i prikaži")}</button></td></tr>`;
      }).join("")}</tbody></table></div><p class="small-note">${t("Apply changes only the listed unlocked hardware and extends the playback limit to 250 ms (observation time, not a physical change). It marks changed inputs as unmeasured. Calibration records stay intact. Compare actual chrono and sound measurements before buying or changing parts.", "Primjena mijenja samo navedene odmrznute dijelove i produljuje prikaz na 250 ms (vrijeme promatranja, ne fizička promjena). Promijenjeni ulazi označuju se kao neizmjereni. Kalibracijski zapisi ostaju sačuvani. Usporedite stvarna mjerenja kronografom i zvuka prije kupnje ili zamjene dijelova.")}</p>` : `<p class="lab-warning">${t("No complete candidate meets the energy constraint. No best setup is claimed. Review your candidate values; unresolved low-impact cases are not assumed quiet.", "Nijedan završeni kandidat ne zadovoljava energetski uvjet. Ne tvrdi se da postoji najbolja konfiguracija. Provjerite kandidate; nezavršeni slučajevi ne smatraju se tihima.")}</p>`}
      <button class="secondary-button" type="button" id="exportOptimizer">${t("Export search and locks", "Izvezi pretragu i zaključavanja")}</button>`;
    $("exportOptimizer").addEventListener("click", () => download("airsoft-optimizer-search.json", r));
    document.querySelectorAll("[data-apply-optimizer]").forEach(button => button.addEventListener("click", () => {
      if (busy || !optimizer.result) return;
      const candidate = optimizer.result.frontier[Number(button.dataset.applyOptimizer)];
      try {
        const next = O.applyCandidate(p, optimizer.result, candidate), keys = Object.keys(candidate.changes);
        // Recheck using the normal full-trace solver before changing the live setup.
        const checked = P.simulate(next, { maxTime: r.horizonMs });
        if (O.assess(next, checked, r.bounds).reason) throw new Error("candidate changed");
        p = next; p.maxTime = r.horizonMs; selectedPlatform = "custom";
        if (keys.some(key => O.GROUPS.spring.includes(key))) { provenance.spring = "assumed"; springLabel = "custom"; }
        if (keys.some(key => !O.GROUPS.spring.includes(key))) provenance.geometry = "assumed";
        if (keys.some(key => [...O.GROUPS.piston, ...O.GROUPS.head, ...O.GROUPS.airbrake].includes(key))) component = "custom";
        if (keys.some(key => O.GROUPS.airbrake.includes(key))) pinLabel = p.airbrakeLength ? "custom" : "plug";
        invalidateFit(); setStatus("A hypothetical optimizer setup is active. Existing measurements are preserved; this new hardware combination is not automatically calibrated.", "Aktivna je hipotetska konfiguracija optimizatora. Postojeća mjerenja sačuvana su; nova kombinacija dijelova nije automatski kalibrirana."); invalidateOptimizer(); syncSetupControls(); recalculate(); optimizer.status = ["Candidate applied. Frozen hardware and environmental/loss assumptions were preserved. Playback now observes up to 250 ms.", "Kandidat je primijenjen. Zamrznuti dijelovi i pretpostavke okoliša/gubitaka sačuvani su. Prikaz sada prati do 250 ms."]; $("optimizerStatus").textContent = t(...optimizer.status);
        const category = keys.every(key => O.GROUPS.spring.includes(key)) ? "spring" : keys.some(key => [...O.GROUPS.head, ...O.GROUPS.airbrake].includes(key)) ? "airbrake" : keys.some(key => [...O.GROUPS.piston, ...O.GROUPS.bb].includes(key)) ? "masses" : "geometry";
        workspace.selectCategory(category); workspace.selectView("shot");
        setFrame(0); $("workspaceBody").scrollTop = 0;
        if (window.innerWidth <= 960) $("previewPanel").scrollIntoView({ block: "start" });
        $("playButton").focus({ preventScroll: true }); startPlayback();
      } catch (_) { invalidateOptimizer(); optimizer.status = ["Result is stale or failed rechecking. No candidate was applied; run the search again.", "Rezultat je zastario ili nije prošao ponovnu provjeru. Kandidat nije primijenjen; ponovite pretragu."]; $("optimizerStatus").textContent = t(...optimizer.status); }
    }));
  }
  function metric(label, value, note, kind = "model") { return `<article class="readout"><div class="topline"><span>${label}</span><span class="tag ${kind}">${kind === "geometry" ? t("geometry", "geometrija") : t("model", "model")}</span></div><strong>${value}</strong><small>${note}</small></article>`; }
  function updateSpringSummary() {
    if (!$("springSummary")) return;
    const s = P.springState(p), errors = P.validate(p).filter(v => v.startsWith("spring"));
    const messages = {
      "spring:lengths": ["Enter positive free length and a front seat distance greater than the stroke.", "Unesite pozitivnu slobodnu duljinu i razmak prednjih oslonaca veći od hoda."],
      "spring:slack": ["The resulting spring is shorter than the front seat distance. Unseating/recontact is not modeled.", "Dobivena opruga kraća je od razmaka oslonaca pri prednjem kontaktu. Gubitak i ponovni kontakt nisu modelirani."],
      "spring:coils": ["A cut estimate needs the original active-coil count and fewer removed active coils. Do not infer these from length alone.", "Procjena reza traži početni broj aktivnih zavoja i manji broj uklonjenih. Ne izvodite ih samo iz duljine."],
      "spring:cut-length": ["Enter the free-length reduction when active coils have been removed.", "Unesite smanjenje slobodne duljine ako su uklonjeni aktivni zavoji."],
      "spring:coil-bind": ["Coil bind: the cocked seat distance is at or below the entered solid height.", "Potpuno stiskanje zavoja: razmak oslonaca zapete opruge manji je ili jednak duljini potpuno stisnute opruge."],
      "spring:cut-curve": ["An uncut force curve cannot predict a cut spring. Clear it to estimate, or enter the already-cut measured spring with cut/removal set to zero.", "Krivulja neskraćene opruge ne predviđa skraćenu. Izbrišite je za procjenu ili unesite već skraćenu izmjerenu oprugu uz nulti rez i uklonjene zavoje."],
      "spring:coverage": ["The measured curve must cover front compression through full cocked compression.", "Izmjerena krivulja mora pokriti stlačenje pri prednjem kontaktu do punog zapinjanja."]
    };
    $("springSummary").innerHTML = errors.length ? `<p class="lab-warning" role="alert">${errors.map(code => esc(messages[code] ? t(...messages[code]) : code)).join(" ")}</p>` : `<div class="spring-summary">
      ${p.springLengthMode ? `<p>${t("Resulting free length", "Dobivena slobodna duljina")}: <strong>${fmt(s.freeLength, 1, "mm")}</strong></p><p>${t("Cocked seat distance", "Razmak oslonaca pri zapinjanju")}: <strong>${fmt(s.cockedLength, 1, "mm")}</strong></p>` : ""}
      <p>${t("Compression · front / cocked", "Stlačenje · prednji kontakt / zapeto")}: <strong>${fmt(s.preload, 1)} / ${fmt(s.cockedCompression, 1)} mm</strong></p>
      <p>${p.springCurve.length ? t("Measured force curve active", "Aktivna izmjerena krivulja sile") : `${t("Effective stiffness", "Efektivna krutost")}: <strong>${fmt(s.stiffness, 1, "N/m")}</strong>${p.springLengthMode && p.springCutLength > 0 ? ` · ${t("cut estimate", "procjena reza")}` : ""}`}</p>
      <p>${t("Force · bumper contact / cocked", "Sila · kontakt s gumicom / zapeto")}: <strong>${fmt(P.springForce(p, P.contactStroke(p)), 2)} / ${fmt(P.springForce(p, 0), 2)} N</strong></p>
      <p>${t("Available spring work", "Raspoloživi rad opruge")}: <strong>${fmt(P.springEnergy(p, 0), 3, "J")}</strong> · ${t("not BB exit energy", "nije izlazna energija BB-a")}</p>
      <p>${s.coilBindChecked ? `${t("Cocked clearance above solid height", "Zazor zapete opruge iznad potpuno stisnute duljine")}: ${fmt(s.cockedLength - p.springSolidLength, 1, "mm")}` : t("Coil bind not checked — solid height / seat geometry unknown.", "Potpuno stiskanje zavoja nije provjereno — nepoznata duljina / geometrija oslonaca.")}</p></div>`;
  }
  function setResultState(state) {
    const results = $("results");
    if (!results) return;
    if (!$("resultContent")) {
      results.innerHTML = '<div id="resultStatus" class="result-status" role="status" aria-live="polite"></div><div id="resultError" class="lab-warning error" role="alert" hidden></div><div id="resultContent"></div>';
      bindResults();
    }
    results.dataset.state = state;
    workspace?.sync();
    results.setAttribute("aria-busy", String(state === "pending"));
    $("resultContent").inert = state !== "ready";
    $("resultContent").setAttribute("aria-hidden", String(state === "invalid"));
    $("resultError").hidden = state !== "invalid";
    $("resultStatus").textContent = state === "pending" ? t("Updating… previous shot held on screen; playback paused.", "Ažuriranje… prethodni hitac ostaje na zaslonu; prikaz je pauziran.") : state === "invalid" ? t("Check inputs · results unavailable", "Provjerite ulaze · rezultati nisu dostupni") : t("Live model · edits update in place · playback stays at the same shot time", "Model uživo · izmjene bez ponovnog učitavanja · zadržava se vrijeme prikaza");
  }
  function updateResults() {
    if (!$("results")) return;
    updateSpringSummary();
    const g = P.geometry(p, 0, 0), effectiveStroke = g.stroke * 1000, before = Math.max(0, effectiveStroke - p.airbrakeLength);
    $("shortStrokeDynamic").textContent = t(`Effective piston travel: ${effectiveStroke.toFixed(1)} mm (${p.bumperThickness.toFixed(1)} mm added bumper). Swept volume: ${(g.sweptVolume * 1e6).toFixed(2)} cm³. Before pin entry: ${before.toFixed(1)} mm / ${(g.ac * before * 1000).toFixed(2)} cm³.`, `Efektivni hod pistona: ${effectiveStroke.toFixed(1)} mm (${p.bumperThickness.toFixed(1)} mm dodatne gumice). Radni volumen: ${(g.sweptVolume * 1e6).toFixed(2)} cm³. Prije ulaska pina: ${before.toFixed(1)} mm / ${(g.ac * before * 1000).toFixed(2)} cm³.`);
    $("clearanceNote").textContent = t(`Full-shaft radial clearance: ${g.gap.toFixed(3)} mm; annular area: ${(g.annulus * 1e6).toFixed(3)} mm². Added bumper solid volume: ${(g.bumperSolidVolume * 1e6).toFixed(3)} cm³. Geometry only—not flow or sound.`, `Radijalni zazor uz tijelo pina: ${g.gap.toFixed(3)} mm; prstenasta površina: ${(g.annulus * 1e6).toFixed(3)} mm². Puni volumen dodatne gumice: ${(g.bumperSolidVolume * 1e6).toFixed(3)} cm³. Samo geometrija — nije protok ni zvuk.`);
    if (!shot?.valid) {
      setResultState("invalid");
      $("resultError").textContent = t("Cannot simulate this setup. Check dimensions, clearances, residual volumes and spring data. Previous results are hidden: ", "Ovu konfiguraciju nije moguće simulirati. Provjerite dimenzije, zazore, preostale volumene i oprugu. Prethodni rezultati su skriveni: ") + (shot?.errors || []).join(" · "); return;
    }
    const s = shot, retention = s.exitEnergy !== null && baseline?.valid && baseline.exitEnergy > 0 ? 100 * s.exitEnergy / baseline.exitEnergy : null;
    const diff = s.engageTime !== null && s.exitTime !== null ? (s.engageTime - s.exitTime) * 1000 : null;
    const timing = I.timing(s, p), delta = timing.marginMs;
    const verdict = I.verdictText(timing.verdict, t);
    const next = document.createElement("div");
    next.innerHTML = `<div class="readout-grid">
      ${metric(t("Cylinder / barrel volumes", "Volumeni cilindra / cijevi"), `${fmt(s.cylinderVolume * 1e6, 2)} / ${fmt(s.barrelVolume * 1e6, 2)}`, "cm³", "geometry")}
      ${metric(t("Cylinder / barrel ratio", "Omjer cilindra / cijevi"), fmt(s.ratio, 2, ": 1"), t("Swept volume / barrel volume", "Radni volumen / volumen cijevi"), "geometry")}
      ${metric(t("Bumper / effective contact travel", "Gumica / efektivni hod do kontakta"), `${fmt(p.bumperThickness, 1)} / ${fmt(s.stroke * 1000, 1)}`, "mm", "geometry")}
      ${metric(t("Predicted muzzle speed", "Predviđena izlazna brzina"), fmt(fps(s.exitVelocity), 1, "fps"), s.exitEnergy === null ? t("BB did not exit within the run", "BB nije izašao tijekom simulacije") : `${fmt(s.exitEnergy, 3, "J")} · ${t("conditional, not chrono", "uvjetno, nije kronograf")}`)}
      ${metric(t("Energy gained at slowing event", "Energija pri događaju usporavanja"), fmt(s.preBrakeShare === null ? null : s.preBrakeShare * 100, 1, "%"), t("Relative to exit energy; can exceed 100%", "U odnosu na izlaznu energiju; može prijeći 100%"))}
      ${metric(t("Peak cylinder / BB pressure", "Vršni tlak cilindra / iza BB-a"), `${fmt((s.peakCylinderPressure - s.ambientPressure) / 1e5, 2)} / ${fmt((s.peakPressure - s.ambientPressure) / 1e5, 2)}`, t("bar above atmosphere", "bar iznad atmosferskog tlaka"))}
      ${metric(t("Relative exit-energy retention", "Relativno zadržavanje izlazne energije"), fmt(retention, 1, "%"), t("Same mass, no-pin baseline; not sound reduction", "Ista masa, referenca bez pina; nije utišavanje"))}
      ${metric(t("Piston momentum at entry", "Količina gibanja pistona pri ulasku"), fmt(s.momentumAtEngage, 3, "kg·m/s"), t("Actual piston mass × signed velocity", "Stvarna masa pistona × predznačena brzina"))}
      ${metric(t("Pin entry relative to BB exit", "Ulazak pina u odnosu na izlazak BB-a"), fmt(diff, 2, "ms"), t("Negative = pin enters first", "Negativno = pin ulazi prvi"))}
      </div>
      ${!s.complete ? `<div class="lab-warning">${t("Run ended with missing events:", "Simulacija je završila bez događaja:")} ${s.exitTime === null ? t("BB exit. ", "Izlazak BB-a. ") : ""}${s.pistonHitTime === null ? t("Piston contact. ", "Kontakt pistona. ") : ""}${t("Missing contact is not a predicted soft landing. Increase modeled time if appropriate.", "Izostanak kontakta ne znači predviđen mekan udar. Po potrebi povećajte vrijeme simulacije.")}</div>` : ""}
      <section class="panel timing-card"><div class="timing-head"><strong>${verdict}</strong><span>${fmt(delta, 2, "ms")}</span></div><p class="small-note">${t("The amber event is measured from the modeled acceleration after entry—not proof that all slowing is caused by the pin. Compression can slow a piston without an airbrake. Green marks a chosen share of maximum BB energy before exit, not a universal optimum.", "Jantarni događaj temelji se na modeliranom ubrzanju nakon ulaska — nije dokaz da je sve usporavanje uzrokovano pinom. Kompresija može usporiti piston i bez kočnice. Zelena označuje odabrani udio najveće energije BB-a prije izlaska, ne univerzalni optimum.")}</p><div class="event-list">${events().map(([key, label, cls]) => `<button type="button" data-event="${key}" class="${cls}" ${s[key] === null ? "disabled" : ""}>${label}<br><span class="mono">${stamp(s[key])}</span></button>`).join("")}</div></section>
      <section class="panel stage"><div class="stage-toolbar"><button class="primary-button" type="button" id="playButton">${t("Fire / play", "Opali / pokreni")}</button><button class="secondary-button" id="resetButton" type="button">${t("Reset", "Početak")}</button><input id="scrubber" aria-label="${t("Shot time", "Vrijeme opaljenja")}" type="range" min="0" max="1000" value="${fraction * 1000}"><span id="clock" class="clock mono"></span></div><canvas id="mechanism" role="img" aria-label="${t("Schematic piston, bumper, airbrake and BB positions; live numeric values below", "Shematski položaji pistona, odbojne gumice, pina i BB-a; brojčane vrijednosti ispod")}"></canvas><div id="phaseText" class="stage-status" aria-live="off"></div><div id="liveStrip" class="live-strip"></div><p class="results-note">${t("Schematic cutaway. The green pad is the entered bumper; its contact highlight is symbolic because rubber deformation is not resolved. Glow indicates modeled pressure; particles and trails illustrate flow and motion, not gas dynamics or sound. Every cue pauses with model time.", "Shematski presjek. Zelena gumica prikazuje uneseni odbojnik; isticanje pri kontaktu simbolično je jer deformacija gume nije razriješena. Sjaj označuje modelirani tlak; čestice i tragovi ilustriraju protok i gibanje, ne dinamiku plina ni zvuk. Sve se pauzira s vremenom modela.")}</p></section>
      <section class="panel graphs"><div class="graphs-header"><div><h2>${t("Shot traces", "Krivulje opaljenja")}</h2><p>${t("Pressure: amber cylinder, cyan behind BB. Events: green energy threshold, dashed amber slowing, cyan exit. Negative values remain visible.", "Tlak: jantarni cilindar, cijan iza BB-a. Događaji: zeleni prag energije, isprekidano jantarno usporavanje, cijan izlazak. Negativne vrijednosti ostaju vidljive.")}</p></div></div><div class="chart-grid">${[["pressureChart", t("Pressure vs time", "Tlak kroz vrijeme"), "bar(g)"], ["pistonChart", t("Piston velocity vs time", "Brzina pistona kroz vrijeme"), "m/s"], ["bbChart", t("BB velocity vs time", "Brzina BB-a kroz vrijeme"), "m/s"]].map(([id, label, units]) => `<div class="chart"><div class="chart-title"><span>${label}</span><span>${units} / ms</span></div><canvas id="${id}" role="img" aria-label="${label}; ${t("numeric values in live readouts; export full trace below", "brojčane vrijednosti u prikazu uživo; izvoz cijele krivulje ispod")}"></canvas></div>`).join("")}</div></section>
      ${I.soundMarkup(s, baseline, t, fmt)}
      <section class="panel insight"><div class="panel-heading"><h2>${t("Energy, verification and uncertainty", "Energija, provjera i nesigurnost")}</h2><span class="tag unknown">${t("not experimentally validated", "nije eksperimentalno potvrđeno")}</span></div><div class="assumption-grid"><span>${t("Maximum BB energy observed", "Najveća opažena energija BB-a")}</span><strong>${fmt(s.maxBbEnergy, 3, "J")}</strong><span>${t("Energy lost before exit", "Energija izgubljena prije izlaska")}</span><strong>${fmt(s.bbEnergyLoss, 3, "J")}</strong><span>${t("Positive / negative net BB work", "Pozitivan / negativan neto rad na BB-u")}</span><strong>${fmt(s.positiveBbWork, 3)} / ${fmt(s.negativeBbWork, 3, "J")}</strong><span>${t("Energy balance residual", "Odstupanje energetske bilance")}</span><strong>${fmt(s.energyResidual * 1000, 4, "mJ")}</strong><span>${t("Gas mass residual", "Odstupanje bilance mase plina")}</span><strong>${s.massResidual.toExponential(2)} kg</strong><span>${t("Ambient barrel sound-crossing scale", "Vrijeme prolaza zvuka kroz cijev pri okolišnim uvjetima")}</span><strong>${stamp(s.soundCrossingTime)}</strong></div>
      <p class="small-note">${t("A small numerical residual does not validate the physics. Two uniform-pressure gas volumes, approximate series duct losses, an effective leaky-piston BB and atmospheric pressure ahead of it are simplifications. Pressure waves, spring surge, detailed cup/bumper deformation and structural acoustics are not resolved. Sub-millisecond timing needs instrumented and spatial-flow validation.", "Malo numeričko odstupanje ne potvrđuje fizikalni model. Dva plinska volumena jednolikog tlaka, približni gubici u kanalima, BB kao efektivni propusni klip i atmosferski tlak ispred njega pojednostavljenja su. Tlačni valovi, valovi opruge, detaljna deformacija brtve/odbojnika i strukturna akustika nisu razriješeni. Vremenski odnos ispod milisekunde zahtijeva instrumentiranu i prostornu provjeru protoka.")}</p>
      <div class="fit-row"><button class="secondary-button" id="convergenceButton" type="button">${t("Check finer time steps", "Provjeri manje vremenske korake")}</button><button class="secondary-button" id="sensitivityButton" type="button">${t("Check input sensitivity", "Provjeri osjetljivost na ulaze")}</button><button class="secondary-button" id="exportRun" type="button">${t("Export setup and full trace", "Izvezi postavke i cijelu krivulju")}</button></div>
      <p class="small-note">${t("Sensitivity examples vary head and pin diameter by ±0.02 mm and spring force by ±5%, in all eight combinations. These are explicit test ranges, not measured tolerances or statistical confidence intervals.", "Primjeri osjetljivosti mijenjaju promjer glave i pina za ±0,02 mm te silu opruge za ±5%, u svih osam kombinacija. To su izričito zadani ispitni rasponi, a ne izmjerene tolerancije ili statistički intervali pouzdanosti.")}</p><p id="diagnosticReport" class="status-line" role="status">${diagnostic ? esc(t(...diagnostic)) : ""}</p>
      <div class="source-links"><a href="https://tridos.design/products/ultimate-ssg10-vsr10-piston-cylinder-head-kit" target="_blank" rel="noreferrer">AMP / Tridos</a><a href="https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html" target="_blank" rel="noreferrer">${t("Compressible mass flow", "Stlačivi protok")}</a><a href="https://cris.technion.ac.il/en/publications/the-internal-ballistics-of-airguns/" target="_blank" rel="noreferrer">${t("Thermodynamic model reference", "Referenca termodinamičkog modela")}</a></div></section>`;
    const stage = next.querySelector(".stage"), graphs = next.querySelector(".graphs");
    stage.insertAdjacentHTML("afterbegin", `<p class="playback-reference">${p.airbrakeLength === 0 ? t("Reference shot · airbrake off. No pin dimensions are implied for your AMP/SSG10. Enter your measured pin geometry to enable it; the other starting values are illustrative, not a verified rifle setup.", "Referentni hitac · zračna kočnica isključena. Dimenzije pina vašeg AMP/SSG10 nisu pretpostavljene. Unesite izmjerenu geometriju pina za uključivanje; ostale početne vrijednosti su ilustrativne, ne potvrđena konfiguracija replike.") : t("Airbrake active · motion depends on the entered passage, pin, spring and loss assumptions. Internal timing needs experimental validation.", "Zračna kočnica uključena · gibanje ovisi o unesenom kanalu, pinu, opruzi i gubicima. Unutarnji vremenski odnos traži eksperimentalnu provjeru.")}</p>
      ${s.maxPreContactRetreat > .001 ? `<div class="lab-warning" role="status"><strong>${t("Large predicted reversal — check the model inputs", "Velik predviđeni povrat — provjerite ulaze modela")}</strong><p>${t(`The piston travels backward by up to ${fmt(s.maxPreContactRetreat * 1000, 2)} mm BEFORE touching the head. This is pressure-driven motion in this model, not a bumper bounce or a verified SSG10 prediction. Check pin clearance, head passage, spring force and losses. Motion has not been clipped or forced forward.`, `Piston se vraća do ${fmt(s.maxPreContactRetreat * 1000, 2)} mm PRIJE dodira s glavom. To je gibanje zbog tlaka u modelu, ne odskok od odbojnika ni potvrđeno predviđanje SSG10. Provjerite zazor pina, kanal glave, silu opruge i gubitke. Gibanje nije odrezano ni prisiljeno naprijed.`)}</p></div>` : ""}
      <div class="playback-options"><label for="playbackMode">${t("Playback", "Prikaz")}<select id="playbackMode"><option value="focus" ${!playbackUniform ? "selected" : ""}>${t("Firing focus + faster settling", "Fokus opaljenja + brže smirivanje")}</option><option value="uniform" ${playbackUniform ? "selected" : ""}>${t("Uniform full-run slow motion", "Jednoliko usporena cijela simulacija")}</option></select></label><label for="playbackSpeed">${t("Playback speed", "Brzina prikaza")}<select id="playbackSpeed">${[.5, 1, 2].map(v => `<option value="${v}" ${playbackSpeed === v ? "selected" : ""}>${v}×</option>`).join("")}</select></label></div><p id="playbackPhase" class="small-note" aria-live="off"></p>`);
    stage.insertAdjacentHTML("beforeend", `<p class="small-note">${t("Firing focus reserves 80% of playback for the shot and initial muzzle discharge when a long tail remains; it then speeds through the full settling interval. No motion or events are removed. The clock, scrubber and graph axes always use actual model time. The cylinder and head share one axial drawing scale; the barrel has a separate scale.", "Fokus opaljenja odvaja 80% prikaza za hitac i početno pražnjenje kad preostaje dugo smirivanje; zatim ubrzava prikaz cijelog preostalog intervala. Gibanje i događaji nisu uklonjeni. Sat, klizač i osi grafova uvijek koriste stvarno vrijeme modela. Cilindar i glava imaju zajedničko uzdužno mjerilo; cijev ima zasebno mjerilo.")} ${t("Maximum modeled backward travel", "Najveći modelirani povratni pomak")}: ${fmt(s.maxPistonRetreat * 1000, 3, "mm")}; ${t("before first contact", "prije prvog kontakta")}: ${fmt(s.maxPreContactRetreat * 1000, 3, "mm")}.</p>`);
    const compactMetric = (label, value, note) => `<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
    const summary = [
      compactMetric(t("Predicted exit", "Predviđeni izlazak"), fmt(s.exitEnergy, 3, "J"), `${fmt(fps(s.exitVelocity), 1, "fps")} · ${t("volume ratio", "omjer volumena")} ${fmt(s.ratio, 2)}`),
      compactMetric(t("Piston strike", "Udar pistona"), fmt(s.impactEnergy === null ? null : s.impactEnergy * 1000, 2, "mJ"), s.impactEnergy === null ? t("No contact recorded", "Kontakt nije zabilježen") : t("Contact energy · not dB", "Energija kontakta · ne dB")),
      compactMetric(t("Muzzle pressure", "Tlak na ustima"), fmt(s.exitPressure === null ? null : (s.exitPressure - s.ambientPressure) / 1e5, 2, "bar(g)"), `${t("Peak outflow", "Vršni protok")}: ${fmt(s.exitTime === null ? null : s.peakOutflow * 1000, 2, "g/s")}`),
      compactMetric(t("Useful energy → slowing", "Korisna energija → usporavanje"), fmt(delta, 2, "ms"), delta === null ? t("Timing unavailable", "Vrijeme nije dostupno") : delta === 0 ? t("Threshold and slowing coincide", "Prag i usporavanje se podudaraju") : delta > 0 ? t("Threshold reached first", "Prag je dosegnut prvi") : t("Slowing begins first", "Usporavanje počinje prvo"))
    ].join("");
    globalThis.PneumaticWorkspace.prepareResults(next, summary, {
      timingHTML: I.timingMarkup(s, p, t, fmt, stamp),
      explainSound: t("Piston impact & muzzle blast — what do these mean?", "Udar pistona i prasak na ustima — što to znači?"),
      live: t("Live values · pressure, velocity & spring", "Vrijednosti uživo · tlak, brzina i opruga"),
      help: t("Playback options & model notes", "Opcije prikaza i napomene modela"),
      flag: p.airbrakeLength ? t("Airbrake active · conditional model, not measured performance", "Zračna kočnica uključena · uvjetni model, ne izmjerene performanse") : t("No-airbrake reference · conditional model, not measured performance", "Referenca bez kočnice · uvjetni model, ne izmjerene performanse")
    }, s.complete ? "" : t("Incomplete run: ", "Nezavršena simulacija: ") + (s.exitTime === null ? t("BB has not exited. ", "BB nije izašao. ") : "") + (s.pistonHitTime === null ? t("Piston contact unknown—not a soft landing.", "Kontakt pistona nepoznat — nije mekan udar.") : ""));
    // Stable panel keys keep conditional warnings from replacing neighboring UI.
    for (const parent of [next, stage]) for (const element of parent.children) {
      if (!element.id && element.className) element.setAttribute("data-view-key", element.className);
    }
    next.querySelectorAll("canvas, #liveStrip, #phaseText, #clock, #playbackPhase").forEach(element => element.setAttribute("data-live", ""));
    setResultState("ready");
    globalThis.PneumaticView.patchChildren($("resultContent"), next);
    workspace?.sync();
    setFrame(fraction);
  }
  function bindLanguage() {
    document.querySelectorAll("[data-lang]").forEach(button => button.addEventListener("click", () => {
      if (busy) return;
      language = button.dataset.lang;
      try { localStorage.setItem("ssg10-pneumatic-lab-language", language); } catch (_) { /* no-op */ }
      if (calculationPending) recalculate();
      render();
    }));
  }
  function recalculate() {
    clearTimeout(debounce);
    if (optimizer?.result && JSON.stringify(p) !== JSON.stringify(optimizer.result.base)) invalidateOptimizer();
    stop(); diagnostic = null; calculationPending = false; chartCache.clear();
    shot = P.simulate(p);
    baseline = shot.valid ? P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }) : null;
    if (shot.valid) fraction = Math.min(1, playheadTime / shot.duration);
    updateResults();
  }
  function scheduleCalculation() {
    invalidateOptimizer();
    stop(); clearTimeout(debounce);
    calculationPending = true;
    setResultState("pending");
    debounce = setTimeout(recalculate, 140);
  }
  function syncSetupControls() {
    for (const [key, value] of Object.entries(p)) {
      const input = $(key), range = document.querySelector(`[data-range="${key}"]`);
      if (input?.matches("[data-number]")) input.value = finite(value) ? value : "";
      if (range) range.value = finite(value) ? value : 0;
    }
    for (const [id, value] of Object.entries({ platformPreset: selectedPlatform, component, springLabel, pinLabel })) $(id).value = value;
    $("springLengthMode").checked = p.springLengthMode === 1;
    $("springCurve").value = p.springCurve.map(pair => pair.join(", ")).join("\n");
    document.querySelectorAll("[data-provenance]").forEach(box => { box.checked = provenance[box.dataset.provenance] === "measured"; });
    document.querySelectorAll("[data-mass]").forEach(button => button.setAttribute("aria-pressed", String(p.pistonMass === Number(button.dataset.mass))));
    $("measurementConfirm").checked = false;
    syncSpringControls();
  }
  function bindControls() {
    $("toggleControls").addEventListener("click", e => { const closed = document.querySelector(".controls-panel").classList.toggle("is-collapsed"); e.currentTarget.setAttribute("aria-expanded", String(!closed)); });
    document.querySelectorAll("[data-number], [data-range]").forEach(input => input.addEventListener("input", () => {
      const key = input.dataset.number || input.dataset.range;
      const previous = p[key];
      p[key] = input.value === "" ? NaN : Number(input.value);
      if (optimizer && optimizer.values[key] === String(previous)) optimizer.values[key] = String(p[key]);
      const pair = input.dataset.number ? document.querySelector(`[data-range="${key}"]`) : $(key);
      pair.value = input.value;
      selectedPlatform = "custom"; $("platformPreset").value = "custom";
      if (key.startsWith("airbrake")) { pinLabel = p.airbrakeLength > 0 ? "custom" : "plug"; $("pinLabel").value = pinLabel; }
      if (key.startsWith("spring")) { provenance.spring = "assumed"; invalidateFit(); }
      else if (["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "pistonMass", "bbMass", "bbDiameter", "headBore", "headLength", "nozzleBore", "nozzleLength", "bumperThickness", "restitution", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume"].includes(key)) provenance.geometry = "assumed";
      document.querySelectorAll("[data-provenance]").forEach(box => { box.checked = provenance[box.dataset.provenance] === "measured"; });
      $("measurementConfirm").checked = false;
      document.querySelectorAll("[data-mass]").forEach(button => button.setAttribute("aria-pressed", Number(button.dataset.mass) === p.pistonMass));
      syncSpringControls(); scheduleCalculation();
    }));
    document.querySelectorAll("[data-provenance]").forEach(box => box.addEventListener("change", () => { provenance[box.dataset.provenance] = box.checked ? "measured" : "assumed"; }));
    document.querySelectorAll("[data-mass]").forEach(button => button.addEventListener("click", () => { $("pistonMass").value = button.dataset.mass; $("pistonMass").dispatchEvent(new Event("input", { bubbles: true })); }));
    $("springLengthMode").addEventListener("change", e => {
      p.springLengthMode = e.target.checked ? 1 : 0;
      provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false;
      $("measurementConfirm").checked = false; selectedPlatform = "custom"; $("platformPreset").value = "custom";
      invalidateFit(); syncSpringControls(); scheduleCalculation();
    });
    $("platformPreset").addEventListener("change", event => {
      selectedPlatform = event.target.value;
      const v = platforms[selectedPlatform];
      if (v) {
        p = P.normalize({ cylinderBore: Math.sqrt(v.volume * 1000 / v.stroke / Math.PI) * 2, strokeLength: v.stroke, barrelLength: v.barrel, barrelDiameter: v.bore, pistonMass: v.mass });
        component = selectedPlatform.startsWith("ssg10") ? "amp" : "custom";
        if (component !== "amp") { p.airbrakeLength = 0; p.airbrakeTaper = 0; }
        provenance = { geometry: "assumed", spring: "assumed" }; pinLabel = "plug"; springLabel = "unspecified"; fit = null;
      }
      invalidateFit(); syncSetupControls(); recalculate();
    });
    $("component").addEventListener("change", e => { component = e.target.value; provenance.geometry = "assumed"; document.querySelector('[data-provenance="geometry"]').checked = false; $("measurementConfirm").checked = false; });
    $("springLabel").addEventListener("change", e => { springLabel = e.target.value; provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false; $("measurementConfirm").checked = false; });
    $("pinLabel").addEventListener("change", e => {
      pinLabel = e.target.value; provenance.geometry = "assumed";
      if (pinLabel === "plug") { p.airbrakeLength = 0; p.airbrakeTaper = 0; syncSetupControls(); recalculate(); }
      else { document.querySelector('[data-provenance="geometry"]').checked = false; $("measurementConfirm").checked = false; setStatus("Pin label recorded. Enter its measured projection, diameter and assembled mass; no undocumented dimensions were assigned.", "Oznaka pina je zabilježena. Unesite izmjereno izbočenje, promjer i masu sklopa; nisu dodijeljene nepoznate dimenzije."); }
    });
    $("springCurve").addEventListener("change", e => {
      p.springCurve = e.target.value.trim() ? e.target.value.trim().split(/\n+/).map(line => line.trim().split(/[,;\s]+/).map(Number)) : [];
      provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false; $("measurementConfirm").checked = false; invalidateFit(); syncSpringControls(); scheduleCalculation();
    });
    const energyReadout = () => { $("measurementEnergy").textContent = `${t("Derived energy", "Izvedena energija")}: ${fmt(C.energy(Number($("measurementMass").value), Number($("measurementFps").value)), 3, "J")}`; };
    $("measurementMass").addEventListener("input", energyReadout); $("measurementFps").addEventListener("input", energyReadout); energyReadout();
    $("measurementForm").addEventListener("submit", event => {
      event.preventDefault();
      if (busy) return;
      if (measurements.length >= 2000) { setStatus("Dataset limit: 2,000 shots. Export a backup before removing records.", "Ograničenje: 2000 hitaca. Izvezite sigurnosnu kopiju prije uklanjanja zapisa."); return; }
      const confirmed = $("measurementConfirm").checked, mass = Number($("measurementMass").value);
      if (confirmed && P.validate({ ...p, bbMass: mass }).length) { setStatus("Correct invalid setup inputs before recording a confirmed shot.", "Ispravite nevaljane ulaze prije spremanja potvrđenog hica."); return; }
      const row = C.cleanRecord({ id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, bbMass: mass, fps: Number($("measurementFps").value), sigma: Number($("measurementSigma").value),
        setup: confirmed ? { ...clone(p), bbMass: mass } : null, confirmed, provenance: clone(provenance), role: $("measurementRole").value, solverVersion: P.VERSION,
        notes: `${component} / ${pinLabel} / ${springLabel}. ${$("measurementNotes").value}` });
      if (!row) return;
      measurements.push(row); invalidateFit(); save(); renderMeasurements(); setStatus("Shot saved; previous fit cleared. Only eligible training shots enter a fit; setup metadata remains attached to this record.", "Hitac je spremljen; prethodna prilagodba poništena je. Samo prikladni podaci ulaze u prilagodbu; konfiguracija ostaje pridružena zapisu.");
    });
    $("exportMeasurements").addEventListener("click", () => download("airsoft-chrono-data.json", { ...C.encode(measurements), lastFit: fit }));
    $("importMeasurements").addEventListener("change", async e => {
      if (busy || !e.target.files[0]) return;
      try {
        const file = e.target.files[0]; if (file.size > 8e6) throw new Error("size");
        const data = C.decode(await file.text());
        if (measurements.length + data.measurements.length > 2000) throw new Error("record limit");
        const ids = new Set(measurements.map(r => r.id));
        for (const row of data.measurements) { if (ids.has(row.id)) row.id += `-import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; measurements.push(row); ids.add(row.id); }
        invalidateFit(); save(); renderMeasurements(); setStatus(`Imported ${data.measurements.length} shots. Existing data was kept; previous fit cleared; legacy records are unverified references.`, `Uvezeno je ${data.measurements.length} hitaca. Postojeći podaci sačuvani su; prethodna prilagodba poništena je; stari zapisi ostaju nepotvrđene reference.`);
      } catch (_) { setStatus("Import rejected: invalid JSON, unsupported records, file too large or 2,000-shot limit exceeded. Existing data was not changed.", "Uvoz odbijen: nevaljan JSON, nepodržani zapisi, prevelika datoteka ili više od 2000 hitaca. Postojeći podaci nisu promijenjeni."); }
    });
    $("fitButton").addEventListener("click", async () => {
      if (busy) return;
      stop(); clearTimeout(debounce);
      if (calculationPending) recalculate();
      setBusy(true); setStatus("Fitting one discharge coefficient. This cannot establish accurate internal timing…", "Prilagođavanje jednog koeficijenta protoka. To ne potvrđuje točnost unutarnjeg vremenskog odnosa…");
      try {
        fit = await C.fitLoss(clone(measurements), n => setStatus(`Evaluating fit ${n}…`, `Provjera prilagodbe ${n}…`));
        const en = `Cd = ${fit.coefficient.toFixed(4)}. Training RMSE ${fmt(fit.training.rmse, 2)} fps (${fit.training.count} shots, ${fit.distinctTrainingSetups} distinct setups). Held-out RMSE ${fmt(fit.validation.rmse, 2)} fps (${fit.validation.count} shots; ${fit.validation.failures} failed predictions).${fit.boundReached ? " Parameter bound reached." : ""}${fit.weaklyConstrained ? " Cd is weakly constrained by these data." : ""} No timing validation.`;
        const hr = `Cd = ${fit.coefficient.toFixed(4)}. RMSE prilagodbe ${fmt(fit.training.rmse, 2)} fps (${fit.training.count} hitaca, ${fit.distinctTrainingSetups} različitih konfiguracija). Neovisni RMSE ${fmt(fit.validation.rmse, 2)} fps (${fit.validation.count} hitaca; ${fit.validation.failures} neuspjelih predviđanja).${fit.boundReached ? " Dosegnuta granica parametra." : ""}${fit.weaklyConstrained ? " Ovi podaci slabo određuju Cd." : ""} Vremenski odnos nije potvrđen.`;
        setStatus(en, hr);
        $("fitReport").innerHTML = `<button class="secondary-button" type="button" id="applyFit">${t("Apply fitted Cd to current setup", "Primijeni prilagođeni Cd na trenutačnu konfiguraciju")}</button>`;
        $("applyFit").addEventListener("click", () => { p.dischargeCoefficient = fit.coefficient; $("dischargeCoefficient").value = p.dischargeCoefficient; document.querySelector('[data-range="dischargeCoefficient"]').value = p.dischargeCoefficient; $("measurementConfirm").checked = false; recalculate(); });
      } catch (error) { setStatus(error.message === "fit:too-many-configurations" ? "Fit limit: 32 distinct configurations per dataset." : "Fit unavailable: add confirmed training shots with measured geometry/masses and spring data; each candidate must produce a valid exit.", error.message === "fit:too-many-configurations" ? "Ograničenje prilagodbe: 32 različite konfiguracije po skupu." : "Prilagodba nije dostupna: dodajte potvrđene podatke s izmjerenom geometrijom/masama i oprugom; svaki kandidat mora dati valjan izlazak BB-a."); }
      finally { setBusy(false); }
    });
  }
  function renderMeasurements() {
    if (!$("measurementRows")) return;
    $("measurementRows").innerHTML = measurements.map((r, i) => `<tr><td>${fmt(r.bbMass, 2, "g")}</td><td>${fmt(r.fps, 1)} / ${fmt(C.energy(r.bbMass, r.fps), 3)}</td><td>${r.role === "train" ? t("Training", "Prilagodba") : r.role === "validation" ? t("Held-out", "Neovisna provjera") : t("Reference only", "Samo referenca")}<br><small>${C.eligible(r) ? t("Measured inputs confirmed", "Izmjereni ulazi potvrđeni") : t("Not fit-eligible", "Nije prikladno za prilagodbu")}${r.setup ? ` · ${fmt(r.setup.pistonMass, 1, "g")} / ${fmt(r.setup.barrelLength, 0, "mm")}` : ` · ${t("setup incomplete", "nepotpuna konfiguracija")}`}</small></td><td>${esc(r.notes)}</td><td><button type="button" class="danger-button" data-remove="${i}" aria-label="${t("Remove shot", "Ukloni hitac")} ${i + 1}">×</button></td></tr>`).join("");
    document.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => {
      if (busy) return;
      const i = Number(button.dataset.remove);
      if (!confirm(t("Remove this measurement from browser storage? Export first if you need a backup.", "Ukloniti ovo mjerenje iz pohrane preglednika? Najprije izvezite podatke ako trebate kopiju."))) return;
      measurements.splice(i, 1); invalidateFit(); save(); renderMeasurements(); setStatus("Measurement removed from browser storage; previous fit cleared. An earlier export can restore the measurement.", "Mjerenje je uklonjeno iz pohrane preglednika; prethodna prilagodba poništena je. Mjerenje se može vratiti iz ranijeg izvoza.");
    }));
  }
  function setBusy(value) {
    busy = value;
    document.querySelectorAll("button, input, select, textarea").forEach(el => { if (value) { el.dataset.preDisabled = el.disabled ? "1" : "0"; el.disabled = true; } else { el.disabled = el.dataset.preDisabled === "1"; delete el.dataset.preDisabled; } });
    if (!value && location.hash !== "#pneumatic-timing") render();
  }
  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function startPlayback() {
    if (calculationPending || !shot?.valid || busy) return;
    if (fraction > .999) fraction = 0;
    playing = true; $("playButton").textContent = t("Pause", "Pauza");
    const timeline = B.timeline(shot, playbackUniform), screenMs = 8000 / playbackSpeed;
    const start = performance.now() - timeline.progressAt(fraction * shot.duration) * screenMs;
    function tick(now) {
      if (!playing) return;
      const progress = Math.min(1, (now - start) / screenMs);
      setFrame(timeline.timeAt(progress) / shot.duration);
      if (progress >= 1) stop(); else animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
  }
  function bindResults() {
    // One delegated handler per event, installed only when the shell mounts.
    const results = $("results");
    results.onclick = event => {
      if (calculationPending || !shot?.valid || busy) return;
      const button = event.target.closest("button");
      if (!button || button.disabled || !results.contains(button)) return;
      if (button.dataset.event) {
        const time = shot[button.dataset.event];
        if (time !== null) { stop(); setFrame(time / shot.duration); }
      } else if (button.id === "playButton") { if (playing) stop(); else startPlayback(); }
      else if (button.id === "resetButton") { stop(); setFrame(0); }
      else if (button.id === "convergenceButton") runDiagnostic("convergence");
      else if (button.id === "sensitivityButton") runDiagnostic("sensitivity");
      else if (button.id === "explainSound") {
        stop(); workspace.selectView("details"); $("workspaceBody").scrollTop = 0;
        $("soundExplanations").focus({ preventScroll: true });
        if (window.innerWidth <= 960) $("previewPanel").scrollIntoView({ block: "start" });
      }
      else if (button.id === "exportRun") download("airsoft-pneumatic-run.json", { schemaVersion: 3, solverVersion: P.VERSION, identity: { selectedPlatform, component, springLabel, pinLabel }, provenance, setup: p, result: shot, baseline: { exitEnergy: baseline?.exitEnergy ?? null, impactEnergy: baseline?.impactEnergy ?? null }, limitations: "Unvalidated two-volume, leaky-piston model; not exact joules or dB; see docs/MODEL.md" });
    };
    results.oninput = event => {
      if (calculationPending || !shot?.valid || busy) return;
      if (event.target.id === "scrubber") { stop(); setFrame(Number(event.target.value) / 1000); }
    };
    results.onchange = event => {
      if (calculationPending || !shot?.valid || busy) return;
      if (event.target.id === "playbackMode") { stop(); playbackUniform = event.target.value === "uniform"; setFrame(fraction); }
      if (event.target.id === "playbackSpeed") { stop(); playbackSpeed = Number(event.target.value); }
    };
  }
  async function runDiagnostic(mode) {
    if (busy || calculationPending || !shot?.valid) return;
    stop(); setBusy(true);
    $("diagnosticReport").textContent = t("Computing diagnostic runs…", "Računanje provjernih simulacija…");
    const setup = clone(p), original = shot;
    await new Promise(resolve => setTimeout(resolve, 20));
    try {
      if (mode === "convergence") {
        const a = P.simulate(setup, { dt: 5e-6, tolerance: 5e-6 }), b = P.simulate(setup, { dt: 2.5e-6, tolerance: 1.25e-6 });
        const difference = (one, two, k, scale = 1) => one.valid && two.valid && one[k] !== null && two[k] !== null ? Math.abs(one[k] - two[k]) * scale : null;
        const dv = difference(a, b, "exitVelocity"), dt = difference(a, b, "exitTime", 1000), contact = difference(a, b, "impactEnergy", 1000);
        diagnostic = [
          `Between 5 and 2.5 μs limits: speed Δ ${fmt(dv, 4, "m/s")}; exit time Δ ${fmt(dt, 4, "ms")}; contact energy Δ ${fmt(contact, 4, "mJ")}. Energy residuals: ${[original, a, b].map(s => fmt(s.energyResidual * 1000, 4)).join(" / ")} mJ. Missing events stay unavailable. Numerical convergence is not experimental validation.`,
          `Između ograničenja 5 i 2,5 μs: brzina Δ ${fmt(dv, 4, "m/s")}; vrijeme izlaska Δ ${fmt(dt, 4, "ms")}; energija kontakta Δ ${fmt(contact, 4, "mJ")}. Odstupanja energije: ${[original, a, b].map(s => fmt(s.energyResidual * 1000, 4)).join(" / ")} mJ. Nedostajući događaji nisu dostupni. Numerička konvergencija nije eksperimentalna potvrda.`
        ];
      } else {
        const runs = [];
        for (const head of [-.02, .02]) for (const pin of [-.02, .02]) for (const spring of [.95, 1.05]) {
          runs.push(P.simulate({ ...setup, headBore: setup.headBore + head, airbrakeDiameter: setup.airbrakeDiameter + pin, springStiffness: setup.springStiffness * spring, springCurve: setup.springCurve.map(([x, f]) => [x, f * spring]) }, { sampleInterval: 1 }));
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        const speeds = runs.filter(s => s.valid && s.exitVelocity !== null).map(s => fps(s.exitVelocity));
        const margins = runs.filter(s => s.valid && s.usefulTime !== null && s.strongBrakeTime !== null).map(s => (s.strongBrakeTime - s.usefulTime) * 1000);
        const range = (values, unit) => values.length ? `${fmt(Math.min(...values), 2)} … ${fmt(Math.max(...values), 2, unit)}` : "—";
        diagnostic = [
          `Eight-corner sensitivity: exit speed ${range(speeds, "fps")}; energy-threshold → slowing margin ${range(margins, "ms")}. ${8 - speeds.length} cases had no valid exit; ${8 - margins.length} had no comparable timing events. These ranges are not confidence intervals and do not include model-form error.`,
          `Osjetljivost u osam rubnih kombinacija: izlazna brzina ${range(speeds, "fps")}; razmak prag energije → usporavanje ${range(margins, "ms")}. ${8 - speeds.length} slučajeva bez valjanog izlaska; ${8 - margins.length} bez usporedivih događaja. Rasponi nisu intervali pouzdanosti i ne uključuju pogrešku fizikalnog modela.`
        ];
      }
      if ($("diagnosticReport")) $("diagnosticReport").textContent = t(...diagnostic);
    } finally { setBusy(false); }
  }
  function stop() { playing = false; cancelAnimationFrame(animation); if ($("playButton")) $("playButton").textContent = t("Fire / play", "Opali / pokreni"); }
  function atTime(time) {
    return B.frameAt(shot, time);
  }
  function setFrame(next) {
    if (calculationPending || !shot?.valid || !$("mechanism")) return;
    fraction = Math.max(0, Math.min(1, next));
    const f = atTime(shot.duration * fraction);
    playheadTime = f.t;
    $("scrubber").value = fraction * 1000; $("clock").textContent = stamp(f.t);
    const timeline = B.timeline(shot, playbackUniform);
    $("playbackPhase").textContent = playbackUniform || timeline.split === 1 ? t("Uniform slow motion · clock shows actual model time", "Jednoliko usporeno · sat prikazuje stvarno vrijeme modela") : f.t <= timeline.focusEnd ? t("Firing focus · slower playback", "Fokus opaljenja · sporiji prikaz") : t("Post-exit settling · faster playback, no states removed", "Smirivanje nakon izlaska · brži prikaz, bez uklanjanja stanja");
    const parts = [];
    if (f.t === 0) parts.push(t("Spring held; gas at atmospheric pressure.", "Opruga zapeta; plin na atmosferskom tlaku."));
    else {
      if (f.pistonV < -.005) parts.push(f.pistonHit ? t("Modeled reverse motion after head contact.", "Modelirano povratno gibanje nakon kontakta s glavom.") : t("Modeled pressure-driven reversal before head contact; not verified rifle behavior.", "Modelirani povrat zbog tlaka prije kontakta s glavom; nije potvrđeno gibanje replike."));
      else if (f.pistonV > .02) parts.push(f.pistonA < 0 ? t("Piston decelerating.", "Piston usporava.") : t("Spring releasing; piston accelerating.", "Opruga se otpušta; piston ubrzava."));
      else parts.push(t("Piston at rest or turning.", "Piston miruje ili mijenja smjer."));
      if (f.insertion > 0) parts.push(t("Pin overlaps the passage; pressure difference and clearance set airflow.", "Pin ulazi u kanal; razlika tlaka i zazor određuju protok."));
      if (f.bbExited) parts.push(t("BB has exited; gas continues to flow through the muzzle.", "BB je izašao; plin se nastavlja prazniti kroz usta cijevi."));
      else if (Math.abs(f.bbV) < .01) parts.push(t("BB held or stalled.", "BB zadržan ili zaustavljen."));
      else parts.push(f.bbA >= 0 ? t("BB gaining speed in the barrel.", "BB ubrzava u cijevi.") : t("BB losing speed in the barrel.", "BB usporava u cijevi."));
      if (f.pistonHit) parts.push(p.bumperThickness > 0 ? t("The piston has contacted the added head bumper.", "Piston je dotaknuo dodatnu odbojnu gumicu glave.") : t("First rigid-head contact has occurred.", "Dogodio se prvi kontakt s krutom glavom."));
    }
    $("phaseText").textContent = parts.join(" ");
    const liveValues = [
      [t("Cylinder / BB pressure", "Tlak cilindra / iza BB-a"), `${fmt((f.cylinderPressure - shot.ambientPressure) / 1e5, 2)} / ${fmt((f.pressure - shot.ambientPressure) / 1e5, 2, "bar(g)")}`],
      [t("Piston velocity", "Brzina pistona"), fmt(f.pistonV, 2, "m/s")],
      [t("Piston travel / bumper contact", "Pomak pistona / kontakt s gumicom"), `${fmt(f.pistonX * 1000, 2)} / ${fmt(shot.stroke * 1000, 1, "mm")}`],
      [t("Piston momentum", "Količina gibanja pistona"), fmt(f.pistonV * p.pistonMass / 1000, 3, "kg·m/s")],
      [t("BB velocity", "Brzina BB-a"), fmt(f.bbV, 2, "m/s")],
      [t("BB acceleration", "Ubrzanje BB-a"), fmt(f.bbA, 0, "m/s²")],
      [t("Head airflow", "Protok kroz glavu"), fmt(f.flow * 1000, 3, "g/s")],
      [t("Spring compression", "Stlačenje opruge"), fmt(P.springState(p).cockedCompression - f.pistonX * 1000, 1, "mm")],
      [t("Spring force", "Sila opruge"), fmt(P.springForce(p, f.pistonX), 2, "N")]
    ];
    if (!$("liveStrip").firstChild) $("liveStrip").innerHTML = liveValues.map(() => '<div class="live-item"><span></span><strong></strong></div>').join("");
    liveValues.forEach(([label, value], index) => {
      const item = $("liveStrip").children[index];
      if (item.firstChild.textContent !== label) item.firstChild.textContent = label;
      if (item.lastChild.textContent !== value) item.lastChild.textContent = value;
    });
    if (workspaceState.view === "shot") drawMechanism(f);
    if (workspaceState.view === "graphs") drawCharts(f.t);
  }
  function canvasContext(id, fallbackWidth = 900, fallbackHeight = 300) {
    const canvas = $(id), rect = canvas.getBoundingClientRect(), w = rect.width || fallbackWidth, h = rect.height || fallbackHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h };
  }
  function drawMechanism(f) {
    const { ctx, w, h } = canvasContext("mechanism");
    globalThis.PneumaticAnimation.draw(ctx, w, h, p, shot, f, t, fmt);
  }
  function drawCharts(time) {
    const traces = [
      ["pressureChart", [[f => (f.cylinderPressure - shot.ambientPressure) / 1e5, "#ffbf69"], [f => (f.pressure - shot.ambientPressure) / 1e5, "#5de4e7"]]],
      ["pistonChart", [[f => f.pistonV, "#ffbf69"]]], ["bbChart", [[f => f.bbV, "#5de4e7"]]]
    ];
    for (const [id, series] of traces) {
      const { ctx, w, h } = canvasContext(id, 300, 200), left = 44, right = w - 12, top = 18, bottom = h - 28;
      let cached = chartCache.get(id);
      if (!cached || cached.w !== w || cached.h !== h || cached.shot !== shot || cached.dpr !== devicePixelRatio) {
      let lo = 0, hi = 0;
      for (const [value] of series) for (const f of shot.frames) { const v = value(f); lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const span = Math.max(.1, hi - lo); lo -= span * .06; hi += span * .08;
      const x = v => left + v / shot.duration * (right - left), y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
      ctx.font = "12px ui-monospace, monospace"; ctx.textAlign = "right";
      for (let i = 0; i < 4; i++) { const v = lo + (hi - lo) * i / 3, yy = y(v); ctx.strokeStyle = "#28343c"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke(); ctx.fillStyle = "#91a0a7"; ctx.fillText(v.toFixed(hi > 20 ? 0 : 1), left - 6, yy + 4); }
      ctx.strokeStyle = "#62757d"; ctx.beginPath(); ctx.moveTo(left, y(0)); ctx.lineTo(right, y(0)); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
      for (const [get, color] of series) { ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath(); shot.frames.forEach((f, i) => { if (i) ctx.lineTo(x(f.t), y(get(f))); else ctx.moveTo(x(f.t), y(get(f))); }); ctx.stroke(); }
      for (const [key, color] of [["usefulTime", "#6ee7a8"], ["strongBrakeTime", "#ffbf69"], ["exitTime", "#5de4e7"]]) {
        if (shot[key] === null) continue;
        ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash(key === "strongBrakeTime" ? [4, 4] : [2, 3]); ctx.beginPath(); ctx.moveTo(x(shot[key]), top); ctx.lineTo(x(shot[key]), bottom); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();
      ctx.textAlign = "left"; ctx.fillStyle = "#91a0a7"; ctx.fillText("0", left, h - 7); ctx.textAlign = "right"; ctx.fillText(`${(shot.duration * 1000).toFixed(0)} ms`, right, h - 7);
      const bitmap = document.createElement("canvas");
      bitmap.width = $(id).width; bitmap.height = $(id).height;
      bitmap.getContext("2d").drawImage($(id), 0, 0);
      cached = { bitmap, w, h, shot, dpr: devicePixelRatio }; chartCache.set(id, cached);
      } else ctx.drawImage(cached.bitmap, 0, 0, w, h);
      const cursor = left + time / shot.duration * (right - left);
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cursor, top); ctx.lineTo(cursor, bottom); ctx.stroke(); ctx.restore();
    }
  }
  window.addEventListener("hashchange", () => { if (busy) return; clearTimeout(debounce); if (location.hash === "#pneumatic-timing") recalculate(); render(); });
  window.addEventListener("resize", () => { if (shot?.valid && $("mechanism")) setFrame(fraction); });
  if (location.hash === "#pneumatic-timing") { shot = P.simulate(p); baseline = P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }); }
  render();
})();
