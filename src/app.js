/* UI shared by the generated standalone file and Cloudflare build. */
(() => {
  "use strict";
  const P = globalThis.PneumaticPhysics, C = globalThis.PneumaticCalibration, O = globalThis.PneumaticOptimizer, B = globalThis.PneumaticPlayback;
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
  let p = P.normalize(), selectedPlatform = "ssg10", component = "amp", springLabel = "unspecified", pinLabel = "plug";
  let provenance = { geometry: "assumed", spring: "assumed" }, shot = null, baseline = null, fraction = 0, playing = false, animation = 0;
  let measurements = [], fit = null, status = null, diagnostic = null, busy = false, debounce = null;
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
    ["engageTime", t("Pin enters bumper / head passage", "Ulazak pina u otvor gumice / glave"), ""],
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
        <section class="control-group bumper-controls"><p class="group-label">${t("Added cylinder-head bumper", "Dodatna odbojna gumica glave cilindra")}</p>${["bumperThickness", "bumperBore", "restitution"].map(field).join("")}<p class="field-help">${t("Thickness 0 mm means no added pad. Thickness and inner diameter define a separate annular passage before the metal head bore. If the pin projection is no longer than the bumper thickness, it can finish entirely inside the bumper and never enter the metal head passage. Restitution controls post-contact rebound only; it is not rubber hardness, absorbed sound, peak force or dB. Measure the installed pad because its hole can deform.", "Debljina 0 mm znači da nema dodatne gumice. Debljina i unutarnji promjer definiraju zaseban prstenasti kanal ispred metalnog provrta glave. Ako izbočenje pina nije veće od debljine gumice, pin može završiti potpuno unutar gumice i nikad ne ući u metalni kanal glave. Koeficijent odskoka određuje samo povrat nakon kontakta; nije tvrdoća gume, apsorbirani zvuk, vršna sila ni dB. Izmjerite ugrađenu gumicu jer se njezin otvor može deformirati.")}</p></section>
        <label for="pinLabel">${t("Installed AMP pin", "Ugrađeni AMP pin")}</label><select id="pinLabel">${[["custom", "Measured / custom", "Izmjeren / prilagođen"], ["plug", "Plug / no airbrake", "Čep / bez zračne kočnice"], ["short", "Short pin — enter measured size", "Kratki pin — unesite dimenzije"], ["medium", "Medium pin — enter measured size", "Srednji pin — unesite dimenzije"], ["long", "Long pin — enter measured size", "Dugi pin — unesite dimenzije"]].map(([v, en, hr]) => `<option value="${v}" ${pinLabel === v ? "selected" : ""}>${t(en, hr)}</option>`).join("")}</select>
        ${["headBore", "headLength", "nozzleBore", "nozzleLength", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume"].map(field).join("")}<p class="small-note" id="clearanceNote"></p><p class="field-help">${t("Internal diameters—not outer diameters. The model has three consecutive axial passages: bumper opening, rigid-head bore and nozzle. Each restricts only the part of the pin actually reaching that segment. Dead volume is the bare rigid-head cavity; the pad's annular solid volume is subtracted automatically. Measure the installed geometry because rubber deformation and eccentricity are not resolved.", "Unutarnji promjeri — ne vanjski promjeri. Model ima tri uzastopna uzdužna kanala: otvor gumice, provrt krute glave i mlaznicu. Svaki ograničava samo dio pina koji stvarno doseže taj segment. Preostali volumen predstavlja šupljinu gole krute glave; puni prstenasti volumen gumice oduzima se automatski. Izmjerite ugrađenu geometriju jer deformacija gume i ekscentričnost nisu razriješene.")}</p>${provenanceControl("geometry", "I have measured the geometry and assembled masses", "Izmjerio/la sam geometriju i mase sklopova")}</details>
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
    const bumperClearance = p.bumperThickness > 0 ? `${g.bumperGap.toFixed(3)} mm / ${(g.bumperAnnulus * 1e6).toFixed(3)} mm²` : t("inactive (0 mm thickness)", "neaktivno (debljina 0 mm)");
    $("clearanceNote").textContent = t(`Full-shaft clearance / annular area — bumper: ${bumperClearance}; metal head: ${g.gap.toFixed(3)} mm / ${(g.annulus * 1e6).toFixed(3)} mm². Added bumper solid volume: ${(g.bumperSolidVolume * 1e6).toFixed(3)} cm³.`, `Zazor tijela pina / prstenasta površina — gumica: ${bumperClearance}; metalna glava: ${g.gap.toFixed(3)} mm / ${(g.annulus * 1e6).toFixed(3)} mm². Puni volumen dodatne gumice: ${(g.bumperSolidVolume * 1e6).toFixed(3)} cm³.`);
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
      ${Parts.markup(p, t)}
      ${I.soundMarkup(s, baseline, t, fmt)}
      ${I.feedbackMarkup(changeComparison, s, baseline, p, provenance, fields, t, fmt)}
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
      explainFeedback: t("What changed & recommended next steps", "Što se promijenilo i preporučeni sljedeći koraci"),
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
    const nextShot = P.simulate(p);
    if (nextShot.valid) {
      const nextComparison = I.comparisonSnapshot(lastValidShot, nextShot);
      if (nextComparison?.changes.length) changeComparison = nextComparison;
      lastValidShot = nextShot;
    }
    shot = nextShot;
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
      else if (["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "pistonMass", "bbMass", "bbDiameter", "headBore", "headLength", "nozzleBore", "nozzleLength", "bumperThickness", "bumperBore", "restitution", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume"].includes(key)) provenance.geometry = "assumed";
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
      if (f.insertion > 0) {
        const overlap = f.insertion * 1000;
        if (p.bumperThickness > 0 && overlap <= p.bumperThickness + 1e-6) parts.push(t("Pin is inside the bumper opening only; it has not entered the metal head bore.", "Pin je samo u otvoru gumice; nije ušao u metalni provrt glave."));
        else if (overlap <= p.bumperThickness + p.headLength + 1e-6) parts.push(t("Pin has entered the metal head bore; pressure difference and local clearance set airflow.", "Pin je ušao u metalni provrt glave; razlika tlaka i lokalni zazor određuju protok."));
        else parts.push(t("Pin reaches the nozzle segment; all overlapped passages contribute to flow resistance.", "Pin doseže segment mlaznice; svi preklopljeni kanali doprinose otporu protoku."));
      }
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
  if (location.hash === "#pneumatic-timing") { shot = P.simulate(p); lastValidShot = shot.valid ? shot : null; baseline = P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }); }
  render();
})();
