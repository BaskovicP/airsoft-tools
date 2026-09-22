(function (root) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const SCHEMA = 3, KEY = "ssg10-pneumatic-lab-v3", OLD_KEY = "ssg10-pneumatic-lab-v2";
  const LENGTH_FIELDS = ["springLengthMode", "springFreeLength", "springInstalledLength", "springCutLength", "springActiveCoils", "springRemovedCoils", "springSolidLength"];
  const BUMPER_FIELDS = ["bumperThickness", "bumperBore"];
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
    const previousComplete = row.setup && (
      row.solverVersion === "3.0.0" && [...LENGTH_FIELDS, ...BUMPER_FIELDS].every(k => !Object.hasOwn(row.setup, k)) && Object.keys(P.DEFAULTS).filter(k => ![...LENGTH_FIELDS, ...BUMPER_FIELDS].includes(k)).every(k => Object.hasOwn(row.setup, k)) ||
      row.solverVersion === "3.1.1" && BUMPER_FIELDS.every(k => !Object.hasOwn(row.setup, k)) && Object.keys(P.DEFAULTS).filter(k => !BUMPER_FIELDS.includes(k)).every(k => Object.hasOwn(row.setup, k)) ||
      row.solverVersion === "3.2.0" && !Object.hasOwn(row.setup, "bumperBore") && Object.keys(P.DEFAULTS).filter(k => k !== "bumperBore").every(k => Object.hasOwn(row.setup, k))
    );
    const setupComplete = row.setup && (previousComplete || Object.keys(P.DEFAULTS).every(k => Object.hasOwn(row.setup, k)));
    const migratedSetup = previousComplete ? { ...row.setup,
      ...(!Object.hasOwn(row.setup, "bumperThickness") ? { bumperThickness: 0 } : {}),
      ...(!Object.hasOwn(row.setup, "bumperBore") ? { bumperBore: row.setup.headBore } : {})
    } : row.setup;
    const setup = !legacy && setupComplete && P.validate(migratedSetup).length === 0 ? P.normalize(migratedSetup) : null;
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
