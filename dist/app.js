(() => {
      "use strict";

      const $ = (id) => document.getElementById(id);
      const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
      const lerp = (a, b, t) => a + (b - a) * t;
      const pistonMasses = [45, 50, 58, 65, 68, 72, 76, 82];
      const FPS_PER_MPS = 3.28084;
      const ATM = 101325;
      const STORAGE_KEY = "ssg10-pneumatic-lab-v2";
      const LANGUAGE_KEY = "ssg10-pneumatic-lab-language";

      const STATIC_HR = {
        "INTERACTIVE INTERNAL-BALLISTICS EXPLAINER": "INTERAKTIVNI PRIKAZ UNUTARNJE BALISTIKE",
        "Airsoft Tools": "Airsoft alati",
        "Interactive workshop": "Interaktivna radionica",
        "Select a focused tool to explore your setup. More tools can be added here as the collection grows.": "Odaberite alat za istraživanje svoje konfiguracije. Ovdje se mogu dodavati novi alati kako zbirka bude rasla.",
        "1 tool available": "Dostupan je 1 alat",
        "Available": "Dostupno",
        "Compare piston, cylinder, barrel, BB and airbrake timing with live animation, graphs and chrono calibration.": "Usporedite vremenski odnos pistona, cilindra, cijevi, BB-a i zračne kočnice uz animaciju, grafove i kalibraciju kronografom.",
        "Additional calculators and setup tools will appear in this menu later.": "Dodatni kalkulatori i alati za konfiguraciju kasnije će se pojaviti u ovom izborniku.",
        "← All tools": "← Svi alati",
        "SSG10 Pneumatic Timing Lab": "SSG10 laboratorij pneumatskog tempiranja",
        "Spring Sniper Pneumatic Timing Lab": "Laboratorij pneumatike opružnih snajpera",
        "See when a Stalker Scorpion-style weighted piston builds useful pressure, when its airbrake begins cushioning, and whether the BB has already received most of its acceleration.": "Pogledajte kada otežani piston tipa Stalker Scorpion stvara koristan tlak, kada njegova zračna kočnica počinje ublažavati udar i je li BB već dobio većinu ubrzanja.",
        "Compare SSG10, TAC-41, SRS, VSR and L96-style systems to see when a weighted piston builds useful pressure, when an airbrake begins cushioning, and whether the BB has already received most of its acceleration.": "Usporedite sustave SSG10, TAC-41, SRS, VSR i L96 kako biste vidjeli kada otežani piston stvara koristan tlak, kada zračna kočnica počinje ublažavati udar i je li BB već dobio većinu ubrzanja.",
        "Interpretation boundary:": "Granice tumačenja:",
        "this is a simplified comparative model—not a chronograph, pressure transducer, acoustic meter, or claim of exact real-world joules or dB. Calibration improves agreement only inside the measured setup range.": "ovo je pojednostavljeni usporedni model — nije kronograf, senzor tlaka ni mjerač zvuka te ne tvrdi da daje točne stvarne joule ili dB. Kalibracija poboljšava podudaranje samo unutar raspona izmjerenih konfiguracija.",
        "Language": "Jezik",
        "editable inputs": "podesivi ulazi",
        "verify internals": "provjerite unutrašnjost",
        "geometry": "geometrija",
        "model": "model",
        "heuristic": "heuristika",
        "model traces": "krivulje modela",
        "0–100 index": "indeks 0–100",
        "timing interpretation": "tumačenje vremenskog odnosa",
        "Setup": "Postavke",
        "Platform starting point": "Početna konfiguracija platforme",
        "Rifle / configuration preset": "Predložak replike / konfiguracije",
        "SSG10 spring": "Opruga SSG10",
        "relative model input": "relativni ulaz modela",
        "M150 · calibration reference": "M150 · referenca kalibracije",
        "SSG10 reference": "SSG10 referentna konfiguracija",
        "SSG10 short-stroke (−20 mm)": "SSG10 skraćeni hod (−20 mm)",
        "VSR-10 Pro / clone baseline": "VSR-10 Pro / klon, osnovna konfiguracija",
        "VSR-10 G-Spec baseline": "VSR-10 G-Spec, osnovna konfiguracija",
        "APS2 / L96 baseline": "APS2 / L96, osnovna konfiguracija",
        "Custom setup": "Prilagođena konfiguracija",
        "EDITABLE INPUTS": "PODESIVI ULAZI",
        "AIR SYSTEM": "ZRAČNI SUSTAV",
        "Cylinder swept volume": "Radni volumen cilindra",
        "Inner-barrel length": "Duljina unutarnje cijevi",
        "Inner-barrel diameter": "Promjer unutarnje cijevi",
        "Usable piston stroke": "Iskoristivi hod pistona",
        "What short stroking changes:": "Što mijenja skraćivanje hoda:",
        "In this model it moves the cocked piston closer to the cylinder head. With the same airbrake rod length, the piston has less free travel—and sweeps less air volume—before the rod enters the head and pneumatic cushioning begins. It also reduces total swept cylinder volume. Exact timing relative to BB exit can still change because pressure and BB motion change too.": "U ovom modelu skraćivanje hoda pomiče napeti piston bliže glavi cilindra. Uz istu duljinu šipke zračne kočnice piston ima manje slobodnog hoda — i istiskuje manji volumen zraka — prije nego što šipka uđe u glavu i započne pneumatsko ublažavanje. Time se smanjuje i ukupni radni volumen cilindra. Točan vremenski odnos prema izlasku BB-a ipak se može promijeniti jer se mijenjaju i tlak te gibanje BB-a.",
        "MOVING MASS": "POKRETNA MASA",
        "Stalker Scorpion piston mass": "Masa Stalker Scorpion pistona",
        "Piston mass": "Masa pistona",
        "Exact piston mass in grams": "Točna masa pistona u gramima",
        "Piston mass presets": "Zadane mase pistona",
        "BB mass": "Masa BB-a",
        "AIRBRAKE": "ZRAČNA KOČNICA",
        "Airbrake": "Zračna kočnica",
        "Rod / engagement length": "Duljina šipke / ulaska",
        "Pneumatic cushion effect": "Učinak pneumatskog jastuka",
        "How it works:": "Kako djeluje:",
        "Higher values represent a stronger air cushion as the airbrake traps air near the cylinder head. The piston slows sooner and reaches the head with less kinetic energy, which usually softens its mechanical sound. This is a modeled damping strength—not a measured percentage of noise reduction.": "Veća vrijednost predstavlja snažniji zračni jastuk kada zračna kočnica zarobi zrak blizu glave cilindra. Piston se ranije usporava i dolazi do glave s manje kinetičke energije, što obično ublažava njegov mehanički zvuk. To je modelirana jačina prigušenja — nije izmjereni postotak smanjenja buke.",
        "Advanced physics inputs": "Napredni fizikalni ulazi",
        "These controls parameterize major effects that geometry alone cannot determine. Defaults are assumptions, not measured SSG10 specifications.": "Ove kontrole opisuju glavne učinke koji se ne mogu odrediti samo iz geometrije. Zadane vrijednosti pretpostavke su, a ne izmjerene specifikacije SSG10.",
        "Reset advanced assumptions": "Vrati napredne pretpostavke",
        "SPRING AND PISTON MECHANICS": "MEHANIKA OPRUGE I PISTONA",
        "Spring and piston mechanics": "Mehanika opruge i pistona",
        "Spring preload / spacer": "Prednaprezanje opruge / odstojnik",
        "Spring condition / strength": "Stanje / snaga opruge",
        "Piston dynamic friction": "Dinamičko trenje pistona",
        "COMPRESSION AND AIRFLOW": "KOMPRESIJA I PROTOK ZRAKA",
        "Compression and airflow": "Kompresija i protok zraka",
        "Head / nozzle dead volume": "Mrtvi volumen glave / mlaznice",
        "Piston seal efficiency": "Učinkovitost brtve pistona",
        "Nozzle flow efficiency": "Učinkovitost protoka kroz mlaznicu",
        "Compression exponent": "Eksponent kompresije",
        "BB, HOP AND BARREL LOSSES": "GUBICI BB-a, HOP-UPA I CIJEVI",
        "BB, hop and barrel losses": "Gubici BB-a, hop-upa i cijevi",
        "Actual BB diameter": "Stvarni promjer BB-a",
        "Hop / bucking breakaway force": "Sila pokretanja kroz hop-up gumicu",
        "Moving barrel drag": "Otpor kretanju u cijevi",
        "BB air-transfer efficiency": "Učinkovitost prijenosa zraka na BB",
        "ENVIRONMENT": "OKOLINA",
        "Environment": "Okolina",
        "Ambient air pressure": "Tlak okolnog zraka",
        "Air temperature": "Temperatura zraka",
        "Unknown model assumptions": "Nepoznate pretpostavke modela",
        "Effective spring drive": "Efektivni pogon opruge",
        "Fitted base flow efficiency": "Prilagođena osnovna učinkovitost protoka",
        "Spring force curve": "Krivulja sile opruge",
        "simplified linear": "pojednostavljeno linearna",
        "Nozzle model": "Model mlaznice",
        "lumped response": "skupni odziv",
        "Simulation time step": "Vremenski korak simulacije",
        "BB breakaway resistance": "Otpor pokretanju BB-a",
        "Piston friction": "Trenje pistona",
        "Compression exponent": "Eksponent kompresije",
        "Barrel air volume": "Volumen zraka u cijevi",
        "GEOMETRY": "GEOMETRIJA",
        "π × bore radius² × length": "π × polumjer provrta² × duljina",
        "Cylinder / barrel ratio": "Omjer cilindra i cijevi",
        "Available swept volume ÷ barrel volume": "Radni volumen cilindra ÷ volumen cijevi",
        "Model exit velocity": "Modelirana izlazna brzina",
        "MODEL": "MODEL",
        "Conditional estimate; not a chrono result": "Uvjetna procjena; nije rezultat kronografa",
        "Useful acceleration before braking": "Korisno ubrzanje prije kočenja",
        "Share of modeled exit kinetic energy already gained": "Već ostvaren udio modelirane izlazne kinetičke energije",
        "Peak pressure behind BB": "Vršni tlak iza BB-a",
        "Gauge pressure from simplified gas model": "Relativni tlak iz pojednostavljenog modela plina",
        "Relative energy retention": "Relativno zadržavanje energije",
        "Versus the same modeled setup without airbrake": "U odnosu na istu modeliranu konfiguraciju bez zračne kočnice",
        "Piston momentum at brake entry": "Količina gibanja pistona pri ulasku kočnice",
        "Mass × modeled piston velocity": "Masa × modelirana brzina pistona",
        "Airbrake entry vs BB exit": "Ulazak zračne kočnice prema izlasku BB-a",
        "Negative means airbrake enters first": "Negativno znači da zračna kočnica ulazi prva",
        "The tuning target: useful BB acceleration nearly complete before strong pneumatic braking": "Cilj podešavanja: korisno ubrzanje BB-a gotovo je završeno prije snažnog pneumatskog kočenja",
        "Advanced-factor influence": "Utjecaj naprednih faktora",
        "versus baseline assumptions": "prema osnovnim pretpostavkama",
        "All advanced inputs are at their baseline assumptions.": "Svi napredni ulazi postavljeni su na osnovne pretpostavke.",
        "Exit velocity": "Izlazna brzina",
        "Peak BB pressure": "Vršni tlak iza BB-a",
        "Peak piston velocity": "Vršna brzina pistona",
        "BB exit time": "Vrijeme izlaska BB-a",
        "Impact index": "Indeks udara",
        "Blast index": "Indeks praska",
        "strong brake": "snažno kočenje",
        "BB exit": "izlazak BB-a",
        "Fire / play": "Opali / pokreni",
        "Reset": "Vrati na početak",
        "SPRING + PISTON": "OPRUGA + PISTON",
        "CYLINDER HEAD / NOZZLE": "GLAVA CILINDRA / MLAZNICA",
        "INNER BARREL": "UNUTARNJA CIJEV",
        "Animated SSG10 firing cycle": "Animirani ciklus opaljenja SSG10",
        "Animated spring-sniper firing cycle": "Animirani ciklus opaljenja opružnog snajpera",
        "A spring drives a piston through a cylinder, compressing air that moves a BB through the barrel. An airbrake rod enters the cylinder head and creates a pneumatic cushion.": "Opruga pokreće piston kroz cilindar i komprimira zrak koji potiskuje BB kroz cijev. Šipka zračne kočnice ulazi u glavu cilindra i stvara pneumatski jastuk.",
        "PISTON v": "v PISTONA",
        "PRESSURE BEHIND BB": "TLAK IZA BB-a",
        "AIRBRAKE ENTRY": "ULAZAK ZRAČNE KOČNICE",
        "Ready — spring held, chamber at atmospheric pressure": "Spremno — opruga je napeta, komora je na atmosferskom tlaku",
        "PRESSURE": "TLAK",
        "PISTON VELOCITY": "BRZINA PISTONA",
        "PISTON MOMENTUM": "KOLIČINA GIBANJA PISTONA",
        "BB VELOCITY": "BRZINA BB-a",
        "BB ACCELERATION": "UBRZANJE BB-a",
        "spring / piston / airbrake": "opruga / piston / zračna kočnica",
        "compressed air / BB": "komprimirani zrak / BB",
        "Animation time is slowed; the readout shows modeled milliseconds.": "Animacija je usporena; prikaz pokazuje modelirane milisekunde.",
        "Shot traces": "Krivulje opaljenja",
        "The cursor follows the animation. Amber = strong airbrake onset; cyan = BB exit.": "Pokazivač prati animaciju. Jantarno = početak snažnog kočenja; cijan = izlazak BB-a.",
        "MODEL TRACES": "KRIVULJE MODELA",
        "Pressure vs time": "Tlak kroz vrijeme",
        "Piston velocity vs time": "Brzina pistona kroz vrijeme",
        "BB velocity vs time": "Brzina BB-a kroz vrijeme",
        "Two separate contributors to shot sound": "Dva odvojena izvora zvuka opaljenja",
        "Piston impact is the mechanical strike inside the cylinder. Muzzle blast is compressed air leaving the barrel. These relative indices explain different sources and cannot be added together or read as dB.": "Udar pistona mehanički je udar unutar cilindra. Prasak na ustima cijevi nastaje izlaskom komprimiranog zraka. Ovi relativni indeksi opisuju različite izvore i ne mogu se zbrajati niti očitati kao dB.",
        "heuristic, not dB": "heuristika, nije dB",
        "Piston impact — mechanical sound contribution": "Udar pistona — doprinos mehaničkom zvuku",
        "0–100 INDEX": "INDEKS 0–100",
        "What it means:": "Što znači:",
        "This estimates how hard the piston reaches the cylinder head from its remaining kinetic energy (½mv²). A higher value generally means a sharper, louder mechanical strike. Actual loudness also depends on materials, damping, stock resonance, suppressor and surroundings. This index is not dB or a durability prediction.": "Ovo procjenjuje koliko snažno piston udara u glavu cilindra prema preostaloj kinetičkoj energiji (½mv²). Veća vrijednost općenito znači oštriji i glasniji mehanički udar. Stvarna glasnoća ovisi i o materijalima, prigušenju, rezonanciji kundaka, prigušivaču i okolini. Ovaj indeks nije dB ni predviđanje trajnosti.",
        "Muzzle blast — escaping-air sound contribution": "Prasak na ustima cijevi — doprinos zvuka izlazećeg zraka",
        "This estimates the remaining pressure and gas volume released when the BB exits. A higher value suggests a stronger air blast at the muzzle. It is separate from piston impact and is not dB or a suppressor prediction.": "Ovo procjenjuje preostali tlak i volumen plina koji se oslobađa pri izlasku BB-a. Veća vrijednost upućuje na snažniji prasak zraka na ustima cijevi. Odvojen je od udara pistona i nije dB niti predviđanje učinka prigušivača.",
        "What this Scorpion configuration is doing": "Kako se ponaša ova Scorpion konfiguracija",
        "What this piston configuration is doing": "Kako se ponaša ova konfiguracija pistona",
        "TIMING INTERPRETATION": "TUMAČENJE VREMENSKOG ODNOSA",
        "Calibration mode — add real SSG10 chrono measurements": "Kalibracija — dodajte stvarna kronografska mjerenja SSG10",
        "Calibration mode — add real chrono measurements": "Kalibracija — dodajte stvarna kronografska mjerenja",
        "Each measurement stores a snapshot of the current barrel, cylinder, piston and airbrake setup. “Fit unknowns” adjusts only the effective spring-drive scale and seal/flow efficiency. One data point can anchor overall scale; varied BB masses and configurations are needed to constrain both unknowns. Saved data stays in this browser’s local storage.": "Svako mjerenje sprema trenutačnu konfiguraciju cijevi, cilindra, pistona i zračne kočnice. „Prilagodi nepoznanice” podešava samo efektivnu skalu pogona opruge i učinkovitost brtvljenja/protoka. Jedna točka može usidriti ukupnu skalu; za određivanje obiju nepoznanica potrebne su različite mase BB-a i konfiguracije. Podaci ostaju u lokalnoj pohrani ovog preglednika.",
        "Each measurement stores a snapshot of the current barrel, cylinder, piston stroke, piston mass and airbrake setup. “Fit unknowns” adjusts only the effective spring-drive scale and seal/flow efficiency. One data point can anchor overall scale; varied BB masses and configurations are needed to constrain both unknowns. Saved data stays in this browser’s local storage.": "Svako mjerenje sprema trenutačnu konfiguraciju cijevi, cilindra, hoda i mase pistona te zračne kočnice. „Prilagodi nepoznanice” podešava samo efektivnu skalu pogona opruge i učinkovitost brtvljenja/protoka. Jedna točka može usidriti ukupnu skalu; za određivanje obiju nepoznanica potrebne su različite mase BB-a i konfiguracije. Podaci ostaju u lokalnoj pohrani ovog preglednika.",
        "Each measurement stores a snapshot of the current barrel, cylinder, spring selection, piston stroke, piston mass and airbrake setup. “Fit unknowns” adjusts only the base spring-drive scale and seal/flow efficiency. One data point can anchor overall scale; varied BB masses and configurations are needed to constrain both unknowns. Saved data stays in this browser’s local storage.": "Svako mjerenje sprema trenutačnu konfiguraciju cijevi, cilindra, odabir opruge, hod i masu pistona te zračnu kočnicu. „Prilagodi nepoznanice” podešava samo osnovnu skalu pogona opruge i učinkovitost brtvljenja/protoka. Jedna točka može usidriti ukupnu skalu; za određivanje obiju nepoznanica potrebne su različite mase BB-a i konfiguracije. Podaci ostaju u lokalnoj pohrani ovog preglednika.",
        "Each measurement stores the current geometry, spring, piston, BB, airbrake and advanced physics inputs. “Fit unknowns” adjusts only the base spring-drive scale and flow efficiency. One data point can anchor overall scale; varied BB masses and configurations are needed to constrain both unknowns. Saved data stays in this browser’s local storage.": "Svako mjerenje sprema trenutačnu geometriju, oprugu, piston, BB, zračnu kočnicu i napredne fizikalne ulaze. „Prilagodi nepoznanice” podešava samo osnovnu skalu pogona opruge i učinkovitost protoka. Jedna točka može usidriti ukupnu skalu; za određivanje obiju nepoznanica potrebne su različite mase BB-a i konfiguracije. Podaci ostaju u lokalnoj pohrani ovog preglednika.",
        "BB mass (g)": "Masa BB-a (g)",
        "Measured velocity (fps)": "Izmjerena brzina (fps)",
        "Energy (J, derived)": "Energija (J, izvedena)",
        "Energy in joules": "Energija u joulima",
        "Add with current setup": "Dodaj s trenutačnom konfiguracijom",
        "Velocity": "Brzina",
        "Energy": "Energija",
        "Captured setup": "Spremljena konfiguracija",
        "Fit unknowns": "Prilagodi nepoznanice",
        "Reset calibration": "Vrati kalibraciju",
        "What is calculated, estimated, and still unknown": "Što je izračunato, procijenjeno i još nepoznato",
        "Geometry:": "Geometrija:",
        "barrel volume and cylinder/barrel volume ratio are direct calculations from the entered dimensions.": "volumen cijevi i omjer volumena cilindra i cijevi izravno se računaju iz unesenih dimenzija.",
        "Physics-based model:": "Fizikalni model:",
        "pressure, velocities, acceleration, momentum and event timing come from a simplified time-step model using spring force, two-stage pressure response, gas compression and force balance. They depend on assumptions.": "tlak, brzine, ubrzanje, količina gibanja i vremena događaja dolaze iz pojednostavljenog vremenskog modela koji koristi silu opruge, dvostupanjski odziv tlaka, kompresiju plina i ravnotežu sila. Ovise o pretpostavkama.",
        "Heuristics:": "Heuristike:",
        "impact and muzzle-blast are relative 0–100 comparison indices, never dB. Relative energy retention is only relative to this model’s no-airbrake baseline.": "udar i prasak na ustima cijevi relativni su usporedni indeksi 0–100, nikada dB. Relativno zadržavanje energije uspoređuje se samo s osnovnim modelom bez zračne kočnice.",
        "Unknown or fitted:": "Nepoznato ili prilagođeno:",
        "advanced controls parameterize spring condition, preload, friction, dead volume, seals, nozzle response, hop resistance, barrel losses and environment. Their real values still require measurement; chrono fitting cannot uniquely identify all of them.": "napredne kontrole parametriziraju stanje i prednaprezanje opruge, trenje, mrtvi volumen, brtve, odziv mlaznice, otpor hop-upa, gubitke u cijevi i okolinu. Njihove stvarne vrijednosti i dalje zahtijevaju mjerenje; prilagodba kronografskim podacima ne može ih sve jednoznačno odrediti."
      };

      const MESSAGES = {
        en: {
          "play.fire": "Fire / play", "play.pause": "Pause", "play.resume": "Resume", "play.replay": "Replay",
          "timing.before": "Airbrake enters before BB exit", "timing.after": "Airbrake enters after BB exit",
          "timing.disabled": "Disabled", "timing.none": "No pneumatic cushion configured",
          "goal.overlap": "Timing overlap: BB is still gaining substantial energy",
          "goal.after": "Strong cushion begins after BB exit",
          "goal.none": "No strong airbrake event in this preset",
          "goal.near": "{percent}% of modeled exit energy gained first — near target",
          "goal.close": "{percent}% gained first — close, with overlap",
          "impact.verySoft": "Very soft piston landing",
          "impact.soft": "Soft mechanical impact",
          "impact.moderate": "Moderate mechanical impact",
          "impact.hard": "Hard mechanical impact",
          "impact.veryHard": "Very hard mechanical impact",
          "shortStroke.current": "Current pre-entry region: {travel} mm piston travel · ≈{volume} cm³ swept air",
          "shortStroke.disabled": "Current pre-entry region: no active airbrake configured",
          "phase.1": "1 · Trigger release — spring unloads and accelerates the piston",
          "phase.2": "2 · Piston compresses the sealed air column — pressure rises behind the stationary BB",
          "phase.3": "3 · Pressure overcomes BB resistance — BB accelerates down the barrel",
          "phase.4": "4 · Airbrake rod enters the head / nozzle region — trapped air starts to cushion",
          "phase.5": "5 · Pneumatic cushion rapidly decelerates the piston while the BB is still in the barrel",
          "phase.6": "6 · BB exits — residual compressed air expands from the muzzle",
          "phase.7": "7 · Cushion bleeds down — piston completes its final low-speed travel",
          "phase.7.noBrake": "7 · Residual pressure vents — the uncushioned piston completes its travel",
          "phase.8": "8 · Piston reaches the cylinder head — impact depends on its remaining kinetic energy",
          "interpret.entryBefore": "The rod enters {time} ms before exit",
          "interpret.entryAfter": "The rod enters {time} ms after exit",
          "interpret.brakeAfter": "{entry}, while the cushion does not become strongly decelerating until {time} ms after the BB has left.",
          "interpret.brakeBefore": "Strong cushioning begins {time} ms before the BB exits, when the BB has reached about {percent}% of its modeled exit kinetic energy.",
          "interpret.massHeavy": "This heavier piston accelerates more slowly but carries more momentum into the braking zone, so the airbrake must absorb more late-cycle motion.",
          "interpret.massLight": "This lighter piston changes direction more readily and carries less momentum into the head, but may build a shorter pressure impulse for a heavy BB.",
          "interpret.massReference": "The 72 g piston is the reference preset: changing mass will shift both pressure timing and the momentum that the airbrake must remove.",
          "interpret.compare": "Compare presets and airbrake lengths by watching the amber and cyan markers move; treat the result as a tuning hypothesis to verify on a chronograph.",
          "interpret.noBrake": "This starting preset has no active airbrake; add rod length and cushion effect to explore braking timing.",
          "fit.loaded": "A supplied 0.46 g / 330 fps / ≈2.33 J reference point is loaded.",
          "fit.empty": "Add at least one chrono measurement first.",
          "fit.running": "Fitting simplified unknowns…",
          "fit.one": "One-point scale fit: drive {drive}×; flow held at {flow}%. This does not identify losses independently.",
          "fit.many": "Fit across {count} points: drive {drive}×, flow {flow}%, RMS velocity error {error}%.",
          "fit.ready": "{count} measurement{suffix} ready to fit.",
          "fit.reset": "Calibration reset to the supplied 0.46 g / 330 fps reference point.",
          "measurement.setup": "{length} mm × {diameter} · {stroke} mm stroke · {mass} g piston · {brakeLength} mm / {effect}% brake",
          "measurement.spring": " · {spring} spring",
          "measurement.remove": "Remove", "measurement.delete": "Delete measurement",
          "model.energy": "{fps} fps · ≈{energy} J model estimate",
          "spring.note": "Manufacturer reference for the default SSG10 barrel: {light} J with 0.20 g and {heavy} J with a heavy BB, with stated output variation of ±20%. The simulation applies a {scale}× relative drive factor versus M150; it does not treat those values as an exact prediction.",
          "factor.default": "All advanced inputs are at their baseline assumptions.",
          "factor.active": "{count} advanced inputs differ from baseline. The deltas below isolate their combined modeled effect while geometry, masses, spring selection and airbrake stay unchanged.",
          "preset.ssg10": "Published 430 × 6.01 mm barrel; cylinder, stroke, piston and airbrake values are the current SSG10 model defaults.",
          "preset.ssg10-short": "Derived comparison: the same modeled cylinder bore with 20 mm less stroke reduces total swept volume from 35.8 to 27.4 cm³. With the same 20 mm airbrake rod, free piston travel before engagement falls from 65 to 45 mm and pre-entry swept volume from about 27.4 to 19.0 cm³. Cushioning therefore begins earlier in piston travel, but exact timing relative to BB exit remains model-dependent. This is not a universal short-stroke recipe.",
          "preset.tac41p": "Published baseline: 41 cm³ usable bolt volume and a 510 × 6.05 mm barrel. Stroke, piston mass and no-airbrake state are editable starting assumptions.",
          "preset.tac41ls": "Published baseline: 41 cm³ usable bolt volume and a 330 × 6.05 mm barrel. Stroke, piston mass and no-airbrake state are editable starting assumptions.",
          "preset.srs16": "Published baseline: 41 cm³ air displacement, 23.8 mm cylinder bore and a 420 × 6.05 mm barrel. Piston mass and no-airbrake state are starting assumptions.",
          "preset.srs22": "Published baseline: 41 cm³ air displacement and a 578 × 6.05 mm barrel. Stroke, piston mass and no-airbrake state are starting assumptions.",
          "preset.vsr-pro": "Published 430 mm barrel length; stock bore, cylinder volume, stroke and piston mass are approximate baseline values because VSR builds vary.",
          "preset.vsr-gspec": "Published 303 mm barrel length; stock bore, cylinder volume, stroke and piston mass are approximate baseline values because VSR builds vary.",
          "preset.l96": "Generic APS2 / L96 starting point. Variants differ substantially, so every internal value is approximate and should be replaced with measured dimensions.",
          "preset.custom": "Manual setup. The values below no longer match a complete predefined platform profile."
        },
        hr: {
          "play.fire": "Opali / pokreni", "play.pause": "Pauziraj", "play.resume": "Nastavi", "play.replay": "Ponovi",
          "timing.before": "Zračna kočnica ulazi prije izlaska BB-a", "timing.after": "Zračna kočnica ulazi nakon izlaska BB-a",
          "timing.disabled": "Isključeno", "timing.none": "Nije postavljen pneumatski jastuk",
          "goal.overlap": "Vremensko preklapanje: BB još uvijek dobiva znatan dio energije",
          "goal.after": "Snažno ublažavanje počinje nakon izlaska BB-a",
          "goal.none": "U ovom predlošku nema događaja snažnog kočenja",
          "goal.near": "{percent}% modelirane izlazne energije ostvareno je ranije — blizu cilja",
          "goal.close": "{percent}% ostvareno je ranije — blizu, uz preklapanje",
          "impact.verySoft": "Vrlo mekan dosjed pistona",
          "impact.soft": "Blag mehanički udar",
          "impact.moderate": "Umjeren mehanički udar",
          "impact.hard": "Jak mehanički udar",
          "impact.veryHard": "Vrlo jak mehanički udar",
          "shortStroke.current": "Trenutačni prostor prije ulaska: {travel} mm hoda pistona · ≈{volume} cm³ istisnutog zraka",
          "shortStroke.disabled": "Trenutačni prostor prije ulaska: aktivna zračna kočnica nije postavljena",
          "phase.1": "1 · Otpuštanje okidača — opruga se rasterećuje i ubrzava piston",
          "phase.2": "2 · Piston komprimira zatvoreni stupac zraka — tlak raste iza nepomičnog BB-a",
          "phase.3": "3 · Tlak nadvladava otpor BB-a — BB ubrzava kroz cijev",
          "phase.4": "4 · Šipka zračne kočnice ulazi u područje glave / mlaznice — zarobljeni zrak počinje ublažavati",
          "phase.5": "5 · Pneumatski jastuk brzo usporava piston dok je BB još u cijevi",
          "phase.6": "6 · BB izlazi — preostali komprimirani zrak širi se iz usta cijevi",
          "phase.7": "7 · Jastuk se odzračuje — piston dovršava posljednji dio hoda malom brzinom",
          "phase.7.noBrake": "7 · Preostali tlak izlazi — piston bez jastuka završava svoj hod",
          "phase.8": "8 · Piston doseže glavu cilindra — udar ovisi o preostaloj kinetičkoj energiji",
          "interpret.entryBefore": "Šipka ulazi {time} ms prije izlaska",
          "interpret.entryAfter": "Šipka ulazi {time} ms nakon izlaska",
          "interpret.brakeAfter": "{entry}, dok snažno usporavanje jastukom počinje tek {time} ms nakon što BB napusti cijev.",
          "interpret.brakeBefore": "Snažno ublažavanje počinje {time} ms prije izlaska BB-a, kada je BB dosegao oko {percent}% modelirane izlazne kinetičke energije.",
          "interpret.massHeavy": "Ovaj teži piston sporije ubrzava, ali u zonu kočenja donosi veću količinu gibanja, pa zračna kočnica mora apsorbirati više gibanja pri kraju ciklusa.",
          "interpret.massLight": "Ovaj lakši piston lakše mijenja brzinu i donosi manju količinu gibanja prema glavi, ali za teški BB može stvarati kraći impuls tlaka.",
          "interpret.massReference": "Piston od 72 g referentna je postavka: promjena mase pomiče vrijeme tlaka i količinu gibanja koju zračna kočnica mora ukloniti.",
          "interpret.compare": "Usporedite mase i duljine zračne kočnice prateći pomicanje jantarne i cijan oznake; rezultat smatrajte hipotezom za podešavanje koju treba provjeriti kronografom.",
          "interpret.noBrake": "Ovaj početni predložak nema aktivnu zračnu kočnicu; dodajte duljinu šipke i učinak jastuka kako biste istražili vrijeme kočenja.",
          "fit.loaded": "Učitana je zadana referentna točka 0,46 g / 330 fps / ≈2,33 J.",
          "fit.empty": "Najprije dodajte barem jedno kronografsko mjerenje.",
          "fit.running": "Prilagođavanje pojednostavljenih nepoznanica…",
          "fit.one": "Prilagodba jednoj točki: pogon {drive}×; protok zadržan na {flow}%. Time se gubici ne određuju neovisno.",
          "fit.many": "Prilagodba na {count} točaka: pogon {drive}×, protok {flow}%, RMS pogreška brzine {error}%.",
          "fit.ready": "Broj mjerenja spremnih za prilagodbu: {count}.",
          "fit.reset": "Kalibracija je vraćena na zadanu referentnu točku 0,46 g / 330 fps.",
          "measurement.setup": "{length} mm × {diameter} · hod {stroke} mm · piston {mass} g · kočnica {brakeLength} mm / {effect}%",
          "measurement.spring": " · opruga {spring}",
          "measurement.remove": "Ukloni", "measurement.delete": "Izbriši mjerenje",
          "model.energy": "{fps} fps · ≈{energy} J, procjena modela",
          "spring.note": "Referentni podaci proizvođača za standardnu cijev SSG10: {light} J s BB-om od 0,20 g i {heavy} J s teškim BB-om, uz navedeno odstupanje izlazne snage od ±20%. Simulacija primjenjuje relativni faktor pogona {scale}× prema opruzi M150; te vrijednosti ne smatra točnim predviđanjem.",
          "factor.default": "Svi napredni ulazi postavljeni su na osnovne pretpostavke.",
          "factor.active": "Broj naprednih ulaza koji odstupaju od osnove: {count}. Donje razlike izdvajaju njihov zajednički modelirani učinak uz nepromijenjenu geometriju, mase, odabir opruge i zračnu kočnicu.",
          "preset.ssg10": "Objavljeni podaci za cijev: 430 × 6,01 mm; vrijednosti cilindra, hoda, pistona i zračne kočnice trenutačne su zadane vrijednosti SSG10 modela.",
          "preset.ssg10-short": "Izvedena usporedba: isti modelirani promjer cilindra s 20 mm kraćim hodom smanjuje ukupni radni volumen s 35,8 na 27,4 cm³. Uz istu šipku zračne kočnice od 20 mm slobodni hod pistona prije ulaska smanjuje se sa 65 na 45 mm, a istisnuti volumen prije ulaska s približno 27,4 na 19,0 cm³. Ublažavanje zato počinje ranije u hodu pistona, ali točan vremenski odnos prema izlasku BB-a i dalje ovisi o modelu. Ovo nije univerzalna uputa za skraćivanje hoda.",
          "preset.tac41p": "Objavljena osnova: 41 cm³ iskoristivog volumena cilindra i cijev 510 × 6,05 mm. Hod, masa pistona i stanje bez zračne kočnice početne su pretpostavke koje možete mijenjati.",
          "preset.tac41ls": "Objavljena osnova: 41 cm³ iskoristivog volumena cilindra i cijev 330 × 6,05 mm. Hod, masa pistona i stanje bez zračne kočnice početne su pretpostavke koje možete mijenjati.",
          "preset.srs16": "Objavljena osnova: 41 cm³ istisnine zraka, provrt cilindra 23,8 mm i cijev 420 × 6,05 mm. Masa pistona i stanje bez zračne kočnice početne su pretpostavke.",
          "preset.srs22": "Objavljena osnova: 41 cm³ istisnine zraka i cijev 578 × 6,05 mm. Hod, masa pistona i stanje bez zračne kočnice početne su pretpostavke.",
          "preset.vsr-pro": "Objavljena duljina cijevi je 430 mm; provrt, volumen cilindra, hod i masa pistona približne su početne vrijednosti jer se VSR konfiguracije razlikuju.",
          "preset.vsr-gspec": "Objavljena duljina cijevi je 303 mm; provrt, volumen cilindra, hod i masa pistona približne su početne vrijednosti jer se VSR konfiguracije razlikuju.",
          "preset.l96": "Opća početna točka za APS2 / L96. Varijante se znatno razlikuju, pa su sve unutarnje vrijednosti približne i treba ih zamijeniti izmjerenim dimenzijama.",
          "preset.custom": "Ručna konfiguracija. Vrijednosti u nastavku više ne odgovaraju cjelovitom unaprijed zadanom profilu platforme."
        }
      };

      const PLATFORM_PRESETS = {
        ssg10: {
          cylinderVolume: 35.8, strokeLength: 85, barrelLength: 430, barrelDiameter: 6.01,
          pistonMass: 72, bbMass: 0.46, airbrakeLength: 20, airbrakeEffect: 72,
          springRating: "M150",
          noteKey: "preset.ssg10"
        },
        "ssg10-short": {
          cylinderVolume: 27.4, strokeLength: 65, barrelLength: 430, barrelDiameter: 6.01,
          pistonMass: 72, bbMass: 0.46, airbrakeLength: 20, airbrakeEffect: 72,
          springRating: "M150",
          noteKey: "preset.ssg10-short"
        },
        tac41p: {
          cylinderVolume: 41, strokeLength: 92, barrelLength: 510, barrelDiameter: 6.05,
          pistonMass: 58, bbMass: 0.46, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.tac41p"
        },
        tac41ls: {
          cylinderVolume: 41, strokeLength: 92, barrelLength: 330, barrelDiameter: 6.05,
          pistonMass: 58, bbMass: 0.46, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.tac41ls"
        },
        srs16: {
          cylinderVolume: 41, strokeLength: 92, barrelLength: 420, barrelDiameter: 6.05,
          pistonMass: 58, bbMass: 0.46, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.srs16"
        },
        srs22: {
          cylinderVolume: 41, strokeLength: 92, barrelLength: 578, barrelDiameter: 6.05,
          pistonMass: 58, bbMass: 0.46, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.srs22"
        },
        "vsr-pro": {
          cylinderVolume: 31.8, strokeLength: 80, barrelLength: 430, barrelDiameter: 6.08,
          pistonMass: 45, bbMass: 0.40, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.vsr-pro"
        },
        "vsr-gspec": {
          cylinderVolume: 31.8, strokeLength: 80, barrelLength: 303, barrelDiameter: 6.08,
          pistonMass: 45, bbMass: 0.40, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.vsr-gspec"
        },
        l96: {
          cylinderVolume: 30, strokeLength: 80, barrelLength: 490, barrelDiameter: 6.03,
          pistonMass: 45, bbMass: 0.40, airbrakeLength: 0, airbrakeEffect: 0,
          noteKey: "preset.l96"
        },
        custom: { noteKey: "preset.custom" }
      };

      const SSG10_SPRINGS = {
        M110: { lightJ: 0.90, heavyJ: 0.95 },
        M120: { lightJ: 1.15, heavyJ: 1.35 },
        M130: { lightJ: 1.40, heavyJ: 1.70 },
        M140: { lightJ: 1.81, heavyJ: 2.00 },
        M150: { lightJ: 2.12, heavyJ: 2.35 },
        M160: { lightJ: 2.30, heavyJ: 2.81 },
        M170: { lightJ: 2.92, heavyJ: 3.38 },
        M180: { lightJ: 3.00, heavyJ: 3.50 },
        M190: { lightJ: 3.15, heavyJ: 3.85 },
        M220: { lightJ: 4.53, heavyJ: 5.00 }
      };
      const SSG10_REFERENCE_J = SSG10_SPRINGS.M150.lightJ;
      const ADVANCED_DEFAULTS = {
        springPreload: 0,
        springCondition: 100,
        pistonFriction: 3.2,
        deadVolume: 0.55,
        sealEfficiency: 100,
        nozzleFlow: 100,
        compressionExponent: 1.32,
        bbDiameter: 5.95,
        bbBreakaway: 1.35,
        barrelDrag: 0.11,
        barrelSeal: 100,
        ambientPressure: 101.3,
        airTemperature: 20
      };

      let language = "en";
      try { language = localStorage.getItem(LANGUAGE_KEY) || "en"; } catch (_) { /* no-op */ }
      if (!MESSAGES[language]) language = "en";
      let staticTextNodes = [];
      let fitStatusState = { key: "fit.loaded", vars: {} };

      function tr(key, vars = {}) {
        let value = MESSAGES[language][key] || MESSAGES.en[key] || key;
        Object.entries(vars).forEach(([name, replacement]) => {
          value = value.replaceAll(`{${name}}`, String(replacement));
        });
        return value;
      }

      function collectStaticTextNodes() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.parentElement && node.parentElement.closest("script, style")) continue;
          const english = node.nodeValue.trim();
          if (!english || !Object.prototype.hasOwnProperty.call(STATIC_HR, english)) continue;
          staticTextNodes.push({ node, english, original: node.nodeValue });
        }
      }

      function translateStaticText() {
        staticTextNodes.forEach(({ node, english, original }) => {
          const translated = language === "hr" ? STATIC_HR[english] : english;
          node.nodeValue = original.replace(english, translated);
        });
      }

      function setFitStatus(key, vars = {}) {
        fitStatusState = { key, vars };
        $("fitStatus").textContent = tr(key, vars);
      }

      const inputs = {
        cylinderVolume: $("cylinderVolume"),
        barrelLength: $("barrelLength"),
        barrelDiameter: $("barrelDiameter"),
        strokeLength: $("strokeLength"),
        bbMass: $("bbMass"),
        airbrakeLength: $("airbrakeLength"),
        airbrakeEffect: $("airbrakeEffect"),
        springPreload: $("springPreload"),
        springCondition: $("springCondition"),
        pistonFriction: $("pistonFriction"),
        deadVolume: $("deadVolume"),
        sealEfficiency: $("sealEfficiency"),
        nozzleFlow: $("nozzleFlow"),
        compressionExponent: $("compressionExponent"),
        bbDiameter: $("bbDiameter"),
        bbBreakaway: $("bbBreakaway"),
        barrelDrag: $("barrelDrag"),
        barrelSeal: $("barrelSeal"),
        ambientPressure: $("ambientPressure"),
        airTemperature: $("airTemperature")
      };
      const platformPreset = $("platformPreset");
      const ssgSpring = $("ssgSpring");
      const pistonMassRange = $("pistonMassRange");
      const pistonMassNumber = $("pistonMassNumber");
      const toolHub = $("toolHub");
      const labApp = $("labApp");

      let pistonMass = 72;
      let modelUnknowns = { driveScale: 0.325, flowEfficiency: 0.88 };
      let shot = null;
      let noBrakeShot = null;
      let advancedReferenceShot = null;
      let animationId = null;
      let playing = false;
      let playStart = 0;
      let currentFraction = 0;
      let measurements = [];
      let applyingPreset = false;
      let launchedFromMenu = false;
      let ssgSpringEnabled = true;

      function updateDocumentTitle() {
        if (labApp.hidden) {
          document.title = language === "hr" ? "Airsoft alati" : "Airsoft Tools";
        } else {
          document.title = language === "hr" ? STATIC_HR["Spring Sniper Pneumatic Timing Lab"] : "Spring Sniper Pneumatic Timing Lab";
        }
      }

      function showToolMenu() {
        stopAnimation();
        labApp.hidden = true;
        toolHub.hidden = false;
        updateDocumentTitle();
        window.scrollTo(0, 0);
      }

      function showPneumaticLab(pushHistory = true) {
        toolHub.hidden = true;
        labApp.hidden = false;
        updateDocumentTitle();
        window.scrollTo(0, 0);
        if (pushHistory) {
          launchedFromMenu = true;
          history.pushState({ view: "pneumatic-timing" }, "", "#pneumatic-timing");
        }
        requestAnimationFrame(() => drawAllCharts());
      }

      function updatePresetNote() {
        const preset = PLATFORM_PRESETS[platformPreset.value] || PLATFORM_PRESETS.custom;
        $("presetNote").textContent = tr(preset.noteKey);
      }

      function updateSpringControl() {
        $("ssgSpringControl").hidden = !ssgSpringEnabled;
        if (!ssgSpringEnabled) return;
        const spring = SSG10_SPRINGS[ssgSpring.value] || SSG10_SPRINGS.M150;
        $("springNote").textContent = tr("spring.note", {
          light: spring.lightJ.toFixed(2),
          heavy: spring.heavyJ.toFixed(2),
          scale: (spring.lightJ / SSG10_REFERENCE_J).toFixed(2)
        });
      }

      function syncMassPresetButtons() {
        document.querySelectorAll("#massPresets .preset").forEach((button) => {
          button.setAttribute("aria-pressed", +button.dataset.mass === pistonMass ? "true" : "false");
        });
      }

      function setPistonMass(value) {
        pistonMass = Math.round(clamp(Number(value) || 72, 5, 300) * 10) / 10;
        pistonMassRange.value = pistonMass;
        pistonMassNumber.value = pistonMass;
        syncMassPresetButtons();
      }

      function resetAdvancedInputs() {
        Object.entries(ADVANCED_DEFAULTS).forEach(([id, value]) => {
          inputs[id].value = value;
        });
      }

      function withAdvancedDefaults(p) {
        return {
          ...p,
          springPreload: ADVANCED_DEFAULTS.springPreload,
          springCondition: ADVANCED_DEFAULTS.springCondition / 100,
          pistonFriction: ADVANCED_DEFAULTS.pistonFriction,
          deadVolume: ADVANCED_DEFAULTS.deadVolume,
          sealEfficiency: ADVANCED_DEFAULTS.sealEfficiency / 100,
          nozzleFlow: ADVANCED_DEFAULTS.nozzleFlow / 100,
          compressionExponent: ADVANCED_DEFAULTS.compressionExponent,
          bbDiameter: ADVANCED_DEFAULTS.bbDiameter,
          bbBreakaway: ADVANCED_DEFAULTS.bbBreakaway,
          barrelDrag: ADVANCED_DEFAULTS.barrelDrag,
          barrelSeal: ADVANCED_DEFAULTS.barrelSeal / 100,
          ambientPressure: ADVANCED_DEFAULTS.ambientPressure,
          airTemperature: ADVANCED_DEFAULTS.airTemperature
        };
      }

      function advancedChangeCount(p) {
        const baseline = withAdvancedDefaults(p);
        return ["springPreload", "springCondition", "pistonFriction", "deadVolume", "sealEfficiency", "nozzleFlow", "compressionExponent", "bbDiameter", "bbBreakaway", "barrelDrag", "barrelSeal", "ambientPressure", "airTemperature"]
          .filter((key) => Math.abs(p[key] - baseline[key]) > 1e-9).length;
      }

      function markSetupAsCustom() {
        if (applyingPreset) return;
        platformPreset.value = "custom";
        updatePresetNote();
      }

      function applyPlatformPreset(id) {
        const preset = PLATFORM_PRESETS[id];
        if (!preset || id === "custom") {
          platformPreset.value = "custom";
          ssgSpringEnabled = false;
          updatePresetNote();
          updateSpringControl();
          updateSimulation();
          return;
        }
        applyingPreset = true;
        inputs.cylinderVolume.value = preset.cylinderVolume;
        inputs.strokeLength.value = preset.strokeLength;
        inputs.barrelLength.value = preset.barrelLength;
        inputs.barrelDiameter.value = preset.barrelDiameter;
        inputs.bbMass.value = preset.bbMass;
        inputs.airbrakeLength.value = preset.airbrakeLength;
        inputs.airbrakeEffect.value = preset.airbrakeEffect;
        setPistonMass(preset.pistonMass);
        resetAdvancedInputs();
        ssgSpringEnabled = Boolean(preset.springRating);
        if (preset.springRating) ssgSpring.value = preset.springRating;
        platformPreset.value = id;
        applyingPreset = false;
        updatePresetNote();
        updateSpringControl();
        updateSimulation();
      }

      function updatePlayButtonLabel() {
        const key = playing
          ? "play.pause"
          : currentFraction > 0 && currentFraction < 1
            ? "play.resume"
            : currentFraction >= 0.999
              ? "play.replay"
              : "play.fire";
        $("playButton").textContent = tr(key);
      }

      function applyLanguage(nextLanguage) {
        language = MESSAGES[nextLanguage] ? nextLanguage : "en";
        document.documentElement.lang = language;
        updateDocumentTitle();
        try { localStorage.setItem(LANGUAGE_KEY, language); } catch (_) { /* no-op */ }
        document.querySelectorAll("[data-language]").forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.language === language ? "true" : "false");
        });
        translateStaticText();

        const labels = language === "hr" ? {
          switcher: "Jezik", controls: "Kontrole simulacije", presets: "Zadane mase pistona",
          timing: "Cilj vremenskog usklađivanja", stage: "Animirani ciklus opaljenja",
          scrubber: "Pomicanje kroz ciklus opaljenja", live: "Vrijednosti tijekom opaljenja",
          graphs: "Grafovi opaljenja uživo", insight: "Tumačenje trenutačne konfiguracije pistona",
          energy: "Energija u joulima", hubNav: "Zaglavlje izbornika alata",
          openTool: "Otvori laboratorij pneumatike opružnih snajpera",
          pistonMass: "Točna masa pistona u gramima", factor: "Utjecaj naprednih faktora"
        } : {
          switcher: "Language", controls: "Simulation controls", presets: "Piston mass presets",
          timing: "Timing objective", stage: "Animated firing cycle",
          scrubber: "Scrub through firing cycle", live: "Live firing values",
          graphs: "Live firing graphs", insight: "Current piston-configuration interpretation",
          energy: "Energy in joules", hubNav: "Tool menu header",
          openTool: "Open the Spring Sniper Pneumatic Timing Lab",
          pistonMass: "Exact piston mass in grams", factor: "Advanced-factor influence"
        };
        document.querySelectorAll(".language-switch").forEach((switcher) => switcher.setAttribute("aria-label", labels.switcher));
        document.querySelector(".hub-nav").setAttribute("aria-label", labels.hubNav);
        $("openPneumaticLab").setAttribute("aria-label", labels.openTool);
        document.querySelector(".controls-panel").setAttribute("aria-label", labels.controls);
        $("massPresets").setAttribute("aria-label", labels.presets);
        $("timingTrack").closest("section").setAttribute("aria-label", labels.timing);
        document.querySelector(".stage").setAttribute("aria-label", labels.stage);
        $("scrubber").setAttribute("aria-label", labels.scrubber);
        document.querySelector(".live-strip").setAttribute("aria-label", labels.live);
        document.querySelector(".graphs").setAttribute("aria-label", labels.graphs);
        document.querySelector(".insight").setAttribute("aria-label", labels.insight);
        document.querySelector(".factor-impact").setAttribute("aria-label", labels.factor);
        $("measurementEnergy").setAttribute("aria-label", labels.energy);
        pistonMassNumber.setAttribute("aria-label", labels.pistonMass);
        $("brakeTimingMarker").dataset.label = language === "hr" ? "snažno kočenje" : "strong brake";
        $("exitTimingMarker").dataset.label = language === "hr" ? "izlazak BB-a" : "BB exit";

        updatePlayButtonLabel();
        setFitStatus(fitStatusState.key, fitStatusState.vars);
        updatePresetNote();
        updateSpringControl();
        if (shot) {
          updateOutputs(currentParams());
          updateMetrics();
          setFrame(currentFraction);
          renderMeasurements();
        }
      }

      function currentParams() {
        const spring = SSG10_SPRINGS[ssgSpring.value] || SSG10_SPRINGS.M150;
        return {
          cylinderVolume: +inputs.cylinderVolume.value,
          barrelLength: +inputs.barrelLength.value,
          barrelDiameter: +inputs.barrelDiameter.value,
          strokeLength: +inputs.strokeLength.value,
          pistonMass,
          bbMass: +inputs.bbMass.value,
          airbrakeLength: +inputs.airbrakeLength.value,
          airbrakeEffect: +inputs.airbrakeEffect.value / 100,
          springRating: ssgSpringEnabled ? ssgSpring.value : null,
          springDrive: ssgSpringEnabled ? spring.lightJ / SSG10_REFERENCE_J : 1,
          springPreload: +inputs.springPreload.value,
          springCondition: +inputs.springCondition.value / 100,
          pistonFriction: +inputs.pistonFriction.value,
          deadVolume: +inputs.deadVolume.value,
          sealEfficiency: +inputs.sealEfficiency.value / 100,
          nozzleFlow: +inputs.nozzleFlow.value / 100,
          compressionExponent: +inputs.compressionExponent.value,
          bbDiameter: +inputs.bbDiameter.value,
          bbBreakaway: +inputs.bbBreakaway.value,
          barrelDrag: +inputs.barrelDrag.value,
          barrelSeal: +inputs.barrelSeal.value / 100,
          ambientPressure: +inputs.ambientPressure.value,
          airTemperature: +inputs.airTemperature.value,
          driveScale: modelUnknowns.driveScale,
          flowEfficiency: modelUnknowns.flowEfficiency
        };
      }

      function snapshotSetup() {
        const p = currentParams();
        return {
          cylinderVolume: p.cylinderVolume,
          barrelLength: p.barrelLength,
          barrelDiameter: p.barrelDiameter,
          strokeLength: p.strokeLength,
          pistonMass: p.pistonMass,
          bbMass: p.bbMass,
          airbrakeLength: p.airbrakeLength,
          airbrakeEffect: p.airbrakeEffect,
          springRating: p.springRating,
          springDrive: p.springDrive,
          springPreload: p.springPreload,
          springCondition: p.springCondition,
          pistonFriction: p.pistonFriction,
          deadVolume: p.deadVolume,
          sealEfficiency: p.sealEfficiency,
          nozzleFlow: p.nozzleFlow,
          compressionExponent: p.compressionExponent,
          bbDiameter: p.bbDiameter,
          bbBreakaway: p.bbBreakaway,
          barrelDrag: p.barrelDrag,
          barrelSeal: p.barrelSeal,
          ambientPressure: p.ambientPressure,
          airTemperature: p.airTemperature
        };
      }

      function simulate(raw, lightweight = false) {
        const p = { ...raw };
        const stroke = (p.strokeLength || 85) / 1000;
        const cylinderVolume = p.cylinderVolume * 1e-6;
        const cylinderArea = cylinderVolume / stroke;
        const barrelLength = p.barrelLength / 1000;
        const barrelArea = Math.PI * Math.pow(p.barrelDiameter / 2000, 2);
        const bbArea = Math.PI * Math.pow((p.bbDiameter ?? 5.95) / 2000, 2);
        const pistonMassKg = p.pistonMass / 1000;
        const bbMassKg = p.bbMass / 1000;
        const ambientPressure = (p.ambientPressure ?? 101.3) * 1000;
        const airTemperatureK = (p.airTemperature ?? 20) + 273.15;
        const airDensityRatio = ambientPressure / ATM * (293.15 / airTemperatureK);
        const deadVolume = (p.deadVolume ?? 0.55) * 1e-6;
        const initialVolume = cylinderVolume + deadVolume;
        const engagementX = Math.max(0, stroke - p.airbrakeLength / 1000);
        const compressionExponent = p.compressionExponent ?? 1.32;
        const dt = 0.00001;
        const maxTime = 0.045;
        const storeEvery = lightweight ? 999999 : 5;

        let t = 0;
        let pistonX = 0;
        let pistonV = 0;
        let bbX = 0;
        let bbV = 0;
        let bbA = 0;
        let pressure = ambientPressure;
        let chamberPressure = ambientPressure;
        let bbMoving = false;
        let bbExited = false;
        let pistonHit = false;
        let exitPressure = ambientPressure;
        let exitChamberPressure = ambientPressure;
        let exitTime = null;
        let exitVelocity = 0;
        let engageTime = null;
        let strongBrakeTime = null;
        let pistonHitTime = null;
        let pistonImpactVelocity = 0;
        let momentumAtEngage = 0;
        let bbEnergyAtStrongBrake = null;
        let peakPressure = ambientPressure;
        let peakPistonV = 0;
        let strongBrakeSeen = false;
        const frames = [];

        for (let step = 0; t <= maxTime; step++, t += dt) {
          const barrelVolumeBehind = barrelArea * Math.max(0.00035, Math.min(bbX, barrelLength));
          const chamberVolume = Math.max(deadVolume * 0.45, cylinderVolume * (1 - pistonX / stroke) + deadVolume + barrelVolumeBehind);

          if (!bbExited) {
            const idealPressure = ambientPressure * Math.pow(initialVolume / chamberVolume, compressionExponent);
            const sealEfficiency = clamp(p.sealEfficiency ?? 1, 0.6, 1);
            const nozzleEfficiency = clamp(p.nozzleFlow ?? 1, 0.3, 1);
            const chamberRetention = lerp(0.82, 1, sealEfficiency);
            chamberPressure = ambientPressure + Math.max(0, idealPressure - ambientPressure) * (p.flowEfficiency ?? 0.88) * chamberRetention;
            const targetBbPressure = ambientPressure + (chamberPressure - ambientPressure) * sealEfficiency * lerp(0.65, 1, nozzleEfficiency);
            const flowTau = lerp(0.00050, 0.00002, nozzleEfficiency) * Math.sqrt(airDensityRatio);
            pressure += (targetBbPressure - pressure) * (1 - Math.exp(-dt / flowTau));
          } else {
            const ventTau = (0.00072 + 0.00055 * clamp((exitPressure - ambientPressure) / (4 * ambientPressure), 0, 1)) * Math.sqrt(airDensityRatio);
            pressure = ambientPressure + (exitPressure - ambientPressure) * Math.exp(-(t - exitTime) / ventTau);
            chamberPressure = ambientPressure + (exitChamberPressure - ambientPressure) * Math.exp(-(t - exitTime) / (ventTau * 1.18));
          }

          pressure = clamp(pressure, ambientPressure, ambientPressure * 18);
          chamberPressure = clamp(chamberPressure, ambientPressure, ambientPressure * 18);
          peakPressure = Math.max(peakPressure, pressure);

          const preloadForce = 118 / stroke * ((p.springPreload ?? 0) / 1000);
          const springForce = p.driveScale * (p.springDrive || 1) * (p.springCondition ?? 1) * Math.max(0, 205 + preloadForce - 118 * (pistonX / stroke));
          const pressureForce = (chamberPressure - ambientPressure) * cylinderArea;
          const pistonFriction = pistonV > 0.02 ? (p.pistonFriction ?? 3.2) : 0;
          let brakeForce = 0;
          let brakeProgress = 0;

          if (p.airbrakeLength > 0 && p.airbrakeEffect > 0 && pistonX >= engagementX && !pistonHit) {
            if (engageTime === null) {
              engageTime = t;
              momentumAtEngage = pistonMassKg * pistonV;
            }
            brakeProgress = clamp((pistonX - engagementX) / Math.max(stroke - engagementX, 0.0001), 0, 1);
            const elapsed = t - engageTime;
            const trappedCompression = Math.pow(1 / Math.max(0.095, 1 - 0.90 * brakeProgress), 1.28) - 1;
            const leakTau = lerp(0.0035, 0.0105, p.airbrakeEffect);
            const retainedCushion = Math.exp(-elapsed / leakTau);
            const effectiveCushionArea = cylinderArea * 0.29;
            brakeForce = p.airbrakeEffect * (
              ambientPressure * trappedCompression * retainedCushion * effectiveCushionArea +
              Math.max(0, pistonV) * 0.62 * (0.25 + brakeProgress)
            );
            brakeForce = Math.min(brakeForce, 520);

            if (!strongBrakeSeen && (brakeForce > springForce * 0.34 || brakeProgress > 0.45)) {
              strongBrakeSeen = true;
              strongBrakeTime = t;
              bbEnergyAtStrongBrake = 0.5 * bbMassKg * bbV * bbV;
            }
          }

          const pistonA = pistonHit ? 0 : (springForce - pressureForce - pistonFriction - brakeForce) / pistonMassKg;
          if (!pistonHit) {
            pistonV = Math.max(0, pistonV + pistonA * dt);
            pistonX += pistonV * dt;
            peakPistonV = Math.max(peakPistonV, pistonV);
            if (pistonX >= stroke) {
              pistonX = stroke;
              pistonImpactVelocity = pistonV;
              pistonV = 0;
              pistonHit = true;
              pistonHitTime = t;
            }
          }

          if (!bbExited) {
            const pressureOnBb = (pressure - ambientPressure) * bbArea * (p.barrelSeal ?? 1);
            const breakaway = p.bbBreakaway ?? 1.35;
            const movingDrag = p.barrelDrag ?? 0.11;
            if (bbMoving || pressureOnBb > breakaway) {
              bbMoving = true;
              bbA = Math.max(0, (pressureOnBb - movingDrag) / bbMassKg);
              bbV += bbA * dt;
              bbX += bbV * dt;
            } else {
              bbA = 0;
            }

            if (bbX >= barrelLength) {
              bbX = barrelLength;
              bbExited = true;
              exitTime = t;
              exitVelocity = bbV;
              exitPressure = pressure;
              exitChamberPressure = chamberPressure;
            }
          } else {
            bbA = 0;
            bbX += bbV * dt;
          }

          if (step % storeEvery === 0) {
            frames.push({
              t,
              pistonX,
              pistonV,
              pistonA,
              bbX,
              bbV,
              bbA,
              pressure,
              brakeForce,
              brakeProgress,
              pistonHit,
              bbExited
            });
          }

          if (bbExited && pistonHit && t > Math.max(exitTime, pistonHitTime) + 0.006) break;
        }

        if (exitTime === null) {
          exitTime = maxTime;
          exitVelocity = bbV;
          exitPressure = pressure;
        }
        if (engageTime === null) engageTime = maxTime;
        if (strongBrakeTime === null) {
          strongBrakeTime = engageTime;
          bbEnergyAtStrongBrake = 0.5 * bbMassKg * bbV * bbV;
        }

        const exitEnergy = 0.5 * bbMassKg * exitVelocity * exitVelocity;
        const preBrakeShare = exitEnergy > 0 ? clamp(bbEnergyAtStrongBrake / exitEnergy, 0, 1.15) : 0;
        const impactEnergy = 0.5 * pistonMassKg * pistonImpactVelocity * pistonImpactVelocity;
        const impactIndex = clamp(100 * (1 - Math.exp(-impactEnergy / 0.33)), 0, 100);
        const residualGauge = Math.max(0, exitPressure - ambientPressure);
        const blastBasis = residualGauge / ambientPressure * (0.62 + 0.38 * clamp(cylinderVolume / (barrelArea * barrelLength), 0.6, 4) / 4);
        const blastIndex = clamp(100 * (1 - Math.exp(-blastBasis / 1.7)), 0, 100);

        return {
          params: p,
          frames,
          duration: frames.length ? frames[frames.length - 1].t : maxTime,
          stroke,
          barrelLength,
          barrelArea,
          barrelVolume: barrelArea * barrelLength,
          ratio: cylinderVolume / (barrelArea * barrelLength),
          ambientPressure,
          engagementX,
          engageTime,
          strongBrakeTime,
          exitTime,
          exitVelocity,
          exitEnergy,
          exitPressure,
          peakPressure,
          peakPistonV,
          pistonHitTime,
          pistonImpactVelocity,
          momentumAtEngage,
          preBrakeShare,
          impactIndex,
          blastIndex
        };
      }

      function setupMassPresets() {
        const host = $("massPresets");
        host.innerHTML = "";
        pistonMasses.forEach((mass) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "preset";
          button.textContent = `${mass} g`;
          button.dataset.mass = mass;
          button.setAttribute("aria-pressed", mass === pistonMass ? "true" : "false");
          button.addEventListener("click", () => {
            setPistonMass(mass);
            markSetupAsCustom();
            updateSimulation();
          });
          host.appendChild(button);
        });
      }

      function updateOutputs(p) {
        $("cylinderVolumeOut").textContent = `${p.cylinderVolume.toFixed(1)} cm³`;
        $("barrelLengthOut").textContent = `${p.barrelLength} mm`;
        $("barrelDiameterOut").textContent = `${p.barrelDiameter.toFixed(2)} mm`;
        $("strokeLengthOut").textContent = `${p.strokeLength} mm`;
        $("pistonMassOut").textContent = `${p.pistonMass.toFixed(1)} g`;
        $("bbMassOut").textContent = `${p.bbMass.toFixed(2)} g`;
        $("airbrakeLengthOut").textContent = `${p.airbrakeLength} mm`;
        $("airbrakeEffectOut").textContent = `${Math.round(p.airbrakeEffect * 100)}%`;
        const hasActiveAirbrake = p.airbrakeLength > 0 && p.airbrakeEffect > 0;
        const preEntryTravel = Math.max(0, p.strokeLength - p.airbrakeLength);
        const preEntryVolume = p.strokeLength > 0 ? p.cylinderVolume * preEntryTravel / p.strokeLength : 0;
        $("shortStrokeDynamic").textContent = hasActiveAirbrake
          ? tr("shortStroke.current", { travel: preEntryTravel.toFixed(0), volume: preEntryVolume.toFixed(1) })
          : tr("shortStroke.disabled");
        $("springPreloadOut").textContent = `${p.springPreload.toFixed(1)} mm`;
        $("springConditionOut").textContent = `${Math.round(p.springCondition * 100)}%`;
        $("pistonFrictionOut").textContent = `${p.pistonFriction.toFixed(1)} N`;
        $("deadVolumeOut").textContent = `${p.deadVolume.toFixed(2)} cm³`;
        $("sealEfficiencyOut").textContent = `${Math.round(p.sealEfficiency * 100)}%`;
        $("nozzleFlowOut").textContent = `${Math.round(p.nozzleFlow * 100)}%`;
        $("compressionExponentOut").textContent = p.compressionExponent.toFixed(2);
        $("bbDiameterOut").textContent = `${p.bbDiameter.toFixed(2)} mm`;
        $("bbBreakawayOut").textContent = `${p.bbBreakaway.toFixed(2)} N`;
        $("barrelDragOut").textContent = `${p.barrelDrag.toFixed(2)} N`;
        $("barrelSealOut").textContent = `${Math.round(p.barrelSeal * 100)}%`;
        $("ambientPressureOut").textContent = `${p.ambientPressure.toFixed(1)} kPa`;
        $("airTemperatureOut").textContent = `${p.airTemperature.toFixed(0)} °C`;
        $("driveScaleLabel").textContent = `${(p.driveScale * (p.springDrive || 1)).toFixed(3)}×`;
        $("flowEfficiencyLabel").textContent = `${(p.flowEfficiency * 100).toFixed(1)}%`;
      }

      function updateFactorInfluence() {
        const reference = advancedReferenceShot;
        if (!reference) return;
        const percentDelta = (value, baseline) => baseline ? (value - baseline) / Math.abs(baseline) * 100 : 0;
        const signed = (value, digits, suffix) => `${value > 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
        const setDelta = (id, value, digits = 1, suffix = "%") => {
          const element = $(id);
          element.textContent = signed(value, digits, suffix);
          element.classList.toggle("changed", Math.abs(value) >= Math.pow(10, -digits) / 2);
        };
        const activeCount = advancedChangeCount(shot.params);
        $("factorSummary").textContent = tr(activeCount ? "factor.active" : "factor.default", { count: activeCount });
        setDelta("factorVelocity", percentDelta(shot.exitVelocity, reference.exitVelocity));
        setDelta("factorPressure", percentDelta(shot.peakPressure - shot.ambientPressure, reference.peakPressure - reference.ambientPressure));
        setDelta("factorPistonVelocity", percentDelta(shot.peakPistonV, reference.peakPistonV));
        setDelta("factorExitTime", percentDelta(shot.exitTime, reference.exitTime));
        setDelta("factorImpact", shot.impactIndex - reference.impactIndex, 1, "");
        setDelta("factorBlast", shot.blastIndex - reference.blastIndex, 1, "");
      }

      function updateMetrics() {
        const s = shot;
        const hasAirbrake = s.params.airbrakeLength > 0 && s.params.airbrakeEffect > 0;
        const fps = s.exitVelocity * FPS_PER_MPS;
        const retention = noBrakeShot.exitEnergy > 0 ? clamp(s.exitEnergy / noBrakeShot.exitEnergy, 0, 1.2) : 0;
        const timingDelta = (s.engageTime - s.exitTime) * 1000;
        const strongDelta = (s.strongBrakeTime - s.exitTime) * 1000;

        $("barrelVolumeMetric").textContent = `${(s.barrelVolume * 1e6).toFixed(2)} cm³`;
        $("volumeRatioMetric").textContent = `${s.ratio.toFixed(2)} : 1`;
        $("velocityMetric").textContent = `${s.exitVelocity.toFixed(1)} m/s`;
        $("energyMetric").textContent = tr("model.energy", { fps: fps.toFixed(0), energy: s.exitEnergy.toFixed(2) });
        $("preBrakeMetric").textContent = hasAirbrake ? `${Math.round(clamp(s.preBrakeShare, 0, 1) * 100)}%` : "—";
        $("peakPressureMetric").textContent = `${((s.peakPressure - s.ambientPressure) / 1e5).toFixed(2)} bar(g)`;
        $("retentionMetric").textContent = `${Math.round(retention * 100)}%`;
        $("momentumMetric").textContent = hasAirbrake ? `${s.momentumAtEngage.toFixed(3)} kg·m/s` : "—";
        $("timingMetric").textContent = hasAirbrake
          ? `${timingDelta >= 0 ? "+" : ""}${timingDelta.toFixed(2)} ms`
          : tr("timing.disabled");
        $("timingSubMetric").textContent = hasAirbrake
          ? tr(timingDelta < 0 ? "timing.before" : "timing.after")
          : tr("timing.none");

        $("impactValue").textContent = `${Math.round(s.impactIndex)} / 100`;
        $("impactMeter").style.width = `${s.impactIndex}%`;
        const impactSeverity = s.impactIndex <= 20
          ? { state: "very-soft", key: "impact.verySoft" }
          : s.impactIndex <= 40
            ? { state: "soft", key: "impact.soft" }
            : s.impactIndex <= 60
              ? { state: "moderate", key: "impact.moderate" }
              : s.impactIndex <= 80
                ? { state: "hard", key: "impact.hard" }
                : { state: "very-hard", key: "impact.veryHard" };
        $("impactCard").dataset.severity = impactSeverity.state;
        $("impactMeaning").textContent = tr(impactSeverity.key);
        $("blastValue").textContent = `${Math.round(s.blastIndex)} / 100`;
        $("blastMeter").style.width = `${s.blastIndex}%`;

        const achieved = clamp(s.preBrakeShare, 0, 1);
        let verdict = hasAirbrake ? tr("goal.overlap") : tr("goal.none");
        if (hasAirbrake && strongDelta >= 0) verdict = tr("goal.after");
        else if (hasAirbrake && achieved >= 0.93) verdict = tr("goal.near", { percent: Math.round(achieved * 100) });
        else if (hasAirbrake && achieved >= 0.8) verdict = tr("goal.close", { percent: Math.round(achieved * 100) });
        $("goalVerdict").textContent = verdict;

        const entryRelation = timingDelta < 0
          ? tr("interpret.entryBefore", { time: Math.abs(timingDelta).toFixed(2) })
          : tr("interpret.entryAfter", { time: timingDelta.toFixed(2) });
        const brakeRelation = !hasAirbrake
          ? tr("interpret.noBrake")
          : strongDelta >= 0
            ? tr("interpret.brakeAfter", { entry: entryRelation, time: strongDelta.toFixed(2) })
            : tr("interpret.brakeBefore", { time: Math.abs(strongDelta).toFixed(2), percent: Math.round(achieved * 100) });
        const massRelation = s.params.pistonMass > 72
          ? tr("interpret.massHeavy")
          : s.params.pistonMass < 72
            ? tr("interpret.massLight")
            : tr("interpret.massReference");
        $("interpretationText").textContent = `${brakeRelation} ${massRelation} ${tr("interpret.compare")}`;

        const timelineEnd = Math.max(s.exitTime, hasAirbrake ? s.strongBrakeTime : 0, 0.001) * 1.12;
        const brakePct = clamp(s.strongBrakeTime / timelineEnd * 100, 1, 99);
        const exitPct = clamp(s.exitTime / timelineEnd * 100, 1, 99);
        $("brakeTimingMarker").style.left = `${brakePct}%`;
        $("brakeTimingMarker").style.display = hasAirbrake ? "block" : "none";
        $("exitTimingMarker").style.left = `${exitPct}%`;
        $("timingFill").style.width = `${hasAirbrake ? Math.min(brakePct, exitPct) : exitPct}%`;
        updateFactorInfluence();
      }

      function updateSimulation() {
        stopAnimation();
        currentFraction = 0;
        updatePlayButtonLabel();
        $("scrubber").value = 0;
        const p = currentParams();
        updateOutputs(p);
        shot = simulate(p);
        noBrakeShot = simulate({ ...p, airbrakeLength: 0, airbrakeEffect: 0 }, true);
        advancedReferenceShot = simulate(withAdvancedDefaults(p), true);
        updateMetrics();
        setFrame(0);
        drawAllCharts();
      }

      function findFrame(time) {
        const frames = shot.frames;
        let lo = 0;
        let hi = frames.length - 1;
        while (lo < hi) {
          const mid = Math.floor((lo + hi + 1) / 2);
          if (frames[mid].t <= time) lo = mid;
          else hi = mid - 1;
        }
        const a = frames[lo];
        const b = frames[Math.min(lo + 1, frames.length - 1)];
        const mix = b.t === a.t ? 0 : clamp((time - a.t) / (b.t - a.t), 0, 1);
        const frame = {};
        ["t", "pistonX", "pistonV", "pistonA", "bbX", "bbV", "bbA", "pressure", "brakeForce", "brakeProgress"].forEach((key) => frame[key] = lerp(a[key], b[key], mix));
        frame.bbExited = time >= shot.exitTime;
        frame.pistonHit = shot.pistonHitTime !== null && time >= shot.pistonHitTime;
        return frame;
      }

      function springPath(endX) {
        const startX = 56;
        const y = 152;
        const coils = 10;
        let path = `M ${startX} ${y}`;
        const usable = Math.max(20, endX - startX);
        for (let i = 1; i <= coils * 2; i++) {
          const x = startX + usable * (i / (coils * 2));
          const dy = i === coils * 2 ? 0 : (i % 2 ? -29 : 29);
          path += ` L ${x.toFixed(1)} ${(y + dy).toFixed(1)}`;
        }
        return path;
      }

      function phaseFor(frame) {
        const hasAirbrake = shot.params.airbrakeLength > 0 && shot.params.airbrakeEffect > 0;
        if (frame.t < 0.00065) return tr("phase.1");
        if (frame.bbV < 0.2) return tr("phase.2");
        if (!frame.bbExited) {
          if (!hasAirbrake || frame.t < shot.engageTime) return tr("phase.3");
          if (frame.t < shot.strongBrakeTime) return tr("phase.4");
          return tr("phase.5");
        }
        if (frame.t < shot.exitTime + 0.0022) return tr("phase.6");
        if (!frame.pistonHit) return tr(hasAirbrake ? "phase.7" : "phase.7.noBrake");
        return tr("phase.8");
      }

      function setFrame(fraction) {
        if (!shot || !shot.frames.length) return;
        currentFraction = clamp(fraction, 0, 1);
        const time = currentFraction * shot.duration;
        const frame = findFrame(time);
        const hasAirbrake = shot.params.airbrakeLength > 0 && shot.params.airbrakeEffect > 0;
        const pistonStart = 105;
        const pistonEnd = 436;
        const pistonScreen = lerp(pistonStart, pistonEnd, frame.pistonX / shot.stroke);
        const rodLength = shot.params.airbrakeLength / 1000 / shot.stroke * (pistonEnd - pistonStart);
        const bbInside = clamp(frame.bbX / shot.barrelLength, 0, 1);
        const bbAfter = Math.max(0, frame.bbX - shot.barrelLength);
        const bbScreen = frame.bbExited ? 1148 + clamp(bbAfter / 0.06, 0, 1) * 80 : lerp(581, 1148, bbInside);
        const airStart = pistonScreen + 58;
        const airWidth = Math.max(0, 496 - airStart);
        const gaugeBar = Math.max(0, (frame.pressure - shot.ambientPressure) / 1e5);
        const pressureNorm = clamp(gaugeBar / Math.max(0.5, (shot.peakPressure - shot.ambientPressure) / 1e5), 0, 1);
        const springEnd = pistonScreen + 1;

        $("pistonGroup").setAttribute("transform", `translate(${pistonScreen} 0)`);
        $("airbrakeRod").setAttribute("x2", 58 + rodLength);
        $("airbrakeRod").setAttribute("opacity", hasAirbrake ? 1 : 0);
        $("spring").setAttribute("d", springPath(springEnd));
        $("cylinderAir").setAttribute("x", airStart);
        $("cylinderAir").setAttribute("width", airWidth);
        $("cylinderAir").setAttribute("opacity", 0.18 + pressureNorm * 0.72);
        $("barrelAir").setAttribute("width", Math.max(0, Math.min(bbScreen, 1148) - 566));
        $("barrelAir").setAttribute("opacity", frame.bbExited ? Math.max(0, 1 - (time - shot.exitTime) / 0.003) : 0.22 + pressureNorm * 0.6);
        $("bbGroup").setAttribute("transform", `translate(${bbScreen} 0)`);
        $("bbGlow").setAttribute("opacity", 0.06 + clamp(frame.bbV / Math.max(shot.exitVelocity, 1), 0, 1) * 0.27);
        $("pistonVelocityArrow").setAttribute("transform", `translate(${pistonScreen} 0) scale(${clamp(frame.pistonV / Math.max(shot.peakPistonV, 1), .18, 1)} 1)`);
        $("pistonVelocityArrow").setAttribute("opacity", frame.pistonV > 0.25 ? 1 : 0);
        $("bbVelocityArrow").setAttribute("transform", `translate(${Math.min(bbScreen - 14, 1070)} 0) scale(${clamp(frame.bbV / Math.max(shot.exitVelocity, 1), .18, 1)} 1)`);
        $("bbVelocityArrow").setAttribute("opacity", frame.bbV > 0.5 && !frame.bbExited ? 1 : 0);
        $("cushionCloud").setAttribute("opacity", clamp(frame.brakeForce / 130, 0, .95));
        const muzzleOpacity = frame.bbExited ? clamp(1 - (time - shot.exitTime) / 0.0035, 0, 1) * clamp(shot.blastIndex / 60, .2, 1) : 0;
        $("muzzleCloud").setAttribute("opacity", muzzleOpacity);
        $("pressureGaugeFill").setAttribute("width", 230 * pressureNorm);
        $("pressureGaugeText").textContent = `${gaugeBar.toFixed(2)} bar(g)`;

        const engagementScreen = lerp(pistonStart, pistonEnd, shot.engagementX / shot.stroke);
        $("engagementGuide").setAttribute("x1", engagementScreen);
        $("engagementGuide").setAttribute("x2", engagementScreen);
        $("engagementLabel").setAttribute("x", engagementScreen);
        $("engagementGuide").setAttribute("opacity", hasAirbrake ? .7 : 0);
        $("engagementLabel").setAttribute("opacity", hasAirbrake ? 1 : 0);

        $("phaseText").textContent = phaseFor(frame);
        $("clock").textContent = `${(time * 1000).toFixed(2)} ms`;
        $("livePressure").textContent = `${gaugeBar.toFixed(2)} bar(g)`;
        $("livePistonVelocity").textContent = `${frame.pistonV.toFixed(1)} m/s`;
        $("liveMomentum").textContent = `${(shot.params.pistonMass / 1000 * frame.pistonV).toFixed(3)} kg·m/s`;
        $("liveBbVelocity").textContent = `${frame.bbV.toFixed(1)} m/s`;
        $("liveBbAcceleration").textContent = `${Math.round(frame.bbA).toLocaleString(language === "hr" ? "hr-HR" : "en-US")} m/s²`;
        $("scrubber").value = Math.round(currentFraction * 1000);
        drawAllCharts(time);
      }

      function stopAnimation() {
        playing = false;
        if (animationId !== null) cancelAnimationFrame(animationId);
        animationId = null;
        updatePlayButtonLabel();
      }

      function togglePlay() {
        if (playing) {
          stopAnimation();
          return;
        }
        if (currentFraction >= 0.999) currentFraction = 0;
        playing = true;
        updatePlayButtonLabel();
        const visualDuration = Math.max(4200, shot.duration * 150000);
        playStart = performance.now() - currentFraction * visualDuration;

        const tick = (now) => {
          if (!playing) return;
          const fraction = (now - playStart) / visualDuration;
          setFrame(fraction);
          if (fraction < 1) animationId = requestAnimationFrame(tick);
          else {
            playing = false;
            animationId = null;
            updatePlayButtonLabel();
          }
        };
        animationId = requestAnimationFrame(tick);
      }

      function chartColors() {
        const styles = getComputedStyle(document.documentElement);
        return {
          grid: styles.getPropertyValue("--line").trim(),
          text: styles.getPropertyValue("--muted").trim(),
          cyan: styles.getPropertyValue("--cyan").trim(),
          amber: styles.getPropertyValue("--amber").trim(),
          blue: styles.getPropertyValue("--blue").trim(),
          bg: "#0a1014"
        };
      }

      function drawChart(canvas, accessor, color, playTime) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        const w = rect.width;
        const h = rect.height;
        const pad = { l: 42, r: 10, t: 13, b: 25 };
        const plotW = w - pad.l - pad.r;
        const plotH = h - pad.t - pad.b;
        const values = shot.frames.map(accessor);
        const maxY = Math.max(1, ...values) * 1.12;
        const x = (t) => pad.l + t / shot.duration * plotW;
        const y = (v) => pad.t + plotH - v / maxY * plotH;
        const colors = chartColors();
        const hasAirbrake = shot.params.airbrakeLength > 0 && shot.params.airbrakeEffect > 0;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillStyle = colors.text;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        for (let i = 0; i <= 4; i++) {
          const yy = pad.t + plotH * i / 4;
          const val = maxY * (1 - i / 4);
          ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
          ctx.fillText(val < 10 ? val.toFixed(1) : Math.round(val), pad.l - 6, yy);
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let i = 0; i <= 4; i++) {
          const xx = pad.l + plotW * i / 4;
          ctx.fillText((shot.duration * 1000 * i / 4).toFixed(1), xx, h - pad.b + 7);
        }

        if (hasAirbrake) {
          const shadeStart = x(Math.min(shot.strongBrakeTime, shot.exitTime));
          const shadeEnd = x(Math.max(shot.strongBrakeTime, shot.exitTime));
          ctx.fillStyle = "rgba(255, 191, 105, .06)";
          ctx.fillRect(shadeStart, pad.t, shadeEnd - shadeStart, plotH);
        }

        const events = hasAirbrake
          ? [[shot.strongBrakeTime, colors.amber], [shot.exitTime, colors.cyan]]
          : [[shot.exitTime, colors.cyan]];
        events.forEach(([eventTime, eventColor]) => {
          ctx.save();
          ctx.strokeStyle = eventColor;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(x(eventTime), pad.t); ctx.lineTo(x(eventTime), pad.t + plotH); ctx.stroke();
          ctx.restore();
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        shot.frames.forEach((frame, i) => {
          const px = x(frame.t);
          const py = y(accessor(frame));
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();

        if (typeof playTime === "number") {
          ctx.strokeStyle = "rgba(237,243,244,.8)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x(playTime), pad.t); ctx.lineTo(x(playTime), pad.t + plotH); ctx.stroke();
        }
      }

      function drawAllCharts(playTime = currentFraction * (shot ? shot.duration : 0)) {
        if (!shot) return;
        const colors = chartColors();
        drawChart($("pressureChart"), (f) => Math.max(0, (f.pressure - shot.ambientPressure) / 1e5), colors.cyan, playTime);
        drawChart($("pistonChart"), (f) => f.pistonV, colors.amber, playTime);
        drawChart($("bbChart"), (f) => f.bbV, colors.blue, playTime);
      }

      function energyFrom(massG, fps) {
        const mps = fps / FPS_PER_MPS;
        return 0.5 * massG / 1000 * mps * mps;
      }

      function loadCalibration() {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
          if (saved && Array.isArray(saved.measurements)) {
            measurements = saved.measurements;
            if (saved.unknowns) modelUnknowns = saved.unknowns;
          }
        } catch (_) { /* local storage may be unavailable */ }

        if (!measurements.length) {
          measurements = [{
            id: Date.now(),
            mass: 0.46,
            fps: 330,
            energy: 2.33,
            setup: {
              cylinderVolume: 35.8,
              barrelLength: 430,
              barrelDiameter: 6.01,
              strokeLength: 85,
              pistonMass: 72,
              bbMass: 0.46,
              airbrakeLength: 20,
              airbrakeEffect: 0.72,
              springRating: "M150",
              springDrive: 1,
              springPreload: 0,
              springCondition: 1,
              pistonFriction: 3.2,
              deadVolume: 0.55,
              sealEfficiency: 1,
              nozzleFlow: 1,
              compressionExponent: 1.32,
              bbDiameter: 5.95,
              bbBreakaway: 1.35,
              barrelDrag: 0.11,
              barrelSeal: 1,
              ambientPressure: 101.3,
              airTemperature: 20
            }
          }];
        }
      }

      function saveCalibration() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ measurements, unknowns: modelUnknowns })); } catch (_) { /* no-op */ }
      }

      function renderMeasurements() {
        const body = $("measurementRows");
        body.innerHTML = "";
        measurements.forEach((m) => {
          const row = document.createElement("tr");
          const setupText = tr("measurement.setup", {
            length: m.setup.barrelLength,
            diameter: m.setup.barrelDiameter.toFixed(2),
            stroke: m.setup.strokeLength || 85,
            mass: m.setup.pistonMass,
            brakeLength: m.setup.airbrakeLength,
            effect: Math.round(m.setup.airbrakeEffect * 100)
          }) + (m.setup.springRating ? tr("measurement.spring", { spring: m.setup.springRating }) : "");
          row.innerHTML = `
            <td>${m.mass.toFixed(2)} g</td>
            <td>${m.fps.toFixed(0)} fps</td>
            <td>${m.energy.toFixed(2)} J</td>
            <td class="setup-cell">${setupText}</td>
            <td><button class="icon-button" type="button" aria-label="${tr("measurement.delete")}">${tr("measurement.remove")}</button></td>`;
          row.querySelector("button").addEventListener("click", () => {
            measurements = measurements.filter((item) => item.id !== m.id);
            saveCalibration();
            renderMeasurements();
          });
          body.appendChild(row);
        });
      }

      function fitUnknowns() {
        if (!measurements.length) {
          setFitStatus("fit.empty");
          return;
        }
        $("fitButton").disabled = true;
        setFitStatus("fit.running");

        requestAnimationFrame(() => {
          let best = { error: Infinity, driveScale: 1, flowEfficiency: 0.88 };
          const flowValues = measurements.length === 1 ? [modelUnknowns.flowEfficiency] : Array.from({ length: 11 }, (_, i) => 0.72 + i * 0.027);
          for (let drive = 0.16; drive <= 1.62; drive += 0.025) {
            for (const flow of flowValues) {
              let sum = 0;
              measurements.forEach((m) => {
                const predicted = simulate({ ...m.setup, bbMass: m.mass, driveScale: drive, flowEfficiency: flow }, true).exitVelocity * FPS_PER_MPS;
                const relativeError = (predicted - m.fps) / m.fps;
                sum += relativeError * relativeError;
              });
              const error = Math.sqrt(sum / measurements.length);
              if (error < best.error) best = { error, driveScale: drive, flowEfficiency: flow };
            }
          }

          const refinedFlowValues = measurements.length === 1
            ? [best.flowEfficiency]
            : Array.from({ length: 11 }, (_, i) => clamp(best.flowEfficiency - 0.035 + i * 0.007, 0.65, 1));
          const coarseBest = { ...best };
          for (let drive = Math.max(0.12, coarseBest.driveScale - 0.03); drive <= coarseBest.driveScale + 0.03; drive += 0.002) {
            for (const flow of refinedFlowValues) {
              let sum = 0;
              measurements.forEach((m) => {
                const predicted = simulate({ ...m.setup, bbMass: m.mass, driveScale: drive, flowEfficiency: flow }, true).exitVelocity * FPS_PER_MPS;
                const relativeError = (predicted - m.fps) / m.fps;
                sum += relativeError * relativeError;
              });
              const error = Math.sqrt(sum / measurements.length);
              if (error < best.error) best = { error, driveScale: drive, flowEfficiency: flow };
            }
          }

          modelUnknowns = { driveScale: best.driveScale, flowEfficiency: best.flowEfficiency };
          saveCalibration();
          $("fitButton").disabled = false;
          setFitStatus(measurements.length === 1 ? "fit.one" : "fit.many", {
            count: measurements.length,
            drive: best.driveScale.toFixed(3),
            flow: (best.flowEfficiency * 100).toFixed(1),
            error: (best.error * 100).toFixed(1)
          });
          updateSimulation();
        });
      }

      Object.values(inputs).forEach((input) => input.addEventListener("input", () => {
        markSetupAsCustom();
        updateSimulation();
      }));
      pistonMassRange.addEventListener("input", () => {
        setPistonMass(pistonMassRange.value);
        markSetupAsCustom();
        updateSimulation();
      });
      pistonMassNumber.addEventListener("change", () => {
        setPistonMass(pistonMassNumber.value);
        markSetupAsCustom();
        updateSimulation();
      });
      $("resetAdvancedButton").addEventListener("click", () => {
        resetAdvancedInputs();
        markSetupAsCustom();
        updateSimulation();
      });
      platformPreset.addEventListener("change", () => applyPlatformPreset(platformPreset.value));
      ssgSpring.addEventListener("change", () => {
        updateSpringControl();
        updateSimulation();
      });
      $("openPneumaticLab").addEventListener("click", (event) => {
        event.preventDefault();
        showPneumaticLab(true);
      });
      $("backToTools").addEventListener("click", () => {
        if (launchedFromMenu) {
          launchedFromMenu = false;
          history.back();
        } else {
          history.replaceState({ view: "tools" }, "", `${location.pathname}${location.search}`);
          showToolMenu();
        }
      });
      window.addEventListener("popstate", () => {
        if (location.hash === "#pneumatic-timing") showPneumaticLab(false);
        else {
          launchedFromMenu = false;
          showToolMenu();
        }
      });
      $("playButton").addEventListener("click", togglePlay);
      $("resetButton").addEventListener("click", () => { stopAnimation(); setFrame(0); });
      $("scrubber").addEventListener("input", (event) => { stopAnimation(); setFrame(+event.target.value / 1000); });
      window.addEventListener("resize", () => drawAllCharts());

      $("measurementMass").addEventListener("input", () => {
        const mass = +$("measurementMass").value;
        const fps = +$("measurementFps").value;
        if (mass > 0 && fps > 0) $("measurementEnergy").value = energyFrom(mass, fps).toFixed(2);
      });
      $("measurementFps").addEventListener("input", () => {
        const mass = +$("measurementMass").value;
        const fps = +$("measurementFps").value;
        if (mass > 0 && fps > 0) $("measurementEnergy").value = energyFrom(mass, fps).toFixed(2);
      });
      $("measurementEnergy").addEventListener("input", () => {
        const mass = +$("measurementMass").value;
        const energy = +$("measurementEnergy").value;
        if (mass > 0 && energy > 0) $("measurementFps").value = (Math.sqrt(2 * energy / (mass / 1000)) * FPS_PER_MPS).toFixed(0);
      });

      $("measurementForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const mass = +$("measurementMass").value;
        const fps = +$("measurementFps").value;
        if (!(mass > 0 && fps > 0)) return;
        measurements.push({ id: Date.now(), mass, fps, energy: energyFrom(mass, fps), setup: { ...snapshotSetup(), bbMass: mass } });
        saveCalibration();
        renderMeasurements();
        setFitStatus("fit.ready", { count: measurements.length, suffix: measurements.length === 1 ? "" : "s" });
      });

      $("fitButton").addEventListener("click", fitUnknowns);
      $("resetCalibrationButton").addEventListener("click", () => {
        measurements = [];
        modelUnknowns = { driveScale: 0.325, flowEfficiency: 0.88 };
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* no-op */ }
        loadCalibration();
        saveCalibration();
        renderMeasurements();
        setFitStatus("fit.reset");
        updateSimulation();
      });

      collectStaticTextNodes();
      document.querySelectorAll("[data-language]").forEach((button) => {
        button.addEventListener("click", () => applyLanguage(button.dataset.language));
      });
      loadCalibration();
      setupMassPresets();
      renderMeasurements();
      updateSimulation();
      applyLanguage(language);
      if (location.hash === "#pneumatic-timing") showPneumaticLab(false);
    })();
