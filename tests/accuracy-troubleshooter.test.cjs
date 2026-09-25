const test = require("node:test");
const assert = require("node:assert/strict");
const Accuracy = require("../src/accuracy-troubleshooter.js");

test("exposes the five requested visible symptoms", () => {
  assert.deepEqual(Object.keys(Accuracy.SYMPTOMS), ["vertical", "lateral", "flyers", "range", "intermittent"]);
});

test("decision tree branches according to answers and reaches a leaf", () => {
  let result = Accuracy.analyze("vertical", {});
  assert.equal(result.currentQuestion.id, "v_chrono");
  result = Accuracy.analyze("vertical", { v_chrono: "yes" });
  assert.equal(result.currentQuestion.id, "v_mag");
  result = Accuracy.analyze("vertical", { v_chrono: "yes", v_mag: "yes" });
  assert.equal(result.completed, true);
  assert.equal(result.currentQuestion, null);
});

test("a fault that follows one magazine ranks magazine first", () => {
  const result = Accuracy.analyze("intermittent", { i_pattern: "feed", i_mag: "yes" });
  assert.equal(result.completed, true);
  assert.equal(result.rankedCauses[0].id, "magazine");
});

test("stable chrono with off-centre hop contact prioritizes nub alignment", () => {
  const result = Accuracy.analyze("lateral", { l_direction: "same", l_cant: "no", l_window: "no" });
  assert.equal(result.rankedCauses[0].id, "nub");
  assert.equal(result.completed, true);
});

test("checklist stays ordered from non-invasive checks toward internals", () => {
  const result = Accuracy.analyze("flyers", { f_chrono: "yes", f_mag: "no", f_clean: "unknown", f_bucking: "unknown" });
  const orders = result.checklist.map(item => item.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.ok(result.checklist.some(item => item.id === "airseal"));
});

test("invalid symptom returns a safe empty analysis", () => {
  assert.deepEqual(Accuracy.analyze("missing"), { path: [], currentQuestion: null, completed: false, rankedCauses: [], checklist: [] });
});

test("every answer branch terminates without cycles or missing questions", () => {
  function visit(questionId, seen = new Set()) {
    assert.ok(Accuracy.QUESTIONS[questionId], `missing question ${questionId}`);
    assert.ok(!seen.has(questionId), `cycle at ${questionId}`);
    const nextSeen = new Set(seen).add(questionId);
    for (const answer of Accuracy.QUESTIONS[questionId].options) {
      for (const cause of Object.keys(answer.scores)) assert.ok(Accuracy.CAUSES[cause], `missing cause ${cause}`);
      if (answer.next) visit(answer.next, nextSeen);
    }
  }
  for (const symptom of Object.values(Accuracy.SYMPTOMS)) visit(symptom.root);
});
