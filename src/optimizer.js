/* Bounded hardware-only search. Rankings are engineering preferences, not acoustics. */
(function (root) {
  "use strict";
  const VERSION = "2.0.0";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const GROUPS = Object.freeze({
    cylinder: ["cylinderBore", "strokeLength", "deadVolume"],
    barrel: ["barrelLength", "barrelDiameter", "frontDeadVolume"],
    head: ["headBore", "headLength", "nozzleBore", "nozzleLength", "bumperThickness", "bumperBore", "bumperStiffness", "bumperDamping", "bumperMaxCompression", "breechVolume"],
    piston: ["pistonMass"],
    airbrake: ["airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper"],
    spring: ["springStiffness", "springPreload", "springMass", "springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils"],
    bb: ["bbMass", "bbDiameter"]
  });
  const LIMITS = Object.freeze({ cylinderBore: [15,35], strokeLength: [20,150], deadVolume: [.05,5], barrelLength: [100,800], barrelDiameter: [5.8,6.5], frontDeadVolume: [.001,2], headBore: [1,10], headLength: [1,40], nozzleBore: [1,10], nozzleLength: [1,50], bumperThickness: [0,20], bumperBore: [.5,30], bumperStiffness: [0,5000], bumperDamping: [0,1000], bumperMaxCompression: [0,10], breechVolume: [.05,5], pistonMass: [5,300], airbrakeLength: [0,40], airbrakeDiameter: [.5,9], airbrakeTipDiameter: [0,9], airbrakeTaper: [0,10], springStiffness: [0,4000], springPreload: [0,150], springMass: [0,100], springFreeLength: [0,500], springInstalledLength: [0,500], springCutLength: [0,400], springActiveCoils: [0,200], springRemovedCoils: [0,200], bbMass: [.1,1], bbDiameter: [5.5,6.4] });
  const WEIGHTS = Object.freeze({ balanced: [.30,.17,.13,.25,.15], quiet: [.38,.20,.17,.10,.15], efficient: [.12,.08,.05,.60,.15] });
  const HORIZON_MS = 250;
  const clone = v => JSON.parse(JSON.stringify(v));
  function fixedReason(p, key) {
    if (p.springCurve.length && ["springStiffness", "springMass", "springFreeLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"].includes(key)) return "measured-spring";
    if (p.bumperCurve.length && key === "bumperStiffness") return "measured-bumper";
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
    const contacts = Array.isArray(shot.pistonImpacts) ? shot.pistonImpacts : [];
    if (contacts.some(event => event.complete === false)) return { reason: "unfinished" };
    const springWork = P.springEnergy(params, 0);
    if (!(springWork > 0) || !Number.isFinite(shot.peakOutflow) || !Number.isFinite(shot.exitPressure) || !Number.isFinite(shot.energyResidual) || Math.abs(shot.energyResidual) > .001 * springWork) return { reason: "numerical" };
    const efficiency = shot.exitEnergy / springWork;
    if (!(efficiency > 0 && efficiency <= 1.001) || shot.impactEnergy < 0 || shot.peakOutflow < 0) return { reason: "numerical" };
    const contactDissipation = contacts.length ? contacts.reduce((sum, event) => sum + Math.max(0, Number.isFinite(event.dissipatedEnergy) ? event.dissipatedEnergy : event.pistonEnergy || 0), 0) : shot.impactEnergy;
    const timingRisk = shot.waveDiagnostics?.timingRatio === null || shot.waveDiagnostics?.timingRatio === undefined ? 0 : Math.min(2, shot.waveDiagnostics.timingRatio);
    const uncertainty = (shot.waveDiagnostics?.relativePressureSpan || 0) + timingRisk;
    const metrics = { energy: shot.exitEnergy, velocity: shot.exitVelocity, efficiency, springWork,
      impact: contactDissipation, firstImpact: shot.impactEnergy, contactCount: contacts.length || 1,
      outflow: shot.peakOutflow, exitGauge: Math.max(0, shot.exitPressure - shot.ambientPressure), uncertainty,
      timingMargin: shot.strongBrakeTime !== null && shot.usefulTime !== null ? shot.strongBrakeTime - shot.usefulTime : null,
      contactTime: shot.pistonHitTime, duration: shot.duration, energyResidual: shot.energyResidual };
    return { reason: null, metrics, vector: [metrics.impact, metrics.outflow, metrics.exitGauge, -metrics.efficiency, metrics.uncertainty] };
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
        if (fixedReason(next, key)) throw new Error("optimizer:fixed-input-law");
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
