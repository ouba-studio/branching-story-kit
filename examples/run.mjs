/**
 * Headless play-through of "The Midnight Bookshop" using branching-story-kit.
 *
 *   node examples/run.mjs            # plays the archive → trust route, then prints the save file
 *   node examples/run.mjs --all      # additionally walks every authored route to an ending
 *
 * @license MIT — Ouba Studio (https://www.ouba.art/)
 */
import { StoryEngine, validateStory } from "../index.mjs";
import { story } from "./midnight-bookshop.mjs";

const report = validateStory(story);
if (!report.valid) {
  console.error("Story manifest is invalid:\n" + report.errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

const strip = (html) => String(html).replace(/<[^>]+>/g, "");
const playRoute = (labels, { customLine } = {}) => {
  const engine = new StoryEngine(story);
  const log = [];
  let scene = engine.current();
  log.push(`[${scene.id}] ${scene.title}`);
  for (const label of labels) {
    const idx = scene.choices.findIndex((c) => c.label === label);
    if (idx === -1) throw new Error(`Choice not available at '${scene.id}': ${label}`);
    scene = engine.choose(idx);
    log.push(`  → ${scene.state.spark}/${scene.state.trust}  [${scene.id}] ${scene.title}`);
  }
  if (customLine) {
    engine.set("customLine", customLine);
    engine.set("spark", engine.state.spark + 2);
    engine.remember(customLine);
    scene = engine.jump("end_custom");
    log.push(`  → ${scene.state.spark}/${scene.state.trust}  [${scene.id}] ${scene.title} (free-text steering)`);
  }
  return { engine, scene, log };
};

const archiveRoute = playRoute(
  [
    "Pull the folded auction receipt from your coat. \"Let's compare notes like adults, Vance.\"",
    "Sit beside him and open the first notebook. \"Then start from page one.\"",
    "Tell him you kept the letter he wrote to you last winter, too.", // gated: requires trust >= 4
  ],
);
console.log(archiveRoute.log.join("\n"));
console.log("\n--- ending prose ---\n" + strip(archiveRoute.scene.body));
console.log("\n--- exportSave() ---\n" + archiveRoute.engine.exportSave());

if (process.argv.includes("--all")) {
  console.log("\n--- every authored route ---");
  const routes = [
    ["Take the mug and hold his gaze. \"You waited twelve minutes past closing just to gloat?\"",
      "\"One where the rivals stop pretending they're arguing about footnotes.\"",
      "Close the distance and kiss him beneath the hanging lantern."],
    ["Step behind the counter to inspect the folio yourself.",
      "Ask why he saved the letter instead of cataloging it.",
      "Lock the front bolt, pour two more mugs, and stay until sunrise translating together."],
  ];
  for (const labels of routes) {
    const { scene, log } = playRoute(labels);
    console.log(log.join("\n"));
    console.log(`  ending=${scene.ending} scene=${scene.id}\n`);
  }
  const custom = playRoute(
    ["Take the mug and hold his gaze. \"You waited twelve minutes past closing just to gloat?\"",
      "\"Show me the rest of the margin notes you kept, Julian.\""],
    { customLine: "Stay until the last page, then walk me home." },
  );
  console.log(custom.log.join("\n"));
  console.log(`  ending=${custom.scene.ending} scene=${custom.scene.id} memory=${custom.engine.memory.length}`);
}
