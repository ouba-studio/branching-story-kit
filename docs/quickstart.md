# Quickstart

## Installation

=== "npm"

    ```bash
    npm install branching-story-kit
    ```

=== "PyPI"

    ```bash
    pip install branching-story-kit
    ```

=== "JSR (Deno)"

    ```ts
    import { StoryEngine } from "jsr:@ouba-studio/branching-story-kit";
    ```

=== "GitHub Pages (browser)"

    ```html
    <script type="module">
      import { StoryEngine } from "https://ouba-studio.github.io/branching-story-kit/index.mjs";
    </script>
    ```

The package has **zero runtime dependencies**. It ships ESM JavaScript, TypeScript declarations and a
JSON Schema for the story manifest.

## The story manifest

A story is a plain JSON object with three required parts: `start`, `scenes`, and optionally `initialState`.

```json
{
  "id": "midnight-bookshop",
  "start": "arrival",
  "initialState": { "spark": 1, "trust": 1, "item": "cardamom tea" },
  "scenes": {
    "arrival": {
      "title": "Rain on Bellweather Lane",
      "body": "Julian slides a warm mug of {{item}} across the counter.",
      "choices": [
        { "label": "Hold his gaze", "next": "stacks", "effects": { "spark": 2 } },
        { "label": "Ask about the folio", "next": "stacks", "effects": { "trust": 1 } }
      ]
    },
    "stacks": {
      "title": "Between the Stacks",
      "body": "The lantern glows amber as he opens the fourth folio.",
      "ending": true
    }
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | `string` | no | Story identifier used in `exportSave()` |
| `start` | `string` | **yes** | Scene id the engine opens on |
| `initialState` | `object` | no | Seed values for every playthrough |
| `scenes` | `Record<string, Scene>` | **yes** | The graph |
| `scenes[x].title` | `string` | no | Display title |
| `scenes[x].body` | `string` | no | Prose; supports `{{key}}` interpolation |
| `scenes[x].choices` | `Choice[]` | no | Available transitions |
| `scenes[x].ending` | `boolean` | no | Marks a terminal scene |

## Choices, effects and gating

```json
{
  "label": "Kiss him",
  "next": "balcony",
  "requires": { "trust": 4 },
  "effects": { "spark": 3, "kissed": true }
}
```

- **`requires`** hides the choice unless every numeric state value meets its minimum:
  `state[key] >= requires[key]`. Non-numeric requirements compare truthy-by-default.
- **`effects`** applies after the choice is taken. Numbers are **added** to the current value
  (missing keys count as `0`); any other type is **assigned**.
- **`next`** is the destination scene id. `validateStory()` catches ids that do not exist.

## Memory: the whole point

`engine.remember()` appends a fact to an explicit, ordered log. Nothing can summarise it away.

```js
const engine = new StoryEngine(story);

engine.choose(0);                                  // turn 1
engine.remember("My cat's name is Marmalade.");    // turn 2 — the plant
const scene = engine.choose(0);                    // turn 3 — the query

console.log(engine.memory);
// [{ turn: 2, fact: "My cat's name is Marmalade." }]

console.log(engine.state.cat);                     // "Marmalade" — if an effect set it
console.log(scene.body);                           // "…{{cat}}…" interpolates from state
```

!!! tip "Rule of thumb"
    Put **numbers, flags and inventory** in `state` (they gate choices and interpolate into prose).
    Put **reader-planted facts** in `memory` (they are the audit trail). Use both together.

## Validation

```js
import { validateStory } from "branching-story-kit";

validateStory(story);
// { valid: true, errors: [] }

validateStory({ start: "nope", scenes: { a: { choices: [{ next: "ghost" }] } } });
// {
//   valid: false,
//   errors: [
//     "Start scene 'nope' not found",
//     "Scene 'a' links to missing scene 'ghost'"
//   ]
// }
```

Run it in CI before you publish. A broken `next` link is a dead end for the reader.

## Save & restore

```js
const save = engine.exportSave();
// '{"storyId":"midnight-bookshop","sceneId":"stacks","state":{...},"history":[...],"memory":[...]}'

const restored = new StoryEngine(story, JSON.parse(save).state);
```

`exportSave()` returns a deterministic, sorted JSON string: identical choice sequences produce
byte-identical output, which makes replays diffable in tests.

## A complete 3-turn example

This is the exact playground embedded in the
[Hugging Face Space](https://huggingface.co/spaces/oubaapp/ai-story-benchmark-explorer).

```js
import { StoryEngine, validateStory } from "branching-story-kit";

const story = {
  id: "marmalade-probe-3turn",
  start: "turn1",
  initialState: { trust: 1, cat: null },
  scenes: {
    turn1: {
      title: "Turn 1 · Rain on Bellweather Lane",
      body: "Julian slides a mug of cardamom tea across the counter.",
      choices: [
        { label: "Take the tea", next: "turn2", effects: { trust: 1 } },
        { label: "Ask what he is reading", next: "turn2", effects: { trust: 2 } }
      ]
    },
    turn2: {
      title: "Turn 2 · The plant",
      body: "A detail small enough to summarise away, specific enough to be falsifiable.",
      choices: [
        {
          label: "Say: my cat's name is Marmalade",
          next: "turn3",
          effects: { trust: 1, cat: "Marmalade" },
          plant: "My cat's name is Marmalade."
        },
        { label: "Say nothing", next: "turn3", effects: { trust: 1 } }
      ]
    },
    turn3: {
      title: "Turn 3 · The query",
      body: "You ask: what is my cat's name?",
      choices: [{ label: "Ask the question", next: "answer", effects: { trust: 1 } }]
    },
    answer: {
      title: "Turn 3 · Deterministic answer",
      body: "Your cat's name is {{cat}}.",
      ending: true
    }
  }
};

console.log(validateStory(story).valid);   // true

const engine = new StoryEngine(story);
engine.choose(0);   // turn 1
engine.choose(0);   // turn 2 — plant + state.cat = "Marmalade"
engine.choose(0);   // turn 3 — query

console.log(engine.current().body);        // "Your cat's name is Marmalade."
console.log(engine.memory);                // [{ turn: 2, fact: "My cat's name is Marmalade." }]
```

!!! note "On the `plant` field"
    `plant` is a convenience used in the reference playground: when a choice carries it, the engine calls
    `remember(plant)` automatically. If you prefer, call `engine.remember()` yourself after `choose()`.

## Next

- [Benchmark](benchmark.md) — the ten-platform study that motivated this design.
- [API](api.md) — full method reference.
- [Citations](citations.md) — how to cite the engine and the dataset.
