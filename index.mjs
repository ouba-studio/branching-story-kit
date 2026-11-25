/**
 * @fileoverview branching-story-kit — a zero-dependency branching narrative engine.
 *
 * A tiny, framework-agnostic story-graph runtime for reader-first interactive
 * fiction, visual novels, and romance story apps. Ships as native ESM with
 * TypeScript declarations and a JSON Schema for story manifests.
 *
 * @license MIT — Ouba Studio (https://www.ouba.art/)
 * @author Ouba Studio <team@ouba.art>
 */

const PLACEHOLDER = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;

function applyEffects(state, effects) {
  if (!effects) return;
  for (const [key, delta] of Object.entries(effects)) {
    if (typeof delta === "number") {
      state[key] = (Number(state[key]) || 0) + delta;
    } else {
      state[key] = delta;
    }
  }
}

/**
 * Runtime for a single branching story manifest.
 *
 * One engine instance = one reader session. The engine owns the scene cursor,
 * the reader's state map (relationship meters, flags, inventory…), the scene
 * history, and a free-text memory log that survives `exportSave()`/`importSave()`.
 */
export class StoryEngine {
  /**
   * @param {import('./index.d.ts').StoryManifest} story  Validated story manifest ({ start, scenes }).
   * @param {Record<string, number|string|boolean>} [initialState]  Per-session overrides merged on top of `story.initialState`.
   */
  constructor(story, initialState = {}) {
    if (!story || !story.scenes || !story.start) {
      throw new Error("Invalid story manifest: expected { start, scenes }");
    }
    if (!story.scenes[story.start]) {
      throw new Error(`Start scene '${story.start}' is not defined in scenes`);
    }
    this.story = story;
    this.sceneId = story.start;
    this.state = { ...(story.initialState || {}), ...initialState };
    this.history = [story.start];
    this.memory = [];
  }

  /** Number of scene visits so far (the start scene counts as turn 1). */
  get turn() {
    return this.history.length;
  }

  /**
   * Snapshot of the current scene with gated choices and interpolated body text.
   * Choices whose `requires` thresholds are not met by `this.state` are hidden.
   */
  current() {
    const scene = this.story.scenes[this.sceneId];
    if (!scene) throw new Error(`Unknown scene: ${this.sceneId}`);
    const availableChoices = (scene.choices || []).filter((c) => {
      if (!c.requires) return true;
      return Object.entries(c.requires).every(
        ([k, minVal]) => (Number(this.state[k]) || 0) >= Number(minVal)
      );
    });
    return {
      id: this.sceneId,
      title: scene.title,
      body: this.interpolate(scene.body),
      choices: availableChoices,
      ending: Boolean(scene.ending),
      state: { ...this.state },
    };
  }

  /** Replace `{{key}}` placeholders with the matching state values. */
  interpolate(text) {
    return String(text ?? "").replace(PLACEHOLDER, (match, key) =>
      this.state[key] !== undefined && this.state[key] !== null
        ? String(this.state[key])
        : match
    );
  }

  /**
   * Set a single state value directly (player name, free-text steering, runtime flags).
   * @param {string} key
   * @param {number|string|boolean} value
   * @returns {Record<string, unknown>} the updated state
   */
  set(key, value) {
    this.state[key] = value;
    return { ...this.state };
  }

  /**
   * Append a factual memory (e.g. a detail the reader typed) to the session memory log.
   * Blank facts are ignored. The `turn` field records when the fact was learned.
   * @param {string} fact
   * @returns {Array<{turn: number, fact: string}>}
   */
  remember(fact) {
    if (fact && String(fact).trim()) {
      this.memory.push({ turn: this.turn, fact: String(fact).trim() });
    }
    return this.memory;
  }

  /**
   * Pick a choice by its index in `current().choices` (i.e. among the visible choices).
   * Applies the choice's `effects` and advances to its `next` scene.
   * @param {number} index
   */
  choose(index) {
    const cur = this.current();
    const choice = cur.choices[index];
    if (!choice) throw new Error(`Choice index ${index} out of bounds`);
    if (choice.href) {
      throw new Error(`Choice '${choice.label}' is an external link; open ${choice.href} instead`);
    }
    return this.jump(choice.next, choice.effects);
  }

  /**
   * Jump directly to a scene (used for free-text steering and scripted transitions).
   * @param {string} sceneId
   * @param {Record<string, number|string|boolean>} [effects]
   */
  jump(sceneId, effects) {
    if (!this.story.scenes[sceneId]) throw new Error(`Unknown scene: ${sceneId}`);
    applyEffects(this.state, effects);
    this.sceneId = sceneId;
    this.history.push(sceneId);
    return this.current();
  }

  /** Serialise the whole session (cursor, state, history, memory) to a JSON string. */
  exportSave() {
    return JSON.stringify({
      storyId: this.story.id || "untitled",
      sceneId: this.sceneId,
      state: this.state,
      history: this.history,
      memory: this.memory,
    });
  }

  /**
   * Restore a session from `exportSave()` output.
   * @param {string} json
   * @param {import('./index.d.ts').StoryManifest} story
   * @returns {StoryEngine}
   */
  static importSave(json, story) {
    let save;
    try {
      save = typeof json === "string" ? JSON.parse(json) : json;
    } catch {
      throw new Error("Save data is not valid JSON");
    }
    if (!save || !save.sceneId || !Array.isArray(save.history)) {
      throw new Error("Save data is missing sceneId or history");
    }
    const engine = new StoryEngine(story, save.state || {});
    if (!story.scenes[save.sceneId]) {
      throw new Error(`Save points to unknown scene '${save.sceneId}'`);
    }
    engine.sceneId = save.sceneId;
    engine.history = [...save.history];
    engine.memory = Array.isArray(save.memory) ? save.memory.map((m) => ({ ...m })) : [];
    return engine;
  }
}

/**
 * Static validator: checks that the start scene exists, every `next` target resolves,
 * and every choice has a label. Returns `{ valid, errors }` — never throws.
 * @param {import('./index.d.ts').StoryManifest} story
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateStory(story) {
  const errors = [];
  if (!story?.start) errors.push("Missing start scene id");
  if (!story?.scenes || typeof story.scenes !== "object") {
    errors.push("Missing scenes object");
    return { valid: errors.length === 0, errors };
  }
  if (story.start && !story.scenes[story.start]) errors.push(`Start scene '${story.start}' not found`);
  for (const [id, sc] of Object.entries(story.scenes)) {
    if (!sc || typeof sc !== "object") {
      errors.push(`Scene '${id}' is not an object`);
      continue;
    }
    if (sc.body === undefined || sc.body === "") errors.push(`Scene '${id}' has no body text`);
    if (sc.choices !== undefined && !Array.isArray(sc.choices)) errors.push(`Scene '${id}' choices must be an array`);
    for (const c of sc.choices || []) {
      if (!c.label) errors.push(`Scene '${id}' has a choice without a label`);
      if (c.href) continue; // external links do not target a scene
      if (!c.next) errors.push(`Scene '${id}' has a choice without next or href`);
      else if (!story.scenes[c.next]) errors.push(`Scene '${id}' links to missing scene '${c.next}'`);
    }
  }
  return { valid: errors.length === 0, errors };
}
