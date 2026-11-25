# Changelog

All notable changes to **branching-story-kit** are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-25

Initial public release by [Ouba Studio](https://www.ouba.art/).

### Added

- `StoryEngine` — story-graph runtime with scene cursor, interpolated `{{state}}` prose,
  `requires` gating, numeric / literal `effects`, scene history, and a persistent
  free-text memory log (`remember()`).
- `set()` for direct state writes and `jump(sceneId, effects)` for free-text steering.
- `exportSave()` / `StoryEngine.importSave()` for full session serialisation and restore.
- `validateStory()` static validator (missing start scene, broken `next` links, unlabeled
  choices, missing body text) that never throws.
- `index.d.ts` TypeScript declarations and `story.schema.json` (JSON Schema 2020-12).
- `examples/midnight-bookshop.mjs` — the playable "The Midnight Bookshop" reference story
  (4 scenes, 4 endings, gated choice, free-text steering) plus `examples/run.mjs`.
- `docs/index.html` — GitHub Pages showcase that runs the demo on the real engine.
- Node built-in test-suite (`node --test`) with zero dependencies, and a GitHub Actions CI workflow.

[1.0.0]: https://github.com/ouba-studio/branching-story-kit/releases/tag/v1.0.0
