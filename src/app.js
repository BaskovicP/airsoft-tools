/* UI shared by the generated standalone file and Cloudflare build. */
(() => {
  "use strict";
  const P = globalThis.PneumaticPhysics, C = globalThis.PneumaticCalibration, A = globalThis.PneumaticAcoustics, O = globalThis.PneumaticOptimizer, B = globalThis.PneumaticPlayback;
  const I = globalThis.PneumaticInsights, Parts = globalThis.PneumaticParts;
  const $ = id => document.getElementById(id), finite = Number.isFinite;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let language = "en";
  try { language = localStorage.getItem("ssg10-pneumatic-lab-language") === "hr" ? "hr" : "en"; } catch (_) { /* local files may disallow storage */ }
  const t = (en, hr) => language === "hr" ? hr : en;
  const fmt = (v, digits = 2, unit = "") => finite(v) ? `${v.toFixed(digits)}${unit ? " " + unit : ""}` : "—";
  const fps = v => v === null ? null : v / .3048;
  const stamp = v => fmt(v === null ? null : v * 1000, 2, "ms");
  const clone = v => JSON.parse(JSON.stringify(v));
  const parseCurveText = value => value.trim() ? value.trim().split(/\n+/).map(line => line.trim().split(/[,;\s]+/).map(Number)) : [];
  let p = P.normalize(), selectedPlatform = "ssg10", component = "amp", springLabel = "unspecified", pinLabel = "plug";
  let provenance = { geometry: "assumed", spring: "assumed" }, shot = null, baseline = null, unsilencedReference = null, fraction = 0, playing = false, animation = 0;
  let measurements = [], fit = null, acousticFit = null, fitSelection = ["dischargeCoefficient"], status = null, diagnostic = null, busy = false, debounce = null;
  let lastValidShot = null, changeComparison = null;
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
    bumperBore: ["Bumper inner diameter", "Unutarnji promjer odbojne gumice", "mm", .5, 30, .01],
    bumperStiffness: ["Bumper compression stiffness", "Krutost stlačivanja gumice", "N/mm", 0, 5000, 10],
    bumperDamping: ["Bumper viscous damping", "Viskozno prigušenje gumice", "N·s/m", 0, 1000, 5],
    bumperMaxCompression: ["Bumper compression limit (capped by thickness)", "Granica stlačenja gumice (do debljine)", "mm", 0, 10, .05],
    airbrakeLength: ["Pin projection from piston face", "Izbočenje pina od čela pistona", "mm", 0, 40, .1],
    airbrakeDiameter: ["Airbrake maximum / shaft diameter", "Najveći promjer / promjer tijela pina", "mm", .5, 9, .01],
    airbrakeTipDiameter: ["Airbrake tip diameter", "Promjer vrha pina", "mm", 0, 9, .01],
    airbrakeTaper: ["Tapered tip length", "Duljina konusnog vrha", "mm", 0, 10, .1],
    deadVolume: ["Cylinder-side residual cavity", "Preostali volumen na strani cilindra", "cm³", .05, 5, .01],
    breechVolume: ["Head / nozzle / breech storage", "Volumen glave, mlaznice i komore", "cm³", .05, 5, .01],
    frontDeadVolume: ["Muzzle/front-gas residual volume", "Preostali volumen zraka ispred BB-a", "cm³", .001, 2, .001],
    silencerLength: ["Silencer internal expansion length", "Unutarnja ekspanzijska duljina prigušivača", "mm", 20, 500, 1],
    silencerInnerDiameter: ["Silencer internal chamber diameter", "Unutarnji promjer komore prigušivača", "mm", 7, 80, .1],
    silencerBaffleCount: ["Internal baffle count", "Broj unutarnjih pregrada", "", 0, 50, 1],
    silencerBaffleThickness: ["Average baffle thickness", "Prosječna debljina pregrade", "mm", .1, 15, .1],
    silencerBaffleBore: ["Smallest baffle / core bore", "Najmanji provrt pregrade / jezgre", "mm", 5.5, 30, .01],
    silencerEndCapBore: ["Exit end-cap bore", "Promjer izlaznog otvora završne kape", "mm", 5.5, 30, .01],
    silencerPackingFraction: ["Estimated solid fill fraction", "Procijenjeni udio volumena ispune", "", 0, .89, .01],
    silencerDischargeCoefficient: ["Silencer outlet discharge coefficient Cd", "Koeficijent protoka izlaza prigušivača Cd", "", .1, 1, .01],
    silencerHeatTransfer: ["Silencer effective heat conductance", "Efektivna toplinska vodljivost prigušivača", "W/K", 0, 2, .005],
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
    restitution: ["Rigid / bottom-out restitution", "Koeficijent odskoka krutog graničnika", "", 0, .8, .01],
    dischargeCoefficient: ["Head discharge coefficient Cd", "Koeficijent protoka glave Cd", "", .1, 1, .01],
    muzzleDischargeCoefficient: ["Muzzle discharge coefficient Cd", "Koeficijent protoka na ustima Cd", "", .1, 1, .01],
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
  function contactEventLabel() {
    return p.bumperThickness > 0
      ? t("First bumper contact", "Prvi kontakt s gumicom")
      : t("First rigid cylinder-head contact", "Prvi kontakt s krutom glavom cilindra");
  }
  const events = () => [
    ["engageTime", t("Pin enters bumper / head passage", "Ulazak pina u otvor gumice / glave"), ""],
    ["decelTime", t("Piston starts slowing", "Piston počinje usporavati"), ""],
    ["usefulTime", `${I.thresholdPercent(p.usefulFraction)}% ${t("of peak BB energy", "vršne energije BB-a")}`, "useful"],
    ["strongBrakeTime", t("Substantial slowing after entry", "Značajno usporavanje nakon ulaska"), "brake"],
    ["exitTime", t("BB exit", "Izlazak BB-a"), ""],
    ["preContactReversalTime", t("Reversal before contact (model)", "Povrat prije kontakta (model)"), ""],
    ["contactReboundTime", t("Reverse motion after contact", "Povratno gibanje nakon kontakta"), ""],
    ["pistonHitTime", contactEventLabel(), "contact"]
  ];
  function setStatus(en, hr) { status = [en, hr]; if ($("fitStatus")) $("fitStatus").textContent = t(en, hr); }
  function save() {
    try { localStorage.setItem(C.KEY, JSON.stringify(C.encode(measurements))); }
    catch (_) { setStatus("Browser storage unavailable. Export your measurements to keep them.", "Pohrana u pregledniku nije dostupna. Izvezite mjerenja kako biste ih sačuvali."); }
  }
  function invalidateFit() { fit = null; if ($("fitReport")) $("fitReport").innerHTML = ""; }
  function refreshAcousticFit() { acousticFit = A.fitCalibration(measurements); }
  try {
    const current = localStorage.getItem(C.KEY), old = localStorage.getItem(C.OLD_KEY);
    if (current || old) {
      measurements = C.decode(current || old).measurements;
      if (!current) status = ["Old measurements preserved as unverified references; previous fits were discarded.", "Stara mjerenja sačuvana su kao nepotvrđene reference; prijašnje prilagodbe nisu prenesene."];
      else if (measurements.some(row => row.legacySetup || row.setup && row.solverVersion !== P.VERSION)) status = ["Previous solver snapshots and shot metadata are preserved. Older-version shots are excluded from the current fit; record confirmed measurements with the current spring inputs.", "Konfiguracije i podaci hitaca prijašnjeg rješavača sačuvani su. Hici starije verzije isključeni su iz trenutačne prilagodbe; zabilježite potvrđena mjerenja s trenutačnim ulazima opruge."];
    } else measurements = [C.reference()];
  } catch (_) { measurements = [C.reference()]; status = ["Stored data could not be read. It has not been overwritten.", "Pohranjeni podaci nisu čitljivi. Nisu prebrisani."]; }
  refreshAcousticFit();
  function languageSwitch() { return `<div class="language-switch" role="group" aria-label="${t("Language", "Jezik")}"><button type="button" data-lang="en" aria-pressed="${language === "en"}">English</button><button type="button" data-lang="hr" aria-pressed="${language === "hr"}">Hrvatski</button></div>`; }
  function field(key) {
    const [en, hr, unit, min, max, step] = fields[key];
    const name = t(en, hr), helpId = `field-help-${key}`, help = Parts.help(key, t);
    return `<div class="control"><div class="control-label-row"><label for="${key}"><span>${name}</span><span class="mono">${unit === "turns" ? t("turns", "zavoja") : unit}</span></label><span class="field-info-wrap"><button class="field-info" type="button" data-field-info="${helpId}" aria-label="${esc(t(`Explain ${en}`, `Objasni: ${hr}`))}" aria-describedby="${helpId}"><span aria-hidden="true">i</span></button><span class="field-tooltip" id="${helpId}" role="tooltip">${esc(help)}</span></span></div><div class="field-entry"><input data-range="${key}" aria-label="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}"><input id="${key}" data-number="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${p[key]}" required></div></div>`;
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
  function syncBumperControls() {
    if (!$('bumperStiffness')) return;
    const fixed = Boolean(p.bumperCurve.length);
    $('bumperStiffness').disabled = fixed;
    document.querySelector('[data-range="bumperStiffness"]').disabled = fixed;
    const input = $('opt-bumperStiffness');
    if (input) {
      input.disabled = optimizer.locks.head || fixed;
      input.value = fixed ? String(p.bumperStiffness) : optimizer.values.bumperStiffness;
      const note = input.parentElement.querySelector('small');
      if (note) note.hidden = !fixed;
    }
  }
  function silencerMarkup() {
    return `<details id="silencerDetails" ${p.silencerEnabled ? "open" : ""}><summary>${t("Silencer / suppressor expansion chamber", "Ekspanzijska komora prigušivača")}</summary>
      <label class="provenance"><input id="silencerEnabled" type="checkbox" ${p.silencerEnabled ? "checked" : ""}>${t("Silencer installed for this shot", "Prigušivač je ugrađen za ovaj hitac")}</label>
      <p class="field-help">${t("The model adds a conservative gas chamber after the inner-barrel crown. It predicts pressure storage and outlet mass flow—not acoustic transmission, frequency response or real dB.", "Model dodaje konzervativnu plinsku komoru nakon krune unutarnje cijevi. Predviđa pohranu tlaka i maseni protok na izlazu — ne prijenos zvuka, frekvencijski odziv ni stvarne dB.")}</p>
      ${group("Measured internal geometry", "Izmjerena unutarnja geometrija", ["silencerLength", "silencerInnerDiameter", "silencerBaffleCount", "silencerBaffleThickness", "silencerBaffleBore", "silencerEndCapBore", "silencerPackingFraction"])}
      ${group("Conditional flow and thermal inputs", "Uvjetni ulazi protoka i topline", ["silencerDischargeCoefficient", "silencerHeatTransfer"], t("Cd combines contraction, turbulence and unmodeled baffle detail. Heat conductance is an effective transient fit. Neither is obtained from exterior dimensions.", "Cd objedinjuje suženje, turbulenciju i nerazriješene detalje pregrada. Toplinska vodljivost efektivna je prilagodba prijelaznog procesa. Nijedna se ne dobiva iz vanjskih dimenzija."))}
      <div id="silencerSummary" class="small-note" role="status"></div>
      ${provenanceControl("geometry", "I have measured the silencer's internal geometry", "Izmjerio/la sam unutarnju geometriju prigušivača")}</details>`;
  }
  function syncSilencerControls() {
    if (!$("silencerEnabled")) return;
    $("silencerEnabled").checked = p.silencerEnabled === 1;
    for (const key of O.GROUPS.silencer) {
      const input = $("opt-" + key);
      if (!input) continue;
      const inactive = p.silencerEnabled !== 1;
      input.disabled = optimizer.locks.silencer || inactive;
      if (inactive) input.value = String(p[key]);
      const note = input.parentElement.querySelector("small");
      if (note) {
        note.hidden = !inactive;
        if (inactive) note.textContent = t("Install the silencer in Setup before searching its physical geometry.", "Uključite prigušivač u Postavkama prije pretraživanja njegove fizičke geometrije.");
      }
    }
    const sg = P.silencerGeometry(p), barrel = P.geometry(p, 0, 0).barrelVolume;
    $("silencerSummary").innerHTML = p.silencerEnabled ? `${t("Calculated free gas volume", "Izračunati slobodni volumen plina")}: <strong>${fmt(sg.freeVolume * 1e6, 2, "cm³")}</strong> · ${t("volume / barrel", "volumen / cijev")}: <strong>${fmt(sg.freeVolume / barrel, 2, ": 1")}</strong> · ${t("equivalent outlet area", "ekvivalentna izlazna površina")}: <strong>${fmt(sg.effectiveOutletArea * 1e6, 2, "mm²")}</strong>. ${t("The equivalent area includes a disclosed lumped baffle/fill loss proxy; it is not a measured acoustic rating.", "Ekvivalentna površina uključuje navedenu koncentriranu procjenu gubitaka pregrada/ispune; nije izmjerena akustička ocjena.")}` : t("Silencer inactive: its dimensions do not affect this shot.", "Prigušivač nije aktivan: njegove dimenzije ne utječu na ovaj hitac.");
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
      <details class="model-caveat"><summary>${t("Unvalidated model · not exact joules or dB", "Nepotvrđen model · nisu točni jouli ni dB")}</summary><p>${t("Conditional physics predictions, not measured performance. Head/pin dimensions, spring data, bumper material response, muzzle Cd and silencer flow/thermal factors start as assumptions. A chrono fit does not validate internal timing, contact force, acoustic attenuation or sound. No exact real-world joules or dB are claimed.", "Uvjetna predviđanja fizikalnog modela, a ne izmjerene performanse. Dimenzije glave/pina, podaci opruge, odziv materijala gumice, Cd usta te faktori protoka/topline prigušivača početne su pretpostavke. Kalibracija kronografom ne potvrđuje unutarnji vremenski odnos, silu kontakta, akustičko prigušenje ni zvuk. Ne tvrdimo da su stvarni jouli ili dB točno predviđeni.")}</p></details>
      <div class="layout"><aside class="panel controls-panel" aria-label="${t("Simulation controls", "Kontrole simulacije")}"><div class="panel-heading"><h2>${t("Setup", "Postavke")}</h2><button class="secondary-button" id="toggleControls" type="button" aria-expanded="true">${t("Show / hide", "Prikaži / sakrij")}</button></div>
        <section class="control-group"><label for="platformPreset">${t("Rifle starting point", "Početna konfiguracija replike")}</label><select id="platformPreset">${Object.entries(platforms).map(([id, v]) => `<option value="${id}" ${selectedPlatform === id ? "selected" : ""}>${v.name}</option>`).join("")}<option value="custom" ${selectedPlatform === "custom" ? "selected" : ""}>${t("Custom", "Prilagođeno")}</option></select>
        <p class="evidence">${t("Preset geometry is nominal or assumed—not a measurement of your rifle. Changing platforms resets the mechanical assumptions.", "Geometrija predloška nominalna je ili pretpostavljena — nije mjerenje vaše replike. Promjena platforme vraća mehaničke pretpostavke.")}</p>
        <label for="component">${t("Piston / head identity", "Piston / glava cilindra")}</label><select id="component"><option value="amp" ${component === "amp" ? "selected" : ""}>AMP / Tridos Ultimate SSG10</option><option value="scorpion" ${component === "scorpion" ? "selected" : ""}>Stalker Scorpion</option><option value="custom" ${component === "custom" ? "selected" : ""}>${t("Other / custom", "Drugo / prilagođeno")}</option></select>
        <p class="field-help">${t("Identity labels never apply hidden power multipliers. AMP: nominal 71 g at Tridos; manufacturer lists 69–72 g depending on pin. Weigh the complete assembly. Exact head and pin dimensions remain unknown until measured.", "Naziv dijela ne uvodi skrivene množitelje snage. AMP: Tridos navodi 71 g, proizvođač 69–72 g ovisno o pinu. Izvažite cijeli sklop. Točne dimenzije glave i pina nepoznate su do mjerenja.")}</p>
        <label for="springLabel">${t("Spring identity (label only)", "Oznaka opruge (samo naziv)")}</label><select id="springLabel">${["unspecified", "M110", "M120", "M130", "M140", "M150", "M160", "M170", "M180", "M190", "M220", "custom"].map(v => `<option value="${v}" ${springLabel === v ? "selected" : ""}>${v === "unspecified" ? t("Unknown / not recorded", "Nepoznato / nije zabilježeno") : v === "custom" ? t("Other measured spring", "Druga izmjerena opruga") : v}</option>`).join("")}</select><p class="field-help">${t("Use the force data below. An M-rating alone does not determine spring stiffness or preload.", "Koristite podatke o sili u nastavku. Oznaka M ne određuje krutost ni prednaprezanje opruge.")}</p></section>
        ${group("Cylinder and barrel", "Cilindar i cijev", ["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter"], t("Short stroke changes the cocked position. Added bumper thickness below moves the front contact plane rearward instead; the app shows the resulting effective travel separately.", "Skraćeni hod mijenja zapeti položaj. Debljina dodatne gumice niže umjesto toga pomiče prednju ravninu kontakta unatrag; aplikacija zasebno prikazuje dobiveni efektivni hod."))}
        <p class="small-note" id="shortStrokeDynamic"></p>
        ${silencerMarkup()}
        ${group("Moving masses", "Pomične mase", ["pistonMass", "bbMass", "bbDiameter"])}<div class="preset-row">${[58, 65, 68, 72, 76, 82].map(m => `<button class="preset" type="button" data-mass="${m}" aria-pressed="${p.pistonMass === m}">${m} g</button>`).join("")}</div>
        <details open><summary>${t("Head, bumper and airbrake geometry", "Geometrija glave, odbojne gumice i zračne kočnice")}</summary><p class="field-help">${t("Pneumatic cushioning: the pin restricts airflow before contact. The rubber bumper acts only when the piston reaches it. These are separate effects.", "Pneumatsko ublažavanje: pin ograničava protok prije kontakta. Odbojna gumica djeluje tek kad je piston dotakne. To su odvojeni učinci.")}</p>
        <section class="control-group bumper-controls"><p class="group-label">${t("Added cylinder-head bumper", "Dodatna odbojna gumica glave cilindra")}</p>${["bumperThickness", "bumperBore", "bumperStiffness", "bumperDamping", "bumperMaxCompression", "restitution"].map(field).join("")}<label for="bumperCurve">${t("Optional measured bumper curve: compression mm, force N", "Neobavezna izmjerena krivulja gumice: stlačenje mm, sila N")}</label><textarea id="bumperCurve" rows="4" placeholder="0, 0&#10;0.5, 100&#10;1.0, 300">${p.bumperCurve.map(v => v.join(", ")).join("\n")}</textarea><p class="field-help">${t("A measured nonlinear curve replaces the single linear stiffness. Start at 0 mm / 0 N and cover the complete compression cap. Dynamic damping is still entered separately; neither input is Shore hardness or dB.", "Izmjerena nelinearna krivulja zamjenjuje jednu linearnu krutost. Počnite s 0 mm / 0 N i pokrijte cijelu granicu stlačenja. Dinamičko prigušenje i dalje se unosi zasebno; nijedan ulaz nije Shore tvrdoća ni dB.")}</p><p class="field-help">${t("Thickness 0 mm means no added pad. With a pad, force and damping create a finite compression/contact interval; the effective cap is the smaller of the entered limit and physical thickness. Reaching that cap uses rigid bottom-out restitution.", "Debljina 0 mm znači da nema dodatne gumice. Uz gumicu, sila i prigušenje stvaraju konačan interval stlačivanja/kontakta; efektivna granica manja je od unesene vrijednosti i fizičke debljine. Dosezanje te granice koristi odskok krutog graničnika.")}</p></section>
        <label for="pinLabel">${t("Installed AMP pin", "Ugrađeni AMP pin")}</label><select id="pinLabel">${[["custom", "Measured / custom", "Izmjeren / prilagođen"], ["plug", "Plug / no airbrake", "Čep / bez zračne kočnice"], ["short", "Short pin — enter measured size", "Kratki pin — unesite dimenzije"], ["medium", "Medium pin — enter measured size", "Srednji pin — unesite dimenzije"], ["long", "Long pin — enter measured size", "Dugi pin — unesite dimenzije"]].map(([v, en, hr]) => `<option value="${v}" ${pinLabel === v ? "selected" : ""}>${t(en, hr)}</option>`).join("")}</select>
        ${["headBore", "headLength", "nozzleBore", "nozzleLength", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume", "frontDeadVolume"].map(field).join("")}<p class="small-note" id="clearanceNote"></p><p class="field-help">${t("Internal diameters—not outer diameters. The model has three consecutive axial passages: bumper opening, rigid-head bore and nozzle. Each restricts only the part of the pin actually reaching that segment. Dead volume is the bare rigid-head cavity; the pad's annular solid volume is subtracted automatically. Front residual volume prevents a zero-volume singularity as the BB clears the crown and should represent only the small terminal/muzzle pocket. Measure the installed geometry because rubber deformation and eccentricity are not resolved.", "Unutarnji promjeri — ne vanjski promjeri. Model ima tri uzastopna uzdužna kanala: otvor gumice, provrt krute glave i mlaznicu. Svaki ograničava samo dio pina koji stvarno doseže taj segment. Preostali volumen predstavlja šupljinu gole krute glave; puni prstenasti volumen gumice oduzima se automatski. Prednji preostali volumen sprječava singularnost nultog volumena pri izlasku BB-a i treba predstavljati samo mali završni džep na ustima. Izmjerite ugrađenu geometriju jer deformacija gume i ekscentričnost nisu razriješene.")}</p>${provenanceControl("geometry", "I have measured the geometry and assembled masses", "Izmjerio/la sam geometriju i mase sklopova")}</details>
        ${springMarkup()}
        <details><summary>${t("Airflow, friction and environment", "Protok, trenje i okoliš")}</summary>${["dischargeCoefficient", "muzzleDischargeCoefficient", "pistonLeak", "nozzleLeak", "bbLeakCoefficient", "bbBreakaway", "barrelDrag", "heatTransfer", "ambientPressure", "airTemperature"].map(field).join("")}<p class="field-help">${t("Head Cd controls transfer through the bumper/head/nozzle stack. Muzzle Cd vents the modeled air ahead of the BB before exit and the compressed charge after exit, so it can now affect both exit speed and the discharge/blast contributor. Leak areas include their own effective coefficient. All loss coefficients need evidence; they are not efficiency percentages.", "Cd glave određuje prijenos kroz sklop gumice/glave/mlaznice. Cd usta odzračuje modelirani zrak ispred BB-a prije izlaska i stlačeni naboj nakon izlaska, pa sada može utjecati i na izlaznu brzinu i na doprinos pražnjenja/praska. Površine curenja uključuju vlastiti efektivni koeficijent. Svi koeficijenti gubitaka traže potvrdu; nisu postoci učinkovitosti.")}</p></details>
        <details><summary>${t("Timing criteria and solver", "Vremenski kriteriji i rješavač")}</summary>${["usefulFraction", "decelThreshold", "maxTime"].map(field).join("")}<p class="field-help">${t("Adaptive midpoint integration, maximum step 0.01 ms. Thresholds are user conventions, not physical switches. The model can end before contact or complete discharge.", "Adaptivna integracija metodom srednje točke, najveći korak 0,01 ms. Pragovi su dogovoreni kriteriji, a ne fizikalne sklopke. Model može završiti prije kontakta ili potpunog pražnjenja.")}</p></details>
      </aside><section class="main">${optimizerMarkup()}<div id="results"></div>${calibrationMarkup()}</section></div></main>`;
    workspace = globalThis.PneumaticWorkspace.mount(document, workspaceState, t, view => {
      if (view === "optimizer") { optimizer.open = true; $("optimizerBody").hidden = false; $("toggleOptimizer").setAttribute("aria-expanded", "true"); }
      if (view === "calibration") $("calibrationPanel").open = true;
      setFrame(fraction);
    });
    bindLanguage(); bindControls(); bindFieldHelp(); bindOptimizer(); syncSpringControls(); syncBumperControls(); syncSilencerControls(); updateResults(); renderMeasurements(); renderOptimizerResults(); workspace.restoreScroll();
  }
  function calibrationMarkup() {
    return `<details class="panel calibration" id="calibrationPanel"><summary>${t("Calibration · chrono and sound measurements", "Kalibracija · mjerenja kronografom i zvuka")}</summary><div class="calibration-body"><p class="calibration-intro">${t("Your 0.46 g / 330 fps observation is a reference until its full setup is recorded. Energy is derived from mass and velocity. Optional peak-dB readings calibrate only your repeated meter/mode and are normalized to one metre with a free-field distance rule. Record the same microphone, weighting, angle and environment in every test. Data stays in this browser unless exported.", "Mjerenje 0,46 g / 330 fps ostaje referenca dok se ne zabilježi potpuna konfiguracija. Energija se izvodi iz mase i brzine. Neobavezna vršna dB očitanja kalibriraju samo ponovljeni mjerač/način rada i normaliziraju se na jedan metar pravilom slobodnog polja. U svakom testu koristite isti mikrofon, ponderiranje, kut i okoliš. Podaci ostaju u ovom pregledniku osim ako ih izvezete.")}</p>
      <form id="measurementForm" class="measurement-form"><label>${t("BB mass (g)", "Masa BB-a (g)")}<input id="measurementMass" type="number" value="${p.bbMass}" min=".1" max="1" step=".01" required></label><label>${t("Measured speed (fps)", "Izmjerena brzina (fps)")}<input id="measurementFps" type="number" value="330" min="1" max="1000" step=".1" required></label><label>${t("Chrono uncertainty (fps)", "Nesigurnost kronografa (fps)")}<input id="measurementSigma" type="number" value="1" min=".1" max="100" step=".1" required></label>
      <label>${t("Piston contact time (ms, optional)", "Vrijeme kontakta pistona (ms, neobavezno)")}<input id="measurementHitMs" type="number" min="0" max="1000" step=".01"></label><label>${t("Peak cylinder bar(g), optional", "Vršni tlak cilindra bar(g), neobavezno")}<input id="measurementPressure" type="number" min="0" max="100" step=".01"></label><label>${t("Peak silencer bar(g), optional", "Vršni tlak prigušivača bar(g), neobavezno")}<input id="measurementSilencerPressure" type="number" min="0" max="100" step=".01"></label><label>${t("Peak bumper force (N, optional)", "Vršna sila gumice (N, neobavezno)")}<input id="measurementBumperForce" type="number" min="0" max="100000" step=".1"></label>
      <label>${t("Measured peak sound level (dB, optional)", "Izmjerena vršna razina zvuka (dB, neobavezno)")}<input id="measurementSoundDb" type="number" min="20" max="180" step=".1"></label><label>${t("Sound-reading uncertainty (dB)", "Nesigurnost očitanja zvuka (dB)")}<input id="measurementSoundSigma" type="number" value="2" min=".1" max="30" step=".1"></label><label>${t("Microphone distance (m)", "Udaljenost mikrofona (m)")}<input id="measurementSoundDistance" type="number" value="1" min=".05" max="100" step=".01"></label>
      <label>${t("Use this shot as", "Namjena hica")}<select id="measurementRole"><option value="reference">${t("Reference only", "Samo referenca")}</option><option value="train">${t("Training / fit", "Podatak za prilagodbu")}</option><option value="validation">${t("Held-out validation", "Neovisna provjera")}</option></select></label><label class="wide">${t("Notes: pin, spring, hop, BB batch, sound meter/mode, microphone angle, environment", "Bilješke: pin, opruga, hop, serija BB-a, mjerač/način zvuka, kut mikrofona, okoliš")}<input id="measurementNotes" type="text" maxlength="2000"></label><label class="wide provenance"><input id="measurementConfirm" type="checkbox">${t("The current inputs describe the hardware used for this measured shot", "Trenutačni ulazi opisuju sklop kojim je ovaj hitac izmjeren")}</label><output id="measurementEnergy" class="wide small-note"></output><button type="submit" class="secondary-button">${t("Add shot", "Dodaj hitac")}</button></form>
      <p class="small-note">${t("Chrono fitting is enabled only for confirmed setups with measured geometry/masses and spring data. The sound fit is separate and automatic: one or two eligible records fit only one combined factor; at least three sufficiently different setups are required to separate mechanical and airflow response. A peak-dB fit is an empirical same-meter comparison, not a certified SPL prediction.", "Prilagodba kronografa omogućena je samo za potvrđene konfiguracije s izmjerenom geometrijom/masama i podacima opruge. Prilagodba zvuka zasebna je i automatska: jedan ili dva prikladna zapisa daju samo jedan zajednički faktor; za odvajanje mehaničkog odziva i protoka potrebne su najmanje tri dovoljno različite konfiguracije. Prilagodba vršnih dB empirijska je usporedba istim mjeračem, a ne potvrđeno SPL predviđanje.")}</p>
      <fieldset class="fit-parameters"><legend>${t("Parameters to fit", "Parametri za prilagodbu")}</legend>${Object.keys(C.PARAMETER_SPECS).map(key => `<label><input type="checkbox" data-fit-parameter="${key}" ${fitSelection.includes(key) ? "checked" : ""}>${esc(fields[key]?.[language === "hr" ? 1 : 0] || key)}</label>`).join("")}</fieldset>
      <div class="table-wrap"><table><thead><tr><th>BB</th><th>${t("fps / J / sound", "fps / J / zvuk")}</th><th>${t("Use / setup", "Namjena / konfiguracija")}</th><th>${t("Notes", "Bilješke")}</th><th></th></tr></thead><tbody id="measurementRows"></tbody></table></div>
      <div class="fit-row"><button id="fitButton" class="primary-button" type="button">${t("Fit selected parameters", "Prilagodi odabrane parametre")}</button><button id="exportMeasurements" class="secondary-button" type="button">${t("Export data", "Izvezi podatke")}</button><label class="secondary-button">${t("Import data", "Uvezi podatke")}<input id="importMeasurements" type="file" accept="application/json,.json" hidden></label></div><p id="fitStatus" class="status-line" role="status">${status ? esc(t(...status)) : t("No fit applied. References do not calibrate the solver.", "Prilagodba nije primijenjena. Reference ne kalibriraju rješavač.")}</p><div id="fitReport"></div>
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
    const labels = { cylinder: ["Cylinder", "Cilindar"], barrel: ["Barrel", "Cijev"], silencer: ["Silencer", "Prigušivač"], head: ["Head / bumper / nozzle", "Glava / gumica / mlaznica"], piston: ["Piston", "Piston"], airbrake: ["Airbrake", "Zračna kočnica"], spring: ["Spring", "Opruga"], bb: ["BB", "BB"] };
    return `<section class="panel optimizer"><div class="optimizer-heading"><div><h2>${t("Find a quieter, efficient setup", "Pronađi tišu i učinkovitiju konfiguraciju")}</h2><p class="small-note">${t("Freeze the parts you want to keep. Search only the hardware choices you can change.", "Zamrznite dijelove koje želite zadržati. Pretražujte samo zamjenjive dijelove.")}</p></div><button class="primary-button" type="button" id="toggleOptimizer" aria-expanded="${optimizer.open}" aria-controls="optimizerBody">${t("Freeze parts & optimize", "Zamrzni dijelove i optimiziraj")}</button></div>
      <div id="optimizerBody" ${optimizer.open ? "" : "hidden"}><p class="optimizer-target">${t("Performance constraint: keep 95–105% of this setup’s predicted BB exit energy.", "Uvjet performansi: zadrži 95–105% predviđene izlazne energije BB-a trenutačne konfiguracije.")}</p>
      <p class="small-note">${t("Checked = frozen. Enter actual available choices separated by commas; use a dot for decimals. The current value is always included. Example piston masses and pin lengths are hypothetical—not verified compatible AMP parts. Changing geometry can require new sealing/friction measurements.", "Označeno = zamrznuto. Unesite stvarno dostupne vrijednosti odvojene zarezima; decimalni znak je točka. Trenutačna vrijednost uvijek je uključena. Primjeri masa pistona i duljina pina hipotetski su — nisu potvrđeni kompatibilni AMP dijelovi. Promjena geometrije može zahtijevati novo mjerenje brtvljenja i trenja.")}</p>
      <div class="optimizer-locks">${Object.entries(O.GROUPS).map(([group, keys]) => `<fieldset class="optimizer-part"><legend><label><input type="checkbox" data-opt-lock="${group}" ${optimizer.locks[group] ? "checked" : ""}>${t("Freeze", "Zamrzni")} ${t(...labels[group])}</label></legend><details ${!optimizer.locks[group] ? "open" : ""}><summary>${t("Candidate values", "Vrijednosti kandidata")}</summary>${keys.map(key => {
        const fixedInput = O.fixedReason(p, key);
        return `<label class="optimizer-field" for="opt-${key}"><span>${t(fields[key][0], fields[key][1])} (${fields[key][2] === "turns" ? t("turns", "zavoja") : fields[key][2]})</span><input type="text" id="opt-${key}" data-opt-values="${key}" value="${esc(fixedInput ? String(p[key]) : optimizer.values[key])}" ${optimizer.locks[group] || fixedInput ? "disabled" : ""} maxlength="180"><small ${fixedInput ? "" : "hidden"}>${fixedInput === "measured-bumper" ? t("Fixed because the measured bumper force curve replaces linear stiffness.", "Fiksno jer izmjerena krivulja sile gumice zamjenjuje linearnu krutost.") : fixedInput === "silencer-disabled" ? t("Install the silencer in Setup before searching its physical geometry.", "Uključite prigušivač u Postavkama prije pretraživanja njegove fizičke geometrije.") : t("Fixed by the spring input mode or measured curve. Enable length mode in Setup to search spring lengths.", "Fiksno zbog načina unosa opruge ili izmjerene krivulje. Za pretragu duljina uključite taj način u Postavkama.")}</small></label>`;
      }).join("")}</details></fieldset>`).join("")}</div>
      <div class="optimizer-options"><label>${t("Ranking preference", "Prioritet rangiranja")}<select id="optimizerPriority">${[["balanced", "Balanced trade-off", "Uravnotežen kompromis"], ["quiet", "Lower sound contributors", "Niži doprinosi zvuku"], ["efficient", "Higher energy efficiency", "Viša energetska učinkovitost"]].map(([value, en, hr]) => `<option value="${value}" ${optimizer.priority === value ? "selected" : ""}>${t(en, hr)}</option>`).join("")}</select></label><label>${t("Maximum combinations", "Najviše kombinacija")}<select id="optimizerBudget">${[60, 120, 240].map(v => `<option ${optimizer.budget === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
      <p class="small-note">${t("Weather, fitted airflow/leakage, friction, rear damping, rigid restitution and timing criteria stay fixed. Bumper mechanics are searchable when the head group is unlocked; measured silencer geometry is searchable only when that silencer is installed and unlocked. Every candidate uses the same 250 ms observation limit. Rankings compare total modeled contact dissipation, peak flow at the actual atmospheric outlet (muzzle or silencer end cap), inner-barrel exit pressure, efficiency and pressure-wave uncertainty—not dB or guaranteed loudness.", "Vrijeme, prilagođeni protok/curenje, trenje, stražnje prigušenje, kruti odskok i vremenski kriteriji ostaju fiksni. Mehanika gumice pretraživa je kada je grupa glave otključana; izmjerena geometrija prigušivača pretraživa je samo kada je taj prigušivač ugrađen i otključan. Svaki kandidat koristi isti prozor promatranja od 250 ms. Rangiranje uspoređuje ukupno modelirano rasipanje kontakata, vršni protok na stvarnom izlazu u atmosferu (usta cijevi ili završna kapa prigušivača), tlak pri izlasku iz unutarnje cijevi, učinkovitost i nesigurnost tlačnih valova — ne dB ni zajamčenu glasnoću.")}</p>
      <details><summary>${t("How ranking works", "Kako radi rangiranje")}</summary><p class="small-note">${t("Only completed, numerically acceptable shots inside the energy band qualify. Keep the non-dominated trade-offs across five objectives, then rank the frontier with normalized preference weights. Contact / airflow / pressure / inefficiency / uncertainty weights: balanced 30/17/13/25/15%; sound-biased 38/20/17/10/15%; efficiency-biased 12/8/5/60/15%. Contact uses the complete dissipated contact sequence, not only the first strike. These weights are preferences, not an acoustic formula. A limited search finds the best tested choices, not a global optimum.", "Prikladni su samo završeni, numerički prihvatljivi hici unutar energetskog raspona. Zadržavaju se nedominirani kompromisi kroz pet ciljeva, zatim se fronta rangira normaliziranim ponderima. Kontakt / protok / tlak / neučinkovitost / nesigurnost: uravnoteženo 30/17/13/25/15%; zvuk 38/20/17/10/15%; učinkovitost 12/8/5/60/15%. Kontakt koristi cijeli slijed rasipanja, ne samo prvi udar. Ponderi su prioriteti, ne akustička formula. Ograničena pretraga pronalazi najbolje ispitane opcije, ne globalni optimum.")}</p></details>
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
    const metricCells = m => `<td>${fmt(m.energy, 3, "J")}</td><td>${fmt(m.impact * 1000, 3, "mJ")}</td><td>${fmt(m.outflow * 1000, 3, "g/s")}</td><td>${fmt(m.exitGauge / 1e5, 3, "bar(g)")}</td><td>${fmt(m.efficiency * 100, 1, "%")}</td><td>${fmt(m.uncertainty, 2)}</td>`;
    $("optimizerResults").innerHTML = `<p class="optimizer-target">${t("Required model exit energy", "Tražena izlazna energija modela")}: ${fmt(r.bounds.min, 3)}–${fmt(r.bounds.max, 3, "J")}.</p>
      <p class="small-note">${t(`Checked ${r.evaluated} of ${r.total.toLocaleString("en")} combinations. ${r.exhaustive ? "All listed combinations checked." : "Sampled search; untested combinations may be better."} ${r.eligible} eligible; ${r.frontier.length} non-dominated trade-offs.`, `Provjereno ${r.evaluated} od ${r.total.toLocaleString("hr")} kombinacija. ${r.exhaustive ? "Provjerene su sve navedene kombinacije." : "Uzorkovana pretraga; neispitane kombinacije mogu biti bolje."} ${r.eligible} prikladnih; ${r.frontier.length} nedominiranih kompromisa.`)}</p>
      <p class="small-note">${t(`Excluded: ${rejected.energy} outside energy band, ${rejected.unfinished} missing contact/unfinished discharge, ${rejected.noExit} no exit, ${rejected.invalid} invalid, ${rejected.numerical} failed numerical checks. Unfinished impacts are unknown, never zero.`, `Isključeno: ${rejected.energy} izvan energije, ${rejected.unfinished} bez kontakta/nepotpuno pražnjenje, ${rejected.noExit} bez izlaska, ${rejected.invalid} nevaljanih, ${rejected.numerical} numerički neprihvatljivih. Nezavršeni udari nepoznati su, nikad nula.`)}</p>
      ${r.noVariables ? `<p class="lab-warning">${t("All values are frozen or have only the current choice. Nothing can be optimized; unfreeze a part and enter alternatives.", "Sve vrijednosti su zamrznute ili imaju samo trenutačni izbor. Nema promjenjivih veličina; odmrznite dio i unesite alternative.")}</p>` : ""}
      ${best.length ? `<div class="table-wrap"><table class="optimizer-table"><thead><tr><th>${t("Choice / changes", "Odabir / promjene")}</th><th>${t("BB energy", "Energija BB-a")}</th><th>${t("All-contact loss", "Gubitak svih kontakata")}</th><th>${t("Peak outlet flow", "Vršni izlazni protok")}</th><th>${t("Barrel-exit pressure", "Tlak na izlazu iz cijevi")}</th><th>${t("Efficiency", "Učinkovitost")}</th><th>${t("Uncertainty", "Nesigurnost")}</th><th></th></tr></thead><tbody>${r.baseline ? `<tr class="optimizer-baseline"><td>${t("Current setup · reference", "Trenutačno · referenca")}</td>${metricCells(r.baseline)}<td></td></tr>` : ""}${best.map((candidate, i) => {
        const m = candidate.metrics, b = r.baseline;
        const compromise = b && (m.impact > b.impact + 1e-9 || m.outflow > b.outflow + 1e-9 || m.exitGauge > b.exitGauge + 1e-4 || m.efficiency < b.efficiency - 1e-8 || m.uncertainty > b.uncertainty + 1e-8);
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
        const category = keys.every(key => O.GROUPS.spring.includes(key)) ? "spring" : keys.some(key => O.GROUPS.silencer.includes(key)) ? "silencer" : keys.some(key => [...O.GROUPS.head, ...O.GROUPS.airbrake].includes(key)) ? "airbrake" : keys.some(key => [...O.GROUPS.piston, ...O.GROUPS.bb].includes(key)) ? "masses" : "geometry";
        workspace.selectCategory(category); workspace.selectView("shot");
        setFrame(0); $("workspaceBody").scrollTop = 0;
        if (window.innerWidth <= 960) $("previewPanel").scrollIntoView({ block: "start" });
        $("playButton").focus({ preventScroll: true }); startPlayback();
      } catch (_) { invalidateOptimizer(); optimizer.status = ["Result is stale or failed rechecking. No candidate was applied; run the search again.", "Rezultat je zastario ili nije prošao ponovnu provjeru. Kandidat nije primijenjen; ponovite pretragu."]; $("optimizerStatus").textContent = t(...optimizer.status); }
    }));
  }
  function metric(label, value, note, kind = "model") {
    const tags = { geometry: ["geometry", "geometrija"], measured: ["calibrated", "kalibrirano"], unknown: ["unknown", "nepoznato"], model: ["model", "model"] };
    return `<article class="readout"><div class="topline"><span>${label}</span><span class="tag ${kind}">${t(...(tags[kind] || tags.model))}</span></div><strong>${value}</strong><small>${note}</small></article>`;
  }
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
    syncSilencerControls();
    const g = P.geometry(p, 0, 0), effectiveStroke = g.stroke * 1000, before = Math.max(0, effectiveStroke - p.airbrakeLength);
    $("shortStrokeDynamic").textContent = t(`Effective piston travel: ${effectiveStroke.toFixed(1)} mm (${p.bumperThickness.toFixed(1)} mm added bumper). Swept volume: ${(g.sweptVolume * 1e6).toFixed(2)} cm³. Before pin entry: ${before.toFixed(1)} mm / ${(g.ac * before * 1000).toFixed(2)} cm³.`, `Efektivni hod pistona: ${effectiveStroke.toFixed(1)} mm (${p.bumperThickness.toFixed(1)} mm dodatne gumice). Radni volumen: ${(g.sweptVolume * 1e6).toFixed(2)} cm³. Prije ulaska pina: ${before.toFixed(1)} mm / ${(g.ac * before * 1000).toFixed(2)} cm³.`);
    const bumperClearance = p.bumperThickness > 0 ? `${g.bumperGap.toFixed(3)} mm / ${(g.bumperAnnulus * 1e6).toFixed(3)} mm²` : t("inactive (0 mm thickness)", "neaktivno (debljina 0 mm)");
    $("clearanceNote").textContent = t(`Full-shaft clearance / annular area — bumper: ${bumperClearance}; metal head: ${g.gap.toFixed(3)} mm / ${(g.annulus * 1e6).toFixed(3)} mm². Added bumper solid volume: ${(g.bumperSolidVolume * 1e6).toFixed(3)} cm³.`, `Zazor tijela pina / prstenasta površina — gumica: ${bumperClearance}; metalna glava: ${g.gap.toFixed(3)} mm / ${(g.annulus * 1e6).toFixed(3)} mm². Puni volumen dodatne gumice: ${(g.bumperSolidVolume * 1e6).toFixed(3)} cm³.`);
    if (!shot?.valid) {
      setResultState("invalid");
      const errorText = {
        "bumper:curve": ["Bumper curve needs finite, increasing compression points and nondecreasing nonnegative force.", "Krivulja gumice traži konačne rastuće točke stlačenja te neopadajuću nenegativnu silu."],
        "bumper:coverage": ["Bumper curve must start at 0 mm / 0 N and cover the full compression cap.", "Krivulja gumice mora početi s 0 mm / 0 N i pokriti cijelu granicu stlačenja."],
        "silencer:bb-clearance": ["Every silencer bore must be larger than the entered BB diameter.", "Svaki provrt prigušivača mora biti veći od unesenog promjera BB-a."],
        "silencer:clearance": ["Silencer baffle and end-cap bores must be smaller than its internal chamber diameter.", "Provrt pregrada i izlazne kape mora biti manji od unutarnjeg promjera komore prigušivača."],
        "silencer:length": ["The combined baffle thickness must be shorter than the internal expansion length.", "Zbroj debljina pregrada mora biti manji od unutarnje ekspanzijske duljine."],
        "silencer:packing": ["Silencer solid fill fraction must stay between 0 and 0.89.", "Udio punog volumena ispune prigušivača mora biti između 0 i 0,89."],
        "silencer:volume": ["The entered silencer geometry leaves no usable gas volume or outlet area.", "Unesena geometrija prigušivača ne ostavlja uporabljiv volumen plina ili izlaznu površinu."],
        "solver:convergence": ["The numerical solver did not converge; this run is invalid, not a settled shot.", "Numerički rješavač nije konvergirao; ovaj hitac nije valjan niti se smatra smirenim."]
      };
      $("resultError").textContent = t("Cannot simulate this setup. Check dimensions, clearances, residual volumes and force curves. Previous results are hidden: ", "Ovu konfiguraciju nije moguće simulirati. Provjerite dimenzije, zazore, preostale volumene i krivulje sile. Prethodni rezultati su skriveni: ") + (shot?.errors || []).map(code => errorText[code] ? t(...errorText[code]) : code).join(" · "); return;
    }
    const s = shot, retention = s.exitEnergy !== null && baseline?.valid && baseline.exitEnergy > 0 ? 100 * s.exitEnergy / baseline.exitEnergy : null;
    const acousticTerms = A.sourceTerms(s), acousticPrediction = A.predict(s, acousticFit);
    const diff = s.engageTime !== null && s.exitTime !== null ? (s.engageTime - s.exitTime) * 1000 : null;
    const timing = I.timing(s, p), delta = timing.marginMs;
    const verdict = I.verdictText(timing.verdict, t);
    const next = document.createElement("div");
    next.innerHTML = `<div class="readout-grid">
      ${metric(t("Cylinder / barrel volumes", "Volumeni cilindra / cijevi"), `${fmt(s.cylinderVolume * 1e6, 2)} / ${fmt(s.barrelVolume * 1e6, 2)}`, "cm³", "geometry")}
      ${metric(t("Cylinder / barrel ratio", "Omjer cilindra / cijevi"), fmt(s.ratio, 2, ": 1"), t("Swept volume / barrel volume", "Radni volumen / volumen cijevi"), "geometry")}
      ${metric(t("Silencer free volume / barrel", "Slobodni volumen prigušivača / cijev"), p.silencerEnabled ? `${fmt(s.silencerVolume * 1e6, 2)} / ${fmt(s.silencerExpansionRatio, 2, ": 1")}` : t("inactive", "neaktivno"), p.silencerEnabled ? t("Calculated from internal dimensions, baffle solids and fill fraction", "Izračunato iz unutarnjih dimenzija, punog volumena pregrada i udjela ispune") : t("No silencer chamber in this run", "U ovoj simulaciji nema komore prigušivača"), "geometry")}
      ${metric(t("Bumper / effective contact travel", "Gumica / efektivni hod do kontakta"), `${fmt(p.bumperThickness, 1)} / ${fmt(s.stroke * 1000, 1)}`, "mm", "geometry")}
      ${metric(t("Bumper compression / peak force", "Stlačenje gumice / vršna sila"), p.bumperThickness > 0 ? `${fmt(s.maxBumperCompression * 1000, 3)} / ${fmt(s.peakBumperForce, 1)}` : t("inactive", "neaktivno"), t("mm / N · conditional contact model", "mm / N · uvjetni model kontakta"))}
      ${metric(p.silencerEnabled ? t("Predicted inner-barrel exit speed", "Predviđena brzina na izlazu iz unutarnje cijevi") : t("Predicted muzzle speed", "Predviđena izlazna brzina"), fmt(fps(s.exitVelocity), 1, "fps"), s.exitEnergy === null ? t("BB did not exit within the run", "BB nije izašao tijekom simulacije") : `${fmt(s.exitEnergy, 3, "J")} · ${t("conditional, not chrono", "uvjetno, nije kronograf")}`)}
      ${metric(t("Energy gained at slowing event", "Energija pri događaju usporavanja"), fmt(s.preBrakeShare === null ? null : s.preBrakeShare * 100, 1, "%"), t("Relative to exit energy; can exceed 100%", "U odnosu na izlaznu energiju; može prijeći 100%"))}
      ${metric(t("Peak cylinder / behind / ahead-BB pressure", "Vršni tlak cilindra / iza / ispred BB-a"), `${fmt((s.peakCylinderPressure - s.ambientPressure) / 1e5, 2)} / ${fmt((s.peakPressure - s.ambientPressure) / 1e5, 2)} / ${fmt((s.peakFrontPressure - s.ambientPressure) / 1e5, 2)}`, t("bar above atmosphere", "bar iznad atmosferskog tlaka"))}
      ${metric(t("Silencer pressure / outlet pulse", "Tlak prigušivača / izlazni impuls"), p.silencerEnabled ? `${fmt((s.peakSilencerPressure - s.ambientPressure) / 1e5, 2)} / ${fmt(s.outflowPulseDuration * 1000, 2)}` : t("inactive", "neaktivno"), p.silencerEnabled ? t("peak bar(g) / duration above 10% peak flow in ms · not dB", "vršni bar(g) / trajanje iznad 10% vršnog protoka u ms · nije dB") : t("Direct muzzle discharge", "Izravno pražnjenje na ustima"))}
      ${metric(t("Contact / gas source-energy pools", "Energetski izvori kontakta / plina"), `${fmt(acousticTerms.incidentContactEnergy * 1000, 3)} / ${fmt(acousticTerms.jetExpansionEnergy * 1000, 3)}`, t("mJ · physically calculated source pools, not acoustic energy", "mJ · fizikalno izračunati izvori, nisu akustička energija"))}
      ${metric(t("Calibrated peak-level estimate", "Kalibrirana procjena vršne razine"), acousticPrediction.available ? fmt(acousticPrediction.levelAtOneMetre, 1, "dB @ 1 m") : t("not calibrated", "nije kalibrirano"), acousticPrediction.available ? t("Empirical same-meter fit; not certified SPL", "Empirijska prilagodba istim mjeračem; nije potvrđeni SPL") : t("Add confirmed sound measurements in Calibration", "Dodajte potvrđena mjerenja zvuka u Kalibraciji"), acousticPrediction.available ? "measured" : "unknown")}
      ${metric(t("Relative exit-energy retention", "Relativno zadržavanje izlazne energije"), fmt(retention, 1, "%"), t("Same mass, no-pin baseline; not sound reduction", "Ista masa, referenca bez pina; nije utišavanje"))}
      ${metric(t("Piston momentum at entry", "Količina gibanja pistona pri ulasku"), fmt(s.momentumAtEngage, 3, "kg·m/s"), t("Actual piston mass × signed velocity", "Stvarna masa pistona × predznačena brzina"))}
      ${metric(t("Pin entry relative to BB exit", "Ulazak pina u odnosu na izlazak BB-a"), fmt(diff, 2, "ms"), t("Negative = pin enters first", "Negativno = pin ulazi prvi"))}
      </div>
      ${s.waveDiagnostics.risk !== "low" ? `<div class="lab-warning" role="status"><strong>${t("Pressure-wave timing uncertainty is not negligible", "Nesigurnost vremenskog odnosa zbog tlačnih valova nije zanemariva")}</strong><p>${t(`The causal travel-time envelope finds up to ${fmt(s.waveDiagnostics.maxTransit * 1000, 3)} ms one-way transit and ${fmt(s.waveDiagnostics.relativePressureSpan * 100, 1)}% pressure-history spread. Its ${s.waveDiagnostics.referenceCellCount}-cell scale is only a resolution reference, not a solved 1D flow field. The primary motion still uses lumped chamber pressure; treat sub-millisecond event ordering as conditional until instrumented or fully coupled 1D validation agrees.`, `Uzročna ovojnica vremena putovanja nalazi do ${fmt(s.waveDiagnostics.maxTransit * 1000, 3)} ms jednosmjernog prolaza i ${fmt(s.waveDiagnostics.relativePressureSpan * 100, 1)}% raspona povijesti tlaka. Skala od ${s.waveDiagnostics.referenceCellCount} ćelije samo je referentna rezolucija, a ne riješeno 1D polje protoka. Primarno gibanje i dalje koristi koncentrirani tlak komore; redoslijed događaja ispod milisekunde smatrajte uvjetnim dok se ne potvrdi instrumentiranim ili potpuno spregnutim 1D modelom.`)}</p></div>` : ""}
      ${!s.complete ? `<div class="lab-warning">${t("Run ended with missing events:", "Simulacija je završila bez događaja:")} ${s.exitTime === null ? t("BB exit. ", "Izlazak BB-a. ") : ""}${s.pistonHitTime === null ? t("Piston contact. ", "Kontakt pistona. ") : ""}${t("Missing contact is not a predicted soft landing. Increase modeled time if appropriate.", "Izostanak kontakta ne znači predviđen mekan udar. Po potrebi povećajte vrijeme simulacije.")}</div>` : ""}
      <section class="panel timing-card"><div class="timing-head"><strong>${verdict}</strong><span>${fmt(delta, 2, "ms")}</span></div><p class="small-note">${t("The amber event is measured from the modeled acceleration after entry—not proof that all slowing is caused by the pin. Compression can slow a piston without an airbrake. Green marks a chosen share of maximum BB energy before exit, not a universal optimum.", "Jantarni događaj temelji se na modeliranom ubrzanju nakon ulaska — nije dokaz da je sve usporavanje uzrokovano pinom. Kompresija može usporiti piston i bez kočnice. Zelena označuje odabrani udio najveće energije BB-a prije izlaska, ne univerzalni optimum.")}</p><div class="event-list">${events().map(([key, label, cls]) => `<button type="button" data-event="${key}" class="${cls}" ${s[key] === null ? "disabled" : ""}>${label}<br><span class="mono">${stamp(s[key])}</span></button>`).join("")}</div></section>
      <section class="panel stage"><div class="stage-toolbar"><button class="primary-button" type="button" id="playButton">${t("Fire / play", "Opali / pokreni")}</button><button class="secondary-button" id="resetButton" type="button">${t("Reset", "Početak")}</button><input id="scrubber" aria-label="${t("Shot time", "Vrijeme opaljenja")}" type="range" min="0" max="1000" value="${fraction * 1000}"><span id="clock" class="clock mono"></span></div><canvas id="mechanism" role="img" aria-label="${t("Schematic piston, bumper, airbrake, BB and optional silencer positions; live numeric values below", "Shematski položaji pistona, odbojne gumice, pina, BB-a i neobaveznog prigušivača; brojčane vrijednosti ispod")}"></canvas><div id="phaseText" class="stage-status" aria-live="off"></div><div id="liveStrip" class="live-strip"></div><p class="results-note">${t("Schematic cutaway. The green pad visibly compresses according to the lumped stiffness/damping model; its exact rubber shape is still illustrative. The silencer drawing follows entered geometry but not exact baffle shape. After inner-barrel exit the drawn BB coasts at its exit speed: acceleration between baffles is not solved. Glow indicates modeled pressure; particles and trails illustrate flow and motion, not resolved gas dynamics or sound. Every cue pauses with model time.", "Shematski presjek. Zelena gumica vidljivo se stišće prema koncentriranom modelu krutosti/prigušenja; točan oblik gume i dalje je ilustrativan. Crtež prigušivača prati unesenu geometriju, ali ne točan oblik pregrada. Nakon izlaska iz unutarnje cijevi nacrtani BB nastavlja izlaznom brzinom: ubrzavanje između pregrada nije riješeno. Sjaj označuje modelirani tlak; čestice i tragovi ilustriraju protok i gibanje, ne razriješenu dinamiku plina ni zvuk. Sve se pauzira s vremenom modela.")}</p></section>
      <section class="panel graphs"><div class="graphs-header"><div><h2>${t("Shot traces", "Krivulje opaljenja")}</h2><p>${t(`Pressure: amber cylinder, cyan behind BB, violet ahead of BB${p.silencerEnabled ? ", green silencer chamber" : ""}; dashed blue is the causal travel-time estimate, not a solved 1D pressure. Sound source: green is the ideal outlet-expansion power pool; piston contacts remain separate event stems below. Events: green energy threshold, dashed amber slowing, cyan exit, solid red first physical contact.`, `Tlak: jantarni cilindar, cijan iza BB-a, ljubičasti ispred BB-a${p.silencerEnabled ? ", zelena komora prigušivača" : ""}; isprekidana plava je uzročna procjena vremena putovanja, a ne riješeni 1D tlak. Izvor zvuka: zelena je idealna snaga širenja na izlazu; kontakti pistona ostaju zasebne oznake ispod. Događaji: zeleni prag energije, isprekidano jantarno usporavanje, cijan izlazak, puna crvena prvi fizički kontakt.`)}</p><div class="graph-contact-key"><span aria-hidden="true"></span><strong>${contactEventLabel()}</strong><b class="mono">${stamp(s.pistonHitTime)}</b></div></div></div><div class="graphs-mechanism"><div class="graphs-mechanism-heading"><strong>${t("Live firing cutaway", "Živi presjek opaljenja")}</strong><span>${t("synchronized with graph cursor", "sinkronizirano s pokazivačem grafova")}</span></div><canvas id="mechanismGraph" role="img" aria-label="${t("Synchronized piston, bumper, airbrake, BB and optional silencer above the shot graphs", "Sinkronizirani položaji pistona, gumice, pina, BB-a i neobaveznog prigušivača iznad grafova opaljenja")}"></canvas></div><div class="chart-grid">${[["pressureChart", t("Pressure vs time", "Tlak kroz vrijeme"), "bar(g)", ""], ["pistonChart", t("Piston velocity vs time", "Brzina pistona kroz vrijeme"), "m/s", ""], ["bbChart", t("BB velocity vs time", "Brzina BB-a kroz vrijeme"), "m/s", ""], ["soundSourceChart", t("Outlet expansion-power pool vs time", "Energetska snaga širenja na izlazu kroz vrijeme"), "W", t("source-energy upper bound, not a microphone waveform", "gornja granica izvora energije, nije valni oblik mikrofona")]].map(([id, label, units, qualifier]) => `<div class="chart"><div class="chart-title"><span>${label}</span><span>${units}</span></div><canvas id="${id}" role="img" aria-label="${label}${qualifier ? `; ${qualifier}` : ""}; ${contactEventLabel()}: ${stamp(s.pistonHitTime)}"></canvas></div>`).join("")}</div>${I.impactMarkup(s, "impactGraph", "graphs", t, fmt)}</section>
      ${Parts.markup(p, t)}
      ${I.soundMarkup(s, baseline, unsilencedReference, t, fmt)}
      ${A.markup(s, baseline, unsilencedReference, acousticFit, t, fmt)}
      ${I.impactMarkup(s, "impactResultsChart", "results", t, fmt)}
      ${I.feedbackMarkup(changeComparison, s, baseline, p, provenance, fields, t, fmt)}
      <section class="panel insight"><div class="panel-heading"><h2>${t("Energy, verification and uncertainty", "Energija, provjera i nesigurnost")}</h2><span class="tag unknown">${t("not experimentally validated", "nije eksperimentalno potvrđeno")}</span></div><div class="assumption-grid"><span>${t("Maximum BB energy observed", "Najveća opažena energija BB-a")}</span><strong>${fmt(s.maxBbEnergy, 3, "J")}</strong><span>${t("Energy lost before exit", "Energija izgubljena prije izlaska")}</span><strong>${fmt(s.bbEnergyLoss, 3, "J")}</strong><span>${t("Positive / negative net BB work", "Pozitivan / negativan neto rad na BB-u")}</span><strong>${fmt(s.positiveBbWork, 3)} / ${fmt(s.negativeBbWork, 3, "J")}</strong><span>${t("Energy balance residual", "Odstupanje energetske bilance")}</span><strong>${fmt(s.energyResidual * 1000, 4, "mJ")}</strong><span>${t("Gas mass residual", "Odstupanje bilance mase plina")}</span><strong>${s.massResidual.toExponential(2)} kg</strong><span>${t("Ambient barrel sound-crossing scale", "Vrijeme prolaza zvuka kroz cijev pri okolišnim uvjetima")}</span><strong>${stamp(s.soundCrossingTime)}</strong><span>${t("Causal transit / 24-cell reference scale", "Uzročni prolaz / referentna skala 24 ćelije")}</span><strong>${stamp(s.waveDiagnostics.maxTransit)} / ${stamp(s.waveDiagnostics.referenceCellTransit)}</strong><span>${t("Wave-envelope pressure spread", "Raspon tlačne ovojnice")}</span><strong>${fmt(s.waveDiagnostics.maxPressureDelta / 1e5, 3, "bar")} · ${fmt(s.waveDiagnostics.relativePressureSpan * 100, 1, "%")}</strong></div>
      <p class="small-note">${t("A small numerical residual does not validate the physics. Cylinder, behind-BB, ahead-BB and optional silencer gas are conservative lumped control volumes; profile-sliced duct losses, the effective leaky-piston BB and lumped silencer loss factor remain approximations. The front volume vents through the muzzle and opposes BB motion. The solved BB trajectory ends at the inner-barrel crown; its later travel through a silencer is drawn at constant exit speed. Spatial pressure waves, moving-BB blockage inside the silencer, baffle-resolved jets, acoustic transmission, spring surge, distributed rubber deformation and structural acoustics are not resolved. Sub-millisecond timing and silencer behavior still need instrumented validation.", "Malo numeričko odstupanje ne potvrđuje fizikalni model. Plin u cilindru, iza BB-a, ispred BB-a i neobavezno u prigušivaču predstavljaju konzervativne koncentrirane kontrolne volumene; gubici kanala podijeljeni po profilu, BB kao efektivni propusni klip i koncentrirani faktor gubitaka prigušivača ostaju aproksimacije. Prednji volumen odzračuje kroz usta i suprotstavlja se gibanju BB-a. Riješena putanja BB-a završava na kruni unutarnje cijevi; kasniji prolaz kroz prigušivač nacrtan je stalnom izlaznom brzinom. Prostorni tlačni valovi, blokiranje protoka BB-om unutar prigušivača, mlazovi kroz pojedine pregrade, akustički prijenos, valovi opruge, raspodijeljena deformacija gume ni strukturna akustika nisu razriješeni. Vremenski odnos ispod milisekunde i ponašanje prigušivača i dalje traže instrumentiranu provjeru.")}</p>
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
      compactMetric(t("Piston strike", "Udar pistona"), fmt(s.impactEnergy === null ? null : s.impactEnergy * 1000, 2, "mJ"), s.impactEnergy === null ? t("No contact recorded", "Kontakt nije zabilježen") : p.bumperThickness > 0 ? `${t("Peak modeled force", "Vršna modelirana sila")} ${fmt(s.peakBumperForce, 1, "N")} · ${t("not dB", "nije dB")}` : t("Rigid contact energy · not dB", "Energija krutog kontakta · nije dB")),
      compactMetric(p.silencerEnabled ? t("Silencer outlet", "Izlaz prigušivača") : t("Muzzle pressure", "Tlak na ustima"), p.silencerEnabled ? fmt(s.peakOutflow * 1000, 2, "g/s") : fmt(s.exitPressure === null ? null : (s.exitPressure - s.ambientPressure) / 1e5, 2, "bar(g)"), p.silencerEnabled ? `${t("Peak chamber pressure", "Vršni tlak komore")}: ${fmt((s.peakSilencerPressure - s.ambientPressure) / 1e5, 2, "bar(g)")} · ${t("not dB", "nije dB")}` : `${t("Peak outflow", "Vršni protok")}: ${fmt(s.exitTime === null ? null : s.peakOutflow * 1000, 2, "g/s")}`),
      compactMetric(t("Sound estimate", "Procjena zvuka"), acousticPrediction.available ? fmt(acousticPrediction.levelAtOneMetre, 1, "dB @ 1 m") : t("Relative only", "Samo relativno"), acousticPrediction.available ? t("Empirical same-meter calibration", "Empirijska kalibracija istim mjeračem") : `${fmt(acousticTerms.incidentContactEnergy * 1000, 2)} / ${fmt(acousticTerms.jetExpansionEnergy * 1000, 2, "mJ")} · ${t("contact / gas pools", "izvori kontakt / plin")}`),
      compactMetric(t("Useful energy → slowing", "Korisna energija → usporavanje"), fmt(delta, 2, "ms"), delta === null ? t("Timing unavailable", "Vrijeme nije dostupno") : delta === 0 ? t("Threshold and slowing coincide", "Prag i usporavanje se podudaraju") : delta > 0 ? t("Threshold reached first", "Prag je dosegnut prvi") : t("Slowing begins first", "Usporavanje počinje prvo"))
    ].join("");
    globalThis.PneumaticWorkspace.prepareResults(next, summary, {
      timingHTML: I.timingMarkup(s, p, t, fmt, stamp),
      explainSound: t("Piston impact & muzzle blast — what do these mean?", "Udar pistona i prasak na ustima — što to znači?"),
      explainFeedback: t("What changed & recommended next steps", "Što se promijenilo i preporučeni sljedeći koraci"),
      live: t("Live values · pressure, velocity & spring", "Vrijednosti uživo · tlak, brzina i opruga"),
      help: t("Playback options & model notes", "Opcije prikaza i napomene modela"),
      flag: `${p.airbrakeLength ? t("Airbrake active", "Zračna kočnica uključena") : t("No-airbrake reference", "Referenca bez kočnice")} · ${p.silencerEnabled ? t("silencer chamber active", "komora prigušivača uključena") : t("direct muzzle", "izravna usta")} · ${t("conditional model, not measured performance", "uvjetni model, ne izmjerene performanse")}`
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
    const nextShot = P.simulate(p);
    if (nextShot.valid) {
      const nextComparison = I.comparisonSnapshot(lastValidShot, nextShot);
      if (nextComparison?.changes.length) changeComparison = nextComparison;
      lastValidShot = nextShot;
    }
    shot = nextShot;
    baseline = shot.valid ? P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }) : null;
    unsilencedReference = shot.valid && p.silencerEnabled ? P.simulate({ ...p, silencerEnabled: 0 }) : null;
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
    $("silencerEnabled").checked = p.silencerEnabled === 1;
    $("springCurve").value = p.springCurve.map(pair => pair.join(", ")).join("\n");
    $("bumperCurve").value = p.bumperCurve.map(pair => pair.join(", ")).join("\n");
    document.querySelectorAll("[data-provenance]").forEach(box => { box.checked = provenance[box.dataset.provenance] === "measured"; });
    document.querySelectorAll("[data-mass]").forEach(button => button.setAttribute("aria-pressed", String(p.pistonMass === Number(button.dataset.mass))));
    $("measurementConfirm").checked = false;
    syncSpringControls(); syncBumperControls(); syncSilencerControls();
  }
  function bindFieldHelp() {
    const place = button => {
      const tooltip = $(button.dataset.fieldInfo);
      if (!tooltip) return;
      const margin = 12, gap = 9, width = Math.min(340, Math.max(160, window.innerWidth - margin * 2));
      tooltip.style.width = `${width}px`;
      const trigger = button.getBoundingClientRect(), height = tooltip.getBoundingClientRect().height;
      const left = Math.max(margin, Math.min(window.innerWidth - width - margin, trigger.right - width));
      const below = trigger.bottom + gap;
      const opensAbove = below + height > window.innerHeight - margin && trigger.top - height - gap >= margin;
      tooltip.style.left = `${left}px`;
      const maximumTop = Math.max(margin, window.innerHeight - height - margin);
      tooltip.style.top = `${opensAbove ? trigger.top - height - gap : Math.max(margin, Math.min(below, maximumTop))}px`;
      tooltip.dataset.side = opensAbove ? "above" : "below";
    };
    document.querySelectorAll("[data-field-info]").forEach(button => {
      button.addEventListener("pointerenter", () => place(button));
      button.addEventListener("focus", () => place(button));
      button.addEventListener("click", () => place(button));
      button.addEventListener("keydown", event => {
        if (event.key === "Escape") button.blur();
      });
    });
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
      else if (["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "frontDeadVolume", "pistonMass", "bbMass", "bbDiameter", "headBore", "headLength", "nozzleBore", "nozzleLength", "bumperThickness", "bumperBore", "bumperStiffness", "bumperDamping", "bumperMaxCompression", "restitution", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume", "silencerLength", "silencerInnerDiameter", "silencerBaffleCount", "silencerBaffleThickness", "silencerBaffleBore", "silencerEndCapBore", "silencerPackingFraction", "silencerDischargeCoefficient", "silencerHeatTransfer"].includes(key)) provenance.geometry = "assumed";
      document.querySelectorAll("[data-provenance]").forEach(box => { box.checked = provenance[box.dataset.provenance] === "measured"; });
      $("measurementConfirm").checked = false;
      document.querySelectorAll("[data-mass]").forEach(button => button.setAttribute("aria-pressed", Number(button.dataset.mass) === p.pistonMass));
      syncSpringControls(); syncBumperControls(); syncSilencerControls(); scheduleCalculation();
    }));
    document.querySelectorAll("[data-provenance]").forEach(box => box.addEventListener("change", () => { provenance[box.dataset.provenance] = box.checked ? "measured" : "assumed"; }));
    document.querySelectorAll("[data-mass]").forEach(button => button.addEventListener("click", () => { $("pistonMass").value = button.dataset.mass; $("pistonMass").dispatchEvent(new Event("input", { bubbles: true })); }));
    $("springLengthMode").addEventListener("change", e => {
      p.springLengthMode = e.target.checked ? 1 : 0;
      provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false;
      $("measurementConfirm").checked = false; selectedPlatform = "custom"; $("platformPreset").value = "custom";
      invalidateFit(); syncSpringControls(); scheduleCalculation();
    });
    $("silencerEnabled").addEventListener("change", e => {
      p.silencerEnabled = e.target.checked ? 1 : 0;
      provenance.geometry = "assumed"; document.querySelectorAll('[data-provenance="geometry"]').forEach(box => { box.checked = false; });
      $("measurementConfirm").checked = false; selectedPlatform = "custom"; $("platformPreset").value = "custom";
      invalidateFit(); syncSilencerControls(); scheduleCalculation();
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
      p.springCurve = parseCurveText(e.target.value);
      provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false; $("measurementConfirm").checked = false; invalidateFit(); syncSpringControls(); scheduleCalculation();
    });
    $("bumperCurve").addEventListener("change", e => {
      p.bumperCurve = parseCurveText(e.target.value);
      provenance.geometry = "assumed"; document.querySelector('[data-provenance="geometry"]').checked = false; $("measurementConfirm").checked = false;
      invalidateFit(); syncBumperControls(); scheduleCalculation();
    });
    const energyReadout = () => { $("measurementEnergy").textContent = `${t("Derived energy", "Izvedena energija")}: ${fmt(C.energy(Number($("measurementMass").value), Number($("measurementFps").value)), 3, "J")}`; };
    $("measurementMass").addEventListener("input", energyReadout); $("measurementFps").addEventListener("input", energyReadout); energyReadout();
    $("measurementForm").addEventListener("submit", event => {
      event.preventDefault();
      if (busy) return;
      if (measurements.length >= 2000) { setStatus("Dataset limit: 2,000 shots. Export a backup before removing records.", "Ograničenje: 2000 hitaca. Izvezite sigurnosnu kopiju prije uklanjanja zapisa."); return; }
      const confirmed = $("measurementConfirm").checked, mass = Number($("measurementMass").value);
      if (confirmed && P.validate({ ...p, bbMass: mass }).length) { setStatus("Correct invalid setup inputs before recording a confirmed shot.", "Ispravite nevaljane ulaze prije spremanja potvrđenog hica."); return; }
      let measuredSoundTerms = null;
      if (confirmed && $("measurementSoundDb").value !== "") {
        const sourceShot = Math.abs(mass - p.bbMass) < 1e-12 ? shot : P.simulate({ ...p, bbMass: mass });
        const terms = A.sourceTerms(sourceShot);
        if (terms.valid && terms.complete) measuredSoundTerms = terms;
      }
      const row = C.cleanRecord({ id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, bbMass: mass, fps: Number($("measurementFps").value), sigma: Number($("measurementSigma").value),
        pistonHitMs: $("measurementHitMs").value, peakCylinderBarG: $("measurementPressure").value, peakSilencerBarG: $("measurementSilencerPressure").value, peakBumperForceN: $("measurementBumperForce").value,
        soundPeakDb: $("measurementSoundDb").value, soundSigmaDb: $("measurementSoundSigma").value, soundDistanceM: $("measurementSoundDistance").value,
        soundImpactSourceJ: measuredSoundTerms?.incidentContactEnergy, soundGasSourceJ: measuredSoundTerms?.jetExpansionEnergy,
        setup: confirmed ? { ...clone(p), bbMass: mass } : null, confirmed, provenance: clone(provenance), role: $("measurementRole").value, solverVersion: P.VERSION,
        notes: `${component} / ${pinLabel} / ${springLabel}. ${$("measurementNotes").value}` });
      if (!row) return;
      measurements.push(row); invalidateFit(); refreshAcousticFit(); save(); renderMeasurements(); recalculate(); setStatus("Shot saved; chrono fit cleared and the sound calibration refreshed. Only confirmed measured setups enter either fit.", "Hitac je spremljen; prilagodba kronografa poništena je, a kalibracija zvuka osvježena. U obje prilagodbe ulaze samo potvrđene izmjerene konfiguracije.");
    });
    document.querySelectorAll("[data-fit-parameter]").forEach(box => box.addEventListener("change", () => {
      const selected = [...document.querySelectorAll("[data-fit-parameter]:checked")].map(input => input.dataset.fitParameter);
      if (selected.length > 3) { box.checked = false; setStatus("Select no more than three fitted parameters.", "Odaberite najviše tri parametra za prilagodbu."); return; }
      fitSelection = selected; invalidateFit();
    }));
    $("exportMeasurements").addEventListener("click", () => download("airsoft-chrono-data.json", { ...C.encode(measurements), lastFit: fit }));
    $("importMeasurements").addEventListener("change", async e => {
      if (busy || !e.target.files[0]) return;
      try {
        const file = e.target.files[0]; if (file.size > 8e6) throw new Error("size");
        const data = C.decode(await file.text());
        if (measurements.length + data.measurements.length > 2000) throw new Error("record limit");
        const ids = new Set(measurements.map(r => r.id));
        for (const row of data.measurements) { if (ids.has(row.id)) row.id += `-import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; measurements.push(row); ids.add(row.id); }
        invalidateFit(); refreshAcousticFit(); save(); renderMeasurements(); recalculate(); setStatus(`Imported ${data.measurements.length} shots. Existing data was kept; chrono fit cleared and sound calibration refreshed.`, `Uvezeno je ${data.measurements.length} hitaca. Postojeći podaci sačuvani su; prilagodba kronografa poništena je, a kalibracija zvuka osvježena.`);
      } catch (_) { setStatus("Import rejected: invalid JSON, unsupported records, file too large or 2,000-shot limit exceeded. Existing data was not changed.", "Uvoz odbijen: nevaljan JSON, nepodržani zapisi, prevelika datoteka ili više od 2000 hitaca. Postojeći podaci nisu promijenjeni."); }
    });
    $("fitButton").addEventListener("click", async () => {
      if (busy) return;
      stop(); clearTimeout(debounce);
      if (calculationPending) recalculate();
      if (!fitSelection.length) { setStatus("Select at least one parameter to fit.", "Odaberite barem jedan parametar za prilagodbu."); return; }
      setBusy(true); setStatus("Fitting selected parameters. Results remain conditional on the measured observables and model structure…", "Prilagođavanje odabranih parametara. Rezultati ostaju uvjetovani izmjerenim veličinama i strukturom modela…");
      try {
        fit = await C.fitParameters(clone(measurements), fitSelection, n => setStatus(`Evaluating fit ${n}…`, `Provjera prilagodbe ${n}…`));
        const fitted = Object.entries(fit.parameters).map(([key, value]) => `${fields[key]?.[language === "hr" ? 1 : 0] || key} = ${value.toPrecision(5)}`).join(" · ");
        const en = `${fitted}. Training RMSE ${fmt(fit.training.rmse, 2)} fps (${fit.training.count} shots, ${fit.training.observations} observables, ${fit.distinctTrainingSetups} distinct setups). Held-out RMSE ${fmt(fit.validation.rmse, 2)} fps (${fit.validation.count} shots; ${fit.validation.failures} failed predictions).${fit.boundReached ? " Parameter bound reached." : ""}${fit.weaklyConstrained ? " Parameters are weakly constrained; do not extrapolate." : ""}`;
        const hr = `${fitted}. RMSE prilagodbe ${fmt(fit.training.rmse, 2)} fps (${fit.training.count} hitaca, ${fit.training.observations} opažanja, ${fit.distinctTrainingSetups} različitih konfiguracija). Neovisni RMSE ${fmt(fit.validation.rmse, 2)} fps (${fit.validation.count} hitaca; ${fit.validation.failures} neuspjelih predviđanja).${fit.boundReached ? " Dosegnuta granica parametra." : ""}${fit.weaklyConstrained ? " Parametri su slabo određeni; nemojte ekstrapolirati." : ""}`;
        setStatus(en, hr);
        $("fitReport").innerHTML = `<button class="secondary-button" type="button" id="applyFit">${t("Apply fitted parameters to current setup", "Primijeni prilagođene parametre na trenutačnu konfiguraciju")}</button>`;
        $("applyFit").addEventListener("click", () => { for (const [key, value] of Object.entries(fit.parameters)) p[key] = value; syncSetupControls(); $("measurementConfirm").checked = false; recalculate(); });
      } catch (error) {
        const messages = {
          "fit:too-many-configurations": ["Fit limit: 32 distinct configurations per dataset.", "Ograničenje prilagodbe: 32 različite konfiguracije po skupu."],
          "fit:not-identifiable": ["Not enough distinct training configurations for the selected number of parameters.", "Nema dovoljno različitih konfiguracija za odabrani broj parametara."],
          "fit:parameters": ["Select between one and three supported parameters.", "Odaberite jedan do tri podržana parametra."],
          "fit:silencer-disabled": ["Silencer outlet Cd needs at least one eligible training setup with that silencer installed.", "Cd izlaza prigušivača traži barem jednu prikladnu konfiguraciju za prilagodbu s ugrađenim prigušivačem."],
          "fit:measured-spring": ["Spring stiffness cannot be fitted while a measured force curve is active.", "Krutost opruge ne može se prilagođavati dok je aktivna izmjerena krivulja sile."],
          "fit:measured-bumper": ["Bumper stiffness cannot be fitted while a measured bumper force curve is active.", "Krutost gumice ne može se prilagođavati dok je aktivna izmjerena krivulja sile gumice."]
        };
        setStatus(...(messages[error.message] || ["Fit unavailable: add eligible measured training data whose simulations produce valid exits.", "Prilagodba nije dostupna: dodajte prikladne izmjerene podatke čije simulacije daju valjan izlazak."]));
      }
      finally { setBusy(false); }
    });
  }
  function renderMeasurements() {
    if (!$("measurementRows")) return;
    $("measurementRows").innerHTML = measurements.map((r, i) => `<tr><td>${fmt(r.bbMass, 2, "g")}</td><td>${fmt(r.fps, 1)} / ${fmt(C.energy(r.bbMass, r.fps), 3)}${Number.isFinite(r.soundPeakDb) ? `<br><small>${t("peak sound", "vršni zvuk")} ${fmt(r.soundPeakDb, 1, "dB")} @ ${fmt(r.soundDistanceM, 2, "m")}</small>` : ""}${Number.isFinite(r.pistonHitMs) ? `<br><small>${t("contact", "kontakt")} ${fmt(r.pistonHitMs, 2, "ms")}</small>` : ""}${Number.isFinite(r.peakCylinderBarG) ? `<br><small>${t("peak cylinder", "vršni tlak cilindra")} ${fmt(r.peakCylinderBarG, 2, "bar(g)")}</small>` : ""}${Number.isFinite(r.peakSilencerBarG) ? `<br><small>${t("peak silencer", "vršni tlak prigušivača")} ${fmt(r.peakSilencerBarG, 2, "bar(g)")}</small>` : ""}${Number.isFinite(r.peakBumperForceN) ? `<br><small>${t("peak bumper force", "vršna sila gumice")} ${fmt(r.peakBumperForceN, 1, "N")}</small>` : ""}</td><td>${r.role === "train" ? t("Training", "Prilagodba") : r.role === "validation" ? t("Held-out", "Neovisna provjera") : t("Reference only", "Samo referenca")}<br><small>${C.eligible(r) ? t("Measured inputs confirmed", "Izmjereni ulazi potvrđeni") : t("Not fit-eligible", "Nije prikladno za prilagodbu")}${A.soundEligible(r) ? ` · ${t("sound-fit eligible", "prikladno za zvučnu prilagodbu")}` : ""}${r.setup ? ` · ${fmt(r.setup.pistonMass, 1, "g")} / ${fmt(r.setup.barrelLength, 0, "mm")}` : ` · ${t("setup incomplete", "nepotpuna konfiguracija")}`}</small></td><td>${esc(r.notes)}</td><td><button type="button" class="danger-button" data-remove="${i}" aria-label="${t("Remove shot", "Ukloni hitac")} ${i + 1}">×</button></td></tr>`).join("");
    document.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => {
      if (busy) return;
      const i = Number(button.dataset.remove);
      if (!confirm(t("Remove this measurement from browser storage? Export first if you need a backup.", "Ukloniti ovo mjerenje iz pohrane preglednika? Najprije izvezite podatke ako trebate kopiju."))) return;
      measurements.splice(i, 1); invalidateFit(); refreshAcousticFit(); save(); renderMeasurements(); recalculate(); setStatus("Measurement removed; chrono fit cleared and sound calibration refreshed. An earlier export can restore it.", "Mjerenje je uklonjeno; prilagodba kronografa poništena je, a kalibracija zvuka osvježena. Raniji izvoz može ga vratiti.");
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
      if (button.dataset.impactTime !== undefined) {
        const time = Number(button.dataset.impactTime);
        if (Number.isFinite(time)) { stop(); setFrame(time / shot.duration); }
      } else if (button.dataset.event) {
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
      else if (button.id === "explainFeedback") {
        stop(); workspace.selectView("details"); $("setupFeedback").focus({ preventScroll: true });
        $("setupFeedback").scrollIntoView({ block: "start" });
        if (window.innerWidth <= 960) $("previewPanel").scrollIntoView({ block: "start" });
      }
      else if (button.dataset.feedbackCategory) {
        stop(); workspace.selectCategory(button.dataset.feedbackCategory);
        document.querySelector(".controls-panel").classList.remove("is-collapsed"); $("toggleControls").setAttribute("aria-expanded", "true");
        if (window.innerWidth <= 960) $("settingsPanel").scrollIntoView({ block: "start" });
      }
      else if (button.dataset.feedbackView) {
        stop(); workspace.selectView(button.dataset.feedbackView);
      }
      else if (button.id === "exportRun") download("airsoft-pneumatic-run.json", { schemaVersion: 4, solverVersion: P.VERSION, identity: { selectedPlatform, component, springLabel, pinLabel }, provenance, setup: p, result: shot, baseline: { exitEnergy: baseline?.exitEnergy ?? null, impactEnergy: baseline?.impactEnergy ?? null, unsilencedPeakOutflow: unsilencedReference?.peakOutflow ?? null }, limitations: "Unvalidated lumped control-volume model with optional silencer chamber and a causal wave-travel envelope; not a baffle-resolved CFD/acoustic solution and not exact joules or dB; see docs/MODEL.md" });
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
      if (f.insertion > 0) {
        const overlap = f.insertion * 1000;
        if (p.bumperThickness > 0 && overlap <= p.bumperThickness + 1e-6) parts.push(t("Pin is inside the bumper opening only; it has not entered the metal head bore.", "Pin je samo u otvoru gumice; nije ušao u metalni provrt glave."));
        else if (overlap <= p.bumperThickness + p.headLength + 1e-6) parts.push(t("Pin has entered the metal head bore; pressure difference and local clearance set airflow.", "Pin je ušao u metalni provrt glave; razlika tlaka i lokalni zazor određuju protok."));
        else parts.push(t("Pin reaches the nozzle segment; all overlapped passages contribute to flow resistance.", "Pin doseže segment mlaznice; svi preklopljeni kanali doprinose otporu protoku."));
      }
      if (f.bbExited) parts.push(p.silencerEnabled ? t("BB has left the inner barrel; gas expands into the silencer and exits through its end cap.", "BB je napustio unutarnju cijev; plin se širi u prigušivač i izlazi kroz završnu kapu.") : t("BB has exited; gas continues to flow through the muzzle.", "BB je izašao; plin se nastavlja prazniti kroz usta cijevi."));
      else if (Math.abs(f.bbV) < .01) parts.push(t("BB held or stalled.", "BB zadržan ili zaustavljen."));
      else parts.push(f.bbA >= 0 ? t("BB gaining speed in the barrel.", "BB ubrzava u cijevi.") : t("BB losing speed in the barrel.", "BB usporava u cijevi."));
      if (f.bumperCompression > 0) parts.push(t(`The bumper is compressed by ${fmt(f.bumperCompression * 1000, 3)} mm and applies ${fmt(f.bumperForce, 1)} N in the entered contact model.`, `Gumica je stisnuta ${fmt(f.bumperCompression * 1000, 3)} mm i djeluje silom ${fmt(f.bumperForce, 1)} N u unesenom modelu kontakta.`));
      else if (f.pistonHit) parts.push(p.bumperThickness > 0 ? t("The piston has reached the bumper; the pad is no longer compressed at this frame.", "Piston je dosegnuo gumicu; u ovom kadru gumica više nije stisnuta.") : t("First rigid-head contact has occurred.", "Dogodio se prvi kontakt s krutom glavom."));
    }
    $("phaseText").textContent = parts.join(" ");
    const liveValues = [
      [t("Cylinder / behind / ahead pressure", "Tlak cilindra / iza / ispred BB-a"), `${fmt((f.cylinderPressure - shot.ambientPressure) / 1e5, 2)} / ${fmt((f.pressure - shot.ambientPressure) / 1e5, 2)} / ${fmt((f.frontPressure - shot.ambientPressure) / 1e5, 2, "bar(g)")}`],
      [t("Piston velocity", "Brzina pistona"), fmt(f.pistonV, 2, "m/s")],
      [t("Piston travel / bumper contact", "Pomak pistona / kontakt s gumicom"), `${fmt(f.pistonX * 1000, 2)} / ${fmt(shot.stroke * 1000, 1, "mm")}`],
      [t("Bumper compression / force", "Stlačenje gumice / sila"), `${fmt(f.bumperCompression * 1000, 3)} / ${fmt(f.bumperForce, 1, "N")}`],
      [t("Piston momentum", "Količina gibanja pistona"), fmt(f.pistonV * p.pistonMass / 1000, 3, "kg·m/s")],
      [t("BB velocity", "Brzina BB-a"), fmt(f.bbV, 2, "m/s")],
      [t("BB acceleration", "Ubrzanje BB-a"), fmt(f.bbA, 0, "m/s²")],
      [t("Head airflow", "Protok kroz glavu"), fmt(f.flow * 1000, 3, "g/s")],
      [t("Silencer pressure / outlet flow", "Tlak prigušivača / izlazni protok"), p.silencerEnabled ? `${fmt((f.silencerPressure - shot.ambientPressure) / 1e5, 2, "bar(g)")} / ${fmt(f.silencerOutflow * 1000, 3, "g/s")}` : t("inactive", "neaktivno")],
      [t("Ideal outlet expansion power", "Idealna snaga širenja na izlazu"), fmt(A.jetPowerAtFrame(shot, f), 2, "W")],
      [t("Spring compression", "Stlačenje opruge"), fmt(P.springState(p).cockedCompression - f.pistonX * 1000, 1, "mm")],
      [t("Spring force", "Sila opruge"), fmt(P.springForce(p, f.pistonX), 2, "N")]
    ];
    if (!$("liveStrip").firstChild) $("liveStrip").innerHTML = liveValues.map(() => '<div class="live-item"><span></span><strong></strong></div>').join("");
    liveValues.forEach(([label, value], index) => {
      const item = $("liveStrip").children[index];
      if (item.firstChild.textContent !== label) item.firstChild.textContent = label;
      if (item.lastChild.textContent !== value) item.lastChild.textContent = value;
    });
    if (workspaceState.view === "shot") drawMechanism(f, "mechanism");
    if (workspaceState.view === "graphs") { drawMechanism(f, "mechanismGraph"); drawCharts(f.t); drawImpactChart("impactGraph", f.t); }
    if (workspaceState.view === "details") drawImpactChart("impactResultsChart", f.t);
  }
  function canvasContext(id, fallbackWidth = 900, fallbackHeight = 300) {
    const canvas = $(id), rect = canvas.getBoundingClientRect(), w = rect.width || fallbackWidth, h = rect.height || fallbackHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h };
  }
  function drawMechanism(f, canvasId = "mechanism") {
    const { ctx, w, h } = canvasContext(canvasId);
    globalThis.PneumaticAnimation.draw(ctx, w, h, p, shot, f, t, fmt);
  }
  function drawCharts(time) {
    const traces = [
      ["pressureChart", [[f => (f.cylinderPressure - shot.ambientPressure) / 1e5, "#ffbf69"], [f => (f.pressure - shot.ambientPressure) / 1e5, "#5de4e7"], [f => (f.frontPressure - shot.ambientPressure) / 1e5, "#b99cff"], ...(p.silencerEnabled ? [[f => (f.silencerPressure - shot.ambientPressure) / 1e5, "#6ee7a8"]] : []), [f => (f.wavePressureEstimate - shot.ambientPressure) / 1e5, "#8da2ff", [5, 4]]]],
      ["pistonChart", [[f => f.pistonV, "#ffbf69"]]], ["bbChart", [[f => f.bbV, "#5de4e7"]]],
      ["soundSourceChart", [[f => A.jetPowerAtFrame(shot, f), "#6ee7a8"]]]
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
      for (const [get, color, dash] of series) { ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.setLineDash(dash || []); ctx.beginPath(); shot.frames.forEach((f, i) => { if (i) ctx.lineTo(x(f.t), y(get(f))); else ctx.moveTo(x(f.t), y(get(f))); }); ctx.stroke(); }
      ctx.setLineDash([]);
      for (const [key, color, width, dash] of [["usefulTime", "#6ee7a8", 1.2, [2, 3]], ["strongBrakeTime", "#ffbf69", 1.2, [4, 4]], ["exitTime", "#5de4e7", 1.2, [2, 3]], ["pistonHitTime", "#ff756f", 2.8, []]]) {
        if (shot[key] === null) continue;
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x(shot[key]), top); ctx.lineTo(x(shot[key]), bottom); ctx.stroke();
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
  function drawImpactChart(id, time) {
    const canvas = $(id);
    if (!canvas) return;
    const { ctx, w, h } = canvasContext(id, 900, 220), summary = I.impactSummary(shot), impacts = summary.impacts;
    const left = 58, right = w - 18, top = 24, bottom = h - 34, plotWidth = Math.max(1, right - left), plotHeight = Math.max(1, bottom - top);
    ctx.font = "11px ui-monospace, monospace";
    if (!impacts.length) {
      ctx.fillStyle = "#91a0a7"; ctx.textAlign = "center";
      ctx.fillText(t("No piston contact recorded", "Kontakt pistona nije zabilježen"), w / 2, h / 2);
      return;
    }
    const firstTime = impacts[0].time, lastTime = impacts.at(-1).time;
    const eventSpan = Math.max(0, lastTime - firstTime), padding = eventSpan > 0 ? Math.max(.00008, eventSpan * .16) : .00075;
    const startTime = Math.max(0, firstTime - padding), endTime = Math.min(shot.duration, Math.max(firstTime + padding, lastTime + padding));
    const timeSpan = Math.max(1e-9, endTime - startTime), maxEnergy = Math.max(...impacts.map(event => event.pistonEnergy * 1000), 1e-6), yMax = maxEnergy * 1.12;
    const x = value => left + (value - startTime) / timeSpan * plotWidth;
    const y = value => bottom - value / yMax * plotHeight;
    ctx.textAlign = "right";
    for (let i = 0; i < 4; i++) {
      const value = yMax * i / 3, yy = y(value);
      ctx.strokeStyle = "#28343c"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
      ctx.fillStyle = "#91a0a7"; ctx.fillText(value < .1 ? value.toFixed(3) : value < 10 ? value.toFixed(2) : value.toFixed(0), left - 7, yy + 4);
    }
    ctx.strokeStyle = "#62757d"; ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, plotWidth, plotHeight); ctx.clip();
    impacts.forEach((event, index) => {
      const xx = x(event.time), yy = y(event.pistonEnergy * 1000), color = index === 0 ? "#ffbf69" : "#5de4e7";
      ctx.strokeStyle = color; ctx.globalAlpha = .22; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xx, bottom); ctx.lineTo(xx, yy); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xx, yy, 4, 0, Math.PI * 2); ctx.fill();
    });
    if (time >= startTime && time <= endTime) {
      const cursor = x(time); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cursor, top); ctx.lineTo(cursor, bottom); ctx.stroke();
    }
    ctx.restore();
    ctx.textAlign = "center"; ctx.fillStyle = "#91a0a7";
    ctx.fillText(`${(startTime * 1000).toFixed(2)} ms`, left, h - 10); ctx.fillText(`${(endTime * 1000).toFixed(2)} ms`, right, h - 10);
    impacts.slice(0, 8).forEach((event, index) => {
      const xx = Math.max(left + 8, Math.min(right - 8, x(event.time)));
      ctx.fillStyle = index === 0 ? "#ffbf69" : "#5de4e7"; ctx.fillText(`#${index + 1}`, xx, top - 7);
    });
  }
  window.addEventListener("hashchange", () => { if (busy) return; clearTimeout(debounce); if (location.hash === "#pneumatic-timing") recalculate(); render(); });
  window.addEventListener("resize", () => { if (shot?.valid && $("mechanism")) setFrame(fraction); });
  if (location.hash === "#pneumatic-timing") { shot = P.simulate(p); lastValidShot = shot.valid ? shot : null; baseline = P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }); }
  render();
})();
