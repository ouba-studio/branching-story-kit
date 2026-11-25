/**
 * branching-story-kit — TypeScript declarations.
 * @license MIT — Ouba Studio (https://www.ouba.art/)
 */

/** Values a choice may apply to state. Numbers are *added*; everything else is *assigned*. */
export type StateValue = number | string | boolean;
export type StoryState = Record<string, StateValue>;

export interface StoryChoice {
  /** Button / link text shown to the reader. */
  label: string;
  /** Scene id to advance to (omit only when `href` is set). */
  next?: string;
  /** Minimum numeric state values required for the choice to be visible. */
  requires?: Record<string, number>;
  /** State mutations applied when the choice is taken (numbers add, others assign). */
  effects?: Record<string, StateValue>;
  /** External link (store page, sequel, survey). The engine never navigates these for you. */
  href?: string;
}

export interface StoryScene {
  title: string;
  /** Prose shown to the reader; `{{stateKey}}` placeholders are interpolated at read time. */
  body: string;
  choices?: StoryChoice[];
  /** Marks a terminal scene. */
  ending?: boolean;
  /** Free-form UI hints (chapter labels, art keys, "allow free text" flags…) passed through untouched. */
  tag?: string;
  [key: string]: unknown;
}

export interface StoryManifest {
  id?: string;
  title?: string;
  start: string;
  initialState?: StoryState;
  scenes: Record<string, StoryScene>;
}

export interface SceneView {
  id: string;
  title: string;
  body: string;
  choices: StoryChoice[];
  ending: boolean;
  state: StoryState;
}

export interface MemoryEntry {
  /** Session turn (scene visit count) at which the fact was learned. */
  turn: number;
  fact: string;
}

export interface SaveData {
  storyId: string;
  sceneId: string;
  state: StoryState;
  history: string[];
  memory: MemoryEntry[];
}

export class StoryEngine {
  constructor(story: StoryManifest, initialState?: StoryState);
  /** Number of scene visits so far (the start scene counts as turn 1). */
  get turn(): number;
  current(): SceneView;
  interpolate(text: string): string;
  /** Set a single state value directly (player name, free-text steering, runtime flags). */
  set(key: string, value: StateValue): StoryState;
  /** Append a factual memory to the session memory log. Blank facts are ignored. */
  remember(fact: string): MemoryEntry[];
  /** Pick a visible choice by index; applies its effects and advances to `next`. */
  choose(index: number): SceneView;
  /** Jump directly to a scene, applying optional effects (free-text steering). */
  jump(sceneId: string, effects?: Record<string, StateValue>): SceneView;
  exportSave(): string;
  static importSave(json: string | SaveData, story: StoryManifest): StoryEngine;
}

export function validateStory(story: StoryManifest): { valid: boolean; errors: string[] };
