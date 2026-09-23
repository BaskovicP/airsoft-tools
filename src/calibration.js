(function (root) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const SCHEMA = 3, KEY = "ssg10-pneumatic-lab-v3", OLD_KEY = "ssg10-pneumatic-lab-v2";
  const LENGTH_FIELDS = ["springLengthMode", "springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"];
  const BUMPER_FIELDS = ["bumperThickness", "bumperBore"];
  const MODEL_34_FIELDS = ["bumperStiffness", "bumperDamping", "bumperMaxCompression", "muzzleDischargeCoefficient"];
  const MODEL_40_FIELDS = ["frontDeadVolume", "bumperCurve"];
  const MODEL_41_FIELDS = ["silencerEnabled", "silencerLength", "silencerInnerDiameter", "silencerBaffleCount", "silencerBaffleThickness", "silencerBaffleBore", "silencerEndCapBore", "silencerPackingFraction", "silencerDischargeCoefficient", "silencerHeatTransfer"];
  const PARAMETER_SPECS = Object.freeze({
    dischargeCoefficient: { min: .1, max: 1 }, muzzleDischargeCoefficient: { min: .1, max: 1 },
    silencerDischargeCoefficient: { min: .1, max: 1 },
    bbLeakCoefficient: { min: 0, max: 1 }, barrelDrag: { min: 0, max: 2 },
    pistonFriction: { min: 0, max: 20 }, sealFriction: { min: 0, max: .2 },
    bumperStiffness: { min: 10, max: 5000 }, bumperDamping: { min: 0, max: 1000 },
    springStiffness: { min: 100, max: 4000 }
  });
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
    // Only fill fields that did not exist in an otherwise complete historical
    // snapshot. v3.2 used headBore as the implicit bumper opening, so preserve
    // that geometry explicitly instead of inventing the new default.
    const missingByVersion = {
      "4.0.0": MODEL_41_FIELDS,
      "3.4.0": [...MODEL_40_FIELDS, ...MODEL_41_FIELDS],
      "3.0.0": [...LENGTH_FIELDS, ...BUMPER_FIELDS, ...MODEL_34_FIELDS, ...MODEL_40_FIELDS, ...MODEL_41_FIELDS],
      "3.1.1": [...BUMPER_FIELDS, ...MODEL_34_FIELDS, ...MODEL_40_FIELDS, ...MODEL_41_FIELDS],
      "3.2.0": ["bumperBore", ...MODEL_34_FIELDS, ...MODEL_40_FIELDS, ...MODEL_41_FIELDS],
      "3.3.0": [...MODEL_34_FIELDS, ...MODEL_40_FIELDS, ...MODEL_41_FIELDS]
    };
    const expectedMissing = missingByVersion[row.solverVersion];
    const previousComplete = row.setup && expectedMissing && expectedMissing.every(k => !Object.hasOwn(row.setup, k)) && Object.keys(P.DEFAULTS).filter(k => !expectedMissing.includes(k)).every(k => Object.hasOwn(row.setup, k));
    const setupComplete = row.setup && (previousComplete || Object.keys(P.DEFAULTS).every(k => Object.hasOwn(row.setup, k)));
    const migratedSetup = previousComplete ? { ...row.setup,
      ...(!Object.hasOwn(row.setup, "bumperThickness") ? { bumperThickness: 0 } : {}),
      ...(!Object.hasOwn(row.setup, "bumperBore") ? { bumperBore: row.setup.headBore } : {}),
      ...Object.fromEntries([...MODEL_34_FIELDS, ...MODEL_40_FIELDS, ...MODEL_41_FIELDS].filter(key => !Object.hasOwn(row.setup, key)).map(key => [key, P.DEFAULTS[key]]))
    } : row.setup;
    const setup = !legacy && setupComplete && P.validate(migratedSetup).length === 0 ? P.normalize(migratedSetup) : null;
    const provenance = Object.fromEntries(Object.entries(row.provenance || {}).filter(([k, v]) => ["geometry", "spring"].includes(k) && ["assumed", "measured"].includes(v)));
    const confirmed = row.confirmed === true && Boolean(setup);
    const role = confirmed && ["train", "validation"].includes(row.role) ? row.role : "reference";
    const optional = (value, low, high) => { if (value === "" || value === null || value === undefined) return null; const number = Number(value); return Number.isFinite(number) && number >= low && number <= high ? number : null; };
    return { id: String(row.id || `measurement-${Math.random().toString(36).slice(2)}`).slice(0, 100), bbMass: mass, fps: speed, sigma: sigma > 0 && sigma <= 100 ? sigma : 1,
      pistonHitMs: optional(row.pistonHitMs, 0, 1000), pistonHitSigmaMs: optional(row.pistonHitSigmaMs, .001, 100) || .1,
      peakCylinderBarG: optional(row.peakCylinderBarG, 0, 100), peakCylinderSigmaBar: optional(row.peakCylinderSigmaBar, .001, 20) || .05,
      peakSilencerBarG: optional(row.peakSilencerBarG, 0, 100), peakSilencerSigmaBar: optional(row.peakSilencerSigmaBar, .001, 20) || .05,
      peakBumperForceN: optional(row.peakBumperForceN, 0, 100000), peakBumperForceSigmaN: optional(row.peakBumperForceSigmaN, .01, 10000) || 5,
      soundPeakDb: optional(row.soundPeakDb, 20, 180), soundSigmaDb: optional(row.soundSigmaDb, .1, 30) || 2,
      soundDistanceM: optional(row.soundDistanceM, .05, 100),
      soundImpactSourceJ: optional(row.soundImpactSourceJ, 0, 1000), soundGasSourceJ: optional(row.soundGasSourceJ, 0, 1000),
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
  function groups(rows, fitted = ["dischargeCoefficient"]) {
    const map = new Map();
    for (const r of rows) {
      const setup = { ...r.setup, bbMass: r.bbMass };
      const identity = Object.fromEntries(Object.entries(setup).filter(([k]) => ![...fitted, "maxTime", "decelThreshold", "usefulFraction", ...LENGTH_FIELDS].includes(k)));
      // Only the force/compression law enters the ODE. Hidden inputs and alternate
      // ways of entering that same law cannot manufacture independent conditions.
      const spring = P.springState(setup);
      identity.springPreload = spring.preload;
      if (setup.springCurve.length) delete identity.springStiffness;
      else if (!fitted.includes("springStiffness")) identity.springStiffness = spring.stiffness;
      const key = JSON.stringify(identity);
      if (!map.has(key)) map.set(key, { setup, rows: [] });
      map.get(key).setup.maxTime = Math.max(map.get(key).setup.maxTime, setup.maxTime);
      map.get(key).rows.push(r);
    }
    return [...map.values()];
  }
  function residualTerms(shot, row) {
    if (!shot.valid || shot.exitVelocity === null) return null;
    const terms = [{ kind: "fps", raw: fps(shot.exitVelocity) - row.fps, sigma: row.sigma }];
    if (Number.isFinite(row.pistonHitMs)) {
      if (shot.pistonHitTime === null) return null;
      terms.push({ kind: "pistonHitMs", raw: shot.pistonHitTime * 1000 - row.pistonHitMs, sigma: row.pistonHitSigmaMs });
    }
    if (Number.isFinite(row.peakCylinderBarG)) terms.push({ kind: "peakCylinderBarG", raw: (shot.peakCylinderPressure - shot.ambientPressure) / 1e5 - row.peakCylinderBarG, sigma: row.peakCylinderSigmaBar });
    if (Number.isFinite(row.peakSilencerBarG)) terms.push({ kind: "peakSilencerBarG", raw: (shot.peakSilencerPressure - shot.ambientPressure) / 1e5 - row.peakSilencerBarG, sigma: row.peakSilencerSigmaBar });
    if (Number.isFinite(row.peakBumperForceN)) {
      if (!Number.isFinite(shot.peakBumperForce)) return null;
      terms.push({ kind: "peakBumperForceN", raw: shot.peakBumperForce - row.peakBumperForceN, sigma: row.peakBumperForceSigmaN });
    }
    return terms;
  }
  async function fitParameters(rows, names = ["dischargeCoefficient"], onProgress = () => {}, simulate = P.simulate) {
    const parameters = [...new Set(names)];
    if (!parameters.length || parameters.length > 3 || parameters.some(name => !PARAMETER_SPECS[name])) throw new Error("fit:parameters");
    const training = groups(rows.filter(r => eligible(r) && r.role === "train"), parameters);
    const validation = groups(rows.filter(r => eligible(r) && r.role === "validation"), parameters);
    if (!training.length) throw new Error("fit:no-eligible-data");
    if (training.length + validation.length > 32) throw new Error("fit:too-many-configurations");
    if (training.length < parameters.length) throw new Error("fit:not-identifiable");
    if (parameters.includes("springStiffness") && training.some(group => group.setup.springCurve.length)) throw new Error("fit:measured-spring");
    if (parameters.includes("bumperStiffness") && training.some(group => group.setup.bumperCurve.length)) throw new Error("fit:measured-bumper");
    if (parameters.includes("silencerDischargeCoefficient") && training.every(group => group.setup.silencerEnabled !== 1)) throw new Error("fit:silencer-disabled");
    const profile = [];
    async function loss(values) {
      let weighted = 0, n = 0;
      for (const group of training) {
        const s = simulate({ ...group.setup, ...values }, { sampleInterval: 1 });
        for (const r of group.rows) {
          const terms = residualTerms(s, r); if (!terms) return Infinity;
          for (const term of terms) { weighted += (term.raw / term.sigma) ** 2; n++; }
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const value = weighted / n;
      profile.push({ parameters: { ...values }, weightedMSE: value });
      onProgress(profile.length);
      await new Promise(resolve => setTimeout(resolve, 0));
      return value;
    }
    let bestValues = Object.fromEntries(parameters.map(name => [name, training[0].setup[name]]));
    let bestLoss = await loss(bestValues);
    const cycles = parameters.length === 1 ? 1 : 2, iterations = parameters.length === 1 ? 16 : 7;
    for (let cycle = 0; cycle < cycles; cycle++) for (const name of parameters) {
      const spec = PARAMETER_SPECS[name]; let lo = spec.min, hi = spec.max;
      if (cycle > 0) { const radius = (spec.max - spec.min) / 6 ** cycle; lo = Math.max(spec.min, bestValues[name] - radius); hi = Math.min(spec.max, bestValues[name] + radius); }
      for (let iteration = 0; iteration < iterations; iteration++) {
        const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
        const va = { ...bestValues, [name]: a }, vb = { ...bestValues, [name]: b };
        const la = await loss(va), lb = await loss(vb);
        if (la < lb) { hi = b; if (la < bestLoss) { bestLoss = la; bestValues = va; } }
        else { lo = a; if (lb < bestLoss) { bestLoss = lb; bestValues = vb; } }
      }
    }
    const best = profile.filter(v => Number.isFinite(v.weightedMSE)).sort((a, b) => a.weightedMSE - b.weightedMSE)[0];
    if (!best) throw new Error("fit:no-valid-exit");
    bestValues = best.parameters;
    function report(gs) {
      let squared = 0, count = 0, failures = 0, weightedSquared = 0, observations = 0;
      const residuals = [];
      for (const group of gs) {
        const s = simulate({ ...group.setup, ...bestValues }, { sampleInterval: 1 });
        if (!s.valid || s.exitVelocity === null) { failures += group.rows.length; continue; }
        for (const r of group.rows) {
          const terms = residualTerms(s, r); if (!terms) { failures++; continue; }
          const error = fps(s.exitVelocity) - r.fps; squared += error ** 2; count++;
          for (const term of terms) { weightedSquared += (term.raw / term.sigma) ** 2; observations++; }
          residuals.push({ id: r.id, predictedFps: fps(s.exitVelocity), measuredFps: r.fps, residualFps: error, terms });
        }
      }
      return { rmse: count ? Math.sqrt(squared / count) : null, weightedRMSE: observations ? Math.sqrt(weightedSquared / observations) : null, count, observations, failures, residuals };
    }
    const boundReached = parameters.some(name => { const spec = PARAMETER_SPECS[name], value = bestValues[name]; return value <= spec.min + (spec.max - spec.min) * .002 || value >= spec.max - (spec.max - spec.min) * .002; });
    return { coefficient: bestValues.dischargeCoefficient ?? null, parameters: bestValues, fittedParameters: parameters,
      training: report(training), validation: report(validation), profile, distinctTrainingSetups: training.length,
      boundReached, weaklyConstrained: training.length <= parameters.length || best.weightedMSE > 4,
      identifiability: training.length > parameters.length ? "screened" : "minimum-data" };
  }
  async function fitLoss(rows, onProgress = () => {}) { return fitParameters(rows, ["dischargeCoefficient"], onProgress); }
  const api = { SCHEMA, KEY, OLD_KEY, PARAMETER_SPECS, reference, cleanRecord, decode, encode, eligible, energy, groups, residualTerms, fitParameters, fitLoss };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PneumaticCalibration = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
