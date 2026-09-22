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
  function impactSummary(s) {
    let impacts = Array.isArray(s?.pistonImpacts) ? s.pistonImpacts.filter(event => finite(event?.time) && finite(event?.incomingVelocity) && finite(event?.pistonEnergy) && event.time >= 0 && event.time <= s.duration && event.incomingVelocity > 0 && event.pistonEnergy >= 0) : [];
    // Backward-compatible display fallback for older exported solver results.
    if (!impacts.length && eventTime(s, "pistonHitTime") !== null && finite(s.pistonImpactVelocity) && finite(s.impactEnergy)) impacts = [{ index: 1, time: s.pistonHitTime, incomingVelocity: s.pistonImpactVelocity, reboundVelocity: null, pistonEnergy: s.impactEnergy }];
    const totalEnergy = impacts.reduce((sum, event) => sum + event.pistonEnergy, 0);
    const laterEnergy = impacts.slice(1).reduce((sum, event) => sum + event.pistonEnergy, 0);
    const strongest = impacts.reduce((best, event) => !best || event.pistonEnergy > best.pistonEnergy ? event : best, null);
    return { impacts, count: impacts.length, first: impacts[0] || null, last: impacts.at(-1) || null, strongest, totalEnergy, laterEnergy };
  }
  function impactMarkup(s, canvasId, placement, t, fmt) {
    const summary = impactSummary(s), shown = summary.impacts.slice(0, 8), hidden = Math.max(0, summary.count - shown.length);
    const compliant = s?.params?.bumperThickness > 0 && s?.params?.bumperMaxCompression > 0;
    const outerClass = placement === "results" ? "panel impact-analysis impact-analysis-results" : "impact-analysis impact-analysis-graphs";
    const titleId = `${canvasId}Title`, contactWord = summary.count === 1 ? t("contact", "kontakt") : t("contacts", "kontakata");
    const cards = [
      [t("Recorded head contacts", "Zabilježeni kontakti s glavom"), summary.count ? `${summary.count} ${contactWord}` : t("None", "Nema"), t("Resolved contact episodes", "Razriješene epizode kontakta")],
      [t("First contact", "Prvi kontakt"), summary.first ? fmt(summary.first.pistonEnergy * 1000, 3, "mJ") : "—", summary.first ? `${fmt(summary.first.incomingVelocity, 3, "m/s")} · ${fmt(summary.first.time * 1000, 3, "ms")}` : t("Not reached", "Nije dosegnut")],
      [t("Peak bumper force", "Vršna sila gumice"), compliant && finite(summary.first?.peakForce) ? fmt(summary.first.peakForce, 1, "N") : "—", compliant && finite(summary.first?.peakCompression) ? `${fmt(summary.first.peakCompression * 1000, 3, "mm")} · ${summary.first.bottomedOut ? t("bottom-out reached", "dosegnut kruti graničnik") : fmt(summary.first.duration * 1000, 3, "ms")}` : t("Rigid event or unavailable", "Kruti događaj ili nedostupno")],
      [t("Later contacts combined", "Zbroj kasnijih kontakata"), summary.count > 1 ? fmt(summary.laterEnergy * 1000, 3, "mJ") : "—", summary.count > 1 ? t("Recontacts only; not sound energy", "Samo ponovni kontakti; nije zvučna energija") : t("No modeled recontact", "Nema modeliranog ponovnog kontakta")]
    ];
    const list = shown.map((event, index) => {
      const end = event.reboundVelocity === null ? t("settled in contact / run ended", "ostao u kontaktu / kraj simulacije") : fmt(event.reboundVelocity, 3, "m/s");
      const contact = finite(event.peakCompression) && event.peakCompression > 0 ? ` · ${fmt(event.peakCompression * 1000, 3, "mm")} · ${fmt(event.peakForce, 1, "N")} · ${t("loss", "gubitak")} ${fmt(event.dissipatedEnergy * 1000, 2, "mJ")}${event.bottomedOut ? ` · ${t("bottom-out", "kruti graničnik")}` : ""}` : "";
      return `<button type="button" data-impact-time="${event.time}" aria-label="${t(`Seek to piston contact ${index + 1}`, `Prikaži kontakt pistona ${index + 1}`)}"><span><b>#${index + 1}</b>${index === 0 ? t("First contact", "Prvi kontakt") : t("Recontact", "Ponovni kontakt")}</span><strong>${fmt(event.pistonEnergy * 1000, 3, "mJ")}</strong><small>${fmt(event.time * 1000, 3, "ms")} · ${fmt(event.incomingVelocity, 3, "m/s")} → ${end}${contact}</small></button>`;
    }).join("");
    return `<section class="${outerClass}" aria-labelledby="${titleId}"><div class="impact-analysis-heading"><div><h2 id="${titleId}">${t("Piston contact sequence", "Slijed kontakata pistona")}</h2><p>${t("Every stem is a separate modeled contact episode with the bumper/head. A pressure-driven reversal before contact is not counted as an impact.", "Svaka oznaka predstavlja zasebnu modeliranu epizodu kontakta s gumicom/glavom. Povrat zbog tlaka prije kontakta ne broji se kao udar.")}</p></div><span class="tag heuristic">${summary.count} ${contactWord}</span></div><div class="impact-summary">${cards.map(([name, value, note]) => `<div><span>${name}</span><strong>${value}</strong><small>${note}</small></div>`).join("")}</div><div class="impact-chart-labels"><span>${t("Piston kinetic energy immediately before contact (mJ)", "Kinetička energija pistona neposredno prije kontakta (mJ)")}</span><span>${t("Expanded contact-time window", "Prošireni vremenski prozor kontakata")}</span></div><canvas id="${canvasId}" class="impact-chart" role="img" aria-label="${t("Piston contact energy versus model time; exact events listed below", "Energija kontakta pistona prema modeliranom vremenu; točni događaji navedeni su ispod")}"></canvas><div class="impact-event-list">${list || `<p>${t("No piston contact occurred during the modeled interval.", "Tijekom modeliranog intervala nije došlo do kontakta pistona.")}</p>`}</div>${hidden ? `<p class="impact-overflow">+${hidden} ${t("additional settling contacts are plotted; inspect the exported run for every value.", "dodatnih kontakata smirivanja prikazano je na grafu; sve vrijednosti dostupne su u izvozu simulacije.")}</p>` : ""}<p class="impact-caveat">${t("Energy is ½ × entered piston mass × incoming speed². With a bumper, peak force, compression and duration come from the entered lumped stiffness/damping model; bottom-out uses the separate rigid restitution. These are conditional mechanics—not measured loudness, rubber stress, durability or dB.", "Energija je ½ × unesena masa pistona × ulazna brzina². Uz gumicu, vršna sila, stlačenje i trajanje proizlaze iz unesenog koncentriranog modela krutosti/prigušenja; udar u graničnik koristi zaseban koeficijent krutog odskoka. To je uvjetna mehanika — ne izmjerena glasnoća, naprezanje gume, trajnost ni dB.")}</p></section>`;
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
      <p>${t("The model now resolves a lumped elastic/damped contact, but actual sound still depends on rubber geometry, frequency-dependent material behavior, spring vibration and receiver/stock resonance. Entered peak force is not dB or a durability rating.", "Model sada razrješava koncentrirani elastično-prigušeni kontakt, ali stvarni zvuk i dalje ovisi o geometriji gume, ponašanju materijala ovisnom o frekvenciji, vibraciji opruge te rezonanciji kućišta i kundaka. Unesena vršna sila nije dB ni ocjena trajnosti.")}</p>
      <p class="sound-measured">${t("First-contact speed", "Brzina pri prvom kontaktu")}: <strong>${fmt(q.impact === null ? null : s.pistonImpactVelocity, 2, "m/s")}</strong> · ${t("Peak force / compression", "Vršna sila / stlačenje")}: <strong>${fmt(s.params?.bumperThickness > 0 ? s.peakBumperForce : null, 1, "N")} / ${fmt(s.params?.bumperThickness > 0 ? s.maxBumperCompression * 1000 : null, 3, "mm")}</strong> · ${t("bumper k / c", "gumica k / c")}: <strong>${fmt(s.params?.bumperThickness > 0 ? s.params.bumperStiffness : null, 0, "N/mm")} / ${fmt(s.params?.bumperThickness > 0 ? s.params.bumperDamping : null, 0, "N·s/m")}</strong></p></article>
      <article class="intensity sound-explainer muzzle-primary" data-comparison="${q.flowComparison.status}"><div class="intensity-head"><strong>${t("Muzzle blast — escaping air", "Prasak na ustima — izlazak zraka")}</strong><output>${fmt(flow, 2, "g/s")}</output></div>
      <p class="sound-quantity">${t("Peak modeled muzzle outflow observed during this run", "Najveći modelirani protok na ustima opažen tijekom simulacije")}</p>
      ${comparisonMarkup(q.flowComparison, referenceFlow, "g/s", "flow", t, fmt)}
      <p><strong>${t("What it means:", "Što to znači:")}</strong> ${t("After the BB exits, compressed air escapes from the barrel and contributes a separate air blast. Pressure, gas inventory and discharge rate describe that release. A higher outflow is not the same as a measured increase in sound.", "Nakon izlaska BB-a stlačeni zrak izlazi iz cijevi i doprinosi zasebnom zračnom prasku. Tlak, masa plina i brzina istjecanja opisuju to pražnjenje. Veći protok nije isto što i izmjeren porast glasnoće.")}</p>
      <p>${t("This is separate from the piston strike—not dB and not a suppressor prediction. The muzzle Cd is an independent unknown: before BB exit it controls venting of the air ahead of the BB; after exit it controls discharge from the barrel.", "To je odvojeno od udara pistona — nisu dB niti predviđanje učinka prigušivača. Cd usta cijevi zasebna je nepoznanica: prije izlaska BB-a određuje odzračivanje zraka ispred BB-a, a nakon izlaska pražnjenje cijevi.")}</p>
      <p class="sound-measured">${t("Pressure at BB exit", "Tlak pri izlasku BB-a")}: <strong>${fmt(s.exitTime === null ? null : (s.exitPressure - s.ambientPressure) / 1e5, 2, "bar(g)")}</strong> · ${t("Gas at exit", "Plin pri izlasku")}: <strong>${fmt(s.exitGasMass === null ? null : s.exitGasMass * 1e6, 1, "mg")}</strong> · ${t("Discharged in run", "Ispušteno tijekom simulacije")}: <strong>${fmt(s.exitTime === null ? null : s.muzzleMass * 1e6, 1, "mg")}</strong>.</p>
      <p>${s.dischargeComplete && baseline?.dischargeComplete ? t("Both runs relaxed to within 1% of atmospheric pressure.", "Obje simulacije približile su se atmosferskom tlaku unutar 1%.") : t("Discharge remains unresolved in one or both runs. Later outflow may change the observed comparison; unfinished discharge is not silence.", "Pražnjenje nije završeno u jednoj ili obje simulacije. Kasniji protok može promijeniti opaženu usporedbu; nezavršeno pražnjenje ne znači tišinu.")}</p></article>
      </div></section>`;
  }
  function parameterChanges(before = {}, after = {}) {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    return [...keys].filter(key => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
      .map(key => ({ key, before: before?.[key], after: after?.[key] }));
  }
  const relativeDelta = (before, after) => {
    const delta = finite(before) && finite(after) ? after - before : null;
    const percent = finite(delta) && before !== 0 ? delta / Math.abs(before) * 100 : null;
    return { before: finite(before) ? before : null, after: finite(after) ? after : null,
      delta: finite(delta) ? delta : null, percent: finite(percent) ? percent : null };
  };
  function comparisonSnapshot(before, after) {
    if (!before?.valid || !after?.valid) return null;
    const margin = shot => finite(shot.strongBrakeTime) && finite(shot.usefulTime) ? (shot.strongBrakeTime - shot.usefulTime) * 1000 : null;
    const gauge = shot => finite(shot.exitPressure) && finite(shot.ambientPressure) ? (shot.exitPressure - shot.ambientPressure) / 1e5 : null;
    return { changes: parameterChanges(before.params, after.params), metrics: {
      energy: relativeDelta(before.exitEnergy, after.exitEnergy),
      velocity: relativeDelta(finite(before.exitVelocity) ? before.exitVelocity / .3048 : null, finite(after.exitVelocity) ? after.exitVelocity / .3048 : null),
      impact: relativeDelta(finite(before.impactEnergy) ? before.impactEnergy * 1000 : null, finite(after.impactEnergy) ? after.impactEnergy * 1000 : null),
      flow: relativeDelta(finite(before.peakOutflow) ? before.peakOutflow * 1000 : null, finite(after.peakOutflow) ? after.peakOutflow * 1000 : null),
      exitGauge: relativeDelta(gauge(before), gauge(after)), timingMargin: relativeDelta(margin(before), margin(after))
    } };
  }
  function actionPlan(s, baseline, p, provenance = {}) {
    const actions = [], timingResult = timing(s, p), sound = soundQuantities(s, baseline);
    const timingCodes = { early: ["delay-braking", "warning", "airbrake"], "same-threshold": ["timing-edge", "caution", "airbrake"],
      "after-threshold": ["timing-useful-first", "good", "airbrake"], "same-exit": ["timing-useful-first", "good", "airbrake"],
      "after-exit": ["timing-after-exit", "good", "airbrake"], "no-slowing": ["strengthen-cushion", "caution", "airbrake"],
      "no-pin": ["measure-pin", "unknown", "airbrake"], "no-exit": ["resolve-exit", "warning", "solver"], unavailable: ["timing-unknown", "unknown", "solver"] };
    const timingAction = timingCodes[timingResult.verdict] || timingCodes.unavailable;
    actions.push({ code: timingAction[0], tone: timingAction[1], category: timingAction[2] });
    if (sound.impactComparison.percent === null) actions.push({ code: "impact-unknown", tone: "unknown", category: "airbrake" });
    else if (sound.impactComparison.percent < 85) actions.push({ code: "impact-lower", tone: "good", category: "airbrake", percent: sound.impactComparison.percent });
    else if (sound.impactComparison.percent > 110) actions.push({ code: "impact-higher", tone: "warning", category: "airbrake", percent: sound.impactComparison.percent });
    else actions.push({ code: "impact-similar", tone: "caution", category: "airbrake", percent: sound.impactComparison.percent });
    if (sound.flowComparison.percent === null) actions.push({ code: "muzzle-unknown", tone: "unknown", category: "geometry" });
    else if (sound.flowComparison.percent < 85) actions.push({ code: "muzzle-lower", tone: "good", category: "geometry", percent: sound.flowComparison.percent });
    else if (sound.flowComparison.percent > 110) actions.push({ code: "muzzle-higher", tone: "warning", category: "geometry", percent: sound.flowComparison.percent });
    else actions.push({ code: "muzzle-similar", tone: "caution", category: "geometry", percent: sound.flowComparison.percent });
    if (provenance.geometry !== "measured" || provenance.spring !== "measured") actions.push({ code: "measure-first", tone: "unknown", view: "calibration" });
    return actions;
  }
  function feedbackMarkup(snapshot, s, baseline, p, provenance, fieldLabels, t, fmt) {
    const signed = (value, digits, unit) => finite(value) ? `${value > 0 ? "+" : ""}${fmt(value, digits, unit)}` : "—";
    const valueText = (change, side) => {
      const meta = fieldLabels?.[change.key], value = change[side];
      if (change.key === "springLengthMode") return value ? t("length mode", "način duljina") : t("direct preload", "izravno prednaprezanje");
      if (Array.isArray(value)) return t("curve updated", "krivulja izmijenjena");
      return finite(value) ? fmt(value, meta?.[2] === "turns" ? 2 : 3, meta?.[2] === "turns" ? t("turns", "zavoja") : meta?.[2] || "") : String(value ?? "—");
    };
    const changeName = change => fieldLabels?.[change.key] ? t(fieldLabels[change.key][0], fieldLabels[change.key][1]) : change.key === "springLengthMode" ? t("Spring input mode", "Način unosa opruge") : change.key === "springCurve" ? t("Measured spring curve", "Izmjerena krivulja opruge") : change.key;
    const shownChanges = snapshot?.changes?.slice(0, 4) || [], extra = Math.max(0, (snapshot?.changes?.length || 0) - shownChanges.length);
    const metricInfo = [
      ["energy", t("BB exit energy", "Izlazna energija BB-a"), 3, "J", "context"],
      ["velocity", t("Muzzle velocity", "Izlazna brzina"), 1, "fps", "context"],
      ["impact", t("Piston contact energy", "Energija kontakta pistona"), 2, "mJ", "lower"],
      ["flow", t("Peak muzzle flow", "Vršni protok na ustima"), 2, "g/s", "lower"],
      ["exitGauge", t("Pressure at BB exit", "Tlak pri izlasku BB-a"), 2, "bar(g)", "lower"],
      ["timingMargin", t("Useful energy → slowing", "Korisna energija → usporavanje"), 2, "ms", "higher"]
    ];
    const metricTone = (metric, goal) => !finite(metric?.delta) ? "unknown" : Math.abs(metric.delta) < 1e-12 ? "same" : goal === "context" ? "context" : goal === "lower" ? metric.delta < 0 ? "good" : "warning" : metric.delta > 0 ? "good" : "warning";
    const metrics = snapshot ? metricInfo.map(([key, label, digits, unit, goal]) => {
      const metric = snapshot.metrics[key];
      return `<div class="change-metric" data-tone="${metricTone(metric, goal)}"><span>${label}</span><strong>${fmt(metric.after, digits, unit)}</strong><small>${t("Before", "Prije")}: ${fmt(metric.before, digits, unit)} · Δ ${signed(metric.delta, digits, unit)}${finite(metric.percent) ? ` (${signed(metric.percent, 1, "%")})` : ""}</small></div>`;
    }).join("") : "";
    const actionCopy = {
      "delay-braking": ["Delay strong braking", "Odgodi snažno kočenje", "The piston slows strongly before the selected BB-energy threshold. Try a slightly shorter pin, smaller pin diameter, or larger local bore—one change at a time. Recheck contact energy because reducing restriction can increase piston strike.", "Piston snažno usporava prije odabranog praga energije BB-a. Probajte malo kraći pin, manji promjer pina ili veći lokalni otvor — jednu promjenu odjednom. Ponovno provjerite energiju kontakta jer manji otpor može pojačati udar pistona."],
      "timing-edge": ["Create a little more timing margin", "Stvori malo veći vremenski razmak", "Useful BB energy and strong slowing nearly coincide. Make only a small reduction in restriction, then confirm that the useful-energy event remains first.", "Korisna energija BB-a i snažno usporavanje gotovo se podudaraju. Samo malo smanjite ograničenje protoka pa potvrdite da događaj korisne energije ostaje prvi."],
      "timing-useful-first": ["Useful acceleration comes first", "Korisno ubrzavanje dolazi prvo", "The selected BB-energy threshold is reached before strong piston slowing. Fine-tune only if piston contact or muzzle discharge still needs improvement.", "Odabrani prag energije BB-a dosegnut je prije snažnog usporavanja pistona. Dodatno podešavajte samo ako još treba smanjiti kontakt pistona ili pražnjenje na ustima."],
      "timing-after-exit": ["Timing target achieved in the model", "Vremenski cilj ostvaren je u modelu", "Strong slowing starts after BB exit. If contact energy remains high, increase cushioning in very small steps and stop before the timing margin becomes negative.", "Snažno usporavanje počinje nakon izlaska BB-a. Ako je energija kontakta još visoka, povećavajte ublažavanje u vrlo malim koracima i stanite prije nego vremenski razmak postane negativan."],
      "strengthen-cushion": ["No strong cushion event detected", "Nije prepoznato snažno pneumatsko ublažavanje", "If piston contact is still too energetic, test a slightly longer pin or smaller measured clearance. Do not treat a missing event as a soft landing.", "Ako je kontakt pistona još prejak, isprobajte malo dulji pin ili manji izmjereni zazor. Izostanak događaja ne smatrajte mekanim zaustavljanjem."],
      "measure-pin": ["Establish an airbrake reference", "Postavi referencu zračne kočnice", "The airbrake is off. Enter measured pin, bumper, head and nozzle geometry before judging pneumatic cushioning.", "Zračna kočnica je isključena. Unesite izmjerenu geometriju pina, gumice, glave i mlaznice prije procjene pneumatskog ublažavanja."],
      "resolve-exit": ["Resolve BB exit first", "Prvo riješi izlazak BB-a", "The model did not record BB exit, so timing and muzzle recommendations are incomplete. Check spring force, hop resistance, barrel drag and observation time.", "Model nije zabilježio izlazak BB-a pa preporuke za vremenski odnos i usta cijevi nisu potpune. Provjerite silu opruge, otpor hopa, otpor cijevi i vrijeme promatranja."],
      "timing-unknown": ["Timing is unresolved", "Vremenski odnos nije riješen", "Required events are missing. Inspect the event list and input validity before tuning the airbrake.", "Nedostaju potrebni događaji. Prije podešavanja zračne kočnice provjerite popis događaja i valjanost ulaza."],
      "impact-lower": ["Mechanical strike contributor is lower", "Doprinos mehaničkog udara je niži", "Modeled contact energy is lower than the no-airbrake reference. Keep this gain only if BB energy and timing remain acceptable; actual sound still depends on the bumper and rifle structure.", "Modelirana energija kontakta niža je od reference bez zračne kočnice. Zadržite dobitak samo ako su energija BB-a i vremenski odnos prihvatljivi; stvarni zvuk i dalje ovisi o gumici i konstrukciji replike."],
      "impact-higher": ["Mechanical strike moved the wrong way", "Mehanički udar krenuo je u pogrešnom smjeru", "Contact energy is higher than the no-airbrake reference. Check for poorly timed restriction or reversal before adding more airbrake.", "Energija kontakta viša je od reference bez zračne kočnice. Prije jačanja zračne kočnice provjerite loše tempirano ograničenje ili povratno gibanje."],
      "impact-similar": ["Contact energy is broadly similar", "Energija kontakta je približno slična", "The modeled airbrake has not materially changed first-contact energy. Use measured bumper behavior and chrono data before interpreting sound.", "Modelirana zračna kočnica nije bitno promijenila energiju prvog kontakta. Prije zaključivanja o zvuku koristite izmjereno ponašanje gumice i podatke kronografa."],
      "impact-unknown": ["Piston contact is unknown", "Kontakt pistona je nepoznat", "No first contact was recorded. This is not evidence of silence or a soft landing; extend the run or inspect a pressure-driven reversal.", "Prvi kontakt nije zabilježen. To nije dokaz tišine ni mekanog zaustavljanja; produljite simulaciju ili provjerite povrat uzrokovan tlakom."],
      "muzzle-lower": ["Escaping-air contributor is lower", "Doprinos izlaznog zraka je niži", "Peak modeled muzzle flow is lower than the no-airbrake reference. Confirm exit energy before keeping the change; this is not a dB prediction.", "Vršni modelirani protok na ustima niži je od reference bez zračne kočnice. Prije zadržavanja promjene potvrdite izlaznu energiju; ovo nije predviđanje dB."],
      "muzzle-higher": ["More compressed air remains at the muzzle", "Više stlačenog zraka ostaje na ustima", "Peak muzzle flow is higher than the reference. Explore cylinder/barrel volume matching or a longer barrel while preserving the required BB energy.", "Vršni protok na ustima viši je od reference. Istražite usklađivanje volumena cilindra i cijevi ili dulju cijev uz očuvanje potrebne energije BB-a."],
      "muzzle-similar": ["Muzzle discharge is broadly similar", "Pražnjenje na ustima je približno slično", "The current airbrake has not materially changed peak outflow. Volume matching and exit pressure are the more relevant next checks.", "Trenutačna zračna kočnica nije bitno promijenila vršni protok. Usklađivanje volumena i izlazni tlak važnije su sljedeće provjere."],
      "muzzle-unknown": ["Muzzle discharge is unknown", "Pražnjenje na ustima je nepoznato", "Without a recorded BB exit, the model cannot compare muzzle flow.", "Bez zabilježenog izlaska BB-a model ne može usporediti protok na ustima."],
      "measure-first": ["Replace assumptions with measurements", "Zamijeni pretpostavke mjerenjima", "Geometry or spring data are still marked assumed. Measure the hardware and add confirmed chrono shots before treating small model differences as meaningful.", "Geometrija ili podaci opruge još su označeni kao pretpostavke. Izmjerite dijelove i dodajte potvrđene kronografske hitce prije nego male razlike modela smatrate značajnima."]
    };
    const actions = actionPlan(s, baseline, p, provenance).map((action, index) => {
      const copy = actionCopy[action.code], target = action.view ? `data-feedback-view="${action.view}"` : `data-feedback-category="${action.category}"`;
      return `<article class="action-step" data-tone="${action.tone}"><span class="action-number">${index + 1}</span><div><strong>${t(copy[0], copy[1])}</strong>${finite(action.percent) ? `<small>${fmt(action.percent, 1, "%")} · ${t("of no-airbrake reference", "reference bez zračne kočnice")}</small>` : ""}<p>${t(copy[2], copy[3])}</p><button type="button" class="secondary-button" ${target}>${action.view === "calibration" ? t("Open chrono calibration", "Otvori kalibraciju kronografom") : action.category === "geometry" ? t("Open cylinder & barrel", "Otvori cilindar i cijev") : action.category === "solver" ? t("Open timing & solver", "Otvori vrijeme i rješavač") : t("Open airbrake settings", "Otvori postavke zračne kočnice")}</button></div></article>`;
    }).join("");
    const comparison = snapshot?.changes?.length ? `<div class="change-summary"><div class="change-copy"><strong>${snapshot.changes.length === 1 ? t("One modeled input changed", "Promijenjen je jedan modelirani ulaz") : t(`${snapshot.changes.length} modeled inputs changed together`, `${snapshot.changes.length} modelirana ulaza promijenjena su zajedno`)}</strong><p>${snapshot.changes.length === 1 ? t("This is a direct before/after model comparison. It is still not experimental proof.", "Ovo je izravna usporedba modela prije i poslije. Još uvijek nije eksperimentalni dokaz.") : t("The outcome is combined; it cannot be assigned to one input without changing them separately.", "Rezultat je zajednički; ne može se pripisati jednom ulazu bez odvojenih promjena.")}</p></div><div class="change-chips">${shownChanges.map(change => `<span><b>${changeName(change)}</b>${valueText(change, "before")} → ${valueText(change, "after")}</span>`).join("")}${extra ? `<span>+${extra} ${t("more", "više")}</span>` : ""}</div></div><div class="change-metrics">${metrics}</div>` : `<div class="change-empty"><strong>${t("Make one change to create an A/B comparison", "Napravite jednu promjenu za A/B usporedbu")}</strong><p>${t("The next valid calculation will compare every key outcome with this setup.", "Sljedeći valjani izračun usporedit će sve ključne rezultate s ovom konfiguracijom.")}</p></div>`;
    return `<section id="setupFeedback" class="panel setup-feedback" tabindex="-1"><div class="feedback-heading"><div><h2>${t("What changed & what to try next", "Što se promijenilo i što probati dalje")}</h2><p>${t("Model-guided feedback from the last valid setup, followed by prioritized tuning hypotheses.", "Povratne informacije modela prema zadnjoj valjanoj konfiguraciji, zatim prioritetne hipoteze za podešavanje.")}</p></div><span class="tag unknown">${t("not guaranteed", "nije jamstvo")}</span></div>${comparison}<h3>${t("Action steps", "Sljedeći koraci")}</h3><div class="action-steps">${actions}</div><div class="feedback-footer"><p>${t("Change one hardware input at a time, preserve the energy you need, and verify with chrono measurements. “Similar” means 85–110% of the no-airbrake reference. These steps optimize model quantities—not real dB.", "Mijenjajte po jedan dio, očuvajte potrebnu energiju i provjerite kronografom. „Slično” znači 85–110% reference bez zračne kočnice. Ovi koraci optimiziraju veličine modela — ne stvarne dB.")}</p><button type="button" class="primary-button" data-feedback-view="optimizer">${t("Compare combinations at 95–105% energy", "Usporedi kombinacije uz 95–105% energije")}</button></div></section>`;
  }
  const api = { thresholdPercent, timing, verdictText, timingMarkup, compare, soundQuantities, soundMarkup, impactSummary, impactMarkup, parameterChanges, comparisonSnapshot, actionPlan, feedbackMarkup };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticInsights = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
