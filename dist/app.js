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
        "MOVING MASS": "POKRETNA MASA",
        "Stalker Scorpion piston mass": "Masa Stalker Scorpion pistona",
        "Piston mass": "Masa pistona",
        "Piston mass presets": "Zadane mase pistona",
        "BB mass": "Masa BB-a",
        "AIRBRAKE": "ZRAČNA KOČNICA",
        "Airbrake": "Zračna kočnica",
        "Rod / engagement length": "Duljina šipke / ulaska",
        "Pneumatic cushion effect": "Učinak pneumatskog jastuka",
        "Unknown model assumptions": "Nepoznate pretpostavke modela",
        "Effective spring drive": "Efektivni pogon opruge",
        "Seal / flow efficiency": "Učinkovitost brtvljenja / protoka",
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
        "Estimated piston-impact intensity": "Procijenjeni intenzitet udara pistona",
        "0–100 INDEX": "INDEKS 0–100",
        "Heuristic index derived from modeled piston kinetic energy at the cylinder head. It is not sound pressure, dB, or a durability prediction.": "Heuristički indeks izveden iz modelirane kinetičke energije pistona na glavi cilindra. Nije zvučni tlak, dB ni predviđanje trajnosti.",
        "Estimated muzzle-blast intensity": "Procijenjeni intenzitet praska na ustima cijevi",
        "Heuristic index derived from modeled residual gauge pressure and gas volume at BB exit. It is not dB or a suppressor prediction.": "Heuristički indeks izveden iz modeliranog preostalog relativnog tlaka i volumena plina pri izlasku BB-a. Nije dB niti predviđanje učinka prigušivača.",
        "What this Scorpion configuration is doing": "Kako se ponaša ova Scorpion konfiguracija",
        "What this piston configuration is doing": "Kako se ponaša ova konfiguracija pistona",
        "TIMING INTERPRETATION": "TUMAČENJE VREMENSKOG ODNOSA",
        "Calibration mode — add real SSG10 chrono measurements": "Kalibracija — dodajte stvarna kronografska mjerenja SSG10",
        "Calibration mode — add real chrono measurements": "Kalibracija — dodajte stvarna kronografska mjerenja",
        "Each measurement stores a snapshot of the current barrel, cylinder, piston and airbrake setup. “Fit unknowns” adjusts only the effective spring-drive scale and seal/flow efficiency. One data point can anchor overall scale; varied BB masses and configurations are needed to constrain both unknowns. Saved data stays in this browser’s local storage.": "Svako mjerenje sprema trenutačnu konfiguraciju cijevi, cilindra, pistona i zračne kočnice. „Prilagodi nepoznanice” podešava samo efektivnu skalu pogona opruge i učinkovitost brtvljenja/protoka. Jedna točka može usidriti ukupnu skalu; za određivanje obiju nepoznanica potrebne su različite mase BB-a i konfiguracije. Podaci ostaju u lokalnoj pohrani ovog preglednika.",
        "Each measurement stores a snapshot of the current barrel, cylinder, piston stroke, piston mass and airbrake setup. “Fit unknowns” adjusts only the effective spring-drive scale and seal/flow efficiency. One data point can anchor overall scale; varied BB masses and configurations are needed to constrain both unknowns. Saved data stays in this browser’s local storage.": "Svako mjerenje sprema trenutačnu konfiguraciju cijevi, cilindra, hoda i mase pistona te zračne kočnice. „Prilagodi nepoznanice” podešava samo efektivnu skalu pogona opruge i učinkovitost brtvljenja/protoka. Jedna točka može usidriti ukupnu skalu; za određivanje obiju nepoznanica potrebne su različite mase BB-a i konfiguracije. Podaci ostaju u lokalnoj pohrani ovog preglednika.",
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
        "pressure, velocities, acceleration, momentum and event timing come from a simplified time-step model using spring force, gas compression and force balance. They depend on assumptions.": "tlak, brzine, ubrzanje, količina gibanja i vremena događaja dolaze iz pojednostavljenog vremenskog modela koji koristi silu opruge, kompresiju plina i ravnotežu sila. Ovise o pretpostavkama.",
        "Heuristics:": "Heuristike:",
        "impact and muzzle-blast are relative 0–100 comparison indices, never dB. Relative energy retention is only relative to this model’s no-airbrake baseline.": "udar i prasak na ustima cijevi relativni su usporedni indeksi 0–100, nikada dB. Relativno zadržavanje energije uspoređuje se samo s osnovnim modelom bez zračne kočnice.",
        "Unknown or fitted:": "Nepoznato ili prilagođeno:",
        "actual spring curve, dynamic seal leakage, hop/bucking resistance, airbrake clearances, friction, temperature and barrel losses are not known from geometry alone. Chrono fitting cannot uniquely identify all of them.": "stvarna krivulja opruge, dinamičko propuštanje brtvi, otpor hop-up gumice, zazori zračne kočnice, trenje, temperatura i gubici u cijevi ne mogu se odrediti samo iz geometrije. Prilagodba kronografskim podacima ne može ih sve jednoznačno identificirati."
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
          "measurement.remove": "Remove", "measurement.delete": "Delete measurement",
          "model.energy": "{fps} fps · ≈{energy} J model estimate",
          "preset.ssg10": "Published 430 × 6.01 mm barrel; cylinder, stroke, piston and airbrake values are the current SSG10 model defaults.",
          "preset.ssg10-short": "Derived comparison: the same modeled cylinder bore with 20 mm less stroke reduces swept volume from 35.8 to 27.4 cm³. This is not a universal short-stroke recipe.",
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
          "measurement.remove": "Ukloni", "measurement.delete": "Izbriši mjerenje",
          "model.energy": "{fps} fps · ≈{energy} J, procjena modela",
          "preset.ssg10": "Objavljeni podaci za cijev: 430 × 6,01 mm; vrijednosti cilindra, hoda, pistona i zračne kočnice trenutačne su zadane vrijednosti SSG10 modela.",
          "preset.ssg10-short": "Izvedena usporedba: isti modelirani promjer cilindra s 20 mm kraćim hodom smanjuje radni volumen s 35,8 na 27,4 cm³. Ovo nije univerzalna uputa za skraćivanje hoda.",
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
          noteKey: "preset.ssg10"
        },
        "ssg10-short": {
          cylinderVolume: 27.4, strokeLength: 65, barrelLength: 430, barrelDiameter: 6.01,
          pistonMass: 72, bbMass: 0.46, airbrakeLength: 20, airbrakeEffect: 72,
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
        airbrakeEffect: $("airbrakeEffect")
      };
      const platformPreset = $("platformPreset");
      const toolHub = $("toolHub");
      const labApp = $("labApp");

      let pistonMass = 72;
      let modelUnknowns = { driveScale: 0.325, flowEfficiency: 0.88 };
      let shot = null;
      let noBrakeShot = null;
      let animationId = null;
      let playing = false;
      let playStart = 0;
      let currentFraction = 0;
      let measurements = [];
      let applyingPreset = false;
      let launchedFromMenu = false;

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

      function syncMassPresetButtons() {
        document.querySelectorAll("#massPresets .preset").forEach((button) => {
          button.setAttribute("aria-pressed", +button.dataset.mass === pistonMass ? "true" : "false");
        });
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
          updatePresetNote();
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
        pistonMass = preset.pistonMass;
        platformPreset.value = id;
        syncMassPresetButtons();
        applyingPreset = false;
        updatePresetNote();
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
          openTool: "Otvori laboratorij pneumatike opružnih snajpera"
        } : {
          switcher: "Language", controls: "Simulation controls", presets: "Piston mass presets",
          timing: "Timing objective", stage: "Animated firing cycle",
          scrubber: "Scrub through firing cycle", live: "Live firing values",
          graphs: "Live firing graphs", insight: "Current piston-configuration interpretation",
          energy: "Energy in joules", hubNav: "Tool menu header",
          openTool: "Open the Spring Sniper Pneumatic Timing Lab"
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
        $("measurementEnergy").setAttribute("aria-label", labels.energy);
        $("brakeTimingMarker").dataset.label = language === "hr" ? "snažno kočenje" : "strong brake";
        $("exitTimingMarker").dataset.label = language === "hr" ? "izlazak BB-a" : "BB exit";

        updatePlayButtonLabel();
        setFitStatus(fitStatusState.key, fitStatusState.vars);
        updatePresetNote();
        if (shot) {
          updateOutputs(currentParams());
          updateMetrics();
          setFrame(currentFraction);
          renderMeasurements();
        }
      }

      function currentParams() {
        return {
          cylinderVolume: +inputs.cylinderVolume.value,
          barrelLength: +inputs.barrelLength.value,
          barrelDiameter: +inputs.barrelDiameter.value,
          strokeLength: +inputs.strokeLength.value,
          pistonMass,
          bbMass: +inputs.bbMass.value,
          airbrakeLength: +inputs.airbrakeLength.value,
          airbrakeEffect: +inputs.airbrakeEffect.value / 100,
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
          airbrakeEffect: p.airbrakeEffect
        };
      }

      function simulate(raw, lightweight = false) {
        const p = { ...raw };
        const stroke = (p.strokeLength || 85) / 1000;
        const cylinderVolume = p.cylinderVolume * 1e-6;
        const cylinderArea = cylinderVolume / stroke;
        const barrelLength = p.barrelLength / 1000;
        const barrelArea = Math.PI * Math.pow(p.barrelDiameter / 2000, 2);
        const pistonMassKg = p.pistonMass / 1000;
        const bbMassKg = p.bbMass / 1000;
        const deadVolume = 0.55e-6;
        const initialVolume = cylinderVolume + deadVolume;
        const engagementX = Math.max(0, stroke - p.airbrakeLength / 1000);
        const compressionExponent = 1.32;
        const dt = 0.00001;
        const maxTime = 0.045;
        const storeEvery = lightweight ? 999999 : 5;

        let t = 0;
        let pistonX = 0;
        let pistonV = 0;
        let bbX = 0;
        let bbV = 0;
        let bbA = 0;
        let pressure = ATM;
        let bbMoving = false;
        let bbExited = false;
        let pistonHit = false;
        let exitPressure = ATM;
        let exitTime = null;
        let exitVelocity = 0;
        let engageTime = null;
        let strongBrakeTime = null;
        let pistonHitTime = null;
        let pistonImpactVelocity = 0;
        let momentumAtEngage = 0;
        let bbEnergyAtStrongBrake = null;
        let peakPressure = ATM;
        let peakPistonV = 0;
        let strongBrakeSeen = false;
        const frames = [];

        for (let step = 0; t <= maxTime; step++, t += dt) {
          const barrelVolumeBehind = barrelArea * Math.max(0.00035, Math.min(bbX, barrelLength));
          const chamberVolume = Math.max(deadVolume * 0.45, cylinderVolume * (1 - pistonX / stroke) + deadVolume + barrelVolumeBehind);

          if (!bbExited) {
            const idealPressure = ATM * Math.pow(initialVolume / chamberVolume, compressionExponent);
            pressure = ATM + Math.max(0, idealPressure - ATM) * p.flowEfficiency;
          } else {
            const ventTau = 0.00072 + 0.00055 * clamp((exitPressure - ATM) / (4 * ATM), 0, 1);
            pressure = ATM + (exitPressure - ATM) * Math.exp(-(t - exitTime) / ventTau);
          }

          pressure = clamp(pressure, ATM, ATM * 18);
          peakPressure = Math.max(peakPressure, pressure);

          const springForce = p.driveScale * Math.max(0, 205 - 118 * (pistonX / stroke));
          const pressureForce = (pressure - ATM) * cylinderArea;
          const pistonFriction = pistonV > 0.02 ? 3.2 : 0;
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
              ATM * trappedCompression * retainedCushion * effectiveCushionArea +
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
            const pressureOnBb = (pressure - ATM) * barrelArea;
            const breakaway = bbMoving ? 0.11 : 1.35;
            if (bbMoving || pressureOnBb > breakaway) {
              bbMoving = true;
              bbA = Math.max(0, (pressureOnBb - (bbMoving ? 0.11 : breakaway)) / bbMassKg);
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
        const residualGauge = Math.max(0, exitPressure - ATM);
        const blastBasis = residualGauge / ATM * (0.62 + 0.38 * clamp(cylinderVolume / (barrelArea * barrelLength), 0.6, 4) / 4);
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
            pistonMass = mass;
            syncMassPresetButtons();
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
        $("pistonMassOut").textContent = `${p.pistonMass} g`;
        $("bbMassOut").textContent = `${p.bbMass.toFixed(2)} g`;
        $("airbrakeLengthOut").textContent = `${p.airbrakeLength} mm`;
        $("airbrakeEffectOut").textContent = `${Math.round(p.airbrakeEffect * 100)}%`;
        $("driveScaleLabel").textContent = `${p.driveScale.toFixed(3)}×`;
        $("flowEfficiencyLabel").textContent = `${(p.flowEfficiency * 100).toFixed(1)}%`;
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
        $("peakPressureMetric").textContent = `${((s.peakPressure - ATM) / 1e5).toFixed(2)} bar(g)`;
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
        const gaugeBar = Math.max(0, (frame.pressure - ATM) / 1e5);
        const pressureNorm = clamp(gaugeBar / Math.max(0.5, (shot.peakPressure - ATM) / 1e5), 0, 1);
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
        drawChart($("pressureChart"), (f) => Math.max(0, (f.pressure - ATM) / 1e5), colors.cyan, playTime);
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
              airbrakeEffect: 0.72
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
          });
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
      platformPreset.addEventListener("change", () => applyPlatformPreset(platformPreset.value));
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
