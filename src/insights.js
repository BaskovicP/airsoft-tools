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
