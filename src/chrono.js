/* Pure chrono-string parsing and statistics shared by the browser UI and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChronoAnalyzer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FPS_PER_MPS = 3.280839895013123;
  const finite = Number.isFinite;
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const median = values => quantile(values, .5);

  function quantile(values, fraction) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position), upper = Math.ceil(position);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  }

  function parseReadings(text, limit = 500) {
    const values = [], invalid = [];
    const lines = String(text ?? "").replace(/\r/g, "").split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      let tokens;
      if (/[;\t\s]/.test(line)) tokens = line.split(/[;\t\s]+/).filter(Boolean);
      else if (/^[+-]?\d+(?:,\d+)$/.test(line)) tokens = [line.replace(",", ".")];
      else tokens = line.split(",").filter(Boolean);
      for (const token of tokens) {
        if (values.length >= limit) return { values, invalid, truncated: true };
        const normalized = token.replace(",", ".");
        const value = Number(normalized);
        if (finite(value)) values.push(value);
        else invalid.push(token);
      }
    }
    return { values, invalid, truncated: false };
  }

  function toMps(value, unit) { return unit === "mps" ? value : value / FPS_PER_MPS; }
  function toFps(value, unit) { return unit === "mps" ? value * FPS_PER_MPS : value; }
  function energyJ(massGrams, speedMps) { return .5 * massGrams / 1000 * speedMps ** 2; }

  function statistics(rows) {
    if (!rows.length) return null;
    const speeds = rows.map(row => row.fps), energies = rows.map(row => row.energy);
    const average = mean(speeds), energyAverage = mean(energies);
    const variance = rows.length > 1 ? speeds.reduce((sum, value) => sum + (value - average) ** 2, 0) / (rows.length - 1) : 0;
    const energyVariance = rows.length > 1 ? energies.reduce((sum, value) => sum + (value - energyAverage) ** 2, 0) / (rows.length - 1) : 0;
    let slope = 0;
    if (rows.length > 1) {
      const xAverage = mean(rows.map(row => row.index));
      const denominator = rows.reduce((sum, row) => sum + (row.index - xAverage) ** 2, 0);
      if (denominator) slope = rows.reduce((sum, row) => sum + (row.index - xAverage) * (row.fps - average), 0) / denominator;
    }
    return {
      count: rows.length,
      meanFps: average,
      medianFps: median(speeds),
      minFps: Math.min(...speeds),
      maxFps: Math.max(...speeds),
      spreadFps: Math.max(...speeds) - Math.min(...speeds),
      sampleSdFps: Math.sqrt(variance),
      cvPercent: average ? Math.sqrt(variance) / average * 100 : null,
      meanEnergyJ: energyAverage,
      minEnergyJ: Math.min(...energies),
      maxEnergyJ: Math.max(...energies),
      spreadEnergyJ: Math.max(...energies) - Math.min(...energies),
      sampleSdEnergyJ: Math.sqrt(energyVariance),
      slopeFpsPerShot: slope,
      trendFps: slope * Math.max(0, rows.length - 1)
    };
  }

  function analyze(values, massGrams, unit = "fps", excludeOutliers = true) {
    if (!finite(massGrams) || massGrams <= 0 || massGrams > 2) throw new Error("mass");
    if (!Array.isArray(values)) throw new Error("readings");
    const rejected = [];
    const rows = values.map((value, index) => ({ value, index: index + 1 })).filter(row => {
      const mps = toMps(row.value, unit);
      if (!finite(row.value) || row.value <= 0 || mps > 1000) { rejected.push(row); return false; }
      row.mps = mps; row.fps = toFps(row.value, unit); row.energy = energyJ(massGrams, mps); row.outlier = false;
      return true;
    });
    if (rows.length >= 5) {
      const speeds = rows.map(row => row.fps), q1 = quantile(speeds, .25), q3 = quantile(speeds, .75), iqr = q3 - q1;
      const low = q1 - 1.5 * iqr, high = q3 + 1.5 * iqr;
      rows.forEach(row => { row.outlier = iqr > 1e-12 ? row.fps < low || row.fps > high : Math.abs(row.fps - q1) > 1e-12; });
    }
    const filteredRows = rows.filter(row => !row.outlier);
    const all = statistics(rows), filtered = statistics(filteredRows);
    return {
      unit, massGrams, rows, rejected, all, filtered,
      outlierCount: rows.length - filteredRows.length,
      active: excludeOutliers && filtered ? filtered : all,
      excludingOutliers: Boolean(excludeOutliers && filtered && rows.length !== filteredRows.length)
    };
  }

  function compare(first, second) {
    if (!first?.active || !second?.active) return null;
    const deltaJ = second.active.meanEnergyJ - first.active.meanEnergyJ;
    return {
      deltaJ,
      percent: first.active.meanEnergyJ ? deltaJ / first.active.meanEnergyJ * 100 : null,
      speedDeltaFps: second.active.meanFps - first.active.meanFps
    };
  }

  const SCORE_WEIGHTS = {
    consistency: { cv: .55, spread: .30, drift: .15, speed: 0, energy: 0 },
    balanced: { cv: .30, spread: .20, drift: .15, speed: .15, energy: .20 },
    output: { cv: .15, spread: .10, drift: .10, speed: .25, energy: .40 }
  };

  function relativePair(a, b, higherIsBetter) {
    if (!finite(a) || !finite(b)) return { a: 0, b: 0 };
    if (Math.abs(a - b) < 1e-12) return { a: 100, b: 100 };
    if (higherIsBetter) {
      const best = Math.max(a, b);
      return best <= 0 ? { a: 100, b: 100 } : { a: Math.max(0, a / best * 100), b: Math.max(0, b / best * 100) };
    }
    const best = Math.min(a, b);
    if (best <= 0) return { a: a === best ? 100 : 0, b: b === best ? 100 : 0 };
    return { a: best / a * 100, b: best / b * 100 };
  }

  function comparisonScores(first, second, priority = "balanced") {
    if (!first?.active || !second?.active) return null;
    const weights = SCORE_WEIGHTS[priority] || SCORE_WEIGHTS.balanced;
    const a = first.active, b = second.active;
    const values = {
      cv: { a: a.cvPercent, b: b.cvPercent, higherIsBetter: false },
      spread: { a: a.meanFps ? a.spreadFps / a.meanFps * 100 : null, b: b.meanFps ? b.spreadFps / b.meanFps * 100 : null, higherIsBetter: false },
      drift: { a: a.meanFps ? Math.abs(a.trendFps) / a.meanFps * 100 : null, b: b.meanFps ? Math.abs(b.trendFps) / b.meanFps * 100 : null, higherIsBetter: false },
      speed: { a: a.meanFps, b: b.meanFps, higherIsBetter: true },
      energy: { a: a.meanEnergyJ, b: b.meanEnergyJ, higherIsBetter: true }
    };
    const metrics = {};
    for (const [key, metric] of Object.entries(values)) {
      const score = relativePair(metric.a, metric.b, metric.higherIsBetter);
      metrics[key] = { ...metric, score, weight: weights[key], winner: Math.abs(metric.a - metric.b) < 1e-12 ? "tie" : metric.higherIsBetter ? metric.a > metric.b ? "a" : "b" : metric.a < metric.b ? "a" : "b" };
    }
    const score = side => Object.values(metrics).reduce((sum, metric) => sum + metric.score[side] * metric.weight, 0);
    const scores = { a: score("a"), b: score("b") };
    return { priority: SCORE_WEIGHTS[priority] ? priority : "balanced", weights, metrics, scores, winner: Math.abs(scores.a - scores.b) < .05 ? "tie" : scores.a > scores.b ? "a" : "b" };
  }

  return { FPS_PER_MPS, SCORE_WEIGHTS, parseReadings, toMps, toFps, energyJ, statistics, analyze, compare, comparisonScores };
});
