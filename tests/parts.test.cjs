const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/physics.js");
const Parts = require("../src/parts.js");

const en = value => value;
const hr = (english, croatian) => croatian;

test("parts atlas covers every direct part field and every non-caliper model input", () => {
  const p = P.normalize(), html = Parts.markup(p, en);
  for (const key of Parts.PART_FIELDS) assert.match(html, new RegExp(`data-field="${key}"`));
  for (const key of Parts.MODEL_FIELDS) assert.match(html, new RegExp(`data-field="${key}"`));
  assert.match(html, /Head receiving-bore diameter/);
  assert.match(html, /Pin gauges/);
  assert.match(html, /not metrology-grade CAD|numeric labels are the exact current inputs/i);
  assert.doesNotMatch(html, /NaN|Infinity|undefined|null/);
});

test("airbrake endpoint explanation follows bumper and head geometry", () => {
  const insideBumper = Parts.markup(P.normalize({ airbrakeLength: 4, bumperThickness: 6, headLength: 12 }), en);
  const insideHead = Parts.markup(P.normalize({ airbrakeLength: 10, bumperThickness: 6, headLength: 12 }), en);
  const insideNozzle = Parts.markup(P.normalize({ airbrakeLength: 22, bumperThickness: 6, headLength: 12, nozzleLength: 15 }), en);
  assert.match(insideBumper, /Pin tip ends inside the bumper/);
  assert.match(insideHead, /Pin tip ends in the metal receiving bore/);
  assert.match(insideNozzle, /Pin tip reaches the downstream nozzle/);
});

test("current dimensions are rendered dynamically in English and Croatian", () => {
  const p = P.normalize({ headBore: 4.37, bumperBore: 6.12, airbrakeDiameter: 3.66, pistonMass: 76.4, barrelLength: 303 });
  const english = Parts.markup(p, en), croatian = Parts.markup(p, hr);
  assert.match(english, /4\.37 mm/); assert.match(english, /6\.12 mm/); assert.match(english, /76\.4 g/); assert.match(english, /303\.0 mm/);
  assert.match(croatian, /Promjer ulaznog provrta glave/); assert.match(croatian, /Dijelovi i reference mjerenja/); assert.match(croatian, /trenutačna konfiguracija/);
});

test("spring atlas distinguishes direct and length modes without mutating setup", () => {
  const direct = P.normalize({ springLengthMode: 0, springPreload: 54 });
  const snapshot = JSON.stringify(direct), directHtml = Parts.markup(direct, en);
  const lengthHtml = Parts.markup(P.normalize({ springLengthMode: 1, springFreeLength: 250, springInstalledLength: 145, springCutLength: 10, springActiveCoils: 30, springRemovedCoils: 2, springSolidLength: 78, bumperThickness: 3 }), en);
  assert.equal(JSON.stringify(direct), snapshot);
  assert.match(directHtml, /Direct compression mode/); assert.match(directHtml, /54\.0 mm/);
  assert.match(lengthHtml, /Length mode active/); assert.match(lengthHtml, /Resulting free length/); assert.match(lengthHtml, /simulated cut 10\.0 mm/);
});
