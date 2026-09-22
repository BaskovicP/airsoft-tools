/* Dynamic bilingual measurement atlas for the configured hardware. The SVGs
   are explanatory cutaways: numeric labels are inputs, not metrology-grade CAD. */
(function (root) {
  "use strict";
  const P = typeof module !== "undefined" && module.exports ? require("./physics.js") : root.PneumaticPhysics;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const number = value => Number.isFinite(value) ? value : 0;
  const label = (pair, t) => t(pair[0], pair[1]);

  const UNITS = {
    cylinderBore: "mm", strokeLength: "mm", pistonMass: "g", deadVolume: "cm³",
    bumperThickness: "mm", bumperBore: "mm", airbrakeLength: "mm", airbrakeDiameter: "mm",
    airbrakeTipDiameter: "mm", airbrakeTaper: "mm", headBore: "mm", headLength: "mm",
    nozzleBore: "mm", nozzleLength: "mm", breechVolume: "cm³", barrelLength: "mm",
    barrelDiameter: "mm", bbDiameter: "mm", bbMass: "g", springFreeLength: "mm",
    springInstalledLength: "mm", springCutLength: "mm", springActiveCoils: "turns",
    springRemovedCoils: "turns", springSolidLength: "mm", springStiffness: "N/m",
    springPreload: "mm", springMass: "g", pistonFriction: "N", sealFriction: "",
    rearDamping: "N·s/m", bumperStiffness: "N/mm", bumperDamping: "N·s/m", bumperMaxCompression: "mm",
    restitution: "", dischargeCoefficient: "", muzzleDischargeCoefficient: "", pistonLeak: "mm²",
    nozzleLeak: "mm²", bbLeakCoefficient: "", bbBreakaway: "N", barrelDrag: "N",
    heatTransfer: "W/K", ambientPressure: "kPa abs", airTemperature: "°C",
    usefulFraction: "", decelThreshold: "m/s²", maxTime: "ms"
  };
  const DIGITS = {
    cylinderBore: 2, barrelDiameter: 2, bbDiameter: 2, bumperBore: 2,
    airbrakeDiameter: 2, airbrakeTipDiameter: 2, headBore: 2, nozzleBore: 2,
    deadVolume: 2, breechVolume: 2, pistonLeak: 3, nozzleLeak: 3,
    sealFriction: 3, bbLeakCoefficient: 2, restitution: 2, dischargeCoefficient: 2, muzzleDischargeCoefficient: 2,
    heatTransfer: 3, usefulFraction: 3
  };
  const UNKNOWN_ZERO = new Set(["springFreeLength", "springInstalledLength", "springActiveCoils", "springSolidLength", "springMass"]);

  const GROUPS = [
    {
      title: ["Cylinder & piston", "Cilindar i piston"],
      note: ["Measure the working bore, the two contact planes and the complete moving piston assembly.", "Izmjerite radni provrt, dvije dodirne ravnine i cijeli pokretni sklop pistona."],
      rows: [
        ["cylinderBore", ["Cylinder internal diameter", "Unutarnji promjer cilindra"], ["Bore gauge", "Mjerač provrta"], ["Measure the swept working bore at several depths and directions; ordinary caliper jaws are not reliable inside a long bore.", "Izmjerite radni provrt na više dubina i smjerova; obične čeljusti pomičnog mjerila nisu pouzdane u dugom provrtu."]],
        ["strokeLength", ["Nominal piston stroke", "Nominalni hod pistona"], ["Depth rod", "Dubinomjer"], ["Axial distance from the cocked piston-face position to the rigid cylinder-head contact plane, before adding the bumper.", "Uzdužna udaljenost od položaja čela zapetog pistona do ravnine dodira krute glave, prije dodavanja gumice."]],
        ["pistonMass", ["Assembled moving piston mass", "Masa sastavljenog pokretnog pistona"], ["Digital scale", "Digitalna vaga"], ["Weigh the exact moving assembly: body, cup/seal, airbrake pin and fitted weights. Do not add the stationary bumper.", "Izvažite točan pokretni sklop: tijelo, čašicu/brtvu, pin zračne kočnice i utege. Ne dodajte nepomičnu gumicu."]],
        ["deadVolume", ["Cylinder-side residual cavity", "Preostala šupljina na strani cilindra"], ["Derived volume", "Izvedeni volumen"], ["Derive from the cavity geometry at piston contact, including recesses. This is not the swept cylinder volume.", "Izvedite iz geometrije šupljine pri dodiru pistona, uključujući udubljenja. To nije radni volumen cilindra."]]
      ]
    },
    {
      title: ["Airbrake, bumper & head", "Zračna kočnica, gumica i glava"],
      note: ["These dimensions decide where the pin tip is when the piston face first touches the bumper or head.", "Ove dimenzije određuju gdje se vrh pina nalazi kada čelo pistona prvi put dodirne gumicu ili glavu."],
      rows: [
        ["airbrakeLength", ["Pin projection", "Izbočenje pina"], ["Depth caliper", "Dubinsko mjerilo"], ["From the piston contact face to the farthest point of the airbrake tip, parallel to the piston axis.", "Od dodirnog čela pistona do najudaljenije točke vrha pina, paralelno s osi pistona."]],
        ["airbrakeDiameter", ["Airbrake shaft diameter", "Promjer tijela pina"], ["Micrometer", "Mikrometar"], ["Measure the full-diameter cylindrical section, not the tapered tip.", "Mjerite cilindrični dio punog promjera, ne konusni vrh."]],
        ["airbrakeTipDiameter", ["Airbrake tip diameter", "Promjer vrha pina"], ["Micrometer", "Mikrometar"], ["Measure at the forward end. Enter zero only for a genuinely sharp mathematical-tip approximation.", "Mjerite na prednjem kraju. Nulu unesite samo kao aproksimaciju stvarno oštrog matematičkog vrha."]],
        ["airbrakeTaper", ["Taper length", "Duljina konusa"], ["Caliper", "Pomično mjerilo"], ["Axial length from where the shaft begins narrowing to the end of the tip.", "Uzdužna duljina od mjesta gdje se tijelo počinje sužavati do kraja vrha."]],
        ["bumperThickness", ["Added bumper thickness", "Debljina dodatne gumice"], ["Caliper, light load", "Pomično mjerilo, mala sila"], ["Uncompressed axial thickness. Soft rubber changes under clamp force; record the measurement method.", "Nestlačena uzdužna debljina. Meka guma mijenja se pod silom čeljusti; zabilježite način mjerenja."]],
        ["bumperBore", ["Bumper inner diameter", "Unutarnji promjer gumice"], ["Pin gauges", "Mjerni trnovi"], ["Measure the smallest free opening through the bumper. Do not assume it equals the metal receiving bore.", "Izmjerite najmanji slobodni otvor kroz gumicu. Ne pretpostavljajte da je jednak metalnom ulaznom provrtu."]],
        ["headBore", ["Head receiving-bore diameter", "Promjer ulaznog provrta glave"], ["Pin gauges", "Mjerni trnovi"], ["The metal bore the airbrake enters after any bumper—not the nozzle outlet diameter.", "Metalni provrt u koji pin ulazi nakon gumice — nije promjer izlaznog kanala mlaznice."]],
        ["headLength", ["Receiving-passage length", "Duljina ulaznog provrta"], ["Depth rod", "Dubinomjer"], ["Axial length of the receiving bore before the passage changes into the downstream nozzle section.", "Uzdužna duljina ulaznog provrta prije prijelaza u izlazni kanal mlaznice."]],
        ["nozzleBore", ["Downstream nozzle diameter", "Promjer izlaznog kanala mlaznice"], ["Pin gauges", "Mjerni trnovi"], ["Smallest effective internal diameter after the receiving passage and before the hop chamber.", "Najmanji efektivni unutarnji promjer nakon ulaznog provrta i prije hop komore."]],
        ["nozzleLength", ["Downstream nozzle length", "Duljina izlaznog kanala mlaznice"], ["Depth rod", "Dubinomjer"], ["Axial length assigned to the smaller downstream passage.", "Uzdužna duljina pripisana manjem izlaznom kanalu."]],
        ["breechVolume", ["Head / nozzle / breech storage", "Volumen glave, mlaznice i komore"], ["Derived volume", "Izvedeni volumen"], ["Derive from the connected cavity geometry behind the seated BB. Keep it separate from cylinder-side dead volume.", "Izvedite iz spojene geometrije šupljine iza postavljenog BB-a. Držite ga odvojeno od preostalog volumena cilindra."]]
      ]
    },
    {
      title: ["Inner barrel & BB", "Unutarnja cijev i BB"],
      note: ["The barrel diameter and actual BB diameter are separate inputs; their difference controls the model's annular leakage path.", "Promjer cijevi i stvarni promjer BB-a odvojeni su ulazi; njihova razlika određuje prstenasti put curenja u modelu."],
      rows: [
        ["barrelLength", ["Inner-barrel length", "Duljina unutarnje cijevi"], ["Rule / caliper", "Ravnalo / pomično mjerilo"], ["From the BB start plane used by the model to the muzzle crown along the bore axis.", "Od početne ravnine BB-a koju koristi model do krune cijevi duž osi provrta."]],
        ["barrelDiameter", ["Inner-barrel diameter", "Promjer unutarnje cijevi"], ["Certified plug gauges", "Umjereni mjerni trnovi"], ["Measure the bore rather than relying only on the nominal 6.01/6.03/6.05 marking; check more than one location when possible.", "Mjerite provrt umjesto oslanjanja samo na oznaku 6,01/6,03/6,05; po mogućnosti provjerite više mjesta."]],
        ["bbDiameter", ["Actual BB diameter", "Stvarni promjer BB-a"], ["Micrometer", "Mikrometar"], ["Measure several BBs in multiple orientations with low force and use a representative mean.", "Izmjerite više BB-a u više smjerova uz malu silu i koristite reprezentativni prosjek."]],
        ["bbMass", ["BB mass", "Masa BB-a"], ["0.001 g scale", "Vaga 0,001 g"], ["Weigh a batch and divide by the count; packet labels are useful provenance but not a measurement.", "Izvažite skupinu i podijelite s brojem kuglica; oznaka na pakiranju korisna je kao izvor, ali nije mjerenje."]]
      ]
    },
    {
      title: ["Spring & seats", "Opruga i oslonci"],
      note: ["Length mode and direct-compression mode describe the same installed spring in different ways; do not mix their reference planes.", "Način s duljinama i način s izravnim stlačenjem opisuju istu ugrađenu oprugu na različite načine; nemojte miješati njihove referentne ravnine."],
      rows: [
        ["springFreeLength", ["Unloaded spring length", "Slobodna duljina opruge"], ["Rule / caliper", "Ravnalo / pomično mjerilo"], ["Axial end-to-end length before the simulated cut, with no load on the spring.", "Uzdužna duljina od kraja do kraja prije simuliranog reza, bez opterećenja opruge."]],
        ["springInstalledLength", ["Front seat distance", "Prednji razmak oslonaca"], ["Depth measurement", "Mjerenje dubine"], ["Spring-seat distance at the rigid-head plane before an added bumper. The model subtracts bumper thickness once.", "Razmak oslonaca opruge na ravnini krute glave prije dodatne gumice. Model jednom oduzima debljinu gumice."]],
        ["springCutLength", ["Free length removed", "Uklonjena slobodna duljina"], ["Before / after", "Prije / poslije"], ["Difference in unloaded axial length, not the wire length that was cut away.", "Razlika nestlačene uzdužne duljine, ne duljina uklonjene žice."]],
        ["springActiveCoils", ["Active coils before cutting", "Aktivni zavoji prije rezanja"], ["Count", "Brojanje"], ["Count coils that deflect under load; inactive closed end turns are not active coils.", "Brojite zavoje koji se deformiraju pod opterećenjem; zatvoreni krajnji zavoji nisu aktivni."]],
        ["springRemovedCoils", ["Removed active coils", "Uklonjeni aktivni zavoji"], ["Count", "Brojanje"], ["Count only active turns removed. This is used for the uniform-coil stiffness estimate.", "Brojite samo uklonjene aktivne zavoje. To se koristi za procjenu krutosti jednolike opruge."]],
        ["springSolidLength", ["Remaining solid height", "Preostala potpuno stisnuta duljina"], ["Bench measurement", "Mjerenje na stolu"], ["End-to-end height of the remaining spring at coil bind. Use a safe fixture; never measure inside a cocked assembly.", "Duljina preostale opruge od kraja do kraja pri potpunom stiskanju. Koristite siguran prihvat; nikada ne mjerite u zapetom sklopu."]],
        ["springStiffness", ["Spring stiffness", "Krutost opruge"], ["Force curve", "Krivulja sile"], ["Fit the slope of measured force versus compression over the installed range. An M-rating is not a force curve.", "Prilagodite nagib izmjerene sile prema stlačenju u ugrađenom rasponu. Oznaka M nije krivulja sile."]],
        ["springPreload", ["Front-contact compression", "Stlačenje pri prednjem kontaktu"], ["Geometry / force", "Geometrija / sila"], ["Direct-mode compression at the rigid-head plane before adding the bumper; length mode calculates it instead.", "Stlačenje u izravnom načinu na ravnini krute glave prije dodavanja gumice; način s duljinama ga računa."]],
        ["springMass", ["Installed spring mass", "Masa ugrađene opruge"], ["Digital scale", "Digitalna vaga"], ["Weigh the remaining installed spring after any physical cut. Length alone does not determine its mass.", "Izvažite preostalu ugrađenu oprugu nakon fizičkog rezanja. Sama duljina ne određuje masu."]]
      ]
    }
  ];

  const MODEL_ROWS = [
    ["pistonFriction", ["Piston sliding friction", "Klizno trenje pistona"], ["Bench force test", "Ispitivanje sile na stolu"], ["Approximately constant resisting force from the piston guides and seal while the piston moves. Establish it with a safe bench pull/push test; it is not piston mass.", "Približno stalna sila otpora vodilica i brtve dok se piston giba. Odredite je sigurnim stolnim mjerenjem povlačenja/guranja; nije masa pistona."]],
    ["sealFriction", ["Pressure-dependent seal friction", "Trenje brtve ovisno o tlaku"], ["Fit / instrumented test", "Prilagodba / instrumentirano ispitivanje"], ["Additional seal drag that grows with cylinder gauge pressure in this model. It is a fitted factor, not a directly measured force or an O-ring hardness value.", "Dodatni otpor brtve koji u ovom modelu raste s relativnim tlakom u cilindru. To je prilagodbeni faktor, ne izravno izmjerena sila ni tvrdoća O-prstena."]],
    ["rearDamping", ["Rear vent / mechanical drag", "Stražnji otvor / mehanički otpor"], ["Fit / coast-down evidence", "Prilagodba / mjerenje usporavanja"], ["Velocity-proportional resistance representing air displaced behind the piston and other distributed mechanical losses. It is expressed in N·s/m and needs dynamic evidence.", "Otpor razmjeran brzini koji predstavlja zrak istisnut iza pistona i druge raspodijeljene mehaničke gubitke. Izražen je u N·s/m i traži dinamičku potvrdu."]],
    ["bumperStiffness", ["Bumper compression stiffness", "Krutost stlačivanja gumice"], ["Force–deflection bench test", "Stolno mjerenje sile i deformacije"], ["Slope of bumper force versus axial compression. Higher values make the pad resist compression more strongly; this is N/mm, not Shore hardness.", "Nagib sile gumice prema uzdužnom stlačenju. Veća vrijednost znači da se gumica jače opire stlačivanju; jedinica je N/mm, a ne Shore tvrdoća."]],
    ["bumperDamping", ["Bumper viscous damping", "Viskozno prigušenje gumice"], ["Dynamic contact fit", "Prilagodba dinamičkog kontakta"], ["Velocity-dependent force used to dissipate energy while the bumper is being compressed or released. It changes rebound in the conditional contact model and is not a dB value.", "Sila ovisna o brzini kojom se rasipa energija dok se gumica stišće ili vraća. Mijenja odskok u uvjetnom modelu kontakta i nije vrijednost u dB."]],
    ["bumperMaxCompression", ["Bumper compression cap", "Granica stlačenja gumice"], ["Geometry plus force test", "Geometrija i ispitivanje sile"], ["Largest allowed axial deformation before the model treats the pad as bottomed out against a rigid stop. The effective cap can never exceed the entered physical thickness.", "Najveća dopuštena uzdužna deformacija prije nego što model smatra da je gumica potpuno stisnuta na kruti graničnik. Efektivna granica nikad ne može biti veća od unesene fizičke debljine."]],
    ["restitution", ["Rigid / bottom-out restitution", "Odskok krutog graničnika"], ["High-speed contact measurement", "Brzo mjerenje kontakta"], ["Fraction controlling velocity reversal only when a rigid head is struck or the bumper reaches its compression cap. Zero means no idealized rigid rebound; it does not control the pneumatic cushion.", "Faktor koji određuje promjenu smjera brzine samo pri udaru u krutu glavu ili dosezanju granice stlačenja gumice. Nula znači bez idealiziranog krutog odskoka; ne upravlja pneumatskim jastukom."]],
    ["dischargeCoefficient", ["Head discharge coefficient Cd", "Koeficijent protoka glave Cd"], ["Flow bench or chrono fit", "Protočna klupa ili chrono prilagodba"], ["Effective loss coefficient for mass flow through the bumper opening, receiving bore and downstream nozzle. It combines contraction and turbulence losses; it is not an efficiency percentage.", "Efektivni koeficijent gubitaka masenog protoka kroz otvor gumice, ulazni provrt i izlazni kanal mlaznice. Vrijednost 1 i dalje nije postotak učinkovitosti; koeficijent sažima suženje i turbulentne gubitke."]],
    ["muzzleDischargeCoefficient", ["Muzzle discharge coefficient Cd", "Koeficijent protoka na ustima Cd"], ["Transient muzzle-flow test", "Mjerenje prijelaznog protoka na ustima"], ["Effective outflow coefficient used only after the BB exits. It changes the modeled pressure-release and muzzle-blast contributor, not the BB speed already reached at exit.", "Efektivni koeficijent istjecanja koji se koristi tek nakon izlaska BB-a. Mijenja modelirano pražnjenje tlaka i doprinos prasku na ustima, ne brzinu koju je BB već dosegnuo pri izlasku."]],
    ["pistonLeak", ["Piston-seal leak area", "Površina curenja brtve pistona"], ["Leak-down fit", "Prilagodba pada tlaka"], ["Equivalent area for air bypassing the piston seal from the compressed cylinder side. It already represents an effective leak path and is not a visible geometric hole that must have this shape.", "Ekvivalentna površina zraka koji zaobilazi brtvu pistona sa stlačene strane cilindra. Već predstavlja efektivni put curenja i nije nužno vidljiva rupa toga oblika."]],
    ["nozzleLeak", ["Nozzle / hop leak area", "Površina curenja mlaznice / hopa"], ["Leak-down fit", "Prilagodba pada tlaka"], ["Equivalent leak area from the downstream head/nozzle/hop system to atmosphere, separate from controlled flow into the barrel. Use leak-down evidence or calibration.", "Ekvivalentna površina curenja iz izlaznog sklopa glave, mlaznice i hopa prema atmosferi, odvojena od kontroliranog protoka u cijev. Koristite mjerenje pada tlaka ili kalibraciju."]],
    ["bbLeakCoefficient", ["BB-clearance leak coefficient", "Koeficijent curenja oko BB-a"], ["Calibration parameter", "Kalibracijski parametar"], ["Multiplier for air bypass through the annular clearance between the measured BB and barrel diameters. Zero disables that modeled path; one applies the full effective-clearance estimate.", "Množitelj protoka zraka kroz prstenasti zazor između izmjerenog BB-a i promjera cijevi. Nula isključuje taj modelirani put; jedan primjenjuje puni procijenjeni efektivni zazor."]],
    ["bbBreakaway", ["Hop breakaway force", "Sila pokretanja kroz hop"], ["Force gauge", "Mjerač sile"], ["Forward pressure force that must be exceeded before the seated BB starts moving through the hop rubber. Once moving, the separate barrel-drag input applies.", "Sila tlaka prema naprijed koju treba nadmašiti prije nego što postavljeni BB krene kroz hop gumicu. Nakon pokretanja primjenjuje se zaseban unos otpora u cijevi."]],
    ["barrelDrag", ["Moving BB resistance", "Otpor gibanja BB-a"], ["Force / velocity experiment", "Pokus sile / brzine"], ["Approximately constant resisting force on a BB that is already moving through the barrel, including effective hop and contact losses. It is not the initial breakaway force.", "Približno stalna sila otpora na BB koji se već giba kroz cijev, uključujući efektivne gubitke hopa i dodira. Nije početna sila pokretanja."]],
    ["heatTransfer", ["Gas heat conductance", "Toplinska vodljivost plina"], ["Transient fit", "Prilagodba prijelaznog procesa"], ["Lumped heat-flow conductance between each modeled gas volume and the wall at the entered air/wall temperature. Zero approaches adiabatic behavior over the short shot interval.", "Koncentrirana toplinska vodljivost između svakog modeliranog plinskog volumena i stijenke na unesenoj temperaturi zraka/stijenke. Nula se tijekom kratkog hica približava adijabatskom ponašanju."]],
    ["ambientPressure", ["Atmospheric pressure", "Atmosferski tlak"], ["Barometer", "Barometar"], ["Absolute pressure outside the rifle before firing and ahead of the BB. Enter station pressure, not weather-service pressure corrected to sea level.", "Apsolutni tlak izvan replike prije opaljenja i ispred BB-a. Unesite lokalni stvarni tlak, ne meteorološki tlak preračunat na razinu mora."]],
    ["airTemperature", ["Air / wall temperature", "Temperatura zraka / stijenke"], ["Thermometer", "Termometar"], ["Starting temperature assigned to the air and chamber walls. It affects gas density and sound speed; the model does not separately resolve warmed spring or seal materials.", "Početna temperatura dodijeljena zraku i stijenkama komore. Utječe na gustoću plina i brzinu zvuka; model zasebno ne razrješava zagrijanu oprugu ni materijale brtve."]],
    ["usefulFraction", ["Useful-energy threshold", "Prag korisne energije"], ["Analysis convention", "Dogovor analize"], ["Chosen fraction of the shot's maximum BB kinetic energy used to mark when useful acceleration is nearly complete. It is an analysis marker, not a physical switch or efficiency.", "Odabrani udio najveće kinetičke energije BB-a u tom hicu kojim se označuje kada je korisno ubrzavanje gotovo dovršeno. To je oznaka analize, ne fizikalna sklopka ni učinkovitost."]],
    ["decelThreshold", ["Strong-deceleration threshold", "Prag snažnog usporavanja"], ["Analysis convention", "Dogovor analize"], ["Magnitude of negative piston acceleration used to label the start of substantial slowing after airbrake entry. It changes the event marker, not the simulated forces or motion.", "Iznos negativnog ubrzanja pistona kojim se nakon ulaska pina označuje početak značajnog usporavanja. Mijenja oznaku događaja, ne simulirane sile ni gibanje."]],
    ["maxTime", ["Maximum modeled time", "Najdulje modelirano vrijeme"], ["Solver limit", "Granica rješavača"], ["Time limit at which numerical integration stops if later events or pressure settling have not completed. Increasing it observes a longer tail; it does not slow the firing physics.", "Vremenska granica na kojoj numerička integracija staje ako kasniji događaji ili smirivanje tlaka nisu završili. Povećanje prati dulji završetak; ne usporava fiziku opaljenja."]]
  ];

  const PART_FIELDS = GROUPS.flatMap(group => group.rows.map(row => row[0]));
  const FIELD_HELP = Object.fromEntries([...GROUPS.flatMap(group => group.rows), ...MODEL_ROWS].map(row => [row[0], row[3]]));

  function help(key, t = (en => en)) {
    const pair = FIELD_HELP[key];
    return pair ? label(pair, t) : "";
  }

  function fieldValue(p, key, t) {
    const value = p[key];
    if (!Number.isFinite(value)) return "—";
    if (UNKNOWN_ZERO.has(key) && value === 0) return t("Unknown / not entered", "Nepoznato / nije uneseno");
    const digits = DIGITS[key] ?? (Math.abs(value) < 1 && value !== 0 ? 2 : 1);
    const shown = value.toFixed(digits);
    const unit = UNITS[key];
    if (unit === "turns") return `${shown} ${t("turns", "zavoja")}`;
    return `${shown}${unit ? ` ${unit}` : ""}`;
  }

  function defs(id) {
    return `<defs>
      <linearGradient id="steel-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--line-bright)"/><stop offset=".48" stop-color="var(--text)"/><stop offset=".55" stop-color="var(--muted)"/><stop offset="1" stop-color="var(--line)"/></linearGradient>
      <linearGradient id="dark-steel-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--panel-2)"/><stop offset=".5" stop-color="var(--line-bright)"/><stop offset="1" stop-color="var(--panel-2)"/></linearGradient>
      <pattern id="rubber-${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="color-mix(in srgb,var(--green) 20%,var(--panel))"/><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="var(--green)" stroke-opacity=".32"/></pattern>
      <marker id="arrow-${id}" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill="var(--cyan)"/></marker>
    </defs>`;
  }
  function dimH(id, x1, x2, y, text) {
    const mid = (x1 + x2) / 2;
    return `<g class="parts-dimension"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#arrow-${id})" marker-end="url(#arrow-${id})"/><text x="${mid}" y="${y - 7}" text-anchor="middle">${esc(text)}</text></g>`;
  }
  function dimV(id, x, y1, y2, text, anchor = "start") {
    const tx = anchor === "end" ? x - 10 : x + 10;
    return `<g class="parts-dimension"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" marker-start="url(#arrow-${id})" marker-end="url(#arrow-${id})"/><text x="${tx}" y="${(y1 + y2) / 2 + 4}" text-anchor="${anchor}">${esc(text)}</text></g>`;
  }

  function airPathSvg(p, t) {
    const id = "airpath", scale = 6.2, center = 205, face = 320;
    const bumperWidth = number(p.bumperThickness) * scale;
    const headWidth = number(p.headLength) * scale;
    const nozzleWidth = number(p.nozzleLength) * scale;
    const bumperEnd = face + bumperWidth, headEnd = bumperEnd + headWidth, nozzleEnd = headEnd + nozzleWidth;
    const pinEnd = face + number(p.airbrakeLength) * scale;
    const taperStart = Math.max(face, pinEnd - number(p.airbrakeTaper) * scale);
    const shaftHeight = clamp(number(p.airbrakeDiameter) * 10, 8, 76);
    const tipHeight = clamp(number(p.airbrakeTipDiameter) * 10, 2, shaftHeight);
    const bumperHole = clamp(number(p.bumperBore) * 10, 14, 100);
    const headHole = clamp(number(p.headBore) * 10, 14, 100);
    const nozzleHole = clamp(number(p.nozzleBore) * 10, 14, 100);
    const cylinderHalf = clamp(number(p.cylinderBore) * 3.8, 72, 105);
    let zone;
    if (!(p.airbrakeLength > 0)) zone = t("No airbrake pin enabled", "Pin zračne kočnice nije uključen");
    else if (p.airbrakeLength <= p.bumperThickness) zone = t("Pin tip ends inside the bumper", "Vrh pina završava unutar gumice");
    else if (p.airbrakeLength <= p.bumperThickness + p.headLength) zone = t("Pin tip ends in the metal receiving bore", "Vrh pina završava u metalnom ulaznom provrtu");
    else if (p.airbrakeLength <= p.bumperThickness + p.headLength + p.nozzleLength) zone = t("Pin tip reaches the downstream nozzle", "Vrh pina doseže izlazni kanal mlaznice");
    else zone = t("Pin extends beyond the entered head/nozzle stack", "Pin se proteže izvan unesenog sklopa glave/mlaznice");
    const pin = p.airbrakeLength > 0 ? `<path class="parts-pin" d="M${face} ${center - shaftHeight / 2}H${taperStart}L${pinEnd} ${center - tipHeight / 2}V${center + tipHeight / 2}L${taperStart} ${center + shaftHeight / 2}H${face}Z"/>` : "";
    const bumper = p.bumperThickness > 0 ? `<path class="parts-rubber" d="M${face} 125H${bumperEnd}V${center - bumperHole / 2}H${face}ZM${face} ${center + bumperHole / 2}H${bumperEnd}V285H${face}Z"/>` : `<line class="parts-absent" x1="${face}" y1="125" x2="${face}" y2="285"/>`;
    return `<div class="parts-figure parts-figure-wide">
      <div class="parts-figure-heading"><div><h3>${t("Airbrake-to-head fit at first contact", "Odnos pina i glave pri prvom kontaktu")}</h3><p>${t("This contact-state cutaway shows whether the entered pin stops in the bumper, receiving bore or nozzle.", "Ovaj presjek u stanju kontakta pokazuje završava li uneseni pin u gumici, ulaznom provrtu ili mlaznici.")}</p></div><strong>${esc(zone)}</strong></div>
      <svg class="parts-svg" viewBox="0 0 1160 425" role="img" aria-label="${esc(t("Cutaway of piston, airbrake, bumper, cylinder head, nozzle and barrel with current dimensions", "Presjek pistona, pina, gumice, glave cilindra, mlaznice i cijevi s trenutačnim dimenzijama"))}">
        <title>${esc(zone)}</title>${defs(id)}
        <line class="parts-centerline" x1="34" y1="${center}" x2="1130" y2="${center}"/>
        <path class="parts-cylinder-wall" d="M45 ${center - cylinderHalf - 16}H${face}V${center - cylinderHalf}H45ZM45 ${center + cylinderHalf + 16}H${face}V${center + cylinderHalf}H45Z"/>
        <rect class="parts-piston" x="100" y="${center - cylinderHalf + 8}" width="220" height="${2 * cylinderHalf - 16}" rx="11"/>
        <rect class="parts-piston-face" x="302" y="${center - cylinderHalf + 2}" width="18" height="${2 * cylinderHalf - 4}" rx="4"/>
        ${bumper}
        <path class="parts-head" d="M${bumperEnd} 112H${headEnd}V${center - headHole / 2}H${bumperEnd}ZM${bumperEnd} ${center + headHole / 2}H${headEnd}V298H${bumperEnd}Z"/>
        <path class="parts-nozzle" d="M${headEnd} 151H${nozzleEnd}V${center - nozzleHole / 2}H${headEnd}ZM${headEnd} ${center + nozzleHole / 2}H${nozzleEnd}V259H${headEnd}Z"/>
        <path class="parts-barrel" d="M${nozzleEnd} 169H1130V${center - clamp(number(p.barrelDiameter) * 6, 18, 58) / 2}H${nozzleEnd}ZM${nozzleEnd} ${center + clamp(number(p.barrelDiameter) * 6, 18, 58) / 2}H1130V241H${nozzleEnd}Z"/>
        ${pin}
        <g class="parts-component-labels"><text x="190" y="99">${esc(t("PISTON", "PISTON"))}</text><text x="${face + Math.max(4, bumperWidth) / 2}" y="101" text-anchor="middle">${esc(t("BUMPER", "GUMICA"))}</text><text x="${(bumperEnd + headEnd) / 2}" y="88" text-anchor="middle">${esc(t("RECEIVING BORE", "ULAZNI PROVRT"))}</text><text x="${(headEnd + nozzleEnd) / 2}" y="139" text-anchor="middle">${esc(t("NOZZLE", "MLAZNICA"))}</text><text x="${Math.min(1110, nozzleEnd + 95)}" y="158">${esc(t("BARREL", "CIJEV"))}</text></g>
        ${p.airbrakeLength > 0 ? dimH(id, face, pinEnd, 61, `${t("pin projection", "izbočenje pina")} ${fieldValue(p, "airbrakeLength", t)}`) : ""}
        ${p.bumperThickness > 0 ? dimH(id, face, bumperEnd, 327, `${t("bumper", "gumica")} ${fieldValue(p, "bumperThickness", t)}`) : ""}
        ${dimH(id, bumperEnd, headEnd, 354, `${t("receiving length", "duljina provrta")} ${fieldValue(p, "headLength", t)}`)}
        ${dimH(id, headEnd, nozzleEnd, 381, `${t("nozzle length", "duljina mlaznice")} ${fieldValue(p, "nozzleLength", t)}`)}
        ${dimV(id, 68, center - cylinderHalf, center + cylinderHalf, `Ø ${fieldValue(p, "cylinderBore", t)}`)}
        ${dimV(id, bumperEnd + headWidth * .48, center - headHole / 2, center + headHole / 2, `${t("head", "glava")} Ø ${fieldValue(p, "headBore", t)}`)}
        ${p.bumperThickness > 0 ? `<g class="parts-leader"><path d="M${face + Math.max(3, bumperWidth / 2)} ${center - bumperHole / 2}L${face + 38} 118"/><text x="${face + 43}" y="113">${esc(`${t("bumper ID", "ID gumice")} Ø ${fieldValue(p, "bumperBore", t)}`)}</text></g>` : ""}
        ${p.airbrakeLength > 0 ? `<g class="parts-leader"><path d="M${face + Math.min(70, number(p.airbrakeLength) * scale * .35)} ${center + shaftHeight / 2}L${face + 85} 306"/><text x="${face + 91}" y="311">${esc(`${t("shaft", "tijelo")} Ø ${fieldValue(p, "airbrakeDiameter", t)} · ${t("tip", "vrh")} Ø ${fieldValue(p, "airbrakeTipDiameter", t)}`)}</text></g>` : ""}
      </svg>
      <p class="parts-scale-note">${t("Axial lengths in the head stack share one scale. Bore diameters and small clearances are enlarged independently so they remain visible; the numeric labels are the exact current inputs.", "Uzdužne duljine u sklopu glave imaju zajedničko mjerilo. Promjeri provrta i mali zazori zasebno su uvećani radi vidljivosti; brojčane oznake točni su trenutačni ulazi.")}</p>
    </div>`;
  }

  function cylinderSvg(p, t) {
    const id = "cylinder", left = 76, right = 486, center = 134;
    const contact = right - clamp(number(p.bumperThickness) / Math.max(1, number(p.strokeLength)) * (right - left), 0, 100);
    const boreHalf = clamp(number(p.cylinderBore) * 2.1, 42, 64);
    const g = P.geometry(p, 0, 0);
    return `<div class="parts-figure"><div class="parts-figure-heading"><div><h3>${t("Cylinder, piston & travel", "Cilindar, piston i hod")}</h3><p>${t("Nominal stroke ends at the rigid head plane; an added bumper moves first contact rearward.", "Nominalni hod završava na ravnini krute glave; dodatna gumica pomiče prvi kontakt unatrag.")}</p></div></div>
      <svg class="parts-svg" viewBox="0 0 560 285" role="img" aria-label="${esc(t("Cylinder cutaway with bore, nominal stroke and effective contact travel", "Presjek cilindra s provrtom, nominalnim hodom i efektivnim hodom do kontakta"))}">${defs(id)}
        <line class="parts-centerline" x1="35" y1="${center}" x2="520" y2="${center}"/>
        <path class="parts-cylinder-wall" d="M35 ${center - boreHalf - 14}H505V${center - boreHalf}H35ZM35 ${center + boreHalf + 14}H505V${center + boreHalf}H35Z"/>
        <rect class="parts-piston" x="43" y="${center - boreHalf + 7}" width="${left - 43 + 18}" height="${2 * boreHalf - 14}" rx="8"/><rect class="parts-piston-face" x="${left}" y="${center - boreHalf + 2}" width="14" height="${2 * boreHalf - 4}" rx="3"/>
        ${p.bumperThickness > 0 ? `<rect class="parts-rubber" x="${contact}" y="${center - boreHalf}" width="${right - contact}" height="${2 * boreHalf}"/>` : ""}<line class="parts-contact-plane" x1="${contact}" y1="${center - boreHalf - 8}" x2="${contact}" y2="${center + boreHalf + 8}"/><line class="parts-rigid-plane" x1="${right}" y1="${center - boreHalf - 8}" x2="${right}" y2="${center + boreHalf + 8}"/>
        <text class="parts-part-label" x="56" y="${center + 5}">${esc(fieldValue(p, "pistonMass", t))}</text>
        <text class="parts-caption" x="${contact - 8}" y="57" text-anchor="end">${esc(t("first contact", "prvi kontakt"))}</text><text class="parts-caption" x="${right}" y="76" text-anchor="end">${esc(t("rigid head plane", "ravnina krute glave"))}</text>
        ${dimH(id, left, contact, 35, `${t("effective travel", "efektivni hod")} ${(p.strokeLength - p.bumperThickness).toFixed(1)} mm`)}
        ${dimH(id, left, right, 243, `${t("nominal stroke", "nominalni hod")} ${fieldValue(p, "strokeLength", t)}`)}
        ${dimV(id, 523, center - boreHalf, center + boreHalf, `Ø ${fieldValue(p, "cylinderBore", t)}`, "end")}
      </svg><p class="parts-scale-note">${t("Current effective swept volume", "Trenutačni efektivni radni volumen")}: <strong>${(g.sweptVolume * 1e6).toFixed(2)} cm³</strong>. ${t("Undeformed bumper shown; modeled compression cap / stiffness", "Prikazana je nestlačena gumica; modelirana granica stlačenja / krutost")}: <strong>${Math.min(p.bumperThickness, p.bumperMaxCompression).toFixed(2)} mm / ${p.bumperStiffness.toFixed(0)} N/mm</strong>. ${t("Exact deformed shape is unknown.", "Točan deformirani oblik nije poznat.")}</p></div>`;
  }

  function barrelSvg(p, t) {
    const id = "barrel", center = 137, bore = clamp(number(p.barrelDiameter) * 4, 18, 34), bb = clamp(number(p.bbDiameter) / Math.max(number(p.barrelDiameter), .1) * bore, 12, bore - 1);
    const radial = Math.max(0, (p.barrelDiameter - p.bbDiameter) / 2);
    return `<div class="parts-figure"><div class="parts-figure-heading"><div><h3>${t("Inner barrel & BB clearance", "Unutarnja cijev i zazor BB-a")}</h3><p>${t("The end view enlarges the very small annular gap so the two diameters are distinguishable.", "Pogled s kraja uvećava vrlo mali prstenasti zazor kako bi se dva promjera mogla razlikovati.")}</p></div></div>
      <svg class="parts-svg" viewBox="0 0 560 285" role="img" aria-label="${esc(t("Inner barrel with length, bore diameter, BB diameter and radial clearance", "Unutarnja cijev s duljinom, promjerom provrta, promjerom BB-a i radijalnim zazorom"))}">${defs(id)}
        <path class="parts-barrel" d="M45 102H515V${center - bore / 2}H45ZM45 ${center + bore / 2}H515V172H45Z"/><line class="parts-centerline" x1="30" y1="${center}" x2="530" y2="${center}"/>
        <circle class="parts-bb" cx="87" cy="${center}" r="${bb / 2}"/><path class="parts-motion" d="M113 ${center}H190" marker-end="url(#arrow-${id})"/>
        ${dimH(id, 45, 515, 225, `${t("barrel length", "duljina cijevi")} ${fieldValue(p, "barrelLength", t)}`)}
        <circle class="parts-endview-outer" cx="428" cy="61" r="40"/><circle class="parts-endview-bore" cx="428" cy="61" r="27"/><circle class="parts-bb" cx="428" cy="61" r="${clamp(number(p.bbDiameter) / Math.max(number(p.barrelDiameter), .1) * 24, 15, 23.5)}"/>
        <g class="parts-leader"><path d="M428 34L470 17"/><text x="474" y="20">${esc(`Ø ${fieldValue(p, "barrelDiameter", t)}`)}</text><path d="M428 61L472 77"/><text x="476" y="82">${esc(`BB Ø ${fieldValue(p, "bbDiameter", t)}`)}</text></g>
        <text class="parts-part-label" x="87" y="${center + 5}" text-anchor="middle">BB</text>
      </svg><p class="parts-scale-note">${t("Entered radial clearance", "Uneseni radijalni zazor")}: <strong>${radial.toFixed(3)} mm</strong> · ${t("diametral difference", "razlika promjera")}: <strong>${Math.max(0, p.barrelDiameter - p.bbDiameter).toFixed(3)} mm</strong>. ${t("This is geometry, not a measured leakage rate.", "To je geometrija, ne izmjerena stopa curenja.")}</p></div>`;
  }

  function springPath(x1, x2, center, amplitude, turns) {
    const count = Math.max(5, Math.min(18, Math.round(turns || 11))), step = (x2 - x1) / count;
    let path = `M${x1} ${center}`;
    for (let index = 0; index < count; index++) {
      const x = x1 + index * step;
      path += `C${x + step * .22} ${center - amplitude},${x + step * .28} ${center - amplitude},${x + step * .5} ${center}C${x + step * .72} ${center + amplitude},${x + step * .78} ${center + amplitude},${x + step} ${center}`;
    }
    return path;
  }

  function springSvg(p, t) {
    const id = "spring", spring = P.springState(p), lengthMode = p.springLengthMode === 1;
    const coils = p.springActiveCoils > 0 ? p.springActiveCoils - p.springRemovedCoils : 11;
    const activeText = lengthMode ? t("Length mode active", "Aktivan način s duljinama") : t("Direct compression mode", "Izravni način stlačenja");
    const currentFree = spring.freeLength === null ? null : spring.freeLength;
    return `<div class="parts-figure"><div class="parts-figure-heading"><div><h3>${t("Spring, seats & cut reference", "Opruga, oslonci i referenca reza")}</h3><p>${esc(activeText)}. ${t("The drawing identifies reference lengths; coil geometry itself is not modeled.", "Crtež označuje referentne duljine; sama geometrija zavoja nije modelirana.")}</p></div></div>
      <svg class="parts-svg" viewBox="0 0 560 285" role="img" aria-label="${esc(t("Spring between rear and front seats with current free length, compression and cut values", "Opruga između stražnjeg i prednjeg oslonca s trenutačnom slobodnom duljinom, stlačenjem i vrijednostima reza"))}">${defs(id)}
        <line class="parts-spring-seat" x1="42" y1="57" x2="42" y2="210"/><line class="parts-spring-seat" x1="515" y1="57" x2="515" y2="210"/>
        <path class="parts-spring" d="${springPath(52, 505, 133, 42, coils)}"/><line class="parts-centerline" x1="30" y1="133" x2="527" y2="133"/>
        <text class="parts-caption" x="42" y="43" text-anchor="middle">${esc(t("rear seat", "stražnji oslonac"))}</text><text class="parts-caption" x="515" y="43" text-anchor="middle">${esc(t("front seat", "prednji oslonac"))}</text>
        ${dimH(id, 42, 515, 236, lengthMode ? `${t("entered seat distance", "uneseni razmak oslonaca")} ${fieldValue(p, "springInstalledLength", t)}` : `${t("front compression", "prednje stlačenje")} ${spring.preload.toFixed(1)} mm`)}
        ${p.springCutLength > 0 ? `<g class="parts-cut"><line x1="430" y1="76" x2="430" y2="190"/><text x="422" y="69" text-anchor="end">${esc(`${t("simulated cut", "simulirani rez")} ${fieldValue(p, "springCutLength", t)}`)}</text></g>` : ""}
        <text class="parts-part-label" x="278" y="138" text-anchor="middle">${esc(`${spring.stiffness.toFixed(1)} N/m`)}</text>
      </svg><p class="parts-scale-note">${lengthMode ? `${t("Resulting free length", "Dobivena slobodna duljina")}: <strong>${currentFree === null ? "—" : currentFree.toFixed(1) + " mm"}</strong> · ${t("contact / cocked compression", "stlačenje pri kontaktu / zapeto")}: <strong>${spring.preload.toFixed(1)} / ${spring.cockedCompression.toFixed(1)} mm</strong>.` : `${t("Length fields are inactive; the model uses the entered direct compression", "Polja duljina nisu aktivna; model koristi uneseno izravno stlačenje")}: <strong>${fieldValue(p, "springPreload", t)}</strong>.`} ${t("Do not infer force from the drawing; use a measured force curve when available.", "Ne izvodite silu iz crteža; koristite izmjerenu krivulju sile kada je dostupna.")}</p></div>`;
  }

  function measurementGroup(group, p, t) {
    return `<section class="parts-measure-group"><div class="parts-measure-heading"><h3>${label(group.title, t)}</h3><p>${label(group.note, t)}</p></div><div class="parts-measure-list">${group.rows.map(([key, names, method, help]) => `<article class="parts-measurement" data-field="${key}"><div class="parts-measure-name"><strong>${label(names, t)}</strong><output>${esc(fieldValue(p, key, t))}</output></div><span class="parts-method">${label(method, t)}</span><p>${label(help, t)}</p></article>`).join("")}</div></section>`;
  }

  function modelRows(p, t) {
    return MODEL_ROWS.map(([key, names, method]) => `<tr data-field="${key}"><th scope="row">${label(names, t)}</th><td class="mono">${esc(fieldValue(p, key, t))}</td><td>${label(method, t)}</td></tr>`).join("");
  }

  function markup(raw, t = (en => en)) {
    const p = P.normalize(raw);
    return `<section class="panel parts-atlas" aria-labelledby="partsAtlasTitle">
      <div class="parts-atlas-heading"><div><span class="parts-eyebrow">${t("Dynamic measurement atlas", "Dinamički mjerni atlas")}</span><h2 id="partsAtlasTitle">${t("Parts & measurement references", "Dijelovi i reference mjerenja")}</h2><p>${t("Every number and diagram below follows the current setup. Use the drawings to identify the intended feature, then record the real measurement—not a value estimated from the illustration.", "Svaki broj i dijagram u nastavku prati trenutačnu konfiguraciju. Crtež koristite za prepoznavanje tražene značajke, a zatim zabilježite stvarno mjerenje — ne vrijednost procijenjenu sa slike.")}</p></div><span class="tag geometry">${t("current setup", "trenutačna konfiguracija")}</span></div>
      <div class="parts-safety" role="note"><strong>${t("Before measuring", "Prije mjerenja")}</strong><span>${t("Unload and fully decock the replica. Remove spring load and disassemble according to the manufacturer before placing tools inside the cylinder or spring assembly.", "Ispraznite i potpuno otpustite repliku. Uklonite opterećenje opruge i rastavite prema uputama proizvođača prije stavljanja alata u cilindar ili sklop opruge.")}</span></div>
      <div class="parts-diagrams">${airPathSvg(p, t)}<div class="parts-figure-grid">${cylinderSvg(p, t)}${barrelSvg(p, t)}${springSvg(p, t)}</div></div>
      <div class="parts-measurement-intro"><h2>${t("What each setup value means", "Što znači svaka vrijednost konfiguracije")}</h2><p>${t("The method labels distinguish dimensions you can measure directly from quantities that need a fixture, calculation or calibration.", "Oznake metoda razlikuju dimenzije koje možete izravno izmjeriti od veličina koje traže prihvat, izračun ili kalibraciju.")}</p></div>
      <div class="parts-measure-groups">${GROUPS.map(group => measurementGroup(group, p, t)).join("")}</div>
      <details class="parts-model-parameters" data-preserve-open><summary>${t("Model, bench-test and environmental inputs — not ordinary part dimensions", "Ulazi modela, ispitivanja i okoliša — nisu obične dimenzije dijelova")}</summary><p>${t("These inputs still affect the simulation, but a caliper cannot establish them. Treat unmeasured values as assumptions and use the stated evidence route or chrono calibration where applicable.", "Ovi ulazi i dalje utječu na simulaciju, ali ih pomično mjerilo ne može odrediti. Neizmjerene vrijednosti tretirajte kao pretpostavke i koristite navedeni način provjere ili chrono kalibraciju gdje je primjenjivo.")}</p><div class="table-wrap"><table class="parts-parameter-table"><thead><tr><th>${t("Parameter", "Parametar")}</th><th>${t("Current input", "Trenutačni ulaz")}</th><th>${t("How to establish it", "Kako ga odrediti")}</th></tr></thead><tbody>${modelRows(p, t)}</tbody></table></div></details>
      <p class="parts-cavity-note">${t("For dead and breech volumes, prefer dimensions from a disassembled dry component or a safe bench displacement method. Do not introduce liquid into an assembled replica, cylinder, hop unit or barrel.", "Za preostali volumen i volumen komore prednost dajte dimenzijama rastavljene suhe komponente ili sigurnoj metodi istiskivanja na stolu. Ne unosite tekućinu u sastavljenu repliku, cilindar, hop jedinicu ili cijev.")}</p>
    </section>`;
  }

  const api = { markup, fieldValue, help, PART_FIELDS, MODEL_FIELDS: MODEL_ROWS.map(row => row[0]), HELP_FIELDS: Object.keys(FIELD_HELP) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticParts = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
