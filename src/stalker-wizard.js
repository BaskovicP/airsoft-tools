/* Pure configuration, chrono-step analysis and troubleshooting data for Stalker Scorpion pistons. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StalkerWizard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const bi = (en, hr) => Object.freeze({ en, hr });
  const diagnosticCheck = (titleEn, titleHr, whyEn, whyHr, howEn, howHr, passEn, passHr, failEn, failHr, measurement = null, source = null) => Object.freeze({
    title: bi(titleEn, titleHr), why: bi(whyEn, whyHr), how: bi(howEn, howHr), pass: bi(passEn, passHr), fail: bi(failEn, failHr), measurement: measurement ? bi(measurement[0], measurement[1]) : null, source
  });

  const PROFILES = Object.freeze({
    tac41_stock: Object.freeze({ platform: "tac41", family: "large", guideRing: "tac41", rifle: "Silverback TAC-41", head: bi("Stock AEG cylinder head", "Standardna AEG glava cilindra"), diameter: 3.8, pnpMass: 100, barrelRange: [310, 510], source: "https://www.skirmshop.nl/products/scorpion-piston-tac41-ultimate-edition" }),
    tac41_gbb: Object.freeze({ platform: "tac41", family: "large", guideRing: "tac41", rifle: "Silverback TAC-41", head: bi("Kraken TDC / Silverback GBB cylinder head", "Kraken TDC / Silverback GBB glava cilindra"), diameter: 4, pnpMass: 100, barrelRange: [310, 510], source: "https://www.skirmshop.co.uk/scorpion-tac-41-gbb-air-brake-set.html" }),
    srs: Object.freeze({ platform: "srs", family: "large", guideRing: "srs", rifle: "Silverback SRS", head: bi("Stock or Stalker SRS cylinder head", "Standardna ili Stalker SRS glava cilindra"), diameter: 3.8, pnpMass: 100, barrelRange: [310, 510], source: "https://www.skirmshop.nl/products/scorpion-piston-srs-ultimate-edition-1" }),
    vsr_tm: Object.freeze({ platform: "vsr", family: "small", guideRing: "vsr10", rifle: "Tokyo Marui VSR-10 / clone", head: bi("Tokyo Marui specification head", "Glava prema Tokyo Marui specifikaciji"), diameter: 3.8, pnpMass: 71, barrelRange: [310, 470], source: "https://www.skirmshop.nl/en-nl/products/scorpion-piston-vsr-10" }),
    vsr_aa: Object.freeze({ platform: "vsr", family: "small", guideRing: "vsr10", rifle: "VSR-10 / Action Army", head: bi("Action Army cylinder head", "Action Army glava cilindra"), diameter: 3.8, pnpMass: 71, barrelRange: [310, 470], source: "https://www.skirmshop.nl/en-nl/products/scorpion-piston-vsr-10" }),
    vsr_laylax: Object.freeze({ platform: "vsr", family: "small", guideRing: "vsr10", rifle: "VSR-10 / Laylax", head: bi("Laylax cylinder head", "Laylax glava cilindra"), diameter: 3.8, pnpMass: 71, barrelRange: [310, 470], source: "https://www.skirmshop.nl/en-nl/products/scorpion-piston-vsr-10" }),
    ssg10: Object.freeze({ platform: "ssg10", family: "small", guideRing: "ssg10", rifle: "Novritsch SSG10", head: bi("Stock SSG10 cylinder head", "Standardna SSG10 glava cilindra"), diameter: 4.4, pnpMass: 71, barrelRange: [310, 470], source: "https://www.skirmshop.nl/products/scorpion-piston-2nd-gen-ssg10" }),
    ssg10_kraken: Object.freeze({ platform: "ssg10", family: "small", guideRing: "ssg10", rifle: "Novritsch SSG10 / VSR-10", head: bi("Stalker Kraken chamber + Double Mute cylinder head", "Stalker Kraken komora + Double Mute glava cilindra"), diameter: 4, pnpMass: 71, barrelRange: [310, 470], source: "https://www.skirmshop.nl/products/kraken-ssg-10vsr-10-tdc-hopup-chamber/" }),
    other: Object.freeze({ platform: "other", family: "small", guideRing: "unknown", rifle: "Other / unknown", head: bi("Measure the nozzle's internal bore", "Izmjerite unutarnji provrt mlaznice"), diameter: null, pnpMass: null, barrelRange: null, source: "https://www.skirmshop.nl/en-nl/products/scorpion-piston-vsr-10" })
  });

  // Stalker lists the SSG10 and VSR10 front/rear POM guide-ring sets as
  // separate products. Exact ring OD and separate ring mass are not published,
  // so the UI deliberately keeps those fields unknown instead of estimating.
  const GUIDE_RINGS = Object.freeze({
    ssg10: Object.freeze({ key: "ssg10", visualClass: "ssg10", label: bi("SSG10-specific POM guide rings", "POM guide ringovi za SSG10"), comparison: bi("Dedicated SSG10 front/rear set — not the VSR10/TM-spec set.", "Zaseban prednji/stražnji SSG10 set — nije VSR10/TM-spec set."), outerDiameter: null, mass: null, source: "https://www.skirmshop.nl/products/scorpion-piston-ssg10-guide-ring-set" }),
    vsr10: Object.freeze({ key: "vsr10", visualClass: "vsr10", label: bi("VSR10/TM-spec POM guide rings", "POM guide ringovi za VSR10/TM specifikaciju"), comparison: bi("Dedicated VSR10/TM-spec front/rear set — not the SSG10 set.", "Zaseban prednji/stražnji VSR10/TM-spec set — nije SSG10 set."), outerDiameter: null, mass: null, source: "https://www.skirmshop.nl/en-nl/products/scorpion-piston-vsr-10-guide-ring-set" }),
    tac41: Object.freeze({ key: "tac41", visualClass: "platform", label: bi("TAC-41 Scorpion POM guide rings", "TAC-41 Scorpion POM guide ringovi"), comparison: bi("Use the guide rings supplied for the TAC-41 piston version.", "Koristite guide ringove isporučene za TAC-41 verziju klipa."), outerDiameter: null, mass: null, source: "https://www.skirmshop.nl/products/scorpion-piston-tac41-ultimate-edition" }),
    srs: Object.freeze({ key: "srs", visualClass: "platform", label: bi("SRS Scorpion POM guide rings", "SRS Scorpion POM guide ringovi"), comparison: bi("Use the guide rings supplied for the SRS piston version.", "Koristite guide ringove isporučene za SRS verziju klipa."), outerDiameter: null, mass: null, source: "https://www.skirmshop.nl/products/scorpion-piston-srs-ultimate-edition-1" }),
    unknown: Object.freeze({ key: "unknown", visualClass: "unknown", label: bi("Unverified POM guide rings", "Nepotvrđeni POM guide ringovi"), comparison: bi("Identify the exact piston version before selecting rings.", "Prije odabira ringova utvrdite točnu verziju klipa."), outerDiameter: null, mass: null, source: null })
  });

  function guideRingSpec(profileId) {
    const profile = PROFILES[profileId] || PROFILES.other;
    return GUIDE_RINGS[profile.guideRing] || GUIDE_RINGS.unknown;
  }

  const FAMILY = Object.freeze({
    small: Object.freeze({ defaultMass: 71, aluminumHead: Object.freeze([43, 50, 58, 65, 72, 79]), steelHead: Object.freeze([54, 61, 68, 76, 82, 90]), completeMasses: Object.freeze([43, 50, 54, 58, 61, 65, 68, 72, 76, 79, 82, 90]) }),
    large: Object.freeze({ defaultMass: 100, aluminumHead: Object.freeze([62, 76, 89, 102, 115, 128]), steelHead: Object.freeze([80, 93, 107, 119, 133, 145]), completeMasses: Object.freeze([62, 76, 80, 89, 93, 102, 107, 115, 119, 128, 133, 145]) })
  });

  function springGuideAdvice(profileId) {
    const profile = PROFILES[profileId] || PROFILES.other;
    if (["vsr", "ssg10"].includes(profile.platform)) return Object.freeze({
      title: bi("Use the intended Stalker VSR/SSG10 guide and measure spring clearance; its shaft is nominally 9 mm.", "Upotrijebite predviđenu Stalker VSR/SSG10 vodilicu i izmjerite zazor opruge; osovina joj je nominalno 9 mm."),
      why: bi("The published guide dimensions are a 9.00 mm shaft, 90 mm total length and 21.75 mm base. ‘9 mm’ is a compatibility class, not a guaranteed running clearance: actual spring IDs vary by brand, coating, ovality and ground ends.", "Objavljene dimenzije vodilice su osovina 9,00 mm, ukupna duljina 90 mm i baza 21,75 mm. ‘9 mm’ je klasa kompatibilnosti, a ne zajamčeni radni zazor: stvarni unutarnji promjeri opruga razlikuju se prema marki, premazu, ovalnosti i brušenim krajevima."),
      source: "https://skirmshopusa.com/products/vsr-10-ssg10-9mm-stainless-steel-spring-guide"
    });
    if (profile.platform === "tac41") return Object.freeze({
      title: bi("Use the TAC-41 spring guide supplied with or specified for the Scorpion kit, then measure the actual spring clearance.", "Upotrijebite TAC-41 vodilicu opruge isporučenu ili propisanu za Scorpion kit, zatim izmjerite stvarni zazor opruge."),
      why: bi("The TAC-41 Scorpion product is supplied with its own Stalker stainless guide. The listing does not publish a shaft diameter, so do not substitute the VSR/SSG10 ‘9 mm’ number or assume that the stock guide has the same geometry.", "TAC-41 Scorpion proizvod isporučuje se s vlastitom Stalker nehrđajućom vodilicom. Oglas ne objavljuje promjer osovine, stoga ne preuzimajte VSR/SSG10 broj ‘9 mm’ niti pretpostavljajte da standardna vodilica ima istu geometriju."),
      source: "https://skirmshopusa.com/products/scorpion-piston-tac41-spring-guide"
    });
    if (profile.platform === "srs") return Object.freeze({
      title: bi("Use the Stalker guide made for the SRS Scorpion piston, then measure the actual spring clearance.", "Upotrijebite Stalker vodilicu namijenjenu SRS Scorpion klipu, zatim izmjerite stvarni zazor opruge."),
      why: bi("Stalker lists a dedicated SRS A1/A2 stainless guide and does not publish its shaft diameter. Do not treat the VSR/SSG10 ‘9 mm’ dimension as an SRS specification.", "Stalker navodi zasebnu nehrđajuću vodilicu za SRS A1/A2 i ne objavljuje promjer njezine osovine. VSR/SSG10 dimenziju ‘9 mm’ nemojte smatrati SRS specifikacijom."),
      source: "https://skirmshopusa.com/products/spring-guide-for-stalker-srs-piston"
    });
    return Object.freeze({
      title: bi("Identify the exact piston and spring guide before measuring clearance.", "Prije mjerenja zazora utvrdite točan klip i vodilicu opruge."),
      why: bi("No platform-specific guide is selected. Do not infer guide diameter from the rifle name or from a spring sold as ‘9 mm’; measure the installed pair and confirm compatibility with its maker.", "Nije odabrana vodilica za konkretnu platformu. Ne zaključujte promjer vodilice prema nazivu replike ili opruzi koja se prodaje kao ‘9 mm’; izmjerite ugrađeni par i potvrdite kompatibilnost kod proizvođača."),
      source: null
    });
  }

  function bodyMass(family, headMaterial, steelCount, extras = []) {
    const spec = FAMILY[family];
    if (!spec) throw new Error("family");
    const steel = Math.max(0, Math.min(5, Math.round(Number(steelCount) || 0)));
    // Use the vendor's published assembled totals. They are rounded and do not
    // always equal the sum of the nominal 3 g / 11 g module descriptions.
    const base = (headMaterial === "steel" ? spec.steelHead : spec.aluminumHead)[steel];
    return base + extras.reduce((sum, material) => sum + (material === "steel" ? 11 : 3), 0);
  }

  function combinationForMass(family, targetMass) {
    let best = null;
    for (const headMaterial of ["aluminum", "steel"]) {
      for (let steelCount = 0; steelCount <= 5; steelCount++) {
        const mass = bodyMass(family, headMaterial, steelCount);
        const candidate = { mass, headMaterial, steelCount, aluminumCount: 5 - steelCount, difference: Math.abs(mass - targetMass) };
        if (!best || candidate.difference < best.difference || candidate.difference === best.difference && candidate.mass < best.mass) best = candidate;
      }
    }
    return best;
  }

  function weightPlan(profileId) {
    const profile = PROFILES[profileId] || PROFILES.other;
    const masses = FAMILY[profile.family].completeMasses;
    const nearest = target => masses.reduce((best, mass) => Math.abs(mass - target) < Math.abs(best - target) ? mass : best, masses[0]);
    const references = profile.family === "large"
      ? Object.freeze([
        Object.freeze({ mass: 82, label: bi("current workshop-guide reference", "referenca aktualnog radioničkog vodiča"), source: profile.platform === "srs" ? "https://www.skirmshop.es/pages/guia-srs" : "https://www.skirmshop.es/pages/guia-tac-41" }),
        Object.freeze({ mass: profile.pnpMass, label: bi("published Plug & Play assembly", "objavljeni Plug & Play sklop"), source: profile.source })
      ])
      : profile.pnpMass
        ? Object.freeze([Object.freeze({ mass: profile.pnpMass, label: bi("published Plug & Play assembly", "objavljeni Plug & Play sklop"), source: profile.source })])
        : Object.freeze([]);
    let candidateMasses;
    if (profile.family === "large") candidateMasses = [nearest(82), nearest(90), nearest(profile.pnpMass || 100)];
    else {
      const centre = masses.indexOf(nearest(profile.pnpMass || FAMILY.small.defaultMass));
      candidateMasses = [masses[Math.max(0, centre - 1)], masses[centre], masses[Math.min(masses.length - 1, centre + 1)]];
    }
    candidateMasses = [...new Set(candidateMasses)].sort((a, b) => a - b);
    return Object.freeze({ profile, references, candidateMasses: Object.freeze(candidateMasses) });
  }

  function analyzeWeightTrials(trials = [], targetJ, safetyMarginJ = .05, goal = "balanced") {
    const limit = Number(targetJ), margin = Math.max(0, Number(safetyMarginJ) || 0);
    const ceiling = Number.isFinite(limit) ? Math.max(0, limit - margin) : Infinity;
    const soundPenalty = { clean: 0, unknown: 1, bounce: 4, metallic: 5 };
    const valid = trials.map((trial, index) => {
      const mass = Number(trial.mass), shotStats = stats(trial.readings);
      if (!Number.isFinite(mass) || mass <= 0 || !shotStats) return null;
      const sound = Object.hasOwn(soundPenalty, trial.sound) ? trial.sound : "unknown";
      const overLimit = shotStats.mean > ceiling;
      const gap = Number.isFinite(ceiling) ? Math.abs(ceiling - shotStats.mean) : 0;
      const weights = goal === "quiet" ? { gap: 2, consistency: 24, sound: 3.2 }
        : goal === "output" ? { gap: 7, consistency: 18, sound: .8 }
          : { gap: 4, consistency: 22, sound: 1.7 };
      const score = gap * weights.gap + shotStats.sd * weights.consistency + soundPenalty[sound] * weights.sound;
      return { index, mass, sound, stats: shotStats, overLimit, gap, score };
    }).filter(Boolean).sort((a, b) => a.mass - b.mass);
    let reversal = null;
    for (let i = 1; i < valid.length; i++) {
      const previous = valid[i - 1], current = valid[i];
      const threshold = Math.max(.02, previous.stats.sd, current.stats.sd);
      if (previous.stats.mean - current.stats.mean >= threshold) {
        reversal = { previous, current, amount: previous.stats.mean - current.stats.mean, threshold };
        break;
      }
    }
    const safe = valid.filter(row => !row.overLimit);
    const recommendation = valid.length >= 2 && safe.length ? safe.reduce((best, row) => !best || row.score < best.score ? row : best, null) : null;
    return {
      valid, safe, recommendation, reversal, ceiling, margin,
      status: !valid.length ? "empty" : valid.length < 2 ? "baseline" : !safe.length ? "over-limit" : "ready"
    };
  }

  function nozzleFit(brakeDiameter, measuredBore) {
    const raw = typeof measuredBore === "string" ? measuredBore.trim() : measuredBore;
    const bore = raw === "" || raw === null || raw === undefined ? NaN : Number(raw);
    const brake = Number(brakeDiameter);
    if (!Number.isFinite(bore) || bore <= 0) return { status: "unmeasured", bore: null, brake: Number.isFinite(brake) ? brake : null, clearance: null, radialClearance: null };
    if (!Number.isFinite(brake) || brake <= 0) return { status: "measured-only", bore, brake: null, clearance: null, radialClearance: null };
    const clearance = bore - brake;
    return { status: clearance > 0 ? "positive" : "blocked", bore, brake, clearance, radialClearance: clearance / 2 };
  }

  function recommend(options = {}) {
    const profile = PROFILES[options.profile] || PROFILES.tac41_stock;
    const targetJ = Number(options.targetJ);
    const barrelLength = Number(options.barrelLength);
    const edition = options.edition === "pnp" ? "pnp" : "ultimate";
    const goal = ["balanced", "quiet", "output", "shortstroke"].includes(options.goal) ? options.goal : "balanced";
    const targetMass = profile.pnpMass || FAMILY[profile.family].defaultMass;
    const combination = combinationForMass(profile.family, targetMass);
    const airbrake = targetJ <= 2
      ? { length: "long", start: "low" }
      : targetJ >= 2.8
        ? { length: "short", start: "fully-in" }
        : { length: "short", start: "fully-out" };
    const cup = goal === "quiet" && profile.family === "large" ? "silent" : "high-joule";
    const warnings = [];
    if (profile.diameter === null) warnings.push("measure-nozzle");
    if (profile.barrelRange && Number.isFinite(barrelLength) && (barrelLength < profile.barrelRange[0] || barrelLength > profile.barrelRange[1])) warnings.push("outside-pnp-range");
    if (Number.isFinite(targetJ) && (targetJ < 2 || targetJ > 3)) warnings.push("outside-pnp-energy");
    if (goal === "shortstroke") warnings.push("shortstroke-volume");
    if (edition === "pnp" && warnings.some(item => item.startsWith("outside-pnp"))) warnings.push("ultimate-preferred");
    return { profile, edition, goal, targetMass, combination, airbrake, cup, warnings };
  }

  function parseReadings(value) {
    if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
    return String(value || "").split(/[\s,;]+/).filter(token => token.trim() !== "").map(Number).filter(Number.isFinite);
  }

  function stats(values) {
    const shots = parseReadings(values);
    if (!shots.length) return null;
    const mean = shots.reduce((sum, value) => sum + value, 0) / shots.length;
    const variance = shots.length > 1 ? shots.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (shots.length - 1) : 0;
    return { count: shots.length, mean, sd: Math.sqrt(variance), spread: Math.max(...shots) - Math.min(...shots), values: shots };
  }

  function analyzeChronoSteps(steps = []) {
    const valid = steps.map((step, index) => ({ index, position: Number(step.position), stats: stats(step.readings) })).filter(step => step.stats && Number.isFinite(step.position));
    let drop = null;
    for (let i = 1; i < valid.length; i++) {
      const previous = valid[i - 1], current = valid[i];
      const threshold = Math.max(0.02, previous.stats.sd, current.stats.sd);
      if (previous.stats.mean - current.stats.mean >= threshold) {
        drop = { index: current.index, previousIndex: previous.index, amount: previous.stats.mean - current.stats.mean, threshold };
        break;
      }
    }
    const best = drop ? valid.find(step => step.index === drop.previousIndex) : valid.reduce((winner, step) => !winner || step.stats.mean > winner.stats.mean ? step : winner, null);
    return { valid, drop, best, status: !valid.length ? "empty" : drop ? "drop" : valid.length < 2 ? "baseline" : "continue" };
  }

  const TROUBLESHOOTING = Object.freeze({
    low: Object.freeze({ label: bi("Low or falling joules", "Niski jouli ili pad energije"), icon: "↓J", checks: Object.freeze([
      diagnosticCheck(
        "Confirm the air-brake diameter matches the installed cylinder head and nozzle.", "Potvrdite da promjer air-brakea odgovara ugrađenoj glavi cilindra i mlaznici.",
        "A brake chosen only by rifle name can be wrong after a Kraken, GBB or other cylinder-head conversion. Too large can touch the nozzle; unnecessarily small changes the cushioning behaviour.", "Kočnica odabrana samo prema nazivu replike može biti pogrešna nakon Kraken, GBB ili druge konverzije glave cilindra. Prevelika može dodirivati mlaznicu, a nepotrebno mala mijenja ublažavanje udara.",
        "Select the exact rifle/head profile, then measure the clean bare nozzle at its narrowest point in two axes. Measure the brake outside diameter and perform a centred dry pass through the removed cylinder head; never force it.", "Odaberite točan profil replike/glave, zatim izmjerite čistu golu mlaznicu na najužem mjestu u dvije osi. Izmjerite vanjski promjer kočnice i centrirano je provucite kroz uklonjenu glavu cilindra; nikada je ne silite.",
        "Pass: the published brake matches the selected head, measured clearance is positive and the brake passes through freely without a witness mark.", "Prolaz: objavljena kočnica odgovara odabranoj glavi, izmjereni zazor je pozitivan i kočnica prolazi slobodno bez traga dodira.",
        "Fail: stop if the brake touches, clearance is zero/negative or the actual head cannot be identified. Fit the documented diameter before further chrono testing.", "Pad: zaustavite se ako kočnica dodiruje, zazor je nulti/negativan ili stvarnu glavu nije moguće utvrditi. Ugradite dokumentirani promjer prije daljnjeg mjerenja kronografom."
      ),
      diagnosticCheck(
        "Return one measured step if energy fell while the air-brake was being raised.", "Vratite jedan izmjereni korak ako je energija pala tijekom podizanja air-brakea.",
        "The first repeatable drop indicates that the brake has passed the useful setting for that complete build; continuing farther can restrict flow or disturb the cup seal.", "Prvi ponovljiv pad pokazuje da je kočnica prošla korisnu postavku za taj kompletni sklop; daljnje podizanje može ograničiti protok ili poremetiti brtvljenje cupa.",
        "Use the same BB, hop and shooting cadence. Record at least five shots at each equal measured projection. When the mean drops by more than normal string variation, screw the brake back to the preceding measured projection and repeat the string.", "Koristite isti BB, hop i ritam pucanja. Zabilježite najmanje pet hitaca na svakom jednakom izmjerenom izbočenju. Kada prosjek padne više od normalne varijacije serije, uvucite kočnicu na prethodno izmjereno izbočenje i ponovite seriju.",
        "Pass: the previous position restores the earlier mean energy and remains repeatable for a second string.", "Prolaz: prethodni položaj vraća raniji prosjek energije i ponovljiv je u drugoj seriji.",
        "Fail: if energy does not return, restore the original baseline and investigate lubrication, seal or a loosened stack instead of continuing to adjust the brake.", "Pad: ako se energija ne vrati, vratite početnu postavku i provjerite podmazivanje, brtvljenje ili olabavljen sklop umjesto daljnjeg podešavanja kočnice."
      ),
      diagnosticCheck(
        "Lubricate only the piston-cup sealing edge with one small drop.", "Podmažite samo brtveni rub cupa jednom malom kapi.",
        "A dry lip can drag or leak, while excess oil can migrate into the hop rubber and create erratic energy and flight.", "Suh rub može zapinjati ili propuštati, dok višak ulja može dospjeti na hop gumu i uzrokovati neujednačenu energiju i putanju.",
        "Wipe the cylinder and cup clean, inspect the lip for cuts or folding, place one small drop of suitable silicone oil on the cup edge and spread a thin film around the circumference. Hand-cycle the piston before reassembly.", "Obrišite cilindar i cup, pregledajte ima li rub rezove ili presavijanje, stavite jednu malu kap prikladnog silikonskog ulja na rub cupa i razmažite tanak film po cijelom opsegu. Ručno pomaknite klip prije sastavljanja.",
        "Pass: the lip remains evenly seated, leaves only a faint uniform film and the next controlled chrono strings stabilise.", "Prolaz: rub ostaje ravnomjerno postavljen, ostavlja samo tanak ujednačen film i sljedeće kontrolirane chrono serije se stabiliziraju.",
        "Fail: replace a cut, hardened or repeatedly folded cup. Remove visible pooled oil and clean any contaminated bucking or barrel before retesting.", "Pad: zamijenite zarezani, otvrdnuti ili stalno presavijeni cup. Uklonite vidljivi višak ulja i očistite kontaminirani bucking ili cijev prije ponovnog testa."
      ),
      diagnosticCheck(
        "Isolate piston, cylinder-head and nozzle-to-hop air seals.", "Odvojeno provjerite brtvljenje klipa, glave cilindra i spoja mlaznice s hopom.",
        "Low output can come from several seals; testing them as one system makes the leaking interface impossible to identify.", "Niska energija može dolaziti iz više brtvi; testiranjem cijelog sustava odjednom nije moguće utvrditi koji spoj propušta.",
        "With the spring removed and cylinder assembly out of the replica, gently push the piston by hand while sealing the cylinder-head outlet. Then inspect the head O-ring and, separately, use a thin paper witness around the assembled nozzle-to-bucking joint. Never fire with the muzzle or nozzle blocked.", "S uklonjenom oprugom i cilindarskim sklopom izvan replike, lagano rukom gurajte klip dok zatvarate izlaz glave cilindra. Zatim pregledajte O-ring glave i zasebno upotrijebite tanki papir kao indikator oko sastavljenog spoja mlaznice i buckinga. Nikada ne pucajte sa začepljenim ustima cijevi ili mlaznicom.",
        "Pass: hand compression builds firm resistance, the head O-ring shows continuous contact and the nozzle meets the bucking centrally without an obvious gap.", "Prolaz: ručno stlačivanje stvara čvrst otpor, O-ring glave ima kontinuirani kontakt i mlaznica središnje naliježe na bucking bez vidljivog razmaka.",
        "Fail: repair the first isolated leak found, reassemble and chrono before changing another component. Do not use a stronger spring to hide an air leak.", "Pad: popravite prvo izolirano propuštanje, sastavite i izmjerite prije promjene drugog dijela. Nemojte jačom oprugom prikrivati curenje zraka."
      ),
      diagnosticCheck(
        "Remove added short-stroke modules and retest before changing the spring.", "Uklonite dodatne short-stroke module i ponovite test prije promjene opruge.",
        "Each extension shortens piston travel and reduces swept cylinder volume; the resulting energy loss may be expected rather than a seal fault.", "Svaki produžni modul skraćuje hod klipa i smanjuje radni volumen cilindra; dobiveni pad energije može biti očekivan, a ne kvar brtvljenja.",
        "Photograph and weigh the current stack. Remove only the added extension module, restore the standard-length stack, keep BB/hop/barrel/spring unchanged and shoot two comparable chrono strings.", "Fotografirajte i izvažite trenutačni sklop. Uklonite samo dodani produžni modul, vratite standardnu duljinu sklopa, ostavite isti BB/hop/cijev/oprugu i ispalite dvije usporedive chrono serije.",
        "Pass: energy returns predictably and consistency remains stable, confirming that reduced volume caused the change.", "Prolaz: energija se predvidljivo vrati, a konzistentnost ostane stabilna, što potvrđuje da je promjenu uzrokovao smanjeni volumen.",
        "Fail: if output remains low, restore the documented stack and continue with the seal checks; do not combine a spring change with this test.", "Pad: ako energija ostane niska, vratite dokumentirani sklop i nastavite s provjerama brtvljenja; nemojte istodobno mijenjati oprugu."
      )
    ]) }),
    loud: Object.freeze({ label: bi("Still loud or metallic", "Još uvijek glasno ili metalno"), icon: ")))", checks: Object.freeze([
      diagnosticCheck(
        "Tune the correct air-brake in equal measured steps while recording chrono data.", "Podešavajte ispravan air-brake u jednakim izmjerenim koracima uz bilježenje chrono podataka.",
        "Sound alone cannot show whether the brake is helping; the useful setting is the quiet region before a repeatable energy loss.", "Sam zvuk ne pokazuje pomaže li kočnica; korisna postavka je tiho područje prije ponovljivog pada energije.",
        "Verify brake diameter first. Set hop for the BB in use, measure the initial projection, then raise the brake by the same small increment each time. Shoot equal-size strings toward the same safe backstop and log mean energy plus a same-position sound note.", "Prvo potvrdite promjer kočnice. Podesite hop za korišteni BB, izmjerite početno izbočenje, zatim svaki put podignite kočnicu za isti mali korak. Ispalite jednako velike serije prema istom sigurnom hvataču i zabilježite prosječnu energiju te bilješku o zvuku s istog mjesta.",
        "Pass: impact sound decreases without a meaningful energy drop; reproduce that projection in a second string before locking it.", "Prolaz: zvuk udara se smanji bez značajnog pada energije; ponovite to izbočenje u drugoj seriji prije zaključavanja.",
        "Fail: when energy falls or sound becomes sharper, return to the preceding measured step. If neither changes, inspect the bumper and identify the sound source.", "Pad: kada energija padne ili zvuk postane oštriji, vratite se na prethodni izmjereni korak. Ako se ništa ne promijeni, pregledajte odbojnik i utvrdite izvor zvuka."
      ),
      diagnosticCheck(
        "Inspect the cylinder-head bumper for presence, flatness and secure bonding.", "Pregledajte je li odbojnik glave cilindra prisutan, ravan i čvrsto zalijepljen.",
        "A missing, tilted or loose pad allows hard or uneven piston contact and can sound metallic even when the air-brake is correctly adjusted.", "Nedostajući, nagnuti ili olabavljeni odbojnik dopušta tvrd ili neravnomjeran udar klipa i može zvučati metalno čak i kada je air-brake pravilno podešen.",
        "Unload and strip the cylinder. View the pad square-on and from the side under bright light. Press its entire perimeter with a blunt plastic tool and look for lifted edges, compression dents, tears, oil underneath or an off-centre bore.", "Ispraznite repliku i rastavite cilindar. Pregledajte gumicu sprijeda i sa strane pod jakim svjetlom. Tupim plastičnim alatom pritisnite cijeli rub i tražite odignute rubove, udubljenja, pukotine, ulje ispod ili otvor izvan središta.",
        "Pass: the pad is fully bonded, uniformly thick, centred and shows an even circular contact witness.", "Prolaz: gumica je potpuno zalijepljena, jednoliko debela, centrirana i pokazuje ravnomjeran kružni trag dodira.",
        "Fail: replace a damaged pad or remove and rebond a loose one according to its product instructions. Do not stack random pads because this changes stroke and volume.", "Pad: zamijenite oštećenu gumicu ili uklonite i ponovno zalijepite olabavljenu prema uputama proizvoda. Nemojte nasumično slagati gumice jer to mijenja hod i volumen."
      ),
      diagnosticCheck(
        "Retract an over-extended brake if sound sharpens or energy falls.", "Uvucite previše izvučen air-brake ako zvuk postane oštriji ili energija padne.",
        "Excess projection can enter or restrict the nozzle too early and may upset the piston-cup seal instead of cushioning the final movement.", "Preveliko izbočenje može prerano ući u mlaznicu ili je ograničiti te poremetiti brtvljenje cupa umjesto ublažavanja završnog hoda.",
        "Mark the current lock-nut position, measure projection, then retract exactly one previous adjustment increment. Repeat the same chrono string and compare both the mean energy and character of the mechanical sound.", "Označite trenutačni položaj matice, izmjerite izbočenje, zatim uvucite kočnicu točno za jedan prethodni korak. Ponovite istu chrono seriju i usporedite prosječnu energiju i karakter mehaničkog zvuka.",
        "Pass: the prior position restores energy or removes the sharp/irregular report without making piston impact worse.", "Prolaz: prethodni položaj vraća energiju ili uklanja oštar/nepravilan zvuk bez pogoršanja udara klipa.",
        "Fail: if the result is unchanged, return to the documented baseline and inspect brake straightness, nozzle marks and cup condition.", "Pad: ako se rezultat ne promijeni, vratite dokumentiranu početnu postavku i pregledajte ravnost kočnice, tragove na mlaznici i stanje cupa."
      ),
      diagnosticCheck(
        "Compare one documented lighter piston stack while keeping every other variable fixed.", "Usporedite jedan dokumentirani lakši sklop klipa uz sve ostale iste varijable.",
        "More moving mass can increase mechanical impact energy; whether it sounds better or worse depends on spring, brake timing, bumper and cylinder geometry.", "Veća pomična masa može povećati mehaničku energiju udara; hoće li zvučati bolje ili lošije ovisi o opruzi, timingu kočnice, odbojniku i geometriji cilindra.",
        "Record the complete current mass and module order. Replace only one steel body module with its aluminium counterpart, confirm the stack length is unchanged, then retune the brake from its safe baseline and compare matched chrono strings.", "Zabilježite ukupnu masu i redoslijed modula. Zamijenite samo jedan čelični modul aluminijskim, potvrdite da je duljina sklopa ista, zatim ponovno podesite kočnicu od sigurne početne postavke i usporedite jednake chrono serije.",
        "Pass: the lighter stack reduces the mechanical report while retaining acceptable energy and consistency after retuning.", "Prolaz: lakši sklop smanjuje mehanički zvuk uz prihvatljivu energiju i konzistentnost nakon ponovnog podešavanja.",
        "Fail: restore the original documented stack if energy, consistency or bolt behaviour worsens. Never add or remove several variables in one comparison.", "Pad: vratite izvorni dokumentirani sklop ako se energija, konzistentnost ili rad zatvarača pogoršaju. Nikada ne mijenjajte više varijabli u jednoj usporedbi."
      ),
      diagnosticCheck(
        "Separate piston impact from muzzle blast with a controlled suppressor comparison.", "Odvojite udar klipa od praska na ustima kontroliranom usporedbom s prigušivačem.",
        "An air-brake mainly changes the piston event; a suppressor mainly changes muzzle discharge. Treating both sounds as one leads to tuning the wrong part.", "Air-brake prvenstveno mijenja događaj udara klipa, a prigušivač pražnjenje na ustima. Ako oba zvuka tretirate kao jedan, podešavat ćete pogrešan dio.",
        "At a legal safe test location, keep the same BB, hop, energy, backstop and observer position. Record matched strings with and without the correctly aligned suppressor; also listen near the action from a safe side position. Do not use a phone reading as certified dB.", "Na legalnom sigurnom mjestu zadržite isti BB, hop, energiju, hvatač i položaj promatrača. Snimite jednake serije s pravilno poravnatim prigušivačem i bez njega; slušajte i blizu mehanizma sa sigurnog bočnog položaja. Očitanje mobitela nije certificirani dB.",
        "Pass: a large change at the muzzle identifies discharge noise; little muzzle change with a metallic action sound points back to piston contact or loose hardware.", "Prolaz: velika promjena na ustima upućuje na zvuk pražnjenja; mala promjena na ustima uz metalni zvuk mehanizma vraća sumnju na udar klipa ili olabavljene dijelove.",
        "Fail: stop if the suppressor clips BBs, loosens or changes flight. Correct alignment before drawing any sound conclusion.", "Pad: zaustavite test ako prigušivač dodiruje BB-e, odvija se ili mijenja putanju. Ispravite poravnanje prije zaključka o zvuku."
      )
    ]) }),
    inconsistent: Object.freeze({ label: bi("Inconsistent chrono", "Neujednačen chrono"), icon: "±", checks: Object.freeze([
      diagnosticCheck(
        "Verify every threaded module has its anti-loosening O-ring and the stack is fully seated.", "Provjerite ima li svaki navojni modul O-ring protiv odvrtanja i je li sklop potpuno sjeo.",
        "A module that moves between shots changes piston mass, length, alignment and air-brake projection at the same time.", "Modul koji se pomiče između hitaca istodobno mijenja masu, duljinu, poravnanje i izbočenje air-brakea.",
        "Photograph the module order, unload and remove the piston, then check each joint for the specified small O-ring, a visible gap or witness movement. Hold adjacent modules with protected fingers/tools and confirm they are evenly seated—do not crush the O-rings by excessive torque.", "Fotografirajte redoslijed modula, ispraznite repliku i izvadite klip, zatim na svakom spoju provjerite propisani mali O-ring, vidljiv razmak ili trag pomicanja. Pridržite susjedne module zaštićenim prstima/alatom i potvrdite da su ravnomjerno sjeli—ne drobite O-ringove pretjeranim zatezanjem.",
        "Pass: every joint is flush, the stack remains straight and identical witness marks stay aligned after a test string.", "Prolaz: svaki spoj je bez razmaka, sklop ostaje ravan i oznake ostaju poravnate nakon probne serije.",
        "Fail: replace a missing, cut or extruded O-ring and clean damaged threads. Stop if a module will not seat squarely; do not use thread locker unless the maker specifies it.", "Pad: zamijenite nedostajući, zarezani ili istisnuti O-ring i očistite oštećene navoje. Zaustavite se ako modul ne sjeda ravno; ne koristite ljepilo za navoj ako ga proizvođač ne propisuje."
      ),
      diagnosticCheck(
        "Standardise BBs, hop, loading and cadence before judging consistency.", "Standardizirajte BB-e, hop, punjenje i ritam prije procjene konzistentnosti.",
        "Mixed ammunition, changing hop pressure, temperature and irregular time between shots can imitate an internal fault.", "Miješano streljivo, promjenjiv pritisak hopa, temperatura i nepravilan razmak između hitaca mogu oponašati unutarnji kvar.",
        "Use one undamaged BB batch and mass, mark the hop setting, fill the same magazine, allow the replica to stabilise at one temperature and fire at a steady interval through a correctly aligned chrono. Record at least two strings of equal length.", "Koristite jednu neoštećenu seriju i masu BB-a, označite postavku hopa, napunite isti spremnik, pustite repliku da se stabilizira na istoj temperaturi i pucajte u pravilnom ritmu kroz poravnati kronograf. Zabilježite najmanje dvije jednako duge serije.",
        "Pass: both strings have similar mean and spread, with no repeating first-shot or magazine-position pattern.", "Prolaz: obje serije imaju sličan prosjek i raspon, bez ponavljajućeg uzorka prvog hica ili položaja u spremniku.",
        "Fail: if variation follows a magazine, first shot or cadence, investigate that pattern before opening the cylinder. Remove visibly damaged or dirty BBs.", "Pad: ako varijacija prati spremnik, prvi hitac ili ritam, istražite taj uzorak prije otvaranja cilindra. Uklonite vidljivo oštećene ili prljave BB-e."
      ),
      diagnosticCheck(
        "Inspect cup lubrication, guide-ring drag and cylinder witness marks together.", "Zajedno pregledajte podmazivanje cupa, trenje guide ringa i tragove u cilindru.",
        "Intermittent friction can change piston acceleration shot to shot even when static sealing appears good.", "Povremeno trenje može mijenjati ubrzanje klipa od hica do hica čak i kada statičko brtvljenje izgleda dobro.",
        "Remove the spring, clean the cylinder, apply only a thin film at the cup lip and perform the bare-piston tilt test in four rotational orientations. Inspect the guide rings, cup and cylinder for local polished lines, rubber dust or a repeated tight point.", "Uklonite oprugu, očistite cilindar, nanesite samo tanak film na rub cupa i izvedite test nagibom golog klipa u četiri zakrenuta položaja. Pregledajte guide ringove, cup i cilindar radi lokalnih uglačanih linija, gumene prašine ili ponavljajućeg uskog mjesta.",
        "Pass: travel is smooth in every orientation, the cup remains evenly seated and no fresh line appears.", "Prolaz: hod je gladak u svakom položaju, cup ostaje ravnomjerno postavljen i ne pojavljuje se nova linija.",
        "Fail: identify the exact contact zone before resizing or replacing anything. Excess lubricant is not a repair for a tight guide ring or crooked stack.", "Pad: utvrdite točnu zonu dodira prije dimenzioniranja ili zamjene dijelova. Višak maziva nije popravak za tijesan guide ring ili krivi sklop."
      ),
      diagnosticCheck(
        "Separate cylinder sealing from hop, bucking and nozzle alignment.", "Odvojite brtvljenje cilindra od hopa, buckinga i poravnanja mlaznice.",
        "A stable cylinder can still produce flyers or chrono spread if the nozzle meets the bucking differently on successive shots.", "Stabilan cilindar i dalje može stvarati flyere ili chrono raspon ako mlaznica različito naliježe na bucking između hitaca.",
        "Bench-test the springless cylinder seal by hand first. Then reassemble and use a light paper witness around the nozzle/bucking joint, inspect bucking lips through the chamber and compare strings from two known-good magazines. Never fire with the nozzle or barrel blocked.", "Najprije ručno provjerite brtvljenje cilindra bez opruge. Zatim sastavite, upotrijebite lagani papir kao indikator oko spoja mlaznice/buckinga, pregledajte usne buckinga kroz komoru i usporedite serije iz dva provjereno dobra spremnika. Nikada ne pucajte sa začepljenom mlaznicom ili cijevi.",
        "Pass: cylinder compression is repeatable, nozzle contact is central and both magazines produce equivalent strings.", "Prolaz: kompresija cilindra je ponovljiva, dodir mlaznice je središnji i oba spremnika daju jednake serije.",
        "Fail: repair only the subsystem that changes the result—cylinder seal, nozzle alignment, bucking lips or magazine presentation—then retest.", "Pad: popravite samo podsustav koji mijenja rezultat—brtvljenje cilindra, poravnanje mlaznice, usne buckinga ili dovođenje iz spremnika—zatim ponovite test."
      ),
      diagnosticCheck(
        "Measure and lock the selected air-brake projection reproducibly.", "Izmjerite i ponovljivo zaključajte odabrano izbočenje air-brakea.",
        "If the lock nut allows the brake to rotate, each string may use a different restriction and impact timing.", "Ako matica dopušta okretanje kočnice, svaka serija može imati drukčije ograničenje protoka i timing udara.",
        "After tuning, measure projection from the same fixed piston-head reference with calipers, record it, hold the brake without twisting and tighten the lock nut. Add a removable witness mark across nut and head, then shoot a string and remeasure.", "Nakon podešavanja izmjerite izbočenje pomičnim mjerilom od iste fiksne reference na glavi klipa, zabilježite ga, pridržite kočnicu bez zakretanja i zategnite maticu. Dodajte uklonjivu kontrolnu oznaku preko matice i glave, zatim ispalite seriju i ponovno izmjerite.",
        "Pass: projection and witness mark remain unchanged and the repeated chrono string matches the tuned result.", "Prolaz: izbočenje i kontrolna oznaka ostaju nepromijenjeni, a ponovljena chrono serija odgovara podešenom rezultatu.",
        "Fail: if the brake moves, inspect nut, threads and O-rings before firing again. Do not compensate by overtightening against damaged threads.", "Pad: ako se kočnica pomakne, pregledajte maticu, navoje i O-ringove prije ponovnog pucanja. Nemojte nadoknađivati oštećeni navoj pretjeranim zatezanjem."
      )
    ]) }),
    drag: Object.freeze({ label: bi("Heavy bolt pull or piston drag", "Teško repetiranje ili zapinjanje klipa"), icon: "⇥", checks: Object.freeze([
      diagnosticCheck(
        "Test the bare piston in a clean cylinder without the spring.", "Isprobajte goli klip u čistom cilindru bez opruge.",
        "This separates piston/guide-ring friction from spring force, spring-guide friction and trigger load.", "Time odvajate trenje klipa/guide ringa od sile opruge, trenja spring guidea i opterećenja okidača.",
        "Unload and decock the replica, remove the spring and spring guide, clean the cylinder dry, then insert only the fully assembled piston. Hold the cylinder nearly horizontal and slowly tilt it in both directions; rotate the piston 90° and repeat.", "Ispraznite i otpustite repliku, uklonite oprugu i spring guide, očistite cilindar nasuho te umetnite samo potpuno sastavljen klip. Držite cilindar gotovo vodoravno i polako ga naginjite u oba smjera; zakrenite klip 90° i ponovite.",
        "Pass: the piston traverses the usable cylinder length under gravity or a very light fingertip push, without a repeatable tight spot.", "Prolaz: klip prelazi uporabnu duljinu cilindra pod gravitacijom ili vrlo laganim dodirom, bez ponovljivog uskog mjesta.",
        "Fail: a repeatable stop at the same position or orientation points to a guide ring, O-ring, burr, bent cylinder or eccentric piston stack. Do not compensate with heavier lubrication.", "Pad: ponovljivo zaustavljanje na istom mjestu ili orijentaciji upućuje na guide ring, O-ring, srh, savijeni cilindar ili ekscentričan sklop klipa. Nemojte problem prikriti većom količinom maziva."
      ),
      diagnosticCheck(
        "Check any added guide-ring O-ring for excessive squeeze.", "Provjerite stišće li dodatni O-ring guide ringa previše.",
        "Stalker leaves the optional ring choice to the user because cylinder internal diameters vary. A ring that protrudes too far can become the main source of drag.", "Stalker prepušta izbor neobaveznog O-ringa korisniku jer se unutarnji promjeri cilindara razlikuju. O-ring koji previše viri može postati glavni izvor trenja.",
        "Mark the ring position, repeat the bare-piston test with the added O-ring fitted, then remove only that O-ring and repeat. Inspect for a polished flat, rolled edge or rubber dust. Never remove the POM guide ring itself for a firing test.", "Označite položaj prstena, ponovite test golog klipa s dodatnim O-ringom, zatim uklonite samo taj O-ring i ponovite. Tražite uglačanu plohu, zavrnuti rub ili gumenu prašinu. Nikada ne uklanjajte sam POM guide ring radi testa pucanjem.",
        "Pass: adding the O-ring does not create a detectable tight point, and the ring stays seated without rolling.", "Prolaz: dodavanje O-ringa ne stvara primjetno usko mjesto i prsten ostaje u utoru bez uvrtanja.",
        "Fail: if drag disappears when the optional O-ring is removed, use a thinner correctly sized ring or run the guide ring in the configuration specified for that piston version; do not sand the cylinder.", "Pad: ako trenje nestane uklanjanjem neobaveznog O-ringa, upotrijebite tanji pravilno dimenzioniran prsten ili guide ring koristite prema uputi za tu verziju klipa; ne brusite cilindar.",
        ["Compare with/without the optional O-ring; there is no universal O-ring cross-section because cylinder IDs differ.", "Usporedite s neobaveznim O-ringom i bez njega; nema univerzalnog presjeka O-ringa jer se unutarnji promjeri cilindara razlikuju."]
      ),
      diagnosticCheck(
        "Confirm front and rear guide-ring orientation for your exact generation.", "Potvrdite orijentaciju prednjeg i stražnjeg guide ringa za svoju generaciju.",
        "Scorpion guide-ring geometry has changed. A reversed or misplaced ring can move the bearing surface, alter piston length or rub the cylinder.", "Geometrija Scorpion guide ringova mijenjala se. Obrnut ili pogrešno postavljen prsten može pomaknuti nosivu površinu, promijeniti duljinu klipa ili strugati po cilindru.",
        "Before disassembly, photograph the stack. Compare both ring profiles, shoulders and chamfers with current product photos for the same platform and kit generation. The rear ring belongs at the sear/end-cap side and the front ring at the cup/head side; do not infer orientation from colour alone.", "Prije rastavljanja fotografirajte sklop. Usporedite profile, ramena i zakošenja oba prstena s aktualnim fotografijama iste platforme i generacije kita. Stražnji prsten ide uz sear/završnu kapu, a prednji uz cup/glavu; ne zaključujte orijentaciju samo prema boji.",
        "Pass: both rings sit fully against their intended shoulders, do not pinch an adjacent O-ring and the assembled piston remains straight when rolled on a flat surface.", "Prolaz: oba prstena potpuno naliježu na svoja ramena, ne priklješćuju susjedni O-ring i sastavljeni klip ostaje ravan pri kotrljanju po ravnoj površini.",
        "Fail: if the kit photos do not match your parts, stop and identify the generation with the seller or Stalker group before forcing the stack together.", "Pad: ako fotografije kita ne odgovaraju vašim dijelovima, zaustavite rad i utvrdite generaciju kod trgovca ili Stalker grupe prije prisilnog sastavljanja."
      ),
      diagnosticCheck(
        "Measure spring-to-guide clearance; ‘9 mm’ is a compatibility class, not a guaranteed tolerance.", "Izmjerite zazor opruge prema vodilici; ‘9 mm’ je klasa kompatibilnosti, ne zajamčena tolerancija.",
        "The Stalker VSR/SSG10 guide is listed with a nominal 9.00 mm shaft and for APS-2 springs of approximately 9 mm internal diameter. Real springs vary by brand, coating, ovality and end grinding, so Stalker does not publish one universal numeric clearance.", "Stalker VSR/SSG10 vodilica navodi se s nominalnom osovinom 9,00 mm i za APS-2 opruge približno 9 mm unutarnjeg promjera. Stvarne opruge razlikuju se prema marki, premazu, ovalnosti i obradi krajeva, pa Stalker ne objavljuje jedan univerzalni broj zazora.",
        "With calipers, measure the guide outside diameter at the front, middle and rear of the working shaft. Measure the spring inside diameter across two perpendicular directions at both ends and in the middle where accessible. Use the largest guide OD and smallest spring ID. Slide the uncompressed spring over the clean guide through its full travel and rotate it by hand; do not force it or test with the spring under full compression outside the cylinder.", "Pomičnim mjerilom izmjerite vanjski promjer vodilice na početku, sredini i kraju radne osovine. Unutarnji promjer opruge izmjerite u dva okomita smjera na oba kraja i u sredini gdje je dostupno. Koristite najveći promjer vodilice i najmanji unutarnji promjer opruge. Navucite neopterećenu oprugu preko čiste vodilice cijelim hodom i zakrenite je rukom; ne silite je niti ispitujte potpuno stisnutu izvan cilindra.",
        "Pass: minimum measured ID is greater than maximum measured OD, and the spring slides and rotates over the complete guide without force, scraping or a local catch. A small positive value can pass if the functional test is clean.", "Prolaz: najmanji izmjereni unutarnji promjer veći je od najvećeg vanjskog promjera vodilice, a opruga klizi i okreće se cijelom duljinom bez sile, struganja ili lokalnog zapinjanja. Mali pozitivan broj može proći ako je funkcionalni test čist.",
        "Fail: zero/negative calculated clearance, a spring that must be pushed, exposed shiny rub marks or a catch at a ground spring end means the pair is not acceptable. Replace the spring or guide with a documented compatible pair; do not grind the guide to create clearance.", "Pad: nulti/negativni izračunati zazor, opruga koju treba gurati, sjajni tragovi trljanja ili zapinjanje na brušenom kraju opruge znače da par nije prihvatljiv. Zamijenite oprugu ili vodilicu dokumentirano kompatibilnim parom; ne brusite vodilicu radi stvaranja zazora.",
        ["Diametral clearance = smallest spring ID − largest guide OD. Example only: 9.20 − 9.00 = 0.20 mm diametral, or 0.10 mm per side. This is an example calculation—not a Stalker target specification.", "Promjerni zazor = najmanji unutarnji promjer opruge − najveći vanjski promjer vodilice. Samo primjer: 9,20 − 9,00 = 0,20 mm promjernog, odnosno 0,10 mm po strani. To je primjer izračuna — nije Stalkerova ciljna specifikacija."],
        "https://skirmshopusa.com/products/vsr-10-ssg10-9mm-stainless-steel-spring-guide"
      ),
      diagnosticCheck(
        "Stop on fresh scrape marks and locate the exact interference.", "Zaustavite se kod novih tragova struganja i pronađite točno mjesto dodira.",
        "A new bright line is physical evidence of metal/polymer contact. Continuing to fire can create debris, damage the cup or cylinder and make chrono consistency worse.", "Nova sjajna linija fizički je dokaz dodira metala/polimera. Nastavak pucanja može stvoriti strugotine, oštetiti cup ili cilindar i pogoršati chrono konzistentnost.",
        "Clean the parts, colour the suspected contact area lightly with a removable marker, reassemble without the spring and perform several slow manual strokes. Disassemble and inspect where the marker was removed. Also check that the threaded weight stack is straight and every module is fully seated.", "Očistite dijelove, lagano obojite sumnjivo mjesto uklonjivim markerom, sastavite bez opruge i izvedite nekoliko sporih ručnih hodova. Rastavite i pregledajte gdje je marker uklonjen. Provjerite i je li navojni sklop utega ravan te je li svaki modul potpuno sjeo.",
        "Pass: no new witness mark appears and the bare-piston test remains smooth in several rotational orientations.", "Prolaz: ne pojavljuje se novi trag dodira i test golog klipa ostaje gladak u više zakrenutih položaja.",
        "Fail: a recurring line identifies the contact zone, not automatically the defective part. Check burrs, ring orientation, O-ring squeeze, bent cylinder and off-axis modules before replacing anything.", "Pad: ponavljajuća linija određuje zonu dodira, ali ne nužno neispravan dio. Prije zamjene provjerite srhove, orijentaciju ringa, stisnutost O-ringa, savijeni cilindar i module izvan osi."
      )
    ]) }),
    feed: Object.freeze({ label: bi("BB jam, roll-out or bad flight", "Zapinjanje BB-a, ispadanje ili loš let"), icon: "●×", checks: Object.freeze([
      diagnosticCheck(
        "Inspect magazine presentation, BB stopper and bucking lips before opening the cylinder.", "Pregledajte dovođenje iz spremnika, BB stopper i usne buckinga prije otvaranja cilindra.",
        "Most jams and roll-outs begin where the magazine presents the BB or where the bucking lips retain it, not at the piston.", "Većina zapinjanja i ispadanja počinje ondje gdje spremnik dovodi BB ili gdje ga usne buckinga zadržavaju, a ne na klipu.",
        "Unload the replica. Test two known-good magazines, inspect feed lips and BB height, then remove the chamber and place one clean BB against the bucking lips by hand. It should be retained gently and release with light, centred pressure; never force a jammed BB deeper.", "Ispraznite repliku. Isprobajte dva provjereno dobra spremnika, pregledajte usne i visinu dovođenja, zatim izvadite komoru i rukom postavite jedan čist BB na usne buckinga. Treba ga nježno zadržati i otpustiti uz lagan središnji pritisak; nikada ne gurajte zaglavljeni BB dublje.",
        "Pass: both magazines present BBs centrally and the bucking lips retain one BB without tearing, folding or allowing a roll-out.", "Prolaz: oba spremnika dovode BB središnje i usne buckinga zadržavaju jedan BB bez kidanja, presavijanja ili ispadanja.",
        "Fail: isolate the result to one magazine, damaged stopper or bucking lips. Replace the faulty item and clear the barrel with an appropriate unjamming rod from the correct direction.", "Pad: utvrdite prati li kvar jedan spremnik, oštećeni stopper ili usne buckinga. Zamijenite neispravan dio i očistite cijev odgovarajućom šipkom iz pravilnog smjera."
      ),
      diagnosticCheck(
        "Confirm the cylinder head and nozzle enter the hop chamber centrally and to the correct depth.", "Potvrdite da glava cilindra i mlaznica ulaze u hop komoru središnje i do pravilne dubine.",
        "A tilted or incompletely seated cylinder can push the BB sideways, fold the bucking lips or leave an intermittent air gap.", "Nagnut ili nepotpuno postavljen cilindar može gurnuti BB u stranu, presavinuti usne buckinga ili ostaviti povremeni zračni razmak.",
        "With the replica unloaded and spring controlled, remove the magazine and observe the nozzle/chamber interface under bright light while closing the bolt slowly. Check that receiver screws, chamber block and cylinder head are fully seated and that no cable, shim or debris biases the chamber.", "S ispražnjenom replikom i kontroliranom oprugom izvadite spremnik te pod jakim svjetlom promatrajte spoj mlaznice i komore dok polako zatvarate zatvarač. Provjerite jesu li vijci kućišta, blok komore i glava cilindra potpuno sjeli te pomiče li komoru kabel, podloška ili prljavština.",
        "Pass: the nozzle enters concentrically without touching one side, the bolt closes consistently and the bucking lips remain symmetrical.", "Prolaz: mlaznica ulazi koncentrično bez dodira s jednom stranom, zatvarač se dosljedno zatvara i usne buckinga ostaju simetrične.",
        "Fail: stop if there is side contact, a closing hard spot or distorted lips. Correct seating and alignment before adjusting hop or piston parts.", "Pad: zaustavite se ako postoji bočni dodir, tvrda točka pri zatvaranju ili deformirane usne. Ispravite sjedenje i poravnanje prije podešavanja hopa ili dijelova klipa."
      ),
      diagnosticCheck(
        "Verify that air-brake diameter, straightness and projection cannot obstruct the nozzle.", "Provjerite da promjer, ravnost i izbočenje air-brakea ne mogu blokirati mlaznicu.",
        "A wrong or bent brake may physically enter the nozzle off-axis, causing a hard bolt stop, damaged parts or disturbed airflow.", "Pogrešna ili savijena kočnica može ući u mlaznicu izvan osi te uzrokovati tvrdo zaustavljanje zatvarača, oštećenje dijelova ili poremećen protok.",
        "Measure nozzle ID and brake OD, roll the removed brake on a flat surface to check straightness, then perform a slow centred dry pass through the removed cylinder head. Mark the brake lightly to reveal contact and compare projection with the last known working setting.", "Izmjerite ID mlaznice i OD kočnice, zakotrljajte uklonjenu kočnicu po ravnoj površini radi provjere ravnosti, zatim je polako i centrirano provucite kroz uklonjenu glavu cilindra. Lagano označite kočnicu radi otkrivanja dodira i usporedite izbočenje sa zadnjom ispravnom postavkom.",
        "Pass: clearance is positive, the brake is straight and it passes without contact at the intended projection.", "Prolaz: zazor je pozitivan, kočnica je ravna i prolazi bez dodira na namjeravanom izbočenju.",
        "Fail: do not cycle or fire if it rubs, bends or has zero clearance. Install the documented brake for the exact cylinder head and restart tuning from baseline.", "Pad: nemojte repetirati ni pucati ako struže, savijena je ili nema zazora. Ugradite dokumentiranu kočnicu za točnu glavu cilindra i ponovno podesite od početne postavke."
      ),
      diagnosticCheck(
        "Set hop to zero and inspect the barrel, nub and patch centrally from the breech.", "Vratite hop na nulu i pregledajte cijev, nub i kontaktno mjesto središnje sa stražnje strane.",
        "A rotated bucking, off-centre nub or residual hop at ‘zero’ can cause curve, double feed, jams or unpredictable release.", "Zakrenuti bucking, nub izvan središta ili preostali hop na ‘nuli’ mogu uzrokovati skretanje, dvostruko hranjenje, zapinjanje ili nepredvidivo otpuštanje.",
        "Remove the barrel/chamber safely, clean the bore and view toward a diffuse light. At zero hop the patch should withdraw evenly; increase hop slowly and confirm a centred, symmetrical contact. Rebuild one component at a time while preserving alignment marks.", "Sigurno izvadite cijev/komoru, očistite provrt i gledajte prema difuznom svjetlu. Na nultom hopu kontakt treba ravnomjerno nestati; polako povećavajte hop i potvrdite središnji, simetrični kontakt. Sastavljajte po jedan dio uz očuvanje oznaka poravnanja.",
        "Pass: the clean bore is unobstructed and hop contact appears centrally and symmetrically through its adjustment range.", "Prolaz: čisti provrt je slobodan, a hop kontakt pojavljuje se središnje i simetrično kroz raspon podešavanja.",
        "Fail: recentre or replace a twisted bucking, displaced nub or damaged patch. Do not compensate for a crooked patch by rotating the barrel randomly.", "Pad: ponovno centrirajte ili zamijenite zakrenuti bucking, pomaknuti nub ili oštećeno kontaktno mjesto. Nemojte nasumičnim zakretanjem cijevi kompenzirati krivi kontakt."
      ),
      diagnosticCheck(
        "Use chrono behaviour to separate a flight problem from a piston problem.", "Pomoću chrono ponašanja odvojite problem putanje od problema klipa.",
        "Normal, repeatable muzzle energy with poor flight points downstream toward BB quality, bucking, nub, barrel or muzzle alignment rather than piston power.", "Normalna, ponovljiva izlazna energija uz lošu putanju upućuje dalje prema kvaliteti BB-a, buckingu, nubu, cijevi ili poravnanju usta, a ne prema snazi klipa.",
        "Shoot a controlled chrono string first, then group the same BB batch at a safe known distance from a stable support. Inspect cleaned barrel and crown, hop contact and suppressor alignment. Change only one downstream component before repeating both tests.", "Najprije ispalite kontroliranu chrono seriju, zatim grupirajte istu seriju BB-a na sigurnoj poznatoj udaljenosti sa stabilnog oslonca. Pregledajte očišćenu cijev i krunu, hop kontakt i poravnanje prigušivača. Promijenite samo jedan dio iza cilindra prije ponavljanja oba testa.",
        "Pass: stable chrono plus a repeatable directional flight defect localises the issue to hop/barrel/alignment; correcting that item improves grouping without changing energy.", "Prolaz: stabilan chrono uz ponovljiv usmjereni kvar putanje locira problem na hop/cijev/poravnanje; ispravak tog dijela poboljšava grupu bez promjene energije.",
        "Fail: if chrono is also erratic, return to the consistency tree and solve sealing or mechanical variation before judging accuracy.", "Pad: ako je i chrono neujednačen, vratite se na stablo konzistentnosti i riješite brtvljenje ili mehaničku varijaciju prije procjene preciznosti."
      )
    ]) })
  });

  return { PROFILES, FAMILY, GUIDE_RINGS, TROUBLESHOOTING, guideRingSpec, bodyMass, combinationForMass, weightPlan, analyzeWeightTrials, recommend, parseReadings, stats, analyzeChronoSteps, springGuideAdvice, nozzleFit };
});
