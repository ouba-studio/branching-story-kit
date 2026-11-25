/**
 * branching-story-kit test-suite — run with `npm test` (i.e. `node --test test.mjs`).
 * Zero dependencies: only node:test + node:assert/strict.
 *
 * @license MIT — Ouba Studio (https://www.ouba.art/)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { StoryEngine, validateStory } from "./index.mjs";
import { story as bookshop } from "./examples/midnight-bookshop.mjs";

const sampleStory = {
  id: "midnight-bookshop-mini",
  start: "intro",
  initialState: { spark: 1, trust: 0, reader: "Clara" },
  scenes: {
    intro: {
      title: "Rain on the Glass",
      body: "Welcome back, {{reader}}. Spark={{spark}}.",
      choices: [
        { label: "Hand over the rare folio", next: "warm", effects: { spark: 2, trust: 2 } },
        { label: "Keep it locked", next: "guarded", requires: { trust: 5 } },
      ],
    },
    warm: { title: "Shared Lamp", body: "Trust rose to {{trust}}.", ending: true },
    guarded: { title: "Locked Case", body: "Guarded.", ending: true },
  },
};

const label = (scene, text) => scene.choices.findIndex((c) => c.label === text);

test("validateStory: accepts a well-formed manifest", () => {
  const v = validateStory(sampleStory);
  assert.equal(v.valid, true, v.errors.join(", "));
  assert.deepEqual(v.errors, []);
});

test("validateStory: flags missing start, broken links, unlabeled choices", () => {
  const v = validateStory({
    start: "nope",
    scenes: {
      a: { title: "A", body: "x", choices: [{ next: "ghost" }, { label: "No target" }] },
      b: { title: "B", choices: [] },
    },
  });
  assert.equal(v.valid, false);
  assert.match(v.errors.join("\n"), /Start scene 'nope' not found/);
  assert.match(v.errors.join("\n"), /'a' links to missing scene 'ghost'/);
  assert.match(v.errors.join("\n"), /has a choice without a label/);
  assert.match(v.errors.join("\n"), /has a choice without next or href/);
  assert.match(v.errors.join("\n"), /'b' has no body text/);
});

test("validateStory: href choices are valid without a next scene", () => {
  const v = validateStory({
    start: "end",
    scenes: { end: { title: "End", body: "bye", ending: true, choices: [{ label: "Ouba", href: "https://www.ouba.art/" }] } },
  });
  assert.equal(v.valid, true, v.errors.join(", "));
});

test("validateStory: never throws on garbage input", () => {
  for (const bad of [null, undefined, {}, { start: 1 }, { start: "a", scenes: [] }]) {
    const v = validateStory(bad);
    assert.equal(v.valid, false);
    assert.ok(Array.isArray(v.errors) && v.errors.length > 0);
  }
});

test("constructor: rejects invalid manifests and unknown start scenes", () => {
  assert.throws(() => new StoryEngine(null), /Invalid story manifest/);
  assert.throws(() => new StoryEngine({}), /Invalid story manifest/);
  assert.throws(() => new StoryEngine({ start: "a", scenes: {} }), /Start scene 'a' is not defined/);
});

test("current(): interpolates {{state}} placeholders and hides gated choices", () => {
  const engine = new StoryEngine(sampleStory);
  const s0 = engine.current();
  assert.equal(s0.id, "intro");
  assert.equal(s0.title, "Rain on the Glass");
  assert.equal(s0.body, "Welcome back, Clara. Spark=1.");
  assert.equal(s0.ending, false);
  assert.equal(s0.choices.length, 1, "requires filter should hide the guarded choice");
  assert.equal(engine.turn, 1);
});

test("interpolate(): leaves unknown placeholders intact and tolerates spacing", () => {
  const engine = new StoryEngine(sampleStory);
  assert.equal(engine.interpolate("Hi {{ reader }} / {{ missing }}"), "Hi Clara / {{ missing }}");
  assert.equal(engine.interpolate(undefined), "");
});

test("choose(): applies numeric + literal effects, advances, and records history", () => {
  const engine = new StoryEngine(sampleStory);
  const s1 = engine.choose(0);
  assert.equal(s1.id, "warm");
  assert.equal(s1.ending, true);
  assert.equal(s1.state.spark, 3);
  assert.equal(s1.state.trust, 2);
  assert.deepEqual(engine.history, ["intro", "warm"]);
  assert.equal(engine.turn, 2);

  const literal = new StoryEngine({ start: "a", scenes: {
    a: { title: "A", body: "{{flag}}", choices: [{ label: "go", next: "b", effects: { flag: "taken", vip: true } }] },
    b: { title: "B", body: "{{flag}}/{{vip}}" },
  } });
  assert.equal(literal.choose(0).body, "taken/true");
});

test("choose(): throws on out-of-bounds indexes and on href-only choices", () => {
  const engine = new StoryEngine(sampleStory);
  assert.throws(() => engine.choose(7), /out of bounds/);
  assert.throws(() => engine.choose(-1), /out of bounds/);

  const linked = new StoryEngine({ start: "a", scenes: {
    a: { title: "A", body: "x", choices: [{ label: "Ouba", href: "https://www.ouba.art/" }] },
  } });
  assert.equal(linked.current().choices[0].href, "https://www.ouba.art/");
  assert.throws(() => linked.choose(0), /external link/);
});

test("requires: gated choices appear once the threshold is met", () => {
  const engine = new StoryEngine(sampleStory, { trust: 5 });
  assert.equal(engine.current().choices.length, 2);
  assert.equal(engine.choose(1).id, "guarded");
});

test("set(): writes state directly and feeds interpolation", () => {
  const engine = new StoryEngine(sampleStory);
  engine.set("reader", "Theo");
  assert.equal(engine.current().body, "Welcome back, Theo. Spark=1.");
  assert.equal(engine.state.reader, "Theo");
});

test("remember(): logs trimmed facts with turn numbers and ignores blanks", () => {
  const engine = new StoryEngine(sampleStory);
  engine.remember("  Reader returned the missing folio  ");
  engine.remember("");
  engine.remember("   ");
  engine.remember(null);
  assert.deepEqual(engine.memory, [{ turn: 1, fact: "Reader returned the missing folio" }]);
  engine.choose(0);
  engine.remember("Second fact");
  assert.equal(engine.memory[1].turn, 2);
});

test("jump(): navigates directly, applies effects, and rejects unknown scenes", () => {
  const engine = new StoryEngine(sampleStory);
  const s = engine.jump("warm", { trust: 4 });
  assert.equal(s.id, "warm");
  assert.equal(s.state.trust, 4);
  assert.deepEqual(engine.history, ["intro", "warm"]);
  assert.throws(() => engine.jump("does-not-exist"), /Unknown scene/);
});

test("exportSave() / importSave(): full round-trip of cursor, state, history, and memory", () => {
  const engine = new StoryEngine(sampleStory);
  engine.remember("My cat's name is Marmalade.");
  engine.choose(0);
  const saved = JSON.parse(engine.exportSave());
  assert.equal(saved.storyId, "midnight-bookshop-mini");
  assert.equal(saved.history.length, 2);
  assert.equal(saved.memory.length, 1);

  const restored = StoryEngine.importSave(engine.exportSave(), sampleStory);
  assert.equal(restored.sceneId, "warm");
  assert.deepEqual(restored.state, engine.state);
  assert.deepEqual(restored.history, engine.history);
  assert.deepEqual(restored.memory, engine.memory);
  assert.deepEqual(restored.current(), engine.current());

  // Restored memory must be an independent copy, not a shared reference
  restored.remember("new fact");
  assert.equal(engine.memory.length, 1);
});

test("importSave(): rejects malformed or inconsistent save data", () => {
  assert.throws(() => StoryEngine.importSave("{not json", sampleStory), /not valid JSON/);
  assert.throws(() => StoryEngine.importSave("{}", sampleStory), /missing sceneId or history/);
  assert.throws(
    () => StoryEngine.importSave(JSON.stringify({ sceneId: "ghost", history: ["ghost"], state: {} }), sampleStory),
    /unknown scene 'ghost'/,
  );
});

test("current(): throws when the cursor lands on an undefined scene", () => {
  const engine = new StoryEngine(sampleStory);
  engine.sceneId = "ghost";
  assert.throws(() => engine.current(), /Unknown scene: ghost/);
});

test("example story: 'The Midnight Bookshop' validates and every scene is reachable", () => {
  const v = validateStory(bookshop);
  assert.equal(v.valid, true, v.errors.join(", "));
  const ids = Object.keys(bookshop.scenes);
  // Scenes reached only through engine.jump() (the free-text prompt) are not linked via `next`.
  const dynamic = new Set(["end_custom"]);
  const reachable = new Set();
  const queue = [bookshop.start];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const c of bookshop.scenes[id].choices || []) if (c.next) queue.push(c.next);
  }
  assert.deepEqual(
    [...reachable].sort(),
    ids.filter((id) => !dynamic.has(id)).sort(),
    "every statically linked scene should be reachable from start",
  );
  for (const id of dynamic) assert.ok(bookshop.scenes[id], `dynamic scene ${id} must exist`);
  assert.ok(ids.filter((id) => bookshop.scenes[id].ending).length >= 4, "at least four authored endings");
});

test("example story: trust-gated letter ending only appears on the high-trust route", () => {
  const gatedLabel = "Tell him you kept the letter he wrote to you last winter, too.";
  const sparkRoute = new StoryEngine(bookshop);
  sparkRoute.choose(label(sparkRoute.current(), "Take the mug and hold his gaze. \"You waited twelve minutes past closing just to gloat?\""));
  sparkRoute.choose(label(sparkRoute.current(), "\"One where the rivals stop pretending they're arguing about footnotes.\""));
  assert.equal(sparkRoute.current().choices.some((c) => c.label === gatedLabel), false);

  const trustRoute = new StoryEngine(bookshop);
  trustRoute.choose(label(trustRoute.current(), "Pull the folded auction receipt from your coat. \"Let's compare notes like adults, Vance.\""));
  assert.equal(trustRoute.current().body.includes("Auction Receipt"), false, "scene 2 should not mention the item yet");
  trustRoute.choose(label(trustRoute.current(), "Sit beside him and open the first notebook. \"Then start from page one.\""));
  const turning = trustRoute.current();
  assert.equal(turning.state.trust, 5);
  assert.ok(turning.body.includes("Auction Receipt"), "{{item}} should interpolate into scene 3");
  const letter = turning.choices.find((c) => c.label === gatedLabel);
  assert.ok(letter, "gated choice should be visible when trust >= 4");
  assert.equal(trustRoute.choose(label(turning, gatedLabel)).id, "end_letter");
});

test("example story: free-text steering writes {{customLine}} into the custom ending", () => {
  const engine = new StoryEngine(bookshop);
  engine.choose(0);
  engine.choose(0);
  const line = "Stay until the last page, then walk me home.";
  engine.set("customLine", line);
  engine.set("spark", engine.state.spark + 2);
  engine.remember(line);
  const ending = engine.jump("end_custom");
  assert.equal(ending.ending, true);
  assert.ok(ending.body.includes(line));
  assert.equal(engine.memory.length, 1);
  assert.ok(ending.choices.every((c) => c.href), "ending links out to Ouba and IFDB");
});

test("package metadata: name, license, homepage, repository, and author are publication-ready", () => {
  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  assert.equal(pkg.name, "@ouba-studio/branching-story-kit");
  assert.equal(pkg.version, "1.0.0");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.homepage, "https://www.ouba.art");
  assert.equal(pkg.author, "Ouba Studio <team@ouba.art>");
  assert.match(pkg.repository.url, /github\.com\/ouba-studio\/branching-story-kit/);
  assert.equal(pkg.type, "module");
  assert.deepEqual(pkg.dependencies ?? {}, {}, "package must stay zero-dependency");
  for (const kw of ["interactive-fiction", "branching-narrative", "visual-novel", "romance", "story-engine", "esm", "zero-dependency"]) {
    assert.ok(pkg.keywords.includes(kw), `missing keyword ${kw}`);
  }
  assert.equal(pkg.exports["."].import, "./index.mjs");
  assert.equal(pkg.exports["."].types, "./index.d.ts");
});

test("story.schema.json: parses and describes the manifest contract", () => {
  const schema = JSON.parse(readFileSync(new URL("./story.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.required.join(","), "start,scenes");
  assert.ok(schema.$defs.choice);
  assert.ok(schema.properties.scenes.additionalProperties.$ref.endsWith("/scene"));
});
