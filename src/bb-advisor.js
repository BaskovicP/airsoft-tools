/* Pure BB-weight comparison model shared by the browser UI and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BBWeightAdvisor = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COMMON_WEIGHTS = Object.freeze([.20, .23, .25, .28, .30, .32, .36, .40, .43, .45, .48, .50]);
  const PRIORITY_WEIGHTS = Object.freeze({
    balanced: Object.freeze({ flightTimeS: .15, retainedEnergyJ: .25, windDriftM: .25, expectedRangeM: .25, costPerMagazine: .10 }),
    range: Object.freeze({ flightTimeS: .10, retainedEnergyJ: .20, windDriftM: .30, expectedRangeM: .35, costPerMagazine: .05 }),
    budget: Object.freeze({ flightTimeS: .30, retainedEnergyJ: .15, windDriftM: .10, expectedRangeM: .10, costPerMagazine: .35 })
  });
  const HIGHER_IS_BETTER = Object.freeze({ flightTimeS: false, retainedEnergyJ: true, windDriftM: false, expectedRangeM: true, costPerMagazine: false });
  const DIAMETER_M = .00595;
  const AREA_M2 = Math.PI * DIAMETER_M ** 2 / 4;
  const AIR_DENSITY = 1.225;
  const SPHERE_CD = .47;
  const GRAVITY = 9.80665;
  const FPS_PER_MPS = 3.280839895013123;

  function finitePositive(value) { return Number.isFinite(value) && value > 0; }
  function dragConstant(massKg) { return .5 * AIR_DENSITY * SPHERE_CD * AREA_M2 / massKg; }

  function simulateToDistance(massKg, muzzleSpeedMps, distanceM, windMps) {
    const drag = dragConstant(massKg);
    let x = 0, lateral = 0, vx = muzzleSpeedMps, vy = 0, time = 0;
    const dt = .00075;
    while (x < distanceM && time < 8 && vx > .5) {
      const previousX = x, previousLateral = lateral, previousVx = vx, previousVy = vy, previousTime = time;
      const relativeX = vx, relativeY = vy - windMps, relativeSpeed = Math.hypot(relativeX, relativeY);
      vx += -drag * relativeSpeed * relativeX * dt;
      vy += -drag * relativeSpeed * relativeY * dt;
      x += vx * dt;
      lateral += vy * dt;
      time += dt;
      if (x >= distanceM) {
        const fraction = Math.max(0, Math.min(1, (distanceM - previousX) / Math.max(1e-12, x - previousX)));
        time = previousTime + dt * fraction;
        lateral = previousLateral + (lateral - previousLateral) * fraction;
        vx = previousVx + (vx - previousVx) * fraction;
        vy = previousVy + (vy - previousVy) * fraction;
        x = distanceM;
      }
    }
    const speedMps = Math.hypot(vx, vy);
    return { reached: x >= distanceM, flightTimeS: time, windDriftM: Math.abs(lateral), retainedSpeedMps: speedMps, retainedEnergyJ: .5 * massKg * speedMps ** 2 };
  }

  function estimateRange(massKg, muzzleSpeedMps, weightGrams, hopLimitGrams) {
    const drag = dragConstant(massKg);
    const supported = weightGrams <= hopLimitGrams + 1e-12;
    const support = supported ? 1 : Math.max(.2, (hopLimitGrams / weightGrams) ** 2.3);
    const launchAngle = 2 * Math.PI / 180;
    const liftAtMuzzle = .97 * GRAVITY * support;
    let x = 0, height = 1.5, vx = muzzleSpeedMps * Math.cos(launchAngle), vy = muzzleSpeedMps * Math.sin(launchAngle), time = 0;
    const dt = .00075;
    while (height > 0 && x < 200 && time < 6) {
      const speed = Math.hypot(vx, vy);
      if (speed < 3) break;
      const lift = liftAtMuzzle * (speed / muzzleSpeedMps) ** 1.35;
      vx += -drag * speed * vx * dt;
      vy += (-GRAVITY - drag * speed * vy + lift) * dt;
      x += vx * dt;
      height += vy * dt;
      time += dt;
    }
    return { expectedRangeM: x, hopSupported: supported, hopSupportRatio: support };
  }

  function metricScores(results, key) {
    const eligible = key === "expectedRangeM" ? results.filter(row => row.hopSupported) : results;
    const values = eligible.map(row => row[key]);
    const low = Math.min(...values), high = Math.max(...values), span = high - low;
    const scores = new Map();
    for (const row of results) {
      let score = span < 1e-12 ? 100 : HIGHER_IS_BETTER[key] ? (row[key] - low) / span * 100 : (high - row[key]) / span * 100;
      if (key === "expectedRangeM" && !row.hopSupported) score = Math.min(score, 15 * row.hopSupportRatio);
      scores.set(row.weightGrams, Math.max(0, Math.min(100, score)));
    }
    return scores;
  }

  function compare(options = {}) {
    const muzzleEnergyJ = Number(options.muzzleEnergyJ ?? 2.3);
    const targetDistanceM = Number(options.targetDistanceM ?? 50);
    const windKmh = Number(options.windKmh ?? 10);
    const hopLimitGrams = Number(options.hopLimitGrams ?? .48);
    const magazineCapacity = Number(options.magazineCapacity ?? 50);
    const packagePrice = Number(options.packagePrice ?? 25);
    const packageMassGrams = Number(options.packageMassGrams ?? 1000);
    const priority = PRIORITY_WEIGHTS[options.priority] ? options.priority : "balanced";
    const weights = [...new Set((options.weights || COMMON_WEIGHTS).map(Number))].sort((a, b) => a - b);
    if (!finitePositive(muzzleEnergyJ) || !finitePositive(targetDistanceM) || !Number.isFinite(windKmh) || windKmh < 0 || !finitePositive(hopLimitGrams) || !finitePositive(magazineCapacity) || !Number.isFinite(packagePrice) || packagePrice < 0 || !finitePositive(packageMassGrams) || !weights.length || weights.some(weight => !finitePositive(weight))) throw new Error("inputs");

    const windMps = windKmh / 3.6;
    const results = weights.map(weightGrams => {
      const massKg = weightGrams / 1000;
      const muzzleSpeedMps = Math.sqrt(2 * muzzleEnergyJ / massKg);
      const target = simulateToDistance(massKg, muzzleSpeedMps, targetDistanceM, windMps);
      const range = estimateRange(massKg, muzzleSpeedMps, weightGrams, hopLimitGrams);
      const bbsPerPackage = packageMassGrams / weightGrams;
      return {
        weightGrams,
        massKg,
        muzzleSpeedMps,
        muzzleSpeedFps: muzzleSpeedMps * FPS_PER_MPS,
        ...target,
        ...range,
        bbsPerPackage,
        costPerMagazine: packagePrice * magazineCapacity / bbsPerPackage
      };
    });

    const metricKeys = Object.keys(PRIORITY_WEIGHTS[priority]);
    const scores = Object.fromEntries(metricKeys.map(key => [key, metricScores(results, key)]));
    for (const row of results) {
      row.metricScores = Object.fromEntries(metricKeys.map(key => [key, scores[key].get(row.weightGrams)]));
      row.overallScore = metricKeys.reduce((sum, key) => sum + row.metricScores[key] * PRIORITY_WEIGHTS[priority][key], 0);
      if (!row.hopSupported) row.overallScore *= .55 + .35 * row.hopSupportRatio;
    }
    const eligible = results.filter(row => row.hopSupported);
    const recommendation = (eligible.length ? eligible : results).reduce((best, row) => row.overallScore > best.overallScore ? row : best);
    const categoryWinners = {};
    for (const key of metricKeys) {
      const pool = key === "expectedRangeM" && eligible.length ? eligible : results;
      categoryWinners[key] = pool.reduce((best, row) => HIGHER_IS_BETTER[key] ? row[key] > best[key] ? row : best : row[key] < best[key] ? row : best);
    }
    return { inputs: { muzzleEnergyJ, targetDistanceM, windKmh, hopLimitGrams, magazineCapacity, packagePrice, packageMassGrams, priority }, results, recommendation, categoryWinners, priorityWeights: PRIORITY_WEIGHTS[priority] };
  }

  return { COMMON_WEIGHTS, PRIORITY_WEIGHTS, HIGHER_IS_BETTER, FPS_PER_MPS, simulateToDistance, estimateRange, compare };
});
