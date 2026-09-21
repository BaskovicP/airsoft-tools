const test = require("node:test");
const assert = require("node:assert/strict");
const W = require("../src/workspace.js");

// DOM contract fixture for navigation/reparenting, not a browser/layout engine.
const camel = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.scrollTop = 0; this.hidden = false; this.className = ""; }
  get childNodes() { return this.children; }
  get parentElement() { return this.parentNode; }
  get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
  get classList() { return { add: name => { this.className = [...new Set([...this.className.split(" ").filter(Boolean), name])].join(" "); }, remove: name => { this.className = this.className.split(" ").filter(item => item !== name).join(" "); } }; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
  prepend(...nodes) { for (const node of nodes.reverse()) this.insertBefore(node, this.children[0]); }
  remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
  insertBefore(node, before) { node.remove(); const index = before ? this.children.indexOf(before) : this.children.length; this.children.splice(index, 0, node); node.parentNode = this; }
  setAttribute(name, value) { this.attrs[name] = value; if (name === "class") this.className = value; if (name === "id") this.id = value; if (name.startsWith("data-")) this.dataset[camel(name.slice(5))] = value; }
  getAttribute(name) { if (name === "id") return this.id; if (name === "class") return this.className; if (name.startsWith("data-")) return this.dataset[camel(name.slice(5))]; return this.attrs[name]; }
  matches(selectors) {
    return selectors.split(",").some(raw => {
      const selector = raw.trim(), tag = selector.match(/^[a-z]+/i)?.[0];
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      const id = selector.match(/#([\w-]+)/)?.[1]; if (id && this.id !== id) return false;
      for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!this.className.split(" ").includes(name)) return false;
      for (const [, name] of selector.matchAll(/\[([\w-]+)\]/g)) if (this.getAttribute(name) === undefined) return false;
      return true;
    });
  }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() { this.scrolledIntoView = true; }
  set innerHTML(html) {
    this.children.forEach(child => { child.parentNode = null; }); this.children = [];
    const stack = [this];
    for (const match of html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>/gi)) {
      if (match[0].startsWith("</")) { stack.pop(); continue; }
      const element = this.ownerDocument.createElement(match[1]);
      for (const [, name, value] of match[2].matchAll(/([\w-]+)="([^"]*)"/g)) element.setAttribute(name, value);
      stack.at(-1).append(element);
      if (!["input", "br"].includes(match[1])) stack.push(element);
    }
  }
}
function documentFixture() {
  const doc = { createElement: tag => new Element(tag, doc), querySelector: selector => doc.root.querySelector(selector), getElementById: id => doc.root.querySelector("#" + id) };
  doc.root = doc.createElement("div");
  const node = (tag, attrs = {}, children = []) => { const result = doc.createElement(tag); for (const [name, value] of Object.entries(attrs)) result.setAttribute(name, value); result.append(...children); return result; };
  const field = id => node("input", { id });
  const group = (tag, id) => node(tag, {}, [field(id), node("p", { class: "field-help" })]);
  const aside = node("aside", { class: "controls-panel" }, [
    node("div", { class: "panel-heading" }, [node("button", { id: "toggleControls" })]),
    group("section", "platformPreset"), group("section", "cylinderBore"), node("p", { id: "shortStrokeDynamic" }),
    group("section", "pistonMass"), node("div", { class: "preset-row" }), group("details", "pinLabel"),
    node("details", { id: "springDetails" }, [field("springStiffness")]), group("details", "dischargeCoefficient"), group("details", "usefulFraction")
  ]);
  const results = node("div", { id: "results" }, [node("div", { id: "resultStatus" }), node("div", { id: "resultContent" }, W.VIEWS.filter(([id]) => ["shot", "graphs", "details"].includes(id)).map(([id]) => node("section", { id: "workspace-" + id, "data-workspace-panel": id })))]);
  const main = node("section", { class: "main" }, [node("section", { class: "optimizer" }), results, node("details", { id: "calibrationPanel" }, [field("measurementNotes")])]);
  doc.root.append(node("main", { class: "app" }, [aside, main]));
  return { doc, node, aside, main };
}
const state = () => ({ category: "geometry", view: "shot", categoryScroll: {}, viewScroll: {} });

test("categories move existing inputs once; switching preserves values and category scroll", () => {
  const { doc } = documentFixture(), p = doc.getElementById("pistonMass"); p.value = "76";
  const s = state(), workspace = W.mount(doc, s, en => en, () => {}), pages = doc.getElementById("settingsPages");
  assert.equal(doc.getElementById("settings-geometry").hidden, false);
  pages.scrollTop = 125; workspace.selectCategory("spring"); pages.scrollTop = 80;
  workspace.selectCategory("masses");
  assert.equal(doc.getElementById("pistonMass"), p); assert.equal(p.value, "76");
  workspace.selectCategory("geometry"); assert.equal(pages.scrollTop, 125);
  workspace.selectCategory("spring"); assert.equal(pages.scrollTop, 80);
  assert.equal(doc.getElementById("springDetails").open, true);
  assert.equal(doc.getElementById("settingsPages").children.filter(page => !page.hidden).length, 1);
  workspace.selectCategory("bogus"); assert.equal(s.category, "spring");
});

test("view switches retain panels, chrono drafts and status while restoring view scroll", () => {
  const { doc } = documentFixture(), s = state(), events = [], note = doc.getElementById("measurementNotes"); note.value = "My measured spring";
  const workspace = W.mount(doc, s, en => en, view => events.push(view));
  const shot = doc.getElementById("workspace-shot"), body = doc.getElementById("workspaceBody"); body.scrollTop = 90;
  workspace.selectView("graphs"); body.scrollTop = 150;
  workspace.selectView("calibration"); assert.equal(doc.getElementById("resultContent").hidden, true);
  assert.equal(doc.getElementById("resultStatus").hidden, false); assert.equal(doc.getElementById("measurementNotes"), note); assert.equal(note.value, "My measured spring");
  workspace.selectView("shot"); assert.equal(doc.getElementById("workspace-shot"), shot); assert.equal(shot.hidden, false); assert.equal(body.scrollTop, 90);
  workspace.selectView("graphs"); assert.equal(body.scrollTop, 150);
  const buttons = doc.querySelector(".workspace-nav").querySelectorAll("button");
  assert.equal(buttons.filter(button => button.getAttribute("aria-pressed") === "true").length, 1);
  assert.equal(events.length, 4);
});

test("mobile shortcuts focus reachable controls and show the same preview", () => {
  const { doc, aside, main } = documentFixture(), s = state(); W.mount(doc, s, en => en, () => {});
  const nav = doc.querySelector(".mobile-workspace-jumps"), [settings, preview] = nav.querySelectorAll("button");
  aside.classList.add("is-collapsed"); nav.listeners.click[0]({ target: settings });
  assert.equal(aside.className.includes("is-collapsed"), false); assert.equal(doc.activeElement, doc.getElementById("settingsCategory")); assert.equal(aside.scrolledIntoView, true);
  nav.listeners.click[0]({ target: preview }); assert.equal(main.scrolledIntoView, true); assert.equal(s.view, "shot");
  assert.equal(doc.activeElement.dataset.workspaceView, "shot");
});

test("prepared results retain one transport/canvas and keep incomplete warnings outside disclosures", () => {
  const { doc, node } = documentFixture();
  const canvas = node("canvas", { id: "mechanism" }), live = node("div", { id: "liveStrip" }), transport = node("div", { class: "stage-toolbar" });
  const stage = node("section", { class: "stage" }, [node("p", { class: "playback-reference" }), transport, canvas, live, node("p", { class: "results-note" }), node("div", { class: "playback-options" })]);
  const graphs = node("section", { class: "graphs" }), details = node("div", { class: "readout-grid" });
  const next = node("div", {}, [details, stage, graphs]);
  W.prepareResults(next, "<div><strong>2.3 J</strong></div>", { flag: "Model only", live: "Live values", help: "Options" }, "Missing contact");
  assert.equal(next.children[0], transport); assert.equal(transport.id, "workspace-transport");
  assert.equal(next.querySelector("#mechanism"), canvas); assert.equal(next.querySelectorAll("#mechanism").length, 1);
  assert.equal(next.querySelector("#liveStrip"), live); assert.equal(live.parentNode.id, "liveValuesDetails");
  assert.equal(next.querySelector(".shot-incomplete").parentNode, stage);
  assert.equal(details.parentNode.id, "workspace-details"); assert.equal(graphs.dataset.workspacePanel, "graphs");
  assert.equal(next.querySelector("#playbackDetails").getAttribute("data-preserve-open"), "");
});

test("full-render scroll snapshot restores both workspace panes", () => {
  const { doc } = documentFixture(), s = state(), workspace = W.mount(doc, s, (en, hr) => hr, () => {});
  const pages = doc.getElementById("settingsPages"), body = doc.getElementById("workspaceBody");
  pages.scrollTop = 45; body.scrollTop = 115; workspace.rememberScroll(); pages.scrollTop = 0; body.scrollTop = 0;
  workspace.restoreScroll(); assert.equal(pages.scrollTop, 45); assert.equal(body.scrollTop, 115);
  assert.equal(W.CATEGORIES.length, 7); assert.equal(W.VIEWS.length, 5);
});
