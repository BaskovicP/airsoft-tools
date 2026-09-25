/* Pure decision-tree data and scoring for the interactive accuracy troubleshooter. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AccuracyTroubleshooter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const bi = (en, hr) => Object.freeze({ en, hr });
  const option = (value, en, hr, next, scores = {}) => Object.freeze({ value, label: bi(en, hr), next, scores: Object.freeze(scores) });

  const CAUSES = Object.freeze({
    bb: Object.freeze({
      label: bi("BB quality or unsuitable weight", "Kvaliteta ili neodgovarajuća masa BB-a"),
      summary: bi("Mixed, damaged, dirty or overly light BBs can produce wind-sensitive groups and random flyers.", "Pomiješani, oštećeni, prljavi ili prelagani BB-i mogu uzrokovati osjetljive grupe i nasumične flyere."),
      check: bi("Use one unopened bag of quality BBs, confirm the weight, then fire a 10-shot group.", "Upotrijebite jednu neotvorenu vrećicu kvalitetnih BB-a, potvrdite masu i ispalite grupu od 10 hitaca."),
      pass: bi("If the group improves, the ammunition or weight was the limiting factor.", "Ako se grupa popravi, ograničenje je bilo streljivo ili njegova masa."),
      order: 1
    }),
    barrel: Object.freeze({
      label: bi("Dirty or damaged inner barrel", "Prljava ili oštećena unutarnja cijev"),
      summary: bi("Oil, dust, residue or a damaged crown can disturb individual BBs as they leave the barrel.", "Ulje, prašina, naslage ili oštećena kruna mogu poremetiti pojedine BB-e pri izlasku iz cijevi."),
      check: bi("Unload the replica, turn hop off, clean with lint-free patches and isopropyl alcohol, then inspect the crown.", "Ispraznite repliku, isključite hop, očistite krpicama bez dlačica i izopropilnim alkoholom te pregledajte krunu."),
      pass: bi("Retest dry; do not leave oil in the barrel or on the hop contact patch.", "Ponovno testirajte potpuno suhu cijev; ne ostavljajte ulje u cijevi ni na kontaktnoj površini hopa."),
      order: 2
    }),
    hop: Object.freeze({
      label: bi("Hop setting or unstable adjustment", "Postavka hopa ili nestabilno podešavanje"),
      summary: bi("Too much, too little or a dial that moves between shots changes lift and effective range.", "Previše ili premalo hopa, kao i kotačić koji mijenja položaj, utječe na uzgon i uporabni domet."),
      check: bi("Mark the dial, adjust from zero in small steps and fire 5–10 shots after every change.", "Označite kotačić, podešavajte od nule malim koracima i ispalite 5–10 hitaca nakon svake promjene."),
      pass: bi("The setting should hold its position and produce a repeatable, nearly flat flight path.", "Postavka mora ostati na mjestu i davati ponovljivu, gotovo ravnu putanju."),
      order: 3
    }),
    magazine: Object.freeze({
      label: bi("Magazine or feeding interaction", "Spremnik ili problem hranjenja"),
      summary: bi("Feed pressure, dirty BBs, weak springs or fit can change BB seating and nozzle closure.", "Pritisak hranjenja, prljavi BB-i, slaba opruga ili dosjed mogu mijenjati položaj BB-a i zatvaranje mlaznice."),
      check: bi("Repeat the same group with a known-good magazine; compare full, half-full and nearly empty states.", "Ponovite istu grupu s provjerenim spremnikom; usporedite pun, napola pun i gotovo prazan spremnik."),
      pass: bi("A result that follows one magazine points to fit, spring tension, lips or dirt—not the barrel.", "Rezultat koji prati jedan spremnik upućuje na dosjed, oprugu, usne ili nečistoću — ne na cijev."),
      order: 4
    }),
    bucking: Object.freeze({
      label: bi("Bucking wear, contamination or poor seal", "Istrošenost, zaprljanost ili loše brtvljenje buckinga"),
      summary: bi("A torn, oily, swollen or incompatible bucking can give weak lift, flyers and inconsistent sealing.", "Potrgan, mastan, nabubren ili nekompatibilan bucking može uzrokovati slab uzgon, flyere i neujednačeno brtvljenje."),
      check: bi("Inspect the lips and contact patch under good light; look for tears, oil, deformation and uneven wear.", "Pod dobrim svjetlom pregledajte usne i kontaktnu površinu; tražite pukotine, ulje, deformacije i nejednako trošenje."),
      pass: bi("Clean only with a material-safe method; replace damaged rubber with a known compatible part.", "Čistite samo metodom sigurnom za materijal; oštećenu gumicu zamijenite provjereno kompatibilnim dijelom."),
      order: 5
    }),
    nub: Object.freeze({
      label: bi("Nub, hop arm or barrel alignment", "Poravnanje nuba, hop poluge ili cijevi"),
      summary: bi("An off-centre contact patch commonly produces repeatable left/right curve or uneven lift.", "Kontaktna površina izvan središta često uzrokuje ponovljivo skretanje lijevo/desno ili neujednačen uzgon."),
      check: bi("With the replica unloaded, inspect the hop window from the breech while applying hop gradually.", "Na ispražnjenoj replici promatrajte hop prozor sa stražnje strane dok postupno uključujete hop."),
      pass: bi("The patch should descend centrally and evenly; also verify the barrel clip and chamber do not rotate.", "Kontaktna površina mora se spuštati centralno i ravnomjerno; provjerite i da se kopča cijevi i komora ne zakreću."),
      order: 6
    }),
    nozzle: Object.freeze({
      label: bi("Nozzle alignment or tappet timing", "Poravnanje mlaznice ili timing tappeta"),
      summary: bi("A nozzle that does not return consistently can alternate between good shots, low-power shots and misfeeds.", "Mlaznica koja se ne vraća jednako može izmjenjivati dobre hice, slabe hice i prazna opaljenja."),
      check: bi("After external checks, inspect nozzle travel, chamber seating and tappet return; compare semi with controlled bursts.", "Nakon vanjskih provjera pregledajte hod mlaznice, dosjed komore i povrat tappeta; usporedite semi s kontroliranim rafalima."),
      pass: bi("Seek a technician if gearbox or engine disassembly is outside your experience.", "Ako nemate iskustva s rastavljanjem gearboxa ili mehanizma, prepustite provjeru tehničaru."),
      order: 7
    }),
    airseal: Object.freeze({
      label: bi("Internal air-seal inconsistency", "Neujednačeno unutarnje brtvljenje"),
      summary: bi("Cylinder, piston head, cylinder head or nozzle leaks usually appear as measurable energy variation.", "Propuštanje cilindra, glave klipa, glave cilindra ili mlaznice obično se vidi kao mjerljiva promjena energije."),
      check: bi("Chronograph at least 10 shots with one BB weight and compare low shots with the visible flyers.", "Izmjerite najmanje 10 hitaca kronografom s jednom masom BB-a i usporedite slabe hice s vidljivim flyerima."),
      pass: bi("Consistent energy shifts attention back to barrel and hop; large random drops justify an air-seal inspection.", "Ujednačena energija vraća sumnju na cijev i hop; veliki nasumični padovi opravdavaju pregled brtvljenja."),
      order: 8
    }),
    external: Object.freeze({
      label: bi("Wind, replica cant, sight or loose assembly", "Vjetar, nagib replike, optika ili labav sklop"),
      summary: bi("Crosswind, tilting a hopped replica and loose sights or outer-barrel parts can mimic an internal fault.", "Bočni vjetar, naginjanje replike s hopom te labava optika ili dijelovi vanjske cijevi mogu oponašati unutarnji kvar."),
      check: bi("Shoot supported in calm conditions, keep the replica level and verify the sight, suppressor and outer barrel are secure.", "Pucajte s oslonca u mirnim uvjetima, držite repliku ravno i provjerite optiku, prigušivač i vanjsku cijev."),
      pass: bi("If the curve changes with wind or cant rather than the replica setup, correct the test conditions first.", "Ako se skretanje mijenja s vjetrom ili nagibom, prvo ispravite uvjete testa."),
      order: 2.5
    })
  });

  const SYMPTOMS = Object.freeze({
    vertical: Object.freeze({ label: bi("Vertical spread", "Vertikalno rasipanje"), hint: bi("Shots climb and drop", "Hici idu gore i dolje"), icon: "↕", root: "v_chrono", base: { hop: 2, bb: 1, airseal: 1 } }),
    lateral: Object.freeze({ label: bi("Left / right curve", "Skretanje lijevo / desno"), hint: bi("Shots bend or group sideways", "Hici skreću ili se šire bočno"), icon: "↔", root: "l_direction", base: { nub: 3, external: 2, barrel: 1 } }),
    flyers: Object.freeze({ label: bi("Random flyers", "Nasumični flyeri"), hint: bi("Most shots group; some escape", "Većina grupira, neki odlete"), icon: "✦", root: "f_chrono", base: { bb: 2, barrel: 2, bucking: 1, magazine: 1 } }),
    range: Object.freeze({ label: bi("Weak range", "Slab domet"), hint: bi("Shots fall early or cannot lift", "Hici prerano padaju ili nema uzgona"), icon: "⌁", root: "r_lift", base: { hop: 3, bucking: 2, bb: 1 } }),
    intermittent: Object.freeze({ label: bi("Occasional bad shot", "Povremeno loš hitac"), hint: bi("A shot drops, misfeeds or loses power", "Hitac padne, ne nahrani ili izgubi snagu"), icon: "◌", root: "i_pattern", base: { magazine: 2, nozzle: 2, airseal: 1 } })
  });

  const QUESTIONS = Object.freeze({
    v_chrono: { prompt: bi("Does a 10-shot chrono string show matching speed or energy variation?", "Pokazuje li serija od 10 hitaca na kronografu odgovarajuće promjene brzine ili energije?"), help: bi("Use one BB weight and unchanged hop. If you have no chrono, choose ‘Not tested’.", "Koristite jednu masu BB-a i nepromijenjen hop. Ako nemate kronograf, odaberite ‘Nije testirano’."), options: [
      option("yes", "Yes, output rises and falls", "Da, izlaz raste i pada", "v_mag", { airseal: 5, nozzle: 3, magazine: 2 }),
      option("no", "No, output is consistent", "Ne, izlaz je ujednačen", "v_hop", { hop: 4, bucking: 2, nub: 2, airseal: -2 }),
      option("unknown", "Not tested", "Nije testirano", "v_hop", { airseal: 2, hop: 2 })
    ] },
    v_mag: { prompt: bi("Does the variation change with another known-good magazine?", "Mijenja li se rasipanje s drugim provjerenim spremnikom?"), options: [
      option("yes", "Yes, it follows the magazine", "Da, prati spremnik", null, { magazine: 7, nozzle: 1 }),
      option("no", "No, every magazine behaves alike", "Ne, svi spremnici rade jednako", "v_hop", { airseal: 4, nozzle: 3 }),
      option("unknown", "I only tested one", "Testirao/la sam samo jedan", "v_hop", { magazine: 3, airseal: 2 })
    ] },
    v_hop: { prompt: bi("Does changing hop in small steps move the whole group predictably?", "Pomiče li promjena hopa u malim koracima cijelu grupu na predvidljiv način?"), options: [
      option("yes", "Yes, the group moves together", "Da, grupa se pomiče zajedno", "v_clean", { hop: 2, bb: 2, external: 1 }),
      option("no", "No, lift changes randomly", "Ne, uzgon se mijenja nasumično", "v_clean", { bucking: 5, nub: 4, hop: 3 }),
      option("unknown", "I have not tested systematically", "Nisam sustavno testirao/la", "v_clean", { hop: 3 })
    ] },
    v_clean: { prompt: bi("Was the barrel cleaned dry immediately before this test?", "Je li cijev neposredno prije testa očišćena i potpuno osušena?"), options: [
      option("yes", "Yes", "Da", null, { barrel: -1, bucking: 1 }),
      option("no", "No", "Ne", null, { barrel: 6 }),
      option("unsure", "Unsure", "Nisam siguran/na", null, { barrel: 3 })
    ] },

    l_direction: { prompt: bi("Is the sideways curve repeatably toward the same side?", "Skreću li hici ponovljivo na istu stranu?"), options: [
      option("same", "Yes, always the same side", "Da, uvijek na istu stranu", "l_cant", { nub: 5, external: 2 }),
      option("both", "No, it alternates left and right", "Ne, izmjenjuje lijevo i desno", "l_clean", { bucking: 3, barrel: 3, bb: 2 }),
      option("wind", "It mainly happens outdoors", "Uglavnom se događa vani", "l_cant", { external: 5, bb: 2 })
    ] },
    l_cant: { prompt: bi("Does the direction change when you deliberately tilt the replica or remove crosswind?", "Mijenja li se smjer kada namjerno nagnete repliku ili uklonite bočni vjetar?"), options: [
      option("yes", "Yes", "Da", "l_clean", { external: 7, nub: -1 }),
      option("no", "No, it remains with the replica", "Ne, ostaje vezano uz repliku", "l_window", { nub: 5, external: -1 }),
      option("unknown", "Not tested", "Nije testirano", "l_window", { external: 2, nub: 2 })
    ] },
    l_window: { prompt: bi("Looking through the hop window, does the contact patch descend centrally and evenly?", "Gledano kroz hop prozor, spušta li se kontaktna površina centralno i ravnomjerno?"), options: [
      option("yes", "Yes, it looks centred", "Da, izgleda centrirano", "l_clean", { nub: -1, barrel: 2, external: 1 }),
      option("no", "No, it is visibly off-centre", "Ne, vidljivo je izvan središta", null, { nub: 8, bucking: 3 }),
      option("unknown", "I have not inspected it", "Nisam pregledao/la", "l_clean", { nub: 4 })
    ] },
    l_clean: { prompt: bi("Are the barrel, crown and suppressor path clean, undamaged and unobstructed?", "Jesu li cijev, kruna i put kroz prigušivač čisti, neoštećeni i bez zapreka?"), options: [
      option("yes", "Yes", "Da", null, { barrel: -1 }),
      option("no", "No or unsure", "Ne ili nisam siguran/na", null, { barrel: 6, external: 2 })
    ] },

    f_chrono: { prompt: bi("Do visible flyers coincide with low or high chrono readings?", "Poklapaju li se vidljivi flyeri s niskim ili visokim očitanjima kronografa?"), options: [
      option("yes", "Yes, output changes on flyers", "Da, izlaz se mijenja kod flyera", "f_mag", { airseal: 6, nozzle: 4, magazine: 2 }),
      option("no", "No, output stays consistent", "Ne, izlaz ostaje ujednačen", "f_clean", { bb: 3, barrel: 3, bucking: 3, airseal: -2 }),
      option("unknown", "Not measured", "Nije izmjereno", "f_mag", { airseal: 2, bb: 2 })
    ] },
    f_mag: { prompt: bi("Do flyers become more common with one magazine or at a particular fill level?", "Postaju li flyeri češći s jednim spremnikom ili pri određenoj napunjenosti?"), options: [
      option("yes", "Yes", "Da", "f_clean", { magazine: 7, nozzle: 2 }),
      option("no", "No", "Ne", "f_clean", { magazine: -1, bucking: 2 }),
      option("unknown", "Not compared", "Nije uspoređeno", "f_clean", { magazine: 3 })
    ] },
    f_clean: { prompt: bi("Does cleaning the barrel and using fresh quality BBs reduce the flyers?", "Smanjuju li se flyeri nakon čišćenja cijevi i korištenja svježih kvalitetnih BB-a?"), options: [
      option("yes", "Yes, clearly", "Da, jasno", null, { barrel: 6, bb: 5 }),
      option("no", "No meaningful change", "Nema značajne promjene", "f_bucking", { bucking: 4, nub: 2 }),
      option("unknown", "Not tested together", "Nije testirano zajedno", "f_bucking", { barrel: 3, bb: 3 })
    ] },
    f_bucking: { prompt: bi("Is the bucking dry, undamaged and evenly seated?", "Je li bucking suh, neoštećen i ravnomjerno postavljen?"), options: [
      option("yes", "Yes", "Da", null, { bucking: -1, nozzle: 2 }),
      option("no", "No or visibly worn", "Ne ili je vidljivo istrošen", null, { bucking: 8, nub: 2 }),
      option("unknown", "Not inspected", "Nije pregledano", null, { bucking: 4 })
    ] },

    r_lift: { prompt: bi("At maximum useful hop, can the replica lift your selected BB weight?", "Može li replika pri najvećoj uporabljivoj postavci hopa podići odabranu masu BB-a?"), options: [
      option("no", "No, shots still fall early", "Ne, hici i dalje prerano padaju", "r_lighter", { hop: 5, bucking: 5, nub: 3, bb: 2 }),
      option("over", "It overhops before the end of adjustment", "Prebacuje BB prema gore prije kraja podešavanja", "r_energy", { hop: 2, bb: 3, external: 1 }),
      option("unstable", "Lift changes between shots", "Uzgon se mijenja između hitaca", "r_clean", { bucking: 5, nub: 4, barrel: 2 })
    ] },
    r_lighter: { prompt: bi("Does one step lighter BB restore a normal flight path?", "Vraća li BB jednu razinu lakši normalnu putanju?"), options: [
      option("yes", "Yes", "Da", "r_energy", { bb: 6, hop: 3 }),
      option("no", "No", "Ne", "r_clean", { bucking: 5, nub: 3, airseal: 2 }),
      option("unknown", "Not tested", "Nije testirano", "r_clean", { bb: 3, hop: 2 })
    ] },
    r_energy: { prompt: bi("Is measured muzzle energy near the replica's normal baseline?", "Je li izmjerena energija na ustima blizu uobičajene vrijednosti replike?"), options: [
      option("yes", "Yes, energy is normal", "Da, energija je normalna", "r_clean", { airseal: -2, hop: 3, bb: 2 }),
      option("no", "No, energy is lower", "Ne, energija je niža", "r_mag", { airseal: 6, nozzle: 4 }),
      option("unknown", "No baseline or chrono", "Nema početne vrijednosti ili kronografa", "r_clean", { airseal: 2 })
    ] },
    r_mag: { prompt: bi("Does another known-good magazine restore energy or range?", "Vraća li drugi provjereni spremnik energiju ili domet?"), options: [
      option("yes", "Yes", "Da", null, { magazine: 8 }),
      option("no", "No", "Ne", "r_clean", { airseal: 4, nozzle: 4 }),
      option("unknown", "Not compared", "Nije uspoređeno", "r_clean", { magazine: 3, airseal: 2 })
    ] },
    r_clean: { prompt: bi("Are the barrel and bucking clean, dry and free of visible damage?", "Jesu li cijev i bucking čisti, suhi i bez vidljivih oštećenja?"), options: [
      option("yes", "Yes", "Da", null, { barrel: -1 }),
      option("no", "No or unsure", "Ne ili nisam siguran/na", null, { barrel: 5, bucking: 5 })
    ] },

    i_pattern: { prompt: bi("Is the bad shot usually a misfeed/double-feed, or a BB that leaves with low power?", "Je li loš hitac obično prazno/dvostruko hranjenje ili BB koji izlazi slabom snagom?"), options: [
      option("feed", "Misfeed or double-feed", "Prazno ili dvostruko hranjenje", "i_mag", { magazine: 5, nozzle: 5 }),
      option("low", "BB leaves with low power", "BB izlazi slabom snagom", "i_chrono", { airseal: 4, nozzle: 4, magazine: 2 }),
      option("curve", "Power seems normal; flight is wrong", "Snaga djeluje normalno; putanja je loša", "i_clean", { bucking: 4, barrel: 3, bb: 2 })
    ] },
    i_mag: { prompt: bi("Does the fault follow one magazine, its fill level or pressure against the magwell?", "Prati li kvar jedan spremnik, njegovu napunjenost ili pritisak u otvoru spremnika?"), options: [
      option("yes", "Yes", "Da", null, { magazine: 9, nozzle: 2 }),
      option("no", "No, it happens with all magazines", "Ne, događa se sa svim spremnicima", "i_rate", { magazine: -1, nozzle: 4 }),
      option("unknown", "Not compared", "Nije uspoređeno", "i_rate", { magazine: 3, nozzle: 2 })
    ] },
    i_rate: { prompt: bi("Is it more frequent during rapid semi-auto or full-auto fire?", "Događa li se češće pri brzom semi-auto ili full-auto pucanju?"), options: [
      option("yes", "Yes", "Da", null, { nozzle: 8, magazine: 4 }),
      option("no", "No, cadence makes no difference", "Ne, ritam ne mijenja ništa", "i_chrono", { airseal: 3, bucking: 2 }),
      option("unknown", "Not tested", "Nije testirano", "i_chrono", { nozzle: 3 })
    ] },
    i_chrono: { prompt: bi("Does the bad shot register a clear energy drop on the chrono?", "Pokazuje li loš hitac jasan pad energije na kronografu?"), options: [
      option("yes", "Yes", "Da", "i_clean", { airseal: 7, nozzle: 5 }),
      option("no", "No, energy stays normal", "Ne, energija ostaje normalna", "i_clean", { airseal: -2, bucking: 4, barrel: 2 }),
      option("unknown", "Not captured", "Nije zabilježeno", "i_clean", { airseal: 2 })
    ] },
    i_clean: { prompt: bi("Have you repeated the test with a clean dry barrel and fresh BBs?", "Jeste li ponovili test s čistom suhom cijevi i svježim BB-ima?"), options: [
      option("yes", "Yes", "Da", null, { barrel: -1, bb: -1 }),
      option("no", "No", "Ne", null, { barrel: 5, bb: 4 })
    ] }
  });

  function traverse(symptomId, answers = {}) {
    const symptom = SYMPTOMS[symptomId];
    if (!symptom) return { path: [], currentQuestion: null, completed: false };
    const path = [];
    let questionId = symptom.root;
    const visited = new Set();
    while (questionId && QUESTIONS[questionId] && !visited.has(questionId)) {
      visited.add(questionId);
      const question = QUESTIONS[questionId];
      const answer = answers[questionId];
      path.push({ questionId, question, answer: answer || null });
      if (!answer) return { path, currentQuestion: { id: questionId, ...question }, completed: false };
      const selected = question.options.find(item => item.value === answer);
      if (!selected) return { path, currentQuestion: { id: questionId, ...question }, completed: false };
      questionId = selected.next;
    }
    return { path, currentQuestion: null, completed: path.length > 0 };
  }

  function analyze(symptomId, answers = {}) {
    const symptom = SYMPTOMS[symptomId];
    if (!symptom) return { path: [], currentQuestion: null, completed: false, rankedCauses: [], checklist: [] };
    const walked = traverse(symptomId, answers);
    const scores = Object.fromEntries(Object.keys(CAUSES).map(key => [key, Number(symptom.base[key] || 0)]));
    for (const entry of walked.path) {
      if (!entry.answer) continue;
      const selected = entry.question.options.find(item => item.value === entry.answer);
      for (const [cause, value] of Object.entries(selected?.scores || {})) scores[cause] = (scores[cause] || 0) + value;
    }
    const maximum = Math.max(1, ...Object.values(scores));
    const rankedCauses = Object.entries(scores)
      .filter(([, score]) => score > 0)
      .map(([id, score]) => ({ id, score, confidence: Math.max(12, Math.round(score / maximum * 100)), ...CAUSES[id] }))
      .sort((a, b) => b.score - a.score || a.order - b.order);
    const shortlist = new Set(rankedCauses.slice(0, 5).map(item => item.id));
    const checklist = Object.entries(CAUSES)
      .filter(([id]) => shortlist.has(id))
      .map(([id, cause]) => ({ id, ...cause, score: scores[id] }))
      .sort((a, b) => a.order - b.order || b.score - a.score);
    return { ...walked, rankedCauses, checklist, answeredCount: walked.path.filter(item => item.answer).length };
  }

  return { CAUSES, SYMPTOMS, QUESTIONS, traverse, analyze };
});
