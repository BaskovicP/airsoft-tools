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

test("every numeric setup field has specific bilingual contextual help", () => {
  const expected = Object.keys(P.DEFAULTS).filter(key => !["springCurve", "springLengthMode"].includes(key)).sort();
  assert.deepEqual([...Parts.HELP_FIELDS].sort(), expected);
  for (const key of expected) {
    assert.ok(Parts.help(key, en).length >= 45, `${key} needs a specific English explanation`);
    assert.ok(Parts.help(key, hr).length >= 45, `${key} needs a specific Croatian explanation`);
  }
  assert.match(Parts.help("headLength", en), /Axial length.*receiving bore.*downstream nozzle/i);
  assert.match(Parts.help("nozzleBore", hr), /unutarnji promjer.*ulaznog provrta.*hop komore/i);
  assert.equal(Parts.help("notAField", en), "");
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

test("silencer atlas identifies every internal measurement and calculated free volume", () => {
  const html = Parts.markup(P.normalize({ silencerEnabled: 1, silencerLength: 180, silencerInnerDiameter: 30, silencerBaffleCount: 6, silencerBaffleThickness: 2.5, silencerBaffleBore: 8.5, silencerEndCapBore: 9, silencerPackingFraction: .2 }), en);
  assert.match(html, /Silencer expansion chamber/);
  assert.match(html, /internal expansion length 180\.0 mm/);
  assert.match(html, /baffle bore Ø 8\.50 mm/);
  assert.match(html, /end cap Ø 9\.00 mm/);
  assert.match(html, /6 × 2\.50 mm · fill 20\.0%/);
  assert.match(html, /Calculated free gas volume/);
  assert.match(html, /does not certify BB-strike clearance or predict dB/);
});
