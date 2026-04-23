# Hungry G Migration Plan (Web -> Godot)

This plan migrates the current game from a web stack (React + Three.js + Ammo.js + Howler) to Godot, using the Godot MCP for structured editor/project operations.

---

## Goals

- Preserve core gameplay:
  - Top-down Tokyo map exploration
  - Visit ramen locations and stamp progress
  - Day-based progression (3 to 5 shops/day)
  - Music + SFX
- Improve runtime reliability and performance by moving to Godot-native systems.
- Migrate incrementally with clear checkpoints and playable milestones.

---

## Scope Mapping (Current -> Target)

- **UI/state**
  - Current: React components + local state
  - Target: Godot scenes, Control UI nodes, singleton game state
- **World/map**
  - Current: OSM tile textures in Three.js
  - Target: TileMap or textured planes with tile cache manager
- **Movement/physics**
  - Current: Ammo.js rigid body + fallback movement
  - Target: `CharacterBody3D` (or `CharacterBody2D` if fully 2D)
- **Audio**
  - Current: Howler/use-sound
  - Target: `AudioStreamPlayer` + `AudioStreamPlayer3D` buses
- **Content/data**
  - Current: hardcoded itinerary in `App.tsx`
  - Target: external JSON/Resource (`.tres`) + loader service

---

## Web project updates (documented for Godot parity)

Changes to the current Vite/React runner and audio layer that are **not** in the original migration baseline; mirror or improve these in Godot where relevant.

| Date | Area | Change |
| --- | --- | --- |
| 2026-04-22 | Audio + runner pause | **`useGameAudio(isRunning)`** — `src/audio/useGameAudio.ts` takes the runner pause flag; **`src/App.tsx`** passes `isRunning` from the ⏸️ / ▶️ toggle. Ambient BGM (`bgm_ambient.ogg`) **stops** while paused and **plays again** when unpaused. SFX (stamp, jump, UI, etc.) unchanged. |

**Godot note (Phase 6):** Wire the ambient loop to the same pause/game-state signal as gameplay so music does not keep playing when the player pauses.

---

## Multi-Phase Plan

## Phase 0 - Baseline and Freeze

- Snapshot current behavior in short acceptance checklist:
  - Controls, stamp logic, day progression, map rendering, audio cues
- Identify source-of-truth assets and data to migrate:
  - OSM tiles cache
  - Audio files in `public/assets/audio`
  - Ramen itinerary + metadata
- Freeze feature work on web branch except migration blockers.

**Exit criteria**
- Clear checklist and migration inventory committed.

---

## Phase 1 - Godot Project Bootstrap via MCP

- Create/initialize a new Godot project folder (e.g. `godot/`).
- Use MCP to:
  - create base scenes (`Main`, `World`, `Player`, `UI`)
  - launch editor and validate project opens/runs
  - verify Godot version and project metadata
- Establish folder conventions:
  - `scenes/`, `scripts/`, `assets/audio/`, `assets/map/`, `data/`

**Exit criteria**
- Empty Godot app launches from editor and from run command.

---

## Phase 2 - Data Model Migration

- Extract current itinerary from TypeScript into `data/ramen_itinerary.json`.
- Add a Godot loader script to parse:
  - restaurant id/name/day/source/lat/lng/hints
- Add coordinate conversion utility in GDScript:
  - lat/lng -> local world coordinates (same projection intent as current)

**Exit criteria**
- Godot prints/visualizes loaded restaurant points at expected locations.

---

## Phase 3 - Map Layer Migration (OSM)

- Implement Godot map tile service:
  - local tile-first (`assets/map/osm-tiles/...`)
  - optional remote fallback (if desired)
- Create top-down map renderer:
  - 2D route: `TileMap`/sprites
  - 3D route: textured quads under orthographic camera
- Support tile bounds, caching, and loading window strategy.

**Exit criteria**
- Tokyo map appears consistently and pans/follows without blank states.

---

## Phase 4 - Player Controller and Camera

- Implement player as `CharacterBody3D` (or `2D` depending final target).
- Port controls including custom keybind behavior (W/S swapped if intentional).
- Add top-down camera follow:
  - smoothing
  - clamped zoom/pan behavior
- Add floating visual effect for avatar if retained in design.

**Exit criteria**
- Player moves reliably; camera tracks correctly in top-down view.

---

## Phase 5 - Gameplay Systems (Stamps + Progression)

- Port proximity/collision detection for restaurant bubbles.
- Implement stamp acquisition and visited state tracking.
- Port day progression gating:
  - only advance day after required shops visited
- Port reset flow and timeline/progress indicators.

**Exit criteria**
- One full run (Day 1 -> Day N) works end-to-end in Godot.

---

## Phase 6 - Audio Migration (Howler -> Godot Audio Buses)

- Import existing OGG assets from web build.
- Create audio buses:
  - `Master`, `Music`, `SFX`
- Wire events:
  - ambient loop on load
  - stamp/jump/footstep/day-complete/UI actions
- Add volume controls and mute toggles (optional parity+).

**Exit criteria**
- Audio behavior matches or exceeds current web version.

---

## Phase 7 - UI/UX Parity and Polish

- Recreate side panel and key stats:
  - total visited, day count, today route, legend
- Add loading/error states for tiles/data.
- Polish visuals and interaction responsiveness.

**Exit criteria**
- Playtest confirms parity with current web game UX.

---

## Phase 8 - QA, Performance, and Release Prep

- Performance checks:
  - tile loading throughput
  - memory profile for map/audio assets
- Regression checklist against Phase 0 baseline.
- Package/export targets:
  - Windows first, then optional web export from Godot

**Exit criteria**
- Stable build exported and verified by manual smoke test.

---

## MCP-Driven Execution Strategy

- Use MCP tools to automate repeatable editor tasks:
  - create scenes/nodes
  - launch/run/stop project
  - fetch debug output after each step
- Keep migration commits small and phase-scoped.
- After each phase:
  - run project
  - capture short validation note in commit message

---

## Suggested Branching

- Current branch: `migration/godot`
- Optional sub-branches per phase:
  - `migration/godot-phase-1-bootstrap`
  - `migration/godot-phase-2-data`
  - ...
- Merge back into `migration/godot` only after phase exit criteria pass.

---

## Risks and Mitigations

- **Risk:** OSM tile policy/rate limits
  - **Mitigation:** local cache first, bounded viewport loading
- **Risk:** behavior drift during port
  - **Mitigation:** strict acceptance checklist per phase
- **Risk:** input feel differs from web
  - **Mitigation:** tune acceleration/friction and camera smoothing in isolation
- **Risk:** oversized repository from map/audio dumps
  - **Mitigation:** define curated asset subset; keep raw downloads excluded

---

## Definition of Done

- Godot version of Hungry G supports:
  - top-down Tokyo exploration on map tiles
  - bubble/stamp restaurant interactions
  - day progression with route constraints
  - working music + SFX
  - stable run and export build

