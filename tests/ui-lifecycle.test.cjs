const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
const page = fs.readFileSync(path.join(__dirname, "../src/page.html"), "utf8");
function functionSource(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const rest = source.slice(start + 2), next = rest.slice(1).search(/^  (?:async )?function /m);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function harness() {
  const timers = new Map(), nodes = {}, context = {
    p: {}, optimizer: null, shot: { valid: true, duration: .06 }, baseline: {}, fraction: .3, playheadTime: .018,
    lastValidShot: null, changeComparison: null, I: { comparisonSnapshot: () => null },
    diagnostic: null, calculationPending: false, debounce: null, busy: false, playing: true, fitSelection: ["dischargeCoefficient"],
    chartCache: new Map(), workspace: null, location: { hash: "#pneumatic-timing" },
    P: { simulate: () => context.nextShot }, nextShot: { valid: true, duration: .06 },
    stop: () => { context.playing = false; }, invalidateOptimizer: () => {},
    updateResults: () => { if (context.shot.valid) context.playheadTime = context.fraction * context.shot.duration; },
    setTimeout: callback => { const id = Symbol(); timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    t: en => en, setStatus: () => {}, render: () => {}, clone: value => JSON.parse(JSON.stringify(value)), measurements: [],
    $: id => nodes[id] || null,
    document: { querySelectorAll: () => Object.values(nodes).filter(node => "disabled" in node) }
  };
  for (const id of ["results", "resultContent", "resultError", "resultStatus"]) nodes[id] = { dataset: {}, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  vm.createContext(context);
  for (const name of ["setResultState", "recalculate", "scheduleCalculation", "setBusy"]) vm.runInContext(functionSource(name), context);
  return { context, nodes, timers };
}

test("rapid edits retain previous shot and panel, cancel prior debounce and mark stale actions inert", () => {
  const { context: c, nodes, timers } = harness(), previous = c.shot, canvas = {};
  nodes.resultContent.canvas = canvas;
  Object.defineProperty(nodes.results, "innerHTML", { set() { throw new Error("Mounted panel must not be cleared"); } });
  for (let i = 0; i < 20; i++) c.scheduleCalculation();
  assert.equal(timers.size, 1); assert.equal(c.shot, previous); assert.equal(nodes.resultContent.canvas, canvas);
  assert.equal(c.playing, false); assert.equal(c.calculationPending, true); assert.equal(nodes.results.attrs["aria-busy"], "true");
  assert.equal(nodes.resultContent.inert, true); assert.match(nodes.resultStatus.textContent, /previous shot/);
});

test("valid → invalid → different-duration valid retains physical playhead time", () => {
  const { context: c } = harness();
  c.nextShot = { valid: false, errors: ["dimension"] }; c.recalculate();
  assert.equal(c.playheadTime, .018);
  c.nextShot = { valid: true, duration: .25 }; c.recalculate();
  assert.ok(Math.abs(c.fraction - .072) < 1e-12); assert.equal(c.playheadTime, .018);
  c.nextShot = { valid: true, duration: .01 }; c.recalculate();
  assert.equal(c.fraction, 1); assert.equal(c.playheadTime, .01);
});

test("feedback compares against the last valid setup and survives an invalid intermediate edit", () => {
  const { context: c } = harness(), first = { valid: true, duration: .06, params: { pistonMass: 58 } }, calls = [];
  c.lastValidShot = first;
  c.I.comparisonSnapshot = (before, after) => { calls.push([before, after]); return { changes: [{ key: "pistonMass" }], metrics: {} }; };
  const second = { valid: true, duration: .06, params: { pistonMass: 82 } }; c.nextShot = second; c.recalculate();
  assert.equal(c.lastValidShot, second); assert.equal(c.changeComparison.changes[0].key, "pistonMass");
  const comparison = c.changeComparison; c.nextShot = { valid: false, errors: ["dimension"] }; c.recalculate();
  assert.equal(c.lastValidShot, second); assert.equal(c.changeComparison, comparison);
  const third = { valid: true, duration: .06, params: { pistonMass: 71 } }; c.nextShot = third; c.recalculate();
  assert.equal(calls.at(-1)[0], second); assert.equal(calls.at(-1)[1], third);
});

test("invalid and pending states cannot expose active stale results and recover without removing content", () => {
  const { context: c, nodes } = harness(), content = nodes.resultContent;
  c.setResultState("invalid");
  assert.equal(content.inert, true); assert.equal(content.attrs["aria-hidden"], "true"); assert.equal(nodes.resultError.hidden, false);
  c.setResultState("pending"); assert.equal(content.inert, true); assert.equal(nodes.results.attrs["aria-busy"], "true");
  c.setResultState("ready"); assert.equal(content.inert, false); assert.equal(content.attrs["aria-hidden"], "false");
  assert.equal(nodes.resultError.hidden, true); assert.equal(nodes.resultContent, content);
});

test("pending, invalid and busy states guard delegated playback and export handlers", () => {
  const { context: c, nodes } = harness(); let plays = 0, exports = 0;
  c.startPlayback = () => plays++; c.download = () => exports++; c.playing = false;
  nodes.results.contains = () => true;
  vm.runInContext(functionSource("bindResults"), c); c.bindResults();
  const click = id => nodes.results.onclick({ target: { closest: () => ({ id, dataset: {} }) } });
  for (const state of ["pending", "invalid", "busy"]) {
    c.calculationPending = state === "pending"; c.shot.valid = state !== "invalid"; c.busy = state === "busy";
    click("playButton"); click("exportRun");
  }
  assert.equal(plays, 0); assert.equal(exports, 0);
  c.busy = false; c.shot.valid = true; click("playButton"); assert.equal(plays, 1);
});

test("immediate Fit flushes debounce before busy state, preserving unavailable-event disabled state", async () => {
  const { context: c, nodes, timers } = harness();
  nodes.missingEvent = { disabled: true, dataset: {} };
  nodes.fitButton = { disabled: false, dataset: {}, addEventListener(type, callback) { this.callback = callback; } };
  c.C = { fitParameters: async () => { throw new Error("No training shots"); } };
  c.updateResults = () => { assert.equal(c.busy, false, "Pending render must finish before controls are disabled"); };
  const start = source.indexOf('    $("fitButton").addEventListener("click", async () => {');
  const end = source.indexOf("\n  }\n  function renderMeasurements", start);
  vm.runInContext(source.slice(start, end), c);
  c.scheduleCalculation(); assert.equal(timers.size, 1);
  await nodes.fitButton.callback();
  assert.equal(timers.size, 0); assert.equal(c.calculationPending, false); assert.equal(c.busy, false);
  assert.equal(nodes.missingEvent.disabled, true); assert.equal(nodes.fitButton.disabled, false);
});

test("parameter preset paths and live frames cannot rebuild the results shell", () => {
  assert.doesNotMatch(functionSource("updateResults"), /\$\("results"\)\.innerHTML|bindResults\(\)/);
  assert.doesNotMatch(functionSource("bindControls"), /\brender\(\)/);
  assert.doesNotMatch(functionSource("renderOptimizerResults"), /\brender\(\)/);
  assert.match(functionSource("setFrame"), /if \(!\$\("liveStrip"\)\.firstChild\)/);
});

test("setup fields expose shared help on hover, keyboard focus and touch focus", () => {
  const field = functionSource("field"), binding = functionSource("bindFieldHelp");
  assert.match(field, /Parts\.help\(key, t\)/);
  assert.match(field, /class="field-info"/);
  assert.match(field, /role="tooltip"/);
  assert.match(field, /aria-describedby/);
  assert.match(binding, /pointerenter/);
  assert.match(binding, /addEventListener\("focus"/);
  assert.match(binding, /event\.key === "Escape"/);
  assert.match(page, /\.field-info-wrap:hover \.field-tooltip/);
  assert.match(page, /\.field-info-wrap:focus-within \.field-tooltip/);
});

test("Graphs renders the same live cutaway at the graph cursor time", () => {
  assert.match(functionSource("updateResults"), /id="mechanismGraph"/);
  assert.match(functionSource("setFrame"), /workspaceState\.view === "graphs"\) \{ drawMechanism\(f, "mechanismGraph"\); drawCharts\(f\.t\); drawImpactChart\("impactGraph", f\.t\); \}/);
  assert.match(functionSource("drawMechanism"), /canvasContext\(canvasId\)/);
});

test("shot graphs mark first physical piston contact with a solid red line", () => {
  const update = functionSource("updateResults"), chart = functionSource("drawCharts"), events = functionSource("contactEventLabel");
  assert.match(update, /solid red first physical contact/);
  assert.match(update, /puna crvena prvi fizički kontakt/);
  assert.match(update, /graph-contact-key/);
  assert.match(chart, /\["pistonHitTime", "#ff756f", 2\.8, \[\]\]/);
  assert.match(chart, /if \(shot\[key\] === null\) continue/);
  assert.match(events, /p\.bumperThickness > 0/);
  assert.match(events, /First bumper contact/);
  assert.match(events, /First rigid cylinder-head contact/);
  assert.match(page, /\.event-list \.contact \{ border-color:var\(--red\); \}/);
});

test("Graphs and Results expose the same exact piston-contact sequence", () => {
  const update = functionSource("updateResults"), frame = functionSource("setFrame"), chart = functionSource("drawImpactChart");
  assert.match(update, /impactMarkup\(s, "impactGraph", "graphs"/);
  assert.match(update, /impactMarkup\(s, "impactResultsChart", "results"/);
  assert.match(frame, /workspaceState\.view === "details"\) drawImpactChart\("impactResultsChart", f\.t\)/);
  assert.match(chart, /I\.impactSummary\(shot\)/); assert.match(chart, /event\.pistonEnergy \* 1000/);
});

test("clicking a listed recontact seeks its exact model time", () => {
  const { context: c, nodes } = harness(); let sought = null;
  c.setFrame = value => { sought = value; }; c.shot.duration = .06; c.playing = true;
  nodes.results.contains = () => true;
  vm.runInContext(functionSource("bindResults"), c); c.bindResults();
  nodes.results.onclick({ target: { closest: () => ({ id: "", disabled: false, dataset: { impactTime: ".03" } }) } });
  assert.equal(sought, .5); assert.equal(c.playing, false);
});

test("impact explanation shortcut reveals Results and moves focus to the actual cards", () => {
  const { context: c, nodes } = harness(); let view, focused = false, feedbackFocused = false, revealed = false;
  c.workspace = { selectView: value => { view = value; } }; c.window = { innerWidth: 390 };
  nodes.results.contains = () => true; nodes.workspaceBody = { scrollTop: 400 };
  nodes.soundExplanations = { focus: () => { focused = true; } }; nodes.previewPanel = { scrollIntoView: () => { revealed = true; } };
  nodes.setupFeedback = { focus: () => { feedbackFocused = true; }, scrollIntoView: () => {} };
  vm.runInContext(functionSource("bindResults"), c); c.bindResults();
  nodes.results.onclick({ target: { closest: () => ({ id: "explainSound", dataset: {} }) } });
  assert.equal(view, "details"); assert.equal(focused, true); assert.equal(revealed, true);
  assert.equal(nodes.workspaceBody.scrollTop, 0); assert.equal(c.playing, false);
  nodes.results.onclick({ target: { closest: () => ({ id: "explainFeedback", dataset: {} }) } });
  assert.equal(view, "details"); assert.equal(feedbackFocused, true);
});
