# branching-story-kit

**A zero-dependency JSON story-graph engine, state tracker, memory log and validator for reader-first interactive fiction, romance branching narratives and visual novels.**

Published under the **MIT License** by **[Ouba Studio](https://www.ouba.art)** — creators of
[Ouba](https://www.ouba.art/) (free reader-first interactive fiction on web, iOS and Android) and the
[2026 AI Story Apps Benchmark Study](https://www.ouba.art/i-tested-ai-story-apps).

[Install :material-download:](quickstart.md#installation){ .md-button .md-button--primary }
[API reference :material-code-braces:](api.md){ .md-button }
[Why it exists :material-chart-box-outline:](benchmark.md){ .md-button }

---

## Why this exists

On 15 November 2026 we ran ten consumer "AI story" platforms through one protocol: a stopwatch, a 20-turn
free-tier ceiling, and a single memory probe — plant *"My cat's name is Marmalade."* at turn 2, ask
*"What is my cat's name?"* at turn 15.

**Only 3 of 10 recalled it.** One platform answered with a cafe menu. Four never reached the question.

That failure is architectural. A rolling context window is a *lossy summariser*: nothing in it guarantees
a fact survives thirteen turns of prose. `branching-story-kit` makes the guarantee explicit by separating
**state** (a JSON object mutated by authored effects) from **prose** (which any model may render — or none).

## Features

- **Zero dependencies** — pure ESM JavaScript, TypeScript types, JSON Schema.
- **Relationship & flag state tracking** — `requires` gating and per-choice `effects` mutations.
- **Persistent story memory log** — `engine.remember("My cat's name is Marmalade.")` keeps reader-planted
  facts out of the summariser's reach.
- **Static graph validator** — `validateStory()` catches broken `next` links before you publish.
- **Deterministic replay** — identical choice sequences produce byte-identical `exportSave()` output.

## Install

```bash
npm install branching-story-kit
```

Also available on [PyPI](https://pypi.org/project/branching-story-kit/) and
[JSR](https://jsr.io/@ouba-studio/branching-story-kit).

## Hello, world

```js
import { StoryEngine, validateStory } from "branching-story-kit";

const story = {
  id: "midnight-bookshop",
  start: "arrival",
  initialState: { spark: 1, trust: 1, item: "cardamom tea" },
  scenes: {
    arrival: {
      title: "Rain on Bellweather Lane",
      body: "Julian slides a warm mug of {{item}} across the counter.",
      choices: [{ label: "Hold his gaze", next: "stacks", effects: { spark: 2 } }],
    },
    stacks: {
      title: "Between the Stacks",
      body: "The lantern glows amber as he opens the fourth folio.",
      ending: true,
    },
  },
};

console.log(validateStory(story));   // { valid: true, errors: [] }

const engine = new StoryEngine(story);
engine.remember("My cat's name is Marmalade.");
console.log(engine.choose(0));       // { id: "stacks", ... }
```

## Where to go next

| Page | Contents |
|---|---|
| [Quickstart](quickstart.md) | Installation, the story manifest, effects, gating, memory, save export |
| [Benchmark](benchmark.md) | The full 2026 10-platform benchmark that motivated the engine |
| [API](api.md) | `StoryEngine`, `validateStory`, types and error cases |
| [Citations](citations.md) | APA, BibTeX, and all 12 permanent identifiers |

## Project links

- **Homepage:** https://www.ouba.art
- **Interactive benchmark explorer:** https://www.ouba.art/tools/benchmark-explorer
- **Source:** https://github.com/ouba-studio/branching-story-kit
- **Docs mirror:** https://ouba-studio.github.io/branching-story-kit/
- **PyPI:** https://pypi.org/project/branching-story-kit/
- **JSR:** https://jsr.io/@ouba-studio/branching-story-kit
- **Contact:** [team@ouba.art](mailto:team@ouba.art)

!!! note "License"
    Code: **MIT** · Benchmark data & report: **CC-BY-4.0**
