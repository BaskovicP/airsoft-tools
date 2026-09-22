/* Layout/navigation only. Reparents existing controls and canvases once; never
   clones them or changes physical inputs. No framework/runtime dependency. */
(function (root) {
  "use strict";
  const CATEGORIES = [
    ["geometry", "Cylinder & barrel", "Cilindar i cijev"], ["masses", "Piston & BB", "Piston i BB"],
    ["airbrake", "Airbrake, bumper & head", "Zračna kočnica, gumica i glava"], ["spring", "Spring", "Opruga"],
    ["losses", "Losses & environment", "Gubici i okoliš"], ["rifle", "Rifle presets", "Predlošci replika"],
    ["solver", "Timing & solver", "Vrijeme i rješavač"]
  ];
  const VIEWS = [["shot", "Shot", "Hitac"], ["graphs", "Graphs", "Grafovi"], ["details", "Results", "Rezultati"], ["optimizer", "Optimize", "Optimizacija"], ["calibration", "Chrono", "Kronograf"]];
  function mount(doc, state, t, onView) {
    const $ = id => doc.getElementById(id);
    const aside = doc.querySelector(".controls-panel"), main = doc.querySelector(".main");
    aside.id = "settingsPanel"; main.id = "previewPanel";
    const members = {
      rifle: [$("platformPreset").closest("section")], geometry: [$("cylinderBore").closest("section"), $("shortStrokeDynamic")],
      masses: [$("pistonMass").closest("section"), aside.querySelector(".preset-row")], airbrake: [$("pinLabel").closest("details")],
      spring: [$("springDetails")], losses: [$("dischargeCoefficient").closest("details")], solver: [$("usefulFraction").closest("details")]
    };
    const picker = doc.createElement("label"); picker.className = "settings-picker";
    picker.innerHTML = `${t("Adjust", "Podesi")}<select id="settingsCategory" aria-controls="settingsPages">${CATEGORIES.map(([id, en, hr]) => `<option value="${id}">${t(en, hr)}</option>`).join("")}</select>`;
    const pages = doc.createElement("div"); pages.id = "settingsPages"; pages.className = "settings-pages";
    for (const [id, en, hr] of CATEGORIES) {
      const page = doc.createElement("section"); page.id = "settings-" + id; page.dataset.settingsPage = id; page.className = "settings-page"; page.setAttribute("aria-label", t(en, hr));
      for (const element of members[id]) { if (element.tagName === "DETAILS") { element.open = true; element.classList.add("settings-section"); } page.append(element); }
      pages.append(page);
    }
    aside.append(picker, pages);
    // Keep explanations available without making people pass them to reach inputs.
    const helpGroups = new Map();
    pages.querySelectorAll("p.field-help, p.evidence").forEach(note => {
      const notes = helpGroups.get(note.parentElement) || []; notes.push(note); helpGroups.set(note.parentElement, notes);
    });
    for (const [parent, notes] of helpGroups) {
      const help = doc.createElement("details"); help.className = "inline-help";
      const summary = doc.createElement("summary"); summary.textContent = t("Help & assumptions", "Objašnjenja i pretpostavke"); help.append(summary, ...notes); parent.append(help);
    }
    const body = doc.createElement("div"); body.id = "workspaceBody"; body.className = "workspace-body";
    const optimizer = main.querySelector(".optimizer"), calibration = $("calibrationPanel");
    optimizer.id = "workspace-optimizer"; optimizer.dataset.workspacePanel = "optimizer";
    calibration.dataset.workspacePanel = "calibration"; calibration.open = true;
    body.append($("results"), optimizer, calibration);
    const nav = doc.createElement("nav"); nav.className = "workspace-nav"; nav.setAttribute("aria-label", t("Lab views", "Prikazi laboratorija"));
    nav.innerHTML = VIEWS.map(([id, en, hr]) => `<button type="button" data-workspace-view="${id}" aria-controls="${id === "calibration" ? "calibrationPanel" : "workspace-" + id}" aria-pressed="false">${t(en, hr)}</button>`).join("");
    main.append(nav, body);
    const jump = doc.createElement("nav"); jump.className = "mobile-workspace-jumps"; jump.setAttribute("aria-label", t("Workspace shortcuts", "Prečaci radnog prostora"));
    jump.innerHTML = `<button type="button" data-jump="settings">${t("Settings", "Postavke")}</button><button type="button" data-jump="preview">${t("Preview", "Prikaz")}</button>`;
    main.closest(".app").append(jump);
    function sync() {
      for (const panel of pages.children) panel.hidden = panel.dataset.settingsPage !== state.category;
      $("settingsCategory").value = state.category;
      main.querySelectorAll("[data-workspace-panel]").forEach(panel => { panel.hidden = panel.dataset.workspacePanel !== state.view; });
      // Pending/invalid status remains visible even in Optimize or Chrono.
      if ($("resultContent")) $("resultContent").hidden = !["shot", "graphs", "details"].includes(state.view);
      nav.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.workspaceView === state.view)));
    }
    function selectCategory(value) {
      if (!CATEGORIES.some(([id]) => id === value)) return;
      state.categoryScroll[state.category] = pages.scrollTop; state.category = value;
      sync(); pages.scrollTop = state.categoryScroll[value] || 0;
    }
    function selectView(value) {
      if (!VIEWS.some(([id]) => id === value)) return;
      state.viewScroll[state.view] = body.scrollTop; state.view = value;
      sync(); body.scrollTop = state.viewScroll[value] || 0; onView(value);
    }
    $("settingsCategory").addEventListener("change", event => selectCategory(event.target.value));
    nav.addEventListener("click", event => { const button = event.target.closest("[data-workspace-view]"); if (button && !button.disabled) selectView(button.dataset.workspaceView); });
    jump.addEventListener("click", event => {
      const button = event.target.closest("[data-jump]"); if (!button || button.disabled) return;
      if (button.dataset.jump === "settings") {
        aside.classList.remove("is-collapsed"); $("toggleControls").setAttribute("aria-expanded", "true");
        aside.scrollIntoView({ block: "start" }); $("settingsCategory").focus({ preventScroll: true });
      } else {
        selectView("shot"); body.scrollTop = 0;
        main.scrollIntoView({ block: "start" }); nav.querySelector("button").focus({ preventScroll: true });
      }
    });
    sync();
    return { sync, selectView, selectCategory,
      rememberScroll() { state.categoryScroll[state.category] = pages.scrollTop; state.viewScroll[state.view] = body.scrollTop; },
      restoreScroll() { pages.scrollTop = state.categoryScroll[state.category] || 0; body.scrollTop = state.viewScroll[state.view] || 0; }
    };
  }
  function prepareResults(next, summaryHTML, caption, incomplete) {
    const doc = next.ownerDocument, stage = next.querySelector(".stage"), graphs = next.querySelector(".graphs");
    const transport = stage.querySelector(".stage-toolbar"); transport.id = "workspace-transport"; transport.remove();
    const disclosure = (id, label) => {
      const details = doc.createElement("details"); details.id = id; details.className = "stage-disclosure"; details.setAttribute("data-preserve-open", "");
      const summary = doc.createElement("summary"); summary.textContent = label; details.append(summary); return details;
    };
    const live = disclosure("liveValuesDetails", caption.live), help = disclosure("playbackDetails", caption.help);
    live.append(stage.querySelector("#liveStrip"));
    for (const element of Array.from(stage.children)) {
      if (element.matches(".playback-reference, .playback-options, .results-note, p.small-note")) help.append(element);
    }
    const glance = doc.createElement("div"); glance.className = "tuning-summary"; glance.innerHTML = summaryHTML;
    const flag = doc.createElement("p"); flag.className = "shot-caption"; flag.textContent = caption.flag;
    stage.prepend(flag);
    if (incomplete) {
      const warning = doc.createElement("p"); warning.className = "shot-incomplete"; warning.setAttribute("role", "status"); warning.textContent = incomplete; stage.insertBefore(warning, flag.nextSibling);
    }
    if (caption.timingHTML) {
      const wrapper = doc.createElement("div"); wrapper.innerHTML = caption.timingHTML;
      stage.insertBefore(wrapper.children[0], stage.querySelector("#phaseText"));
    }
    stage.append(glance);
    if (caption.explainSound) {
      const explain = doc.createElement("button"); explain.id = "explainSound"; explain.type = "button"; explain.className = "sound-explain-link"; explain.textContent = caption.explainSound; stage.append(explain);
    }
    stage.append(live, help);
    stage.id = "workspace-shot"; stage.dataset.workspacePanel = "shot";
    graphs.id = "workspace-graphs"; graphs.dataset.workspacePanel = "graphs";
    const details = doc.createElement("section"); details.id = "workspace-details"; details.dataset.workspacePanel = "details";
    for (const child of Array.from(next.childNodes)) if (child !== stage && child !== graphs) details.append(child);
    const sound = details.querySelector("#soundExplanations"); if (sound) details.prepend(sound);
    next.append(transport, stage, graphs, details);
  }
  const api = { mount, prepareResults, CATEGORIES, VIEWS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticWorkspace = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
