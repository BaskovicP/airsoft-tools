/* UI shared by the generated standalone file and Cloudflare build. */
(() => {
  "use strict";
  const P = globalThis.PneumaticPhysics, C = globalThis.PneumaticCalibration;
  const $ = id => document.getElementById(id), finite = Number.isFinite;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let language = "en";
  try { language = localStorage.getItem("ssg10-pneumatic-lab-language") === "hr" ? "hr" : "en"; } catch (_) { /* local files may disallow storage */ }
  const t = (en, hr) => language === "hr" ? hr : en;
  const fmt = (v, digits = 2, unit = "") => finite(v) ? `${v.toFixed(digits)}${unit ? " " + unit : ""}` : "—";
  const fps = v => v === null ? null : v / .3048;
  const stamp = v => fmt(v === null ? null : v * 1000, 2, "ms");
  const clone = v => JSON.parse(JSON.stringify(v));
  let p = P.normalize(), selectedPlatform = "ssg10", component = "amp", springLabel = "unspecified", pinLabel = "custom";
  let provenance = { geometry: "assumed", spring: "assumed" }, shot = null, baseline = null, fraction = 0, playing = false, animation = 0;
  let measurements = [], fit = null, status = null, diagnostic = null, busy = false, debounce = null;
  const fields = {
    cylinderBore: ["Cylinder internal diameter", "Unutarnji promjer cilindra", "mm", 15, 35, .01],
    strokeLength: ["Actual piston stroke", "Stvarni hod pistona", "mm", 20, 150, .1],
    barrelLength: ["Inner-barrel length", "Duljina unutarnje cijevi", "mm", 100, 800, 1],
    barrelDiameter: ["Inner-barrel diameter", "Promjer unutarnje cijevi", "mm", 5.8, 6.5, .01],
    pistonMass: ["Assembled piston mass", "Masa sastavljenog pistona", "g", 5, 300, .1],
    bbMass: ["BB mass", "Masa BB-a", "g", .1, 1, .01],
    bbDiameter: ["Actual BB diameter", "Stvarni promjer BB-a", "mm", 5.5, 6.4, .01],
    headBore: ["Head receiving-bore diameter", "Promjer ulaznog provrta glave", "mm", 1, 10, .01],
    headLength: ["Receiving-passage length", "Duljina ulaznog provrta", "mm", 1, 40, .1],
    nozzleBore: ["Downstream nozzle diameter", "Promjer izlaznog kanala mlaznice", "mm", 1, 10, .01],
    nozzleLength: ["Downstream nozzle length", "Duljina izlaznog kanala mlaznice", "mm", 1, 50, .1],
    airbrakeLength: ["Pin projection from piston face", "Izbočenje pina od čela pistona", "mm", 0, 40, .1],
    airbrakeDiameter: ["Airbrake maximum / shaft diameter", "Najveći promjer / promjer tijela pina", "mm", .5, 9, .01],
    airbrakeTipDiameter: ["Airbrake tip diameter", "Promjer vrha pina", "mm", 0, 9, .01],
    airbrakeTaper: ["Tapered tip length", "Duljina konusnog vrha", "mm", 0, 10, .1],
    deadVolume: ["Cylinder-side residual cavity", "Preostali volumen na strani cilindra", "cm³", .05, 5, .01],
    breechVolume: ["Head / nozzle / breech storage", "Volumen glave, mlaznice i komore", "cm³", .05, 5, .01],
    springStiffness: ["Spring stiffness (linear mode)", "Krutost opruge (linearni model)", "N/m", 0, 4000, 10],
    springPreload: ["Spring compression at front contact", "Stlačenje opruge pri prednjem kontaktu", "mm", 0, 150, .5],
    springMass: ["Spring mass (⅓ effective-mass approximation)", "Masa opruge (aproksimacija ⅓ efektivne mase)", "g", 0, 100, .1],
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
    ["engageTime", t("Pin enters head", "Ulazak pina u glavu"), ""],
    ["decelTime", t("Piston starts slowing", "Piston počinje usporavati"), ""],
    ["usefulTime", `${Math.round(p.usefulFraction * 100)}% ${t("of peak BB energy", "vršne energije BB-a")}`, "useful"],
    ["strongBrakeTime", t("Substantial slowing after entry", "Značajno usporavanje nakon ulaska"), "brake"],
    ["exitTime", t("BB exit", "Izlazak BB-a"), ""],
    ["reboundTime", t("Piston rebound", "Povrat pistona"), ""],
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
    } else measurements = [C.reference()];
  } catch (_) { measurements = [C.reference()]; status = ["Stored data could not be read. It has not been overwritten.", "Pohranjeni podaci nisu čitljivi. Nisu prebrisani."]; }
  function languageSwitch() { return `<div class="language-switch" role="group" aria-label="${t("Language", "Jezik")}"><button type="button" data-lang="en" aria-pressed="${language === "en"}">English</button><button type="button" data-lang="hr" aria-pressed="${language === "hr"}">Hrvatski</button></div>`; }
  function field(key) {
    const [en, hr, unit, min, max, step] = fields[key];
    return `<div class="control"><label for="${key}"><span>${t(en, hr)}</span><span class="mono">${unit}</span></label><div class="field-entry"><input data-range="${key}" aria-label="${t(en, hr)}" type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}"><input id="${key}" data-number="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${p[key]}" required></div></div>`;
  }
  function group(en, hr, keys, help = "") { return `<section class="control-group"><p class="group-label">${t(en, hr)}</p>${keys.map(field).join("")}${help ? `<p class="field-help">${help}</p>` : ""}</section>`; }
  function provenanceControl(key, en, hr) { return `<label class="provenance"><input type="checkbox" data-provenance="${key}" ${provenance[key] === "measured" ? "checked" : ""}>${t(en, hr)}</label>`; }
  function render() {
    stop();
    const lab = location.hash === "#pneumatic-timing";
    document.documentElement.lang = language;
    document.title = lab ? t("Spring Sniper Pneumatic Timing Lab", "Laboratorij pneumatike opružnih snajpera") : "Airsoft Tools";
    if (!lab) {
      $("root").innerHTML = `<main class="tool-hub"><div class="hub-shell"><nav class="hub-nav"><div class="hub-brand"><span class="hub-brand-mark">AT</span><span>Airsoft Tools</span></div>${languageSwitch()}</nav><div class="hub-content"><div class="hub-intro"><p class="eyebrow">${t("Interactive workshop", "Interaktivna radionica")}</p><h1>Airsoft Tools</h1><p>${t("Explore the mechanics behind your setup.", "Istražite mehaniku svoje konfiguracije.")}</p></div><p class="hub-count">${t("1 tool available", "Dostupan je 1 alat")}</p><div class="tool-grid"><a class="tool-card" href="#pneumatic-timing"><span class="tool-icon" aria-hidden="true">↝</span><span class="tool-copy"><span class="tool-status">${t("Available", "Dostupno")}</span><h2>${t("Spring Sniper Pneumatic Timing Lab", "Laboratorij pneumatike opružnih snajpera")}</h2><p>${t("Explore airflow, piston motion and BB timing. Compare measured setups and calibrate with chrono data.", "Istražite protok zraka, gibanje pistona i BB-a. Usporedite izmjerene konfiguracije i kalibrirajte kronografom.")}</p></span><span class="tool-arrow">→</span></a></div><p class="hub-footnote">${t("More tools will appear here later.", "Novi alati bit će dodani kasnije.")}</p></div></div></main>`;
      bindLanguage(); return;
    }
    $("root").innerHTML = `<main class="app"><header><div><a href="#">${t("← All tools", "← Svi alati")}</a><p class="eyebrow">${t("Conservative pneumatic model · v3", "Konzervativni pneumatski model · v3")}</p><h1>${t("Spring Sniper Pneumatic Timing Lab", "Laboratorij pneumatike opružnih snajpera")}</h1><p class="subtitle">${t("Follow the pressure, motion and energy through a shot—not just its final speed.", "Pratite tlak, gibanje i energiju tijekom opaljenja — ne samo konačnu brzinu.")}</p></div>${languageSwitch()}</header>
      <div class="lab-warning">${t("Conditional physics predictions, not measured performance. Head/pin dimensions and spring data start as assumptions. A chrono fit does not validate internal timing or sound. No exact real-world joules or dB are claimed.", "Uvjetna predviđanja fizikalnog modela, a ne izmjerene performanse. Dimenzije glave/pina i podaci opruge početne su pretpostavke. Kalibracija kronografom ne potvrđuje unutarnji vremenski odnos ni zvuk. Ne tvrdimo da su stvarni jouli ili dB točno predviđeni.")}</div>
      <div class="layout"><aside class="panel controls-panel ${window.innerWidth <= 760 ? "is-collapsed" : ""}" aria-label="${t("Simulation controls", "Kontrole simulacije")}"><div class="panel-heading"><h2>${t("Setup", "Postavke")}</h2><button class="secondary-button" id="toggleControls" type="button" aria-expanded="${window.innerWidth > 760}">${t("Show / hide", "Prikaži / sakrij")}</button></div>
        <section class="control-group"><label for="platformPreset">${t("Rifle starting point", "Početna konfiguracija replike")}</label><select id="platformPreset">${Object.entries(platforms).map(([id, v]) => `<option value="${id}" ${selectedPlatform === id ? "selected" : ""}>${v.name}</option>`).join("")}<option value="custom" ${selectedPlatform === "custom" ? "selected" : ""}>${t("Custom", "Prilagođeno")}</option></select>
        <p class="evidence">${t("Preset geometry is nominal or assumed—not a measurement of your rifle. Changing platforms resets the mechanical assumptions.", "Geometrija predloška nominalna je ili pretpostavljena — nije mjerenje vaše replike. Promjena platforme vraća mehaničke pretpostavke.")}</p>
        <label for="component">${t("Piston / head identity", "Piston / glava cilindra")}</label><select id="component"><option value="amp" ${component === "amp" ? "selected" : ""}>AMP / Tridos Ultimate SSG10</option><option value="scorpion" ${component === "scorpion" ? "selected" : ""}>Stalker Scorpion</option><option value="custom" ${component === "custom" ? "selected" : ""}>${t("Other / custom", "Drugo / prilagođeno")}</option></select>
        <p class="field-help">${t("Identity labels never apply hidden power multipliers. AMP: nominal 71 g at Tridos; manufacturer lists 69–72 g depending on pin. Weigh the complete assembly. Exact head and pin dimensions remain unknown until measured.", "Naziv dijela ne uvodi skrivene množitelje snage. AMP: Tridos navodi 71 g, proizvođač 69–72 g ovisno o pinu. Izvažite cijeli sklop. Točne dimenzije glave i pina nepoznate su do mjerenja.")}</p>
        <label for="springLabel">${t("Spring identity (label only)", "Oznaka opruge (samo naziv)")}</label><select id="springLabel">${["unspecified", "M110", "M120", "M130", "M140", "M150", "M160", "M170", "M180", "M190", "M220", "custom"].map(v => `<option value="${v}" ${springLabel === v ? "selected" : ""}>${v === "unspecified" ? t("Unknown / not recorded", "Nepoznato / nije zabilježeno") : v === "custom" ? t("Other measured spring", "Druga izmjerena opruga") : v}</option>`).join("")}</select><p class="field-help">${t("Use the force data below. An M-rating alone does not determine spring stiffness or preload.", "Koristite podatke o sili u nastavku. Oznaka M ne određuje krutost ni prednaprezanje opruge.")}</p></section>
        ${group("Cylinder and barrel", "Cilindar i cijev", ["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter"], t("Short stroke here moves the cocked piston forward while keeping bore, front contact and spring preload at contact fixed. A front spacer or changed piston needs its actual stroke, pin projection, residual volume and spring-seat measurements entered separately.", "Skraćeni hod ovdje pomiče zapeti piston naprijed uz nepromijenjen promjer, prednji kontakt i prednaprezanje pri kontaktu. Za prednji odstojnik ili drugi piston zasebno unesite stvarni hod, izbočenje pina, preostali volumen i geometriju opruge."))}
        <p class="small-note" id="shortStrokeDynamic"></p>
        ${group("Moving masses", "Pomične mase", ["pistonMass", "bbMass", "bbDiameter"])}<div class="preset-row">${[58, 65, 68, 72, 76, 82].map(m => `<button class="preset" type="button" data-mass="${m}" aria-pressed="${p.pistonMass === m}">${m} g</button>`).join("")}</div>
        <details open><summary>${t("Head and airbrake geometry", "Geometrija glave i zračne kočnice")}</summary><p class="field-help">${t("Pneumatic cushioning: the pin restricts airflow. Cylinder pressure rises relative to the air behind the BB, opposing piston motion. The rubber bumper then absorbs any remaining contact energy. These are separate effects.", "Pneumatsko ublažavanje: pin ograničava protok. Tlak u cilindru raste u odnosu na tlak iza BB-a i suprotstavlja se gibanju pistona. Gumeni odbojnik zatim apsorbira preostalu kontaktnu energiju. To su odvojeni učinci.")}</p><label for="pinLabel">${t("Installed AMP pin", "Ugrađeni AMP pin")}</label><select id="pinLabel">${[["custom", "Measured / custom", "Izmjeren / prilagođen"], ["plug", "Plug / no airbrake", "Čep / bez zračne kočnice"], ["short", "Short pin — enter measured size", "Kratki pin — unesite dimenzije"], ["medium", "Medium pin — enter measured size", "Srednji pin — unesite dimenzije"], ["long", "Long pin — enter measured size", "Dugi pin — unesite dimenzije"]].map(([v, en, hr]) => `<option value="${v}" ${pinLabel === v ? "selected" : ""}>${t(en, hr)}</option>`).join("")}</select>
        ${["headBore", "headLength", "nozzleBore", "nozzleLength", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume"].map(field).join("")}<p class="small-note" id="clearanceNote"></p><p class="field-help">${t("Internal diameters—not the outer head diameter. Model: straight shaft with tapered tip and two stepped head passages. Storage volumes are total cavity volumes, before subtracting the pin; count each cavity once. Bumper thickness affects the entered contact plane/stroke.", "Unutarnji promjeri — ne vanjski promjer glave. Model: ravno tijelo pina s konusnim vrhom i dva provrta glave. Volumeni su ukupni volumeni šupljina prije oduzimanja pina; svaku šupljinu računajte jednom. Debljina odbojnika utječe na unesenu ravninu kontakta / hod.")}</p>${provenanceControl("geometry", "I have measured the geometry and assembled masses", "Izmjerio/la sam geometriju i mase sklopova")}</details>
        <details><summary>${t("Spring and mechanical losses", "Opruga i mehanički gubici")}</summary>${["springStiffness", "springPreload", "springMass", "pistonFriction", "sealFriction", "rearDamping", "restitution"].map(field).join("")}
        <label for="springCurve">${t("Optional measured force curve: compression mm, force N (one pair per line)", "Neobavezna izmjerena krivulja: stlačenje mm, sila N (jedan par po retku)")}</label><textarea id="springCurve" rows="4" placeholder="50, 27.5&#10;100, 55&#10;140, 77">${p.springCurve.map(v => v.join(", ")).join("\n")}</textarea><p class="field-help">${t("A supplied curve replaces linear stiffness and must cover preload through full cocked compression. Clear it to use stiffness × compression. Restitution is a simplified bumper model; peak contact force and sound are not calculated.", "Unesena krivulja zamjenjuje linearnu krutost i mora pokriti raspon od prednaprezanja do punog zapinjanja. Izbrišite je za model krutost × stlačenje. Koeficijent odskoka pojednostavljen je model odbojnika; vršna sila kontakta i zvuk se ne računaju.")}</p>${provenanceControl("spring", "I have measured the spring force and installed compression", "Izmjerio/la sam silu opruge i ugrađeno stlačenje")}</details>
        <details><summary>${t("Airflow, friction and environment", "Protok, trenje i okoliš")}</summary>${["dischargeCoefficient", "pistonLeak", "nozzleLeak", "bbLeakCoefficient", "bbBreakaway", "barrelDrag", "heatTransfer", "ambientPressure", "airTemperature"].map(field).join("")}<p class="field-help">${t("Leak areas include their discharge coefficient. Zero heat conductance is an adiabatic starting approximation. All loss coefficients need evidence; they are not efficiency percentages.", "Površine curenja uključuju koeficijent protoka. Nulta toplinska vodljivost početna je adijabatska aproksimacija. Svi koeficijenti gubitaka zahtijevaju potvrdu; nisu postoci učinkovitosti.")}</p></details>
        <details><summary>${t("Timing criteria and solver", "Vremenski kriteriji i rješavač")}</summary>${["usefulFraction", "decelThreshold", "maxTime"].map(field).join("")}<p class="field-help">${t("Adaptive midpoint integration, maximum step 0.01 ms. Thresholds are user conventions, not physical switches. The model can end before contact or complete discharge.", "Adaptivna integracija metodom srednje točke, najveći korak 0,01 ms. Pragovi su dogovoreni kriteriji, a ne fizikalne sklopke. Model može završiti prije kontakta ili potpunog pražnjenja.")}</p></details>
      </aside><section class="main"><div id="results"></div>${calibrationMarkup()}</section></div></main>`;
    bindLanguage(); bindControls(); updateResults(); renderMeasurements();
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
  function metric(label, value, note, kind = "model") { return `<article class="readout"><div class="topline"><span>${label}</span><span class="tag ${kind}">${kind === "geometry" ? t("geometry", "geometrija") : t("model", "model")}</span></div><strong>${value}</strong><small>${note}</small></article>`; }
  function updateResults() {
    if (!$("results")) return;
    const g = P.geometry(p, 0, 0), before = Math.max(0, p.strokeLength - p.airbrakeLength);
    $("shortStrokeDynamic").textContent = t(`Swept volume: ${(g.sweptVolume * 1e6).toFixed(2)} cm³. Before pin entry: ${before.toFixed(1)} mm / ${(g.ac * before * 1000).toFixed(2)} cm³.`, `Radni volumen: ${(g.sweptVolume * 1e6).toFixed(2)} cm³. Prije ulaska pina: ${before.toFixed(1)} mm / ${(g.ac * before * 1000).toFixed(2)} cm³.`);
    $("clearanceNote").textContent = t(`Full-shaft radial clearance: ${g.gap.toFixed(3)} mm; annular area: ${(g.annulus * 1e6).toFixed(3)} mm². This is geometry, not a flow rate.`, `Radijalni zazor uz tijelo pina: ${g.gap.toFixed(3)} mm; prstenasta površina: ${(g.annulus * 1e6).toFixed(3)} mm². To je geometrija, a ne protok.`);
    if (!shot?.valid) {
      $("results").innerHTML = `<div class="lab-warning error" role="alert"><h2>${t("Cannot simulate this setup", "Ovu konfiguraciju nije moguće simulirati")}</h2><p>${t("Check positive dimensions, BB smaller than barrel, pin smaller than the passage it enters, pin length within stroke/head, positive residual storage, and spring-curve coverage. No previous result is shown.", "Provjerite pozitivne dimenzije, BB manji od cijevi, pin manji od pripadnog provrta, duljinu pina unutar hoda/glave, pozitivan preostali volumen i raspon krivulje opruge. Prethodni rezultat nije prikazan.")}</p><p>${esc((shot?.errors || []).join(" · "))}</p></div>`; return;
    }
    const s = shot, retention = s.exitEnergy !== null && baseline?.valid && baseline.exitEnergy > 0 ? 100 * s.exitEnergy / baseline.exitEnergy : null;
    const diff = s.engageTime !== null && s.exitTime !== null ? (s.engageTime - s.exitTime) * 1000 : null;
    const delta = s.strongBrakeTime !== null && s.usefulTime !== null ? (s.strongBrakeTime - s.usefulTime) * 1000 : null;
    const verdict = delta === null ? t("Timing comparison unavailable", "Vremenska usporedba nije dostupna") : delta >= 0 ? t("Energy threshold reached before substantial slowing", "Prag energije dosegnut prije značajnog usporavanja") : t("Substantial slowing starts before the energy threshold", "Značajno usporavanje počinje prije praga energije");
    $("results").innerHTML = `<div class="readout-grid">
      ${metric(t("Cylinder / barrel volumes", "Volumeni cilindra / cijevi"), `${fmt(s.cylinderVolume * 1e6, 2)} / ${fmt(s.barrelVolume * 1e6, 2)}`, "cm³", "geometry")}
      ${metric(t("Cylinder / barrel ratio", "Omjer cilindra / cijevi"), fmt(s.ratio, 2, ": 1"), t("Swept volume / barrel volume", "Radni volumen / volumen cijevi"), "geometry")}
      ${metric(t("Predicted muzzle speed", "Predviđena izlazna brzina"), fmt(fps(s.exitVelocity), 1, "fps"), s.exitEnergy === null ? t("BB did not exit within the run", "BB nije izašao tijekom simulacije") : `${fmt(s.exitEnergy, 3, "J")} · ${t("conditional, not chrono", "uvjetno, nije kronograf")}`)}
      ${metric(t("Energy gained at slowing event", "Energija pri događaju usporavanja"), fmt(s.preBrakeShare === null ? null : s.preBrakeShare * 100, 1, "%"), t("Relative to exit energy; can exceed 100%", "U odnosu na izlaznu energiju; može prijeći 100%"))}
      ${metric(t("Peak cylinder / BB pressure", "Vršni tlak cilindra / iza BB-a"), `${fmt((s.peakCylinderPressure - s.ambientPressure) / 1e5, 2)} / ${fmt((s.peakPressure - s.ambientPressure) / 1e5, 2)}`, t("bar above atmosphere", "bar iznad atmosferskog tlaka"))}
      ${metric(t("Relative exit-energy retention", "Relativno zadržavanje izlazne energije"), fmt(retention, 1, "%"), t("Same mass, no-pin baseline; not sound reduction", "Ista masa, referenca bez pina; nije utišavanje"))}
      ${metric(t("Piston momentum at entry", "Količina gibanja pistona pri ulasku"), fmt(s.momentumAtEngage, 3, "kg·m/s"), t("Actual piston mass × signed velocity", "Stvarna masa pistona × predznačena brzina"))}
      ${metric(t("Pin entry relative to BB exit", "Ulazak pina u odnosu na izlazak BB-a"), fmt(diff, 2, "ms"), t("Negative = pin enters first", "Negativno = pin ulazi prvi"))}
      </div>
      ${!s.complete ? `<div class="lab-warning">${t("Run ended with missing events:", "Simulacija je završila bez događaja:")} ${s.exitTime === null ? t("BB exit. ", "Izlazak BB-a. ") : ""}${s.pistonHitTime === null ? t("Piston contact. ", "Kontakt pistona. ") : ""}${t("Missing contact is not a predicted soft landing. Increase modeled time if appropriate.", "Izostanak kontakta ne znači predviđen mekan udar. Po potrebi povećajte vrijeme simulacije.")}</div>` : ""}
      <section class="panel timing-card"><div class="timing-head"><strong>${verdict}</strong><span>${fmt(delta, 2, "ms")}</span></div><p class="small-note">${t("The amber event is measured from the modeled acceleration after entry—not proof that all slowing is caused by the pin. Compression can slow a piston without an airbrake. Green marks a chosen share of maximum BB energy before exit, not a universal optimum.", "Jantarni događaj temelji se na modeliranom ubrzanju nakon ulaska — nije dokaz da je sve usporavanje uzrokovano pinom. Kompresija može usporiti piston i bez kočnice. Zelena označuje odabrani udio najveće energije BB-a prije izlaska, ne univerzalni optimum.")}</p><div class="event-list">${events().map(([key, label, cls]) => `<button type="button" data-event="${key}" class="${cls}" ${s[key] === null ? "disabled" : ""}>${label}<br><span class="mono">${stamp(s[key])}</span></button>`).join("")}</div></section>
      <section class="panel stage"><div class="stage-toolbar"><button class="primary-button" type="button" id="playButton">${t("Fire / play", "Opali / pokreni")}</button><button class="secondary-button" id="resetButton" type="button">${t("Reset", "Početak")}</button><input id="scrubber" aria-label="${t("Shot time", "Vrijeme opaljenja")}" type="range" min="0" max="1000" value="${fraction * 1000}"><span id="clock" class="clock mono"></span></div><canvas id="mechanism" role="img" aria-label="${t("Schematic piston, airbrake and BB positions; live numeric values below", "Shematski položaji pistona, pina i BB-a; brojčane vrijednosti ispod")}"></canvas><div id="phaseText" class="stage-status" aria-live="off"></div><div id="liveStrip" class="live-strip"></div><p class="results-note">${t("Schematic, not to scale. Each gas region has its own pressure color. Arrows reverse during rebound or reverse flow. Display time is slowed.", "Shematski prikaz, nije u mjerilu. Svako plinsko područje ima svoju boju tlaka. Strelice mijenjaju smjer pri povratu ili obrnutom protoku. Prikaz je usporen.")}</p></section>
      <section class="panel graphs"><div class="graphs-header"><div><h2>${t("Shot traces", "Krivulje opaljenja")}</h2><p>${t("Pressure: amber cylinder, cyan behind BB. Events: green energy threshold, dashed amber slowing, cyan exit. Negative values remain visible.", "Tlak: jantarni cilindar, cijan iza BB-a. Događaji: zeleni prag energije, isprekidano jantarno usporavanje, cijan izlazak. Negativne vrijednosti ostaju vidljive.")}</p></div></div><div class="chart-grid">${[["pressureChart", t("Pressure vs time", "Tlak kroz vrijeme"), "bar(g)"], ["pistonChart", t("Piston velocity vs time", "Brzina pistona kroz vrijeme"), "m/s"], ["bbChart", t("BB velocity vs time", "Brzina BB-a kroz vrijeme"), "m/s"]].map(([id, label, units]) => `<div class="chart"><div class="chart-title"><span>${label}</span><span>${units} / ms</span></div><canvas id="${id}" role="img" aria-label="${label}; ${t("numeric values in live readouts; export full trace below", "brojčane vrijednosti u prikazu uživo; izvoz cijele krivulje ispod")}"></canvas></div>`).join("")}</div></section>
      <div class="intensity-grid"><article class="intensity impact-primary"><div class="intensity-head"><strong>${t("Piston impact · mechanical strike", "Udar pistona · mehanički udarac")}</strong><output>${fmt(s.impactEnergy, 3, "J")}</output></div><p>${s.impactEnergy === null ? t("No contact occurred during this run. Impact intensity is unknown, not zero.", "Kontakt se nije dogodio tijekom simulacije. Jačina udara je nepoznata, a ne nula.") : `${t("First-contact piston speed", "Brzina pistona pri prvom kontaktu")}: ${fmt(s.pistonImpactVelocity, 2, "m/s")}.`}</p><p>${t("Remaining piston kinetic energy indicates how much energy reaches the mechanical strike. It does not determine peak force or loudness. The rubber bumper, spring vibration and body resonance change the sound. No universal 0–100 or dB scale is used.", "Preostala kinetička energija pistona pokazuje energiju koja dolazi do mehaničkog udara. Ne određuje vršnu silu ni glasnoću. Gumeni odbojnik, vibracije opruge i rezonancija tijela mijenjaju zvuk. Ne koristi se univerzalna ljestvica 0–100 ni dB.")}</p></article>
      <article class="intensity"><div class="intensity-head"><strong>${t("Muzzle discharge · escaping air", "Pražnjenje na ustima · izlazak zraka")}</strong><output>${fmt(s.exitPressure === null ? null : (s.exitPressure - s.ambientPressure) / 1e5, 2, "bar(g)")}</output></div><p>${t("Peak muzzle outflow", "Vršni protok na ustima")}: ${fmt(s.exitTime === null ? null : s.peakOutflow * 1000, 2, "g/s")} · ${t("Discharged during run", "Ispušteno tijekom simulacije")}: ${fmt(s.exitTime === null ? null : s.muzzleMass * 1e6, 1, "mg")}.</p><p>${t("Gas inventory at exit", "Masa plina pri izlasku")}: ${fmt(s.exitGasMass === null ? null : s.exitGasMass * 1e6, 1, "mg")}. ${s.dischargeComplete ? t("Pressure relaxed within 1% of atmosphere.", "Tlak se približio atmosferi unutar 1%.") : t("Discharge may continue beyond the run.", "Pražnjenje se može nastaviti nakon simulacije.")}</p><p>${t("These are model quantities, not acoustic intensity or suppressor predictions.", "Ovo su veličine modela, a ne predviđanje akustičkog intenziteta ili prigušivača.")}</p></article></div>
      <section class="panel insight"><div class="panel-heading"><h2>${t("Energy, verification and uncertainty", "Energija, provjera i nesigurnost")}</h2><span class="tag unknown">${t("not experimentally validated", "nije eksperimentalno potvrđeno")}</span></div><div class="assumption-grid"><span>${t("Maximum BB energy observed", "Najveća opažena energija BB-a")}</span><strong>${fmt(s.maxBbEnergy, 3, "J")}</strong><span>${t("Energy lost before exit", "Energija izgubljena prije izlaska")}</span><strong>${fmt(s.bbEnergyLoss, 3, "J")}</strong><span>${t("Positive / negative net BB work", "Pozitivan / negativan neto rad na BB-u")}</span><strong>${fmt(s.positiveBbWork, 3)} / ${fmt(s.negativeBbWork, 3, "J")}</strong><span>${t("Energy balance residual", "Odstupanje energetske bilance")}</span><strong>${fmt(s.energyResidual * 1000, 4, "mJ")}</strong><span>${t("Gas mass residual", "Odstupanje bilance mase plina")}</span><strong>${s.massResidual.toExponential(2)} kg</strong><span>${t("Ambient barrel sound-crossing scale", "Vrijeme prolaza zvuka kroz cijev pri okolišnim uvjetima")}</span><strong>${stamp(s.soundCrossingTime)}</strong></div>
      <p class="small-note">${t("A small numerical residual does not validate the physics. Two uniform-pressure gas volumes, approximate series duct losses, an effective leaky-piston BB and atmospheric pressure ahead of it are simplifications. Pressure waves, spring surge, detailed cup/bumper deformation and structural acoustics are not resolved. Sub-millisecond timing needs instrumented and spatial-flow validation.", "Malo numeričko odstupanje ne potvrđuje fizikalni model. Dva plinska volumena jednolikog tlaka, približni gubici u kanalima, BB kao efektivni propusni klip i atmosferski tlak ispred njega pojednostavljenja su. Tlačni valovi, valovi opruge, detaljna deformacija brtve/odbojnika i strukturna akustika nisu razriješeni. Vremenski odnos ispod milisekunde zahtijeva instrumentiranu i prostornu provjeru protoka.")}</p>
      <div class="fit-row"><button class="secondary-button" id="convergenceButton" type="button">${t("Check finer time steps", "Provjeri manje vremenske korake")}</button><button class="secondary-button" id="sensitivityButton" type="button">${t("Check input sensitivity", "Provjeri osjetljivost na ulaze")}</button><button class="secondary-button" id="exportRun" type="button">${t("Export setup and full trace", "Izvezi postavke i cijelu krivulju")}</button></div>
      <p class="small-note">${t("Sensitivity examples vary head and pin diameter by ±0.02 mm and spring force by ±5%, in all eight combinations. These are explicit test ranges, not measured tolerances or statistical confidence intervals.", "Primjeri osjetljivosti mijenjaju promjer glave i pina za ±0,02 mm te silu opruge za ±5%, u svih osam kombinacija. To su izričito zadani ispitni rasponi, a ne izmjerene tolerancije ili statistički intervali pouzdanosti.")}</p><p id="diagnosticReport" class="status-line" role="status">${diagnostic ? esc(t(...diagnostic)) : ""}</p>
      <div class="source-links"><a href="https://tridos.design/products/ultimate-ssg10-vsr10-piston-cylinder-head-kit" target="_blank" rel="noreferrer">AMP / Tridos</a><a href="https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html" target="_blank" rel="noreferrer">${t("Compressible mass flow", "Stlačivi protok")}</a><a href="https://cris.technion.ac.il/en/publications/the-internal-ballistics-of-airguns/" target="_blank" rel="noreferrer">${t("Thermodynamic model reference", "Referenca termodinamičkog modela")}</a></div></section>`;
    bindResults(); setFrame(fraction);
  }
  function bindLanguage() {
    document.querySelectorAll("[data-lang]").forEach(button => button.addEventListener("click", () => {
      if (busy) return;
      language = button.dataset.lang;
      try { localStorage.setItem("ssg10-pneumatic-lab-language", language); } catch (_) { /* no-op */ }
      render();
    }));
  }
  function recalculate() {
    stop(); fraction = 0; diagnostic = null;
    shot = P.simulate(p);
    baseline = shot.valid ? P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }) : null;
    updateResults();
  }
  function scheduleCalculation() {
    stop(); clearTimeout(debounce);
    shot = null; baseline = null;
    $("results").innerHTML = `<p class="empty-state" role="status">${t("Calculating the coupled shot…", "Računanje povezanog ciklusa…")}</p>`;
    debounce = setTimeout(recalculate, 140);
  }
  function bindControls() {
    $("toggleControls").addEventListener("click", e => { const closed = document.querySelector(".controls-panel").classList.toggle("is-collapsed"); e.currentTarget.setAttribute("aria-expanded", String(!closed)); });
    document.querySelectorAll("[data-number], [data-range]").forEach(input => input.addEventListener("input", () => {
      const key = input.dataset.number || input.dataset.range;
      p[key] = input.value === "" ? NaN : Number(input.value);
      const pair = input.dataset.number ? document.querySelector(`[data-range="${key}"]`) : $(key);
      pair.value = input.value;
      selectedPlatform = "custom"; $("platformPreset").value = "custom";
      if (["springStiffness", "springPreload", "springMass"].includes(key)) provenance.spring = "assumed";
      else if (["cylinderBore", "strokeLength", "barrelLength", "barrelDiameter", "pistonMass", "bbMass", "bbDiameter", "headBore", "headLength", "nozzleBore", "nozzleLength", "airbrakeLength", "airbrakeDiameter", "airbrakeTipDiameter", "airbrakeTaper", "deadVolume", "breechVolume"].includes(key)) provenance.geometry = "assumed";
      document.querySelectorAll("[data-provenance]").forEach(box => { box.checked = provenance[box.dataset.provenance] === "measured"; });
      $("measurementConfirm").checked = false;
      document.querySelectorAll("[data-mass]").forEach(button => button.setAttribute("aria-pressed", Number(button.dataset.mass) === p.pistonMass));
      scheduleCalculation();
    }));
    document.querySelectorAll("[data-provenance]").forEach(box => box.addEventListener("change", () => { provenance[box.dataset.provenance] = box.checked ? "measured" : "assumed"; }));
    document.querySelectorAll("[data-mass]").forEach(button => button.addEventListener("click", () => { $("pistonMass").value = button.dataset.mass; $("pistonMass").dispatchEvent(new Event("input", { bubbles: true })); }));
    $("platformPreset").addEventListener("change", event => {
      selectedPlatform = event.target.value;
      const v = platforms[selectedPlatform];
      if (v) {
        p = P.normalize({ cylinderBore: Math.sqrt(v.volume * 1000 / v.stroke / Math.PI) * 2, strokeLength: v.stroke, barrelLength: v.barrel, barrelDiameter: v.bore, pistonMass: v.mass });
        component = selectedPlatform.startsWith("ssg10") ? "amp" : "custom";
        if (component !== "amp") { p.airbrakeLength = 0; p.airbrakeTaper = 0; }
        provenance = { geometry: "assumed", spring: "assumed" }; pinLabel = component === "amp" ? "custom" : "plug"; springLabel = "unspecified"; fit = null;
      }
      recalculate(); render();
    });
    $("component").addEventListener("change", e => { component = e.target.value; provenance.geometry = "assumed"; document.querySelector('[data-provenance="geometry"]').checked = false; $("measurementConfirm").checked = false; });
    $("springLabel").addEventListener("change", e => { springLabel = e.target.value; provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false; $("measurementConfirm").checked = false; });
    $("pinLabel").addEventListener("change", e => {
      pinLabel = e.target.value; provenance.geometry = "assumed";
      if (pinLabel === "plug") { p.airbrakeLength = 0; p.airbrakeTaper = 0; recalculate(); render(); }
      else { document.querySelector('[data-provenance="geometry"]').checked = false; $("measurementConfirm").checked = false; setStatus("Pin label recorded. Enter its measured projection, diameter and assembled mass; no undocumented dimensions were assigned.", "Oznaka pina je zabilježena. Unesite izmjereno izbočenje, promjer i masu sklopa; nisu dodijeljene nepoznate dimenzije."); }
    });
    $("springCurve").addEventListener("change", e => {
      p.springCurve = e.target.value.trim() ? e.target.value.trim().split(/\n+/).map(line => line.trim().split(/[,;\s]+/).map(Number)) : [];
      provenance.spring = "assumed"; document.querySelector('[data-provenance="spring"]').checked = false; $("measurementConfirm").checked = false; scheduleCalculation();
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
  function bindResults() {
    $("playButton").addEventListener("click", () => {
      if (playing) { stop(); return; }
      if (fraction > .999) fraction = 0;
      playing = true; $("playButton").textContent = t("Pause", "Pauza");
      const start = performance.now() - fraction * 7000;
      function tick(now) { if (!playing) return; setFrame(Math.min(1, (now - start) / 7000)); if (fraction >= 1) stop(); else animation = requestAnimationFrame(tick); }
      animation = requestAnimationFrame(tick);
    });
    $("resetButton").addEventListener("click", () => { stop(); setFrame(0); });
    $("scrubber").addEventListener("input", e => { stop(); setFrame(Number(e.target.value) / 1000); });
    document.querySelectorAll("[data-event]").forEach(button => button.addEventListener("click", () => { const time = shot[button.dataset.event]; if (time !== null) { stop(); setFrame(time / shot.duration); } }));
    $("exportRun").addEventListener("click", () => download("airsoft-pneumatic-run.json", { schemaVersion: 3, solverVersion: P.VERSION, identity: { selectedPlatform, component, springLabel, pinLabel }, provenance, setup: p, result: shot, baseline: { exitEnergy: baseline?.exitEnergy ?? null, impactEnergy: baseline?.impactEnergy ?? null }, limitations: "Unvalidated two-volume, leaky-piston model; not exact joules or dB; see docs/MODEL.md" }));
    $("convergenceButton").addEventListener("click", () => runDiagnostic("convergence"));
    $("sensitivityButton").addEventListener("click", () => runDiagnostic("sensitivity"));
  }
  async function runDiagnostic(mode) {
    if (busy) return;
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
    const f = shot.frames;
    let lo = 0, hi = f.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (f[mid].t <= time) lo = mid; else hi = mid; }
    const a = f[lo], b = f[hi], mix = b.t > a.t ? Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t))) : 0;
    const out = { ...a, t: time };
    for (const key of Object.keys(a)) if (typeof a[key] === "number" && key !== "t") out[key] = a[key] + (b[key] - a[key]) * mix;
    out.bbExited = shot.exitTime !== null && time >= shot.exitTime;
    out.pistonHit = shot.pistonHitTime !== null && time >= shot.pistonHitTime;
    return out;
  }
  function setFrame(next) {
    if (!shot?.valid || !$("mechanism")) return;
    fraction = Math.max(0, Math.min(1, next));
    const f = atTime(shot.duration * fraction);
    $("scrubber").value = fraction * 1000; $("clock").textContent = stamp(f.t);
    const parts = [];
    if (f.t === 0) parts.push(t("Spring held; gas at atmospheric pressure.", "Opruga zapeta; plin na atmosferskom tlaku."));
    else {
      if (f.pistonV < -.005) parts.push(t("Piston rebounding.", "Piston se vraća."));
      else if (f.pistonV > .02) parts.push(f.pistonA < 0 ? t("Piston decelerating.", "Piston usporava.") : t("Spring releasing; piston accelerating.", "Opruga se otpušta; piston ubrzava."));
      else parts.push(t("Piston at rest or turning.", "Piston miruje ili mijenja smjer."));
      if (f.insertion > 0) parts.push(t("Pin overlaps the passage; pressure difference and clearance set airflow.", "Pin ulazi u kanal; razlika tlaka i zazor određuju protok."));
      if (f.bbExited) parts.push(t("BB has exited; gas continues to flow through the muzzle.", "BB je izašao; plin se nastavlja prazniti kroz usta cijevi."));
      else if (Math.abs(f.bbV) < .01) parts.push(t("BB held or stalled.", "BB zadržan ili zaustavljen."));
      else parts.push(f.bbA >= 0 ? t("BB gaining speed in the barrel.", "BB ubrzava u cijevi.") : t("BB losing speed in the barrel.", "BB usporava u cijevi."));
      if (f.pistonHit) parts.push(t("First head contact has occurred.", "Prvi kontakt s glavom se dogodio."));
    }
    $("phaseText").textContent = parts.join(" ");
    $("liveStrip").innerHTML = [
      [t("Cylinder / BB pressure", "Tlak cilindra / iza BB-a"), `${fmt((f.cylinderPressure - shot.ambientPressure) / 1e5, 2)} / ${fmt((f.pressure - shot.ambientPressure) / 1e5, 2, "bar(g)")}`],
      [t("Piston velocity", "Brzina pistona"), fmt(f.pistonV, 2, "m/s")],
      [t("Piston momentum", "Količina gibanja pistona"), fmt(f.pistonV * p.pistonMass / 1000, 3, "kg·m/s")],
      [t("BB velocity", "Brzina BB-a"), fmt(f.bbV, 2, "m/s")],
      [t("BB acceleration", "Ubrzanje BB-a"), fmt(f.bbA, 0, "m/s²")],
      [t("Head airflow", "Protok kroz glavu"), fmt(f.flow * 1000, 3, "g/s")]
    ].map(([label, value]) => `<div class="live-item"><span>${label}</span><strong>${value}</strong></div>`).join("");
    drawMechanism(f); drawCharts(f.t);
  }
  function canvasContext(id, fallbackWidth = 900, fallbackHeight = 300) {
    const canvas = $(id), rect = canvas.getBoundingClientRect(), w = rect.width || fallbackWidth, h = rect.height || fallbackHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h };
  }
  function drawMechanism(f) {
    const { ctx, w, h } = canvasContext("mechanism"), sy = h / 300;
    ctx.save(); ctx.scale(w / 1100, sy);
    const wall = 40, head = 460, face0 = 110, face = face0 + f.pistonX / shot.stroke * (head - face0), barrelStart = 520, end = 1020;
    const bb = f.bbExited ? end + Math.min(65, (f.t - shot.exitTime) * 70000) : barrelStart + f.bbX / shot.barrelLength * (end - barrelStart);
    const pressureAlpha = v => Math.max(.06, Math.min(.85, .12 + (v - shot.ambientPressure) / Math.max(1, shot.peakCylinderPressure - shot.ambientPressure) * .7));
    ctx.lineWidth = 2; ctx.strokeStyle = "#687881"; ctx.fillStyle = "#10171c";
    ctx.fillRect(wall, 90, head - wall, 110); ctx.strokeRect(wall, 90, head - wall, 110);
    ctx.fillStyle = `rgba(255,191,105,${pressureAlpha(f.cylinderPressure)})`; ctx.fillRect(face, 94, Math.max(0, head - face), 102);
    ctx.fillStyle = "#303c43"; ctx.fillRect(head, 112, 60, 65);
    ctx.fillStyle = "#090d10"; ctx.fillRect(head, 134, 60, 22); ctx.strokeRect(head, 134, 60, 22);
    ctx.strokeRect(barrelStart, 132, end - barrelStart, 26);
    ctx.fillStyle = `rgba(93,228,231,${pressureAlpha(f.pressure)})`; ctx.fillRect(barrelStart, 134, Math.max(0, Math.min(bb, end) - barrelStart), 22);
    ctx.strokeStyle = "#ffbf69"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(wall + 5, 145);
    for (let i = 0; i <= 22; i++) ctx.lineTo(wall + 10 + (face - wall - 47) * i / 22, i === 0 || i === 22 ? 145 : i % 2 ? 122 : 168);
    ctx.stroke(); ctx.fillStyle = "#87969e"; ctx.fillRect(face - 30, 95, 30, 100);
    if (p.airbrakeLength > 0) {
      const length = p.airbrakeLength / p.strokeLength * (head - face0), thick = Math.min(18, p.airbrakeDiameter / p.headBore * 22), tip = Math.min(length, length * p.airbrakeTaper / p.airbrakeLength);
      ctx.fillStyle = "#e4edef"; ctx.beginPath(); ctx.moveTo(face, 145 - thick / 2); ctx.lineTo(face + length - tip, 145 - thick / 2); ctx.lineTo(face + length, 145 - thick * p.airbrakeTipDiameter / p.airbrakeDiameter / 2); ctx.lineTo(face + length, 145 + thick * p.airbrakeTipDiameter / p.airbrakeDiameter / 2); ctx.lineTo(face + length - tip, 145 + thick / 2); ctx.lineTo(face, 145 + thick / 2); ctx.closePath(); ctx.fill();
    }
    const arrow = (x, y, delta, color) => { if (Math.abs(delta) < 1) return; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + delta, y); ctx.lineTo(x + delta - Math.sign(delta) * 9, y - 5); ctx.moveTo(x + delta, y); ctx.lineTo(x + delta - Math.sign(delta) * 9, y + 5); ctx.stroke(); };
    arrow(face - 20, 70, Math.sign(f.pistonV) * Math.min(65, Math.abs(f.pistonV) * 12), "#ffbf69");
    arrow(Math.min(bb, 1020), 110, Math.sign(f.bbV) * Math.min(55, Math.abs(f.bbV)), "#5de4e7");
    arrow(475, 216, Math.sign(f.flow) * Math.min(65, Math.abs(f.flow) * 25000), "#5de4e7");
    if (f.insertion > 0 && f.cylinderPressure > f.pressure) { ctx.fillStyle = `rgba(255,191,105,${Math.min(.5, (f.cylinderPressure - f.pressure) / 1e6)})`; ctx.beginPath(); ctx.ellipse(head - 15, 145, 22, 46, 0, 0, Math.PI * 2); ctx.fill(); }
    if (f.bbExited && f.outflow > 0) { ctx.fillStyle = `rgba(93,228,231,${Math.min(.55, f.outflow / Math.max(shot.peakOutflow, 1e-10) * .55)})`; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(end + 15 + i * 14, 145 + (i - 1) * 10, 15, 9 + i * 4, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = "#f5faf9"; ctx.beginPath(); ctx.arc(bb, 145, 8, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.max(14, 12 * 1100 / w)}px system-ui`; ctx.fillStyle = "#bcc9ce";
    if (w >= 650) {
      ctx.fillText(t("SPRING / PISTON", "OPRUGA / PISTON"), 40, 35); ctx.fillText(t("HEAD / NOZZLE", "GLAVA / MLAZNICA"), 430, 35); ctx.fillText(t("INNER BARREL", "UNUTARNJA CIJEV"), 720, 35);
      ctx.fillText(`${t("Cylinder", "Cilindar")}: ${fmt((f.cylinderPressure - shot.ambientPressure) / 1e5, 2)} bar(g)`, 40, 248);
      ctx.fillText(`${t("Behind BB", "Iza BB-a")}: ${fmt((f.pressure - shot.ambientPressure) / 1e5, 2)} bar(g)`, 660, 248);
      ctx.fillText(`${t("Overlap", "Preklapanje")}: ${fmt(f.insertion * 1000, 2)} mm · ${t("open area", "otvor")}: ${fmt(f.openArea * 1e6, 3)} mm²`, 200, 280);
    } else {
      ctx.fillText(t("PISTON → HEAD → BB", "PISTON → GLAVA → BB"), 40, 35);
      ctx.fillText(`${t("Pin overlap", "Preklapanje pina")}: ${fmt(f.insertion * 1000, 2)} mm`, 40, 248);
      ctx.fillText(`${t("Open area", "Otvor")}: ${fmt(f.openArea * 1e6, 3)} mm²`, 40, 280);
    }
    ctx.restore();
  }
  function drawCharts(time) {
    const traces = [
      ["pressureChart", [[f => (f.cylinderPressure - shot.ambientPressure) / 1e5, "#ffbf69"], [f => (f.pressure - shot.ambientPressure) / 1e5, "#5de4e7"]]],
      ["pistonChart", [[f => f.pistonV, "#ffbf69"]]], ["bbChart", [[f => f.bbV, "#5de4e7"]]]
    ];
    for (const [id, series] of traces) {
      const { ctx, w, h } = canvasContext(id, 300, 200), left = 44, right = w - 12, top = 18, bottom = h - 28;
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
      ctx.setLineDash([]); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x(time), top); ctx.lineTo(x(time), bottom); ctx.stroke(); ctx.restore();
      ctx.textAlign = "left"; ctx.fillStyle = "#91a0a7"; ctx.fillText("0", left, h - 7); ctx.textAlign = "right"; ctx.fillText(`${(shot.duration * 1000).toFixed(0)} ms`, right, h - 7);
    }
  }
  window.addEventListener("hashchange", () => { if (busy) return; clearTimeout(debounce); if (location.hash === "#pneumatic-timing") recalculate(); render(); });
  window.addEventListener("resize", () => { if (shot?.valid && $("mechanism")) setFrame(fraction); });
  if (location.hash === "#pneumatic-timing") { shot = P.simulate(p); baseline = P.simulate({ ...p, airbrakeLength: 0, airbrakeTaper: 0 }); }
  render();
})();
