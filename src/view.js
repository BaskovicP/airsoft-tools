/* Small keyed DOM reconciler: retain canvas bitmaps, focus and event handlers.
   Templates are generated locally by app.js; no untrusted HTML is accepted. */
(function (root) {
  "use strict";
  const key = node => node.nodeType === 1 ? node.getAttribute("id") || node.getAttribute("data-view-key") : null;
  const compatible = (a, b) => a && a.nodeType === b.nodeType && a.nodeName === b.nodeName && key(a) === key(b);
  function patchNode(current, next) {
    if (current.nodeType !== 1) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return;
    }
    // data-live leaves belong to the frame renderer, not the shot template.
    if (current.hasAttribute("data-live")) return;
    for (const attribute of Array.from(current.attributes)) {
      if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
    }
    for (const attribute of Array.from(next.attributes)) {
      if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
    }
    patchChildren(current, next);
  }
  function patchChildren(current, next) {
    let cursor = current.firstChild;
    for (const wanted of Array.from(next.childNodes)) {
      let match = compatible(cursor, wanted) ? cursor : null;
      if (!match && key(wanted)) match = Array.from(current.childNodes).find(node => compatible(node, wanted));
      if (!match) {
        match = wanted.cloneNode(true);
        current.insertBefore(match, cursor);
      } else {
        if (match !== cursor) current.insertBefore(match, cursor);
        patchNode(match, wanted);
      }
      cursor = match.nextSibling;
    }
    while (cursor) { const following = cursor.nextSibling; current.removeChild(cursor); cursor = following; }
  }
  const api = { patchChildren };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticView = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
