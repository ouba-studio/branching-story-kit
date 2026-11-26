# The 2026 benchmark

**Study:** [I Tested the AI Story Apps (2026)](https://www.ouba.art/i-tested-ai-story-apps)
**Publisher:** [Ouba Studio](https://www.ouba.art) · `team@ouba.art`
**Evaluation date:** 2026-11-15 · **License:** CC-BY-4.0

This is the study that produced `branching-story-kit`. It is included in the docs because every design
decision in the engine answers a specific failure recorded here.

## Protocol

Single day. Single protocol. **$0 spent**, zero payment cards, email-only sign-ups, no CAPTCHA solving,
no new OAuth accounts.

1. Load the web landing page and start the timer → **time to first story**.
2. If an account is required before any story text, create one with **email only**.
3. Start a PG-13 light romance story or roleplay (**turn 1**).
4. **Turn 2 — plant:** `My cat's name is Marmalade.`
5. Play up to **20 turns**, stopping immediately at any paywall, energy cap or hard message limit.
6. **Turn 15 — probe:** `What is my cat's name?` → record verbatim vs. failed recall.

## Results

| Platform | Category | First story | Turns before wall | Recalled fact | Outcome |
|---|---|---:|---:|---|---|
| **Ouba** | Reader-first AI fiction | 15 s | 20 / 20 | Yes — verbatim | **PASS** |
| Character.AI | Companion chatbot | 21 s | 20 / 20 | No — cafe menu | **FAIL** |
| **Talkie** | Companion chatbot | 17 s | 20 / 20 | Yes | **PASS** |
| **AI Dungeon** | Open sandbox | 70 s | 7 *(queue stall; resumed)* | Yes — verbatim | **PASS** |
| Janitor AI | Companion chatbot | 45 s | 0 | Not reached | CENSORED |
| Talefy | Reader-first AI fiction | 7 s | 0 | Not reached | CENSORED |
| Joyland | Companion chatbot | — | 0 | Not reached | CENSORED |
| NovelAI | AI writing tool | — | 0 | Not reached | CENSORED |
| Chai | Companion chatbot | — | — | Not tested | UNTESTABLE |
| Galatea | Pre-written serial | — | — | Not tested | UNTESTABLE |

### Reading the numbers honestly

Four platforms never reached turn 15, so the fair denominator for "recall given the probe was reached" is
**4**, not 10:

| Metric | Value |
|---|---|
| Platforms tested | 10 |
| Reached the turn-15 probe | 4 |
| Recalled the fact | **3** |
| Silent state loss | 1 |
| Right-censored before the probe | 4 |
| Untestable at $0 | 2 |
| Recall rate among tested apps (n=4) | **75%** |
| Recall rate across all ten platforms | 30% |

Both rates are true. Only the first is a fair comparison of memory quality; only the second is a fair
description of the consumer experience.

### Speed is not continuity

Character.AI produced first story text in **21 seconds** and replied at **~3 s** — the fastest latency of
any platform that completed the run — and still failed the probe. Latency and recall measure different
things. Do not let a fast demo stand in for a stable one.

## What the failures actually were

| Failure | Platform(s) | Mechanism |
|---|---|---|
| Silent state loss | Character.AI | Fact summarised out of a rolling window; a plausible wrong answer arrived with no error |
| Dead free LLM | Janitor AI | 0 replies across 4 sessions; messages did not persist after reload |
| Login wall | Joyland | Every chat click opened a modal; email-only button unaddressable in 6 attempts |
| Paywall before story | Talefy | Teaser paragraph, then sign-up + immediate $9.99 trial upsell |
| Blocked sign-up | NovelAI | Text-generation submit unreachable in 6 attempts |
| No free tier | Chai, Galatea | Mobile-only / paid-only — outside the protocol |

!!! warning "The uncomfortable summary"
    The category's bottleneck is not prose quality. It is **state**. A product can be fluent, fast and
    pleasant, and still forget your cat's name thirteen turns later.

## Why a state machine fixes it

`branching-story-kit` makes three architectural commitments that a chat loop cannot:

1. **State is explicit.** `state.cat = "Marmalade"` is a value in an object, not a token in a window.
2. **Recall is a lookup.** `{{cat}}` interpolates from state; no inference step can substitute a cafe menu.
3. **Memory is append-only.** `engine.remember()` adds to an ordered log that nothing compacts.

```js
const engine = new StoryEngine(story);
engine.choose(0);                               // turn 1
engine.choose(0);                               // turn 2 — plants + remembers
engine.choose(0);                               // turn 3 — query

engine.current().body;   // "Your cat's name is Marmalade."
engine.memory;           // [{ turn: 2, fact: "My cat's name is Marmalade." }]
```

Replayed 1,000 times in the accompanying
[Kaggle notebook](https://www.kaggle.com/datasets/oubaapp/state-drift-consumer-llm-interactive-fiction-2026),
the identical choice sequence yields **one distinct save-file hash** — zero drift.

## Try it live

- **Hugging Face Space (zero-GPU static):** https://huggingface.co/spaces/oubaapp/ai-story-benchmark-explorer
- **Canonical explorer:** https://www.ouba.art/tools/benchmark-explorer
- **Read Ouba stories free:** https://www.ouba.art/

## Data & code

| Artifact | Link |
|---|---|
| Dataset (Harvard Dataverse) | https://doi.org/10.7910/DVN/YEBHQR |
| Dataset (Zenodo) | https://doi.org/10.5281/zenodo.24511974 |
| Dataset (Figshare) | https://doi.org/10.6084/m9.figshare.35110510.v1 |
| Dataset (Knowledge Commons) | https://doi.org/10.17613/f4q6e-45340 |
| Executive deck | https://doi.org/10.5281/zenodo.24511982 |
| iOS availability snapshot | https://doi.org/10.5281/zenodo.24514920 |
| `branching-story-kit` (software DOI) | https://doi.org/10.5281/zenodo.24514910 |
| Source | https://github.com/ouba-studio/branching-story-kit |

See [Citations](citations.md) for the complete identifier list and ready-to-paste APA/BibTeX.

## Related reading

- [Character.AI alternatives (2026)](https://www.ouba.art/character-ai-alternatives)
- [Where Character.AI users are going](https://www.ouba.art/where-character-ai-users-are-going)
- [Save & export Character.AI chats](https://www.ouba.art/save-character-ai-chats)
- [Chai & SpicyChat iOS alternatives](https://www.ouba.art/chai-ai-alternatives-ios)
- [Ouba vs Talkie](https://www.ouba.art/ouba-vs-talkie) · [Ouba vs Janitor AI](https://www.ouba.art/ouba-vs-janitor-ai)
