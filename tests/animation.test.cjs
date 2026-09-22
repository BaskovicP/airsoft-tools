const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/physics.js");
const B = require("../src/playback.js");
const A = require("../src/animation.js");

function context() {
  const calls = [], state = { depth: 0 };
  const numeric = (method, args) => args.forEach(value => { if (typeof value === "number") assert.ok(Number.isFinite(value), `${method}: nonfinite coordinate`); });
  return new Proxy(state, { get(object, method) {
    if (method === "calls") return calls;
    if (method === "depth") return object.depth;
    if (method === "save") return () => object.depth++;
    if (method === "restore") return () => { assert.ok(object.depth > 0); object.depth--; };
    if (String(method).startsWith("create")) return (...args) => { numeric(method, args); return { addColorStop(at) { assert.ok(at >= 0 && at <= 1); } }; };
    return (...args) => { numeric(method, args); if (method === "rect" || method === "fillRect" || method === "strokeRect") assert.ok(args[2] >= 0 && args[3] >= 0); if (method === "arc") assert.ok(args[2] >= 0); calls.push([method, ...args]); };
  } });
}
const format = (v, digits = 2) => Number.isFinite(v) ? v.toFixed(digits) : "—";

test("rich cutaway uses finite canvas geometry at every sampled default and airbrake frame", () => {
  for (const setup of [{}, { airbrakeLength: 20, airbrakeTaper: 2 }, { strokeLength: 60, barrelLength: 200 }, { bumperThickness: 4, restitution: 0 }]) {
    const p = P.normalize(setup), shot = P.simulate(p); assert.ok(shot.valid);
    const before = JSON.stringify(shot);
    for (const [w, h] of [[950, 330], [310, 265]]) {
      for (const f of shot.frames.filter((_, i) => i % 4 === 0)) {
        const ctx = context(); A.draw(ctx, w, h, p, shot, f, (en, hr) => w === 310 ? hr : en, format); assert.equal(ctx.depth, 0);
      }
    }
    assert.equal(JSON.stringify(shot), before, "drawing must never mutate the simulation");
  }
});

test("installed bumper is visible and gets a contact-state deformation cue", () => {
  const p = P.normalize({ bumperThickness: 4, restitution: 0 }), shot = P.simulate(p), layout = B.mechanism(p, 0);
  assert.ok(shot.valid && shot.pistonHitTime !== null && layout.bumperWidth > 0);
  const before = context(); A.draw(before, 950, 330, p, shot, shot.frames[0], en => en, format);
  const atContact = context(); A.draw(atContact, 950, 330, p, shot, B.frameAt(shot, shot.pistonHitTime), en => en, format);
  const padRects = ctx => ctx.calls.filter(([method, x, , width]) => method === "fillRect" && Math.abs(x - layout.head) < 1e-9 && Math.abs(width - layout.bumperWidth) < 1e-9);
  assert.equal(padRects(before).length, 2); assert.equal(padRects(atContact).length, 2);
  assert.ok(padRects(atContact)[0][2] < padRects(before)[0][2], "contact cue should bulge the pad radially");
});

test("piston front face uses solver position even on pressure-driven reverse travel", () => {
  const p = P.normalize({ airbrakeLength: 20, airbrakeTaper: 2 }), shot = P.simulate(p);
  const frames = [shot.frames[0], shot.frames.find(frame => frame.pistonV < -.1), shot.frames.at(-1)];
  for (const f of frames) {
    assert.ok(f); const ctx = context(); A.draw(ctx, 900, 330, p, shot, f, en => en, format);
    const layout = B.mechanism(p, f.pistonX);
    assert.ok(ctx.calls.some(([method, x, y, width, height]) => method === "fillRect" && x === layout.face - 32 && width === 32 && height === 98));
  }
});

test("BB is not held at the muzzle after exit and plume never precedes exit", () => {
  const p = P.normalize(), shot = P.simulate(p);
  for (const time of [0, shot.exitTime / 2, shot.exitTime + .005]) {
    const f = B.frameAt(shot, time), ctx = context(); A.draw(ctx, 950, 330, p, shot, f, en => en, format);
    const bbSpheres = ctx.calls.filter(([method, , , radius]) => method === "arc" && radius === 8);
    assert.equal(bbSpheres.length, time > shot.exitTime ? 0 : 1);
    const plumeArcs = ctx.calls.filter(([method, x]) => method === "arc" && x > 1040);
    if (time < shot.exitTime) assert.equal(plumeArcs.length, 0);
  }
});
