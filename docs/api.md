# API reference

Everything is exported from the package root.

```js
import { StoryEngine, validateStory } from "branching-story-kit";
```

---

## `class StoryEngine`

```ts
new StoryEngine(story: Story, initialState?: Record<string, unknown>): StoryEngine
```

Creates a playthrough. `initialState` is merged over `story.initialState`.

**Throws** `Error("Invalid story manifest: expected { start, scenes }")` if `story` is missing,
has no `scenes` object, or has no `start` id.

### Properties

| Property | Type | Description |
|---|---|---|
| `story` | `Story` | The manifest this engine was constructed with |
| `sceneId` | `string` | Current scene id |
| `state` | `Record<string, unknown>` | Mutable story state (numbers, strings, booleans, inventory) |
| `history` | `string[]` | Ordered scene ids visited, starting with `start` |
| `memory` | `{ turn: number; fact: string }[]` | Append-only log of planted facts |

---

### `current(): Scene`

Returns the current scene with `requires`-filtered choices.

```ts
interface Scene {
  id: string;
  title: string;
  body: string;        // {{key}} placeholders already interpolated from state
  choices: Choice[];
  ending: boolean;
  state: Record<string, unknown>;   // shallow copy
}
```

**Throws** `Error("Unknown scene: <id>")` if `sceneId` is not in `story.scenes`.

A choice is available when it has no `requires`, or when every entry satisfies
`state[key] >= minVal` (missing keys are treated as `0`).

---

### `choose(index: number): Scene`

Applies the chosen choice's `effects`, advances to `choice.next`, pushes the new scene id onto `history`,
and returns the new `current()` scene.

- Numeric effects are **added**: `state[k] = (Number(state[k]) || 0) + delta`.
- Non-numeric effects are **assigned**.
- If the choice carries a `plant` string, `remember(plant)` is called before advancing.

**Throws** `Error("Choice index <n> out of bounds")` when the index does not resolve to an available choice
(including choices hidden by `requires`).

---

### `remember(fact: string): MemoryEntry[]`

Appends `{ turn: history.length, fact }` to `memory` and returns the log.

Blank or falsy facts are ignored. **Nothing in the engine ever removes or rewrites an entry** — this is the
property that makes long-session recall reliable.

```js
engine.remember("My cat's name is Marmalade.");
// [{ turn: 2, fact: "My cat's name is Marmalade." }]
```

---

### `interpolate(text: string): string`

Replaces `{{key}}` with `String(state[key])`. Unknown keys are left as-is so typos are visible rather than silent.

```js
engine.interpolate("A mug of {{item}}.");   // "A mug of cardamom tea."
engine.interpolate("{{nope}}");             // "{{nope}}"
```

---

### `exportSave(): string`

Returns a JSON string of the full playthrough. Deterministic: the same choice sequence always produces the
same bytes.

```json
{
  "storyId": "midnight-bookshop",
  "sceneId": "stacks",
  "state": { "spark": 3, "trust": 1, "item": "cardamom tea" },
  "history": ["arrival", "stacks"],
  "memory": [{ "turn": 2, "fact": "My cat's name is Marmalade." }]
}
```

---

## `validateStory(story): ValidationResult`

Static graph check. Safe to run in CI.

```ts
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

| Condition | Error message |
|---|---|
| `start` missing | `Missing start scene id` |
| `scenes` missing or not an object | `Missing scenes object` |
| `start` id not in `scenes` | `Start scene '<id>' not found` |
| A choice points at a missing scene | `Scene '<id>' links to missing scene '<next>'` |

```js
validateStory({ start: "nope", scenes: { a: { choices: [{ next: "ghost" }] } } });
// { valid: false, errors: ["Start scene 'nope' not found", "Scene 'a' links to missing scene 'ghost'"] }
```

---

## Types

```ts
interface Story {
  id?: string;
  start: string;
  initialState?: Record<string, unknown>;
  scenes: Record<string, Scene>;
}

interface Scene {
  title?: string;
  body?: string;
  ending?: boolean;
  choices?: Choice[];
}

interface Choice {
  label: string;
  next: string;
  requires?: Record<string, number>;
  effects?: Record<string, number | string | boolean | null>;
  plant?: string;        // convenience: calls remember(plant) on choose
}

interface MemoryEntry {
  turn: number;
  fact: string;
}
```

---

## Error summary

| Throw site | Message |
|---|---|
| `new StoryEngine()` | `Invalid story manifest: expected { start, scenes }` |
| `current()` | `Unknown scene: <sceneId>` |
| `choose()` | `Choice index <n> out of bounds` |

All errors are plain `Error` instances — catch them with a normal `try/catch`.

---

## TypeScript

Declarations ship with the package (`index.d.ts`). The engine is structurally typed, so a JSON manifest
straight off disk type-checks after a single cast:

```ts
import story from "./story.json" assert { type: "json" };
const engine = new StoryEngine(story as Story);
```
