const test = require("node:test");
const assert = require("node:assert/strict");
const { patchChildren } = require("../src/view.js");

// Minimal DOM contract used by the reconciler. No browser or runtime dependency.
class Node {
  constructor(name, attributes = {}, children = []) {
    this.nodeType = name === "#text" ? 3 : 1; this.nodeName = name;
    this.attrs = { ...attributes }; this.childNodes = []; this.parentNode = null;
    children.forEach(node => this.insertBefore(node, null));
  }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() { const nodes = this.parentNode?.childNodes || []; return nodes[nodes.indexOf(this) + 1] || null; }
  get attributes() { return Object.entries(this.attrs).map(([name, value]) => ({ name, value })); }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
  getAttribute(name) { return this.hasAttribute(name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; }
  insertBefore(node, before) {
    if (node === before) return;
    if (node.parentNode) node.parentNode.removeChild(node);
    this.childNodes.splice(before ? this.childNodes.indexOf(before) : this.childNodes.length, 0, node); node.parentNode = this;
  }
  cloneNode(deep) { const node = new Node(this.nodeName, this.attrs, deep ? this.childNodes.map(child => child.cloneNode(true)) : []); node.nodeValue = this.nodeValue; return node; }
}
const text = value => { const node = new Node("#text"); node.nodeValue = value; return node; };
const el = (name, attrs, children = []) => new Node(name, attrs, children);

test("patch retains stage, canvases, button handlers and live readout nodes across 20 edits", () => {
  const bitmap = {}, handler = () => {};
  const canvas = el("CANVAS", { id: "mechanism", "data-live": "", width: "1600", height: "660" }); canvas.bitmap = bitmap;
  const button = el("BUTTON", { id: "playButton" }, [text("Play")]); button.onclick = handler;
  const live = el("DIV", { id: "liveStrip", "data-live": "" }, [text("42 m/s")]);
  const stage = el("SECTION", { "data-view-key": "stage" }, [button, canvas, live]);
  const graph = el("CANVAS", { id: "pressureChart", "data-live": "", width: "600" });
  const output = el("STRONG", {}, [text("0")]);
  const parent = el("DIV", {}, [stage, graph, output]);
  for (let i = 1; i <= 20; i++) {
    const next = el("DIV", {}, [el("SECTION", { "data-view-key": "stage" }, [
      el("BUTTON", { id: "playButton" }, [text("Play")]), el("CANVAS", { id: "mechanism", "data-live": "" }), el("DIV", { id: "liveStrip", "data-live": "" })
    ]), el("CANVAS", { id: "pressureChart", "data-live": "" }), el("STRONG", {}, [text(String(i))])]);
    patchChildren(parent, next);
    assert.equal(parent.firstChild, stage); assert.equal(stage.childNodes[0], button); assert.equal(button.onclick, handler);
    assert.equal(stage.childNodes[1], canvas); assert.equal(canvas.bitmap, bitmap); assert.equal(canvas.getAttribute("width"), "1600");
    assert.equal(stage.childNodes[2], live); assert.equal(live.firstChild.nodeValue, "42 m/s");
    assert.equal(parent.childNodes[1], graph); assert.equal(parent.childNodes[2], output); assert.equal(output.firstChild.nodeValue, String(i));
  }
});

test("conditional warnings are inserted and removed without replacing keyed neighbors", () => {
  const options = el("DIV", { "data-view-key": "playback-options" });
  const canvas = el("CANVAS", { id: "mechanism", "data-live": "" });
  const parent = el("DIV", {}, [options, text("\n"), canvas]);
  const warning = el("DIV", { "data-view-key": "warning" }, [text("Check reversal")]);
  patchChildren(parent, el("DIV", {}, [warning, options.cloneNode(true), text("\n"), canvas.cloneNode(true)]));
  assert.equal(parent.childNodes[1], options); assert.equal(parent.childNodes[3], canvas);
  patchChildren(parent, el("DIV", {}, [options.cloneNode(true), text("\n"), canvas.cloneNode(true)]));
  assert.equal(parent.firstChild, options); assert.equal(parent.childNodes[2], canvas); assert.equal(parent.childNodes.length, 3);
});

test("event availability updates without replacing buttons or retaining old disabled attributes", () => {
  const button = el("BUTTON", { id: "event", disabled: "" }, [text("Unavailable")]);
  const parent = el("DIV", {}, [button]);
  patchChildren(parent, el("DIV", {}, [el("BUTTON", { id: "event" }, [text("12 ms")])]));
  assert.equal(parent.firstChild, button); assert.equal(button.hasAttribute("disabled"), false); assert.equal(button.firstChild.nodeValue, "12 ms");
  patchChildren(parent, el("DIV", {}, [el("BUTTON", { id: "event", disabled: "" }, [text("Unavailable")])]));
  assert.equal(button.hasAttribute("disabled"), true);
});

test("only changed text or attributes are written", () => {
  const node = el("DIV", { class: "panel" }, [text("unchanged")]);
  node.setAttribute = () => { throw new Error("Unnecessary attribute mutation"); };
  Object.defineProperty(node.firstChild, "nodeValue", { get: () => "unchanged", set: () => { throw new Error("Unnecessary text mutation"); } });
  patchChildren(el("DIV", {}, [node]), el("DIV", {}, [el("DIV", { class: "panel" }, [text("unchanged")])]));
});

test("open result disclosures survive edits without freezing their live contents", () => {
  const details = el("DETAILS", { id: "liveValuesDetails", "data-preserve-open": "", open: "" }, [text("old")]);
  const parent = el("DIV", {}, [details]);
  patchChildren(parent, el("DIV", {}, [el("DETAILS", { id: "liveValuesDetails", "data-preserve-open": "" }, [text("new")])]));
  assert.equal(parent.firstChild, details); assert.equal(details.hasAttribute("open"), true); assert.equal(details.firstChild.nodeValue, "new");
  details.removeAttribute("open");
  patchChildren(parent, el("DIV", {}, [el("DETAILS", { id: "liveValuesDetails", "data-preserve-open": "", open: "" }, [text("updated")])]));
  assert.equal(details.hasAttribute("open"), false); assert.equal(details.firstChild.nodeValue, "updated");
});
