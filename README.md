# Hungry G

Hungry G is a ramen-themed endless runner available in two implementations:

- **Web version** in `src/` (React + TypeScript + Vite)
- **Godot version** in `godot/` (GDScript + Godot 4 scenes)

The current gameplay loop is:

- run automatically from left to right
- jump with `Space` or left click
- avoid fire obstacles and holes
- collect ramen for bonus score
- survive with limited lives

---

## Project Structure

- `src/` - web game implementation
- `godot/` - Godot game project
- `public/` - shared web assets (source for sync)
- `scripts/sync-godot-assets.mjs` - copies shared assets into Godot
- `MIGRATION.md` - migration notes and parity plan

---

## Tech and Library Choices

### Web Stack

- **React 19**: UI + game state orchestration in one component tree
- **TypeScript**: safer refactors for gameplay constants and data structures
- **Vite 8**: fast local dev and straightforward production build pipeline
- **use-sound + Howler**: simple browser audio playback and looping control
- **Three.js / @react-three/fiber / @react-three/drei**: originally used for 3D map gameplay and still part of dependencies
- **Leaflet / react-leaflet**: map and tile-based exploration support in the web branch
- **Ammo.js typed bindings**: physics support for the earlier 3D version

### Godot Stack

- **Godot 4.6 (GDScript)**: standalone game runtime with built-in scene/physics/audio systems
- **Scene tree architecture** (`Main.tscn`, `Player.gd`, HUD nodes): clear separation of gameplay, UI, and audio nodes
- **AudioStreamPlayer + bus layout** (`Master`, `Music`, `SFX`): game audio routing and control
- **Imported local OGG assets** in `godot/assets/audio/`: same sound set used for BGM and SFX cues

### Why this setup

- Keep a **fast web iteration path** while building a **native Godot runtime**
- Reuse local assets across both versions via sync tooling
- Preserve gameplay parity while allowing Godot-specific UI/physics/audio improvements

---

## Scripts

From the repository root:

- `npm run dev` - start web dev server
- `npm run build` - build the web app
- `npm run preview` - preview built web app
- `npm run lint` - run ESLint
- `npm run sync:godot` - copy shared assets to `godot/`
- `npm run godot:sync` - alias for `sync:godot`

---

## Running the Game

### Web

```bash
npm install
npm run dev
```

### Godot

1. Open the project at `godot/project.godot` in Godot 4.x.
2. If assets changed in `public/`, run `npm run sync:godot`.
3. Reload the project in Godot so imported assets refresh.

---

## Current Notes

- Godot HUD includes score/lives/tier, pause toggle, and game-over restart prompt.
- Game-over restart is `R`.
- Migration and parity details are tracked in `MIGRATION.md`.
