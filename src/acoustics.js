/* Transparent acoustic-source estimator.
   It derives mechanical and gas-energy terms from the solver, then optionally
   maps them to one metre peak-level readings using the user's own measurements.
   It is not a structural-acoustics, propagation, frequency-response or dB solver. */
(function (root) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const finite = Number.isFinite, CP = P.CV + P.R, EXPONENT = (P.GAMMA - 1) / P.GAMMA;
  const DB_ANCHOR = 100, SOURCE_SCALE = .01;

  function idealExpansionSpecificEnergy(pressure, temperature, ambientPressure) {
    if (![pressure, temperature, ambientPressure].every(finite) || pressure <= ambientPressure || temperature <= 0 || ambientPressure <= 0) return 0;
    return CP * temperature * (1 - Math.pow(ambientPressure / pressure, EXPONENT));
  }

  function atmosphericOutlet(shot, frame) {
    if (!shot?.valid || !frame) return { massFlow: 0, pressure: null, temperature: null };
    if (shot.params?.silencerEnabled === 1) return {
      massFlow: Math.max(0, frame.silencerOutflow || 0),
      pressure: frame.silencerPressure,
      temperature: frame.silencerTemperature
    };
    const afterExit = frame.bbExited || finite(shot.exitTime) && frame.t >= shot.exitTime - 1e-12;
    return {
      massFlow: Math.max(0, afterExit ? frame.outflow || 0 : frame.frontOutflow || 0),
      pressure: afterExit ? frame.pressure : frame.frontPressure,
      temperature: afterExit ? frame.bbTemperature : frame.frontTemperature
    };
  }

  function jetPowerAtFrame(shot, frame) {
    const outlet = atmosphericOutlet(shot, frame);
    return outlet.massFlow * idealExpansionSpecificEnergy(outlet.pressure, outlet.temperature, shot?.ambientPressure);
  }

  function impactEvents(shot) {
    if (!Array.isArray(shot?.pistonImpacts)) return [];
    return shot.pistonImpacts.filter(event => finite(event?.time) && finite(event?.pistonEnergy) && event.time >= 0 && event.time <= shot.duration && event.pistonEnergy >= 0);
  }

  function integrateSamples(samples) {
    let value = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i], dt = b.time - a.time;
      if (dt > 0) value += (a.value + b.value) * .5 * dt;
    }
    return value;
  }

  function sourceTerms(shot) {
    if (!shot?.valid || !Array.isArray(shot.frames) || !shot.frames.length) return { valid: false };
    const impacts = impactEvents(shot);
    const incidentContactEnergy = impacts.reduce((sum, event) => sum + event.pistonEnergy, 0);
    const dissipatedContactEnergy = impacts.reduce((sum, event) => sum + (finite(event.dissipatedEnergy) && event.dissipatedEnergy >= 0 ? event.dissipatedEnergy : 0), 0);
    const contactDuration = impacts.reduce((sum, event) => sum + (finite(event.duration) && event.duration > 0 ? event.duration : 0), 0) || null;
    const peakContactForce = impacts.reduce((peak, event) => Math.max(peak, finite(event.peakForce) ? event.peakForce : 0), 0) || null;
    const jetSamples = shot.frames.map(frame => ({ time: frame.t, value: Math.max(0, jetPowerAtFrame(shot, frame)) }));
    const peakJetPower = jetSamples.reduce((peak, sample) => Math.max(peak, sample.value), 0);
    const jetExpansionEnergy = integrateSamples(jetSamples);
    const active = peakJetPower > 0 ? jetSamples.filter(sample => sample.value >= peakJetPower * .1) : [];
    const jetPulseDuration = active.length > 1 ? active.at(-1).time - active[0].time : null;
    const firstImpactTime = impacts[0]?.time ?? null;
    const separation = finite(firstImpactTime) && finite(shot.exitTime) ? firstImpactTime - shot.exitTime : null;
    return {
      valid: true, impacts, incidentContactEnergy, dissipatedContactEnergy, contactDuration, peakContactForce,
      jetSamples, peakJetPower, jetExpansionEnergy, jetPulseDuration, firstImpactTime, separation,
      complete: finite(shot.exitTime) && finite(shot.pistonHitTime),
      dischargeComplete: shot.dischargeComplete === true
    };
  }

  function relativeDb(value, reference) {
    return finite(value) && finite(reference) && value > 0 && reference > 0 ? 10 * Math.log10(value / reference) : null;
  }

  function normalizeMeasuredLevel(levelDb, distanceM) {
    return finite(levelDb) && finite(distanceM) && distanceM > 0 ? levelDb + 20 * Math.log10(distanceM) : null;
  }

  function soundEligible(row) {
    return row?.confirmed === true && row.setup && row.solverVersion === P.VERSION &&
      row.provenance?.geometry === "measured" && row.provenance?.spring === "measured" &&
      finite(row.soundPeakDb) && row.soundPeakDb >= 20 && row.soundPeakDb <= 180 &&
      finite(row.soundDistanceM) && row.soundDistanceM >= .05 && row.soundDistanceM <= 100;
  }

  const linearTarget = levelAtOneMetre => Math.pow(10, (levelAtOneMetre - DB_ANCHOR) / 10);
  const levelFromTarget = target => finite(target) && target > 0 ? DB_ANCHOR + 10 * Math.log10(target) : null;

  function fitError(points, impactCoefficient, gasCoefficient) {
    let error = 0;
    for (const point of points) {
      const prediction = Math.max(1e-30, impactCoefficient * point.impact + gasCoefficient * point.gas);
      const residual = levelFromTarget(prediction) - point.level;
      error += point.weight * residual ** 2;
    }
    return error;
  }

  function fitCalibration(rows, simulate = P.simulate) {
    const eligible = (rows || []).filter(soundEligible).slice(-64), points = [], simulationCache = new Map();
    for (const row of eligible) {
      let impactEnergy = row.soundImpactSourceJ, gasEnergy = row.soundGasSourceJ;
      if (!(finite(impactEnergy) && impactEnergy >= 0 && finite(gasEnergy) && gasEnergy >= 0)) {
        const key = JSON.stringify(row.setup);
        let terms = simulationCache.get(key);
        if (!terms) {
          terms = sourceTerms(simulate(row.setup));
          simulationCache.set(key, terms);
        }
        if (!terms.valid || !terms.complete) continue;
        impactEnergy = terms.incidentContactEnergy;
        gasEnergy = terms.jetExpansionEnergy;
      }
      const level = normalizeMeasuredLevel(row.soundPeakDb, row.soundDistanceM);
      if (!(impactEnergy + gasEnergy > 0) || !finite(level)) continue;
      points.push({ id: row.id, level, target: linearTarget(level), weight: 1 / Math.max(.25, (row.soundSigmaDb || 2) ** 2),
        impact: impactEnergy / SOURCE_SCALE, gas: gasEnergy / SOURCE_SCALE });
    }
    if (!points.length) return { status: "no-data", mode: null, count: 0, points: [] };

    let sii = 0, sgg = 0, sig = 0, siy = 0, sgy = 0;
    for (const point of points) {
      const w = point.weight;
      sii += w * point.impact ** 2; sgg += w * point.gas ** 2; sig += w * point.impact * point.gas;
      siy += w * point.impact * point.target; sgy += w * point.gas * point.target;
    }
    const determinant = sii * sgg - sig ** 2;
    const conditioned = sii > 0 && sgg > 0 && determinant / (sii * sgg) > 1e-4;
    const candidates = [];
    if (points.length >= 3 && conditioned) {
      const impact = (siy * sgg - sgy * sig) / determinant, gas = (sgy * sii - siy * sig) / determinant;
      if (impact >= 0 && gas >= 0) candidates.push({ impact, gas, mode: "separate" });
      if (sii > 0) candidates.push({ impact: Math.max(0, siy / sii), gas: 0, mode: "boundary" });
      if (sgg > 0) candidates.push({ impact: 0, gas: Math.max(0, sgy / sgg), mode: "boundary" });
    }
    const totalDenominator = points.reduce((sum, point) => sum + point.weight * (point.impact + point.gas) ** 2, 0);
    const totalNumerator = points.reduce((sum, point) => sum + point.weight * (point.impact + point.gas) * point.target, 0);
    if (totalDenominator > 0) {
      const scale = Math.max(0, totalNumerator / totalDenominator);
      candidates.push({ impact: scale, gas: scale, mode: "combined" });
    }
    const best = candidates.filter(candidate => candidate.impact > 0 || candidate.gas > 0)
      .map(candidate => ({ ...candidate, error: fitError(points, candidate.impact, candidate.gas) }))
      .sort((a, b) => a.error - b.error)[0];
    if (!best) return { status: "unresolved", mode: null, count: points.length, points };
    const parameterCount = best.mode === "separate" ? 2 : 1;
    const rmseDb = points.length > parameterCount ? Math.sqrt(best.error / points.reduce((sum, point) => sum + point.weight, 0)) : null;
    return { status: "ready", mode: best.mode === "separate" ? "separate" : "combined", count: points.length,
      impactCoefficient: best.impact, gasCoefficient: best.gas, rmseDb, points,
      ranges: {
        impact: [Math.min(...points.map(point => point.impact)), Math.max(...points.map(point => point.impact))],
        gas: [Math.min(...points.map(point => point.gas)), Math.max(...points.map(point => point.gas))]
      }
    };
  }

  function outsideRange(value, range) {
    if (!finite(value) || !Array.isArray(range)) return true;
    const [low, high] = range;
    if (high <= 0) return value > 0;
    return value < low * .5 || value > high * 2;
  }

  function predict(shot, calibration, distanceM = 1) {
    const terms = sourceTerms(shot);
    if (!terms.valid || calibration?.status !== "ready" || !(distanceM > 0)) return { available: false, terms };
    const impact = terms.incidentContactEnergy / SOURCE_SCALE, gas = terms.jetExpansionEnergy / SOURCE_SCALE;
    const impactTarget = calibration.impactCoefficient * impact, gasTarget = calibration.gasCoefficient * gas;
    const totalTarget = impactTarget + gasTarget, levelAtOneMetre = levelFromTarget(totalTarget);
    if (!finite(levelAtOneMetre)) return { available: false, terms };
    return { available: true, terms, levelAtOneMetre, levelAtDistance: levelAtOneMetre - 20 * Math.log10(distanceM), distanceM,
      impactShare: totalTarget > 0 ? impactTarget / totalTarget : null, gasShare: totalTarget > 0 ? gasTarget / totalTarget : null,
      uncertaintyDb: calibration.rmseDb, extrapolated: outsideRange(impact, calibration.ranges.impact) || outsideRange(gas, calibration.ranges.gas) };
  }

  function pulseCharacter(duration, kind, t) {
    if (!finite(duration) || duration <= 0) return t("unresolved duration", "nerazriješeno trajanje");
    if (kind === "impact") return duration < .0004 ? t("very short / sharp", "vrlo kratko / oštro") : duration < .0015 ? t("short mechanical click", "kratak mehanički klik") : t("longer damped thump", "dulji prigušeni udar");
    return duration < .002 ? t("short air pop", "kratak zračni prasak") : duration < .008 ? t("spread discharge pulse", "rastegnuti impuls pražnjenja") : t("long air puff", "dugi zračni ispuh");
  }

  function markup(shot, baseline, flowReference, calibration, t, fmt) {
    const terms = sourceTerms(shot), impactReference = sourceTerms(baseline), gasReference = sourceTerms(flowReference || baseline);
    const prediction = predict(shot, calibration), impactDelta = relativeDb(terms.incidentContactEnergy, impactReference.incidentContactEnergy);
    const gasDelta = relativeDb(terms.jetExpansionEnergy, gasReference.jetExpansionEnergy);
    const calibrated = prediction.available;
    const mode = calibration?.mode === "separate" ? t("separate impact + airflow fit", "odvojena prilagodba udara i protoka") : t("combined one-factor fit", "zajednička prilagodba jednim faktorom");
    const estimate = calibrated ? `${fmt(prediction.levelAtOneMetre, 1, "dB")} @ 1 m` : t("calibration required", "potrebna kalibracija");
    const uncertainty = calibrated && finite(prediction.uncertaintyDb) ? ` · RMSE ${fmt(prediction.uncertaintyDb, 1, "dB")}` : "";
    const dominant = calibrated && calibration.mode === "separate" ? prediction.impactShare >= prediction.gasShare ? t("mechanical contribution larger in this fitted model", "mehanički doprinos veći je u ovoj prilagodbi") : t("airflow contribution larger in this fitted model", "doprinos protoka veći je u ovoj prilagodbi") : t("dominant real source remains unknown", "dominantan stvarni izvor ostaje nepoznat");
    return `<section class="panel acoustic-estimator" aria-labelledby="acousticEstimatorTitle">
      <div class="acoustic-heading"><div><span class="parts-eyebrow">${t("Sound-source estimate", "Procjena izvora zvuka")}</span><h2 id="acousticEstimatorTitle">${t("Mechanical contact + escaping-air calculation", "Izračun mehaničkog kontakta i izlaznog zraka")}</h2><p>${t("The solver supplies two physical source-energy pools. Measured sound records can fit an empirical mapping to your meter at one metre; without them, only relative changes are defensible.", "Rješavač daje dva fizikalna izvora energije. Mjerenja zvuka mogu prilagoditi empirijsku vezu prema vašem mjeraču na jedan metar; bez njih su opravdane samo relativne promjene.")}</p></div><span class="tag ${calibrated ? "measured" : "unknown"}">${calibrated ? t("calibrated estimate", "kalibrirana procjena") : t("relative only", "samo relativno")}</span></div>
      <div class="acoustic-grid">
        <article><span>${t("Piston-contact energy pool", "Energetski izvor kontakta pistona")}</span><strong>${fmt(terms.incidentContactEnergy * 1000, 3, "mJ")}</strong><small>${finite(impactDelta) ? `${impactDelta >= 0 ? "+" : ""}${fmt(impactDelta, 1, "dB")} ${t("energy-ratio change vs no-airbrake", "promjena omjera energije prema referenci bez kočnice")}` : t("No valid contact reference", "Nema valjane reference kontakta")}</small></article>
        <article><span>${t("Ideal outlet expansion pool", "Idealni izvor energije širenja na izlazu")}</span><strong>${fmt(terms.jetExpansionEnergy * 1000, 3, "mJ")}</strong><small>${fmt(terms.peakJetPower, 2, "W")} ${t("peak thermodynamic upper-bound power", "vršna termodinamička gornja granica snage")} ${finite(gasDelta) ? ` · ${gasDelta >= 0 ? "+" : ""}${fmt(gasDelta, 1, "dB")}` : ""}</small></article>
        <article class="acoustic-estimate"><span>${t("Empirically estimated peak level", "Empirijski procijenjena vršna razina")}</span><strong>${estimate}</strong><small>${calibrated ? `${calibration.count} ${t("eligible measurements", "prikladnih mjerenja")} · ${mode}${uncertainty}` : t("Add confirmed peak-dB measurements in Calibration", "Dodajte potvrđena mjerenja vršnih dB u Kalibraciji")}</small></article>
        <article><span>${t("Predicted sound character", "Predviđeni karakter zvuka")}</span><strong>${dominant}</strong><small>${t("Impact", "Udar")}: ${pulseCharacter(terms.contactDuration, "impact", t)} · ${t("air", "zrak")}: ${pulseCharacter(terms.jetPulseDuration, "gas", t)}</small></article>
      </div>
      ${prediction.extrapolated ? `<p class="acoustic-warning">${t("This setup lies well outside at least one calibrated source range; treat the dB value as extrapolation.", "Ova konfiguracija znatno je izvan barem jednog kalibriranog raspona izvora; dB vrijednost smatrajte ekstrapolacijom.")}</p>` : ""}
      <details data-preserve-open><summary>${t("What is calculated, fitted and still unknown", "Što je izračunato, prilagođeno i još nepoznato")}</summary><div class="acoustic-disclosure"><p><strong>${t("Calculated:", "Izračunato:")}</strong> ${t("incident piston-contact energy; contact timing; ideal isentropic expansion energy and power at the actual atmospheric outlet; pulse duration and relative energy-ratio dB changes.", "energija dolaska pistona u kontakt; vrijeme kontakta; idealna izentropska energija i snaga širenja na stvarnom izlazu u atmosferu; trajanje impulsa i relativne dB promjene omjera energije.")}</p><p><strong>${t("Fitted:", "Prilagođeno:")}</strong> ${t("an empirical mapping from those source terms to peak readings normalized to one metre. Three or more varied setups are required before impact and airflow can be separated.", "empirijska veza tih izvora s vršnim očitanjima normaliziranima na jedan metar. Potrebne su najmanje tri različite konfiguracije prije odvajanja udara i protoka.")}</p><p><strong>${t("Unknown:", "Nepoznato:")}</strong> ${t("stock and receiver radiation, spring vibration, microphone response, directional propagation, reflections, hearing weighting and the true frequency spectrum. The ideal gas term is an upper energy pool—not acoustic power radiated to the listener.", "zračenje kundaka i kućišta, vibracija opruge, odziv mikrofona, usmjereno širenje, refleksije, ponderiranje sluha i stvarni frekvencijski spektar. Idealni plinski član gornji je energetski izvor — nije akustička snaga koja stiže do slušatelja.")}</p></div></details>
    </section>`;
  }

  const api = { DB_ANCHOR, SOURCE_SCALE, idealExpansionSpecificEnergy, atmosphericOutlet, jetPowerAtFrame, sourceTerms, relativeDb,
    normalizeMeasuredLevel, soundEligible, fitCalibration, predict, markup };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PneumaticAcoustics = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
