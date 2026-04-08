# Hungry G — audio plan (Howler.js + `use-sound` hooks)

Dependencies: `howler`, `use-sound` (React hooks on top of Howler). See `src/audio/useGameAudio.ts`.

## Implemented in this repo

| Audio | File | Trigger |
| --- | --- | --- |
| Ambient loop (light pizzicato) | `public/assets/audio/bgm_ambient.ogg` | Starts on app load, loops |
| Stamp / restaurant visit | `public/assets/audio/sfx_stamp.ogg` | First-time visit to a shop (collision) |
| Day complete | `public/assets/audio/sfx_day_complete.ogg` | “Next day in Tokyo” when day is complete |
| UI / reset | `public/assets/audio/sfx_ui.ogg` | “Start over” |
| Jump | `public/assets/audio/sfx_jump.ogg` | Successful jump (physics or fallback) |
| Footstep (concrete) | `public/assets/audio/sfx_footstep.ogg` | Moving on ground, throttled |

## Desired audio (future / polish)

- **Music**
  - Separate **day theme** stinger or loop per day (1–3) for stronger identity.
  - **Victory / trip complete** when last day finishes.
- **SFX — gameplay**
  - **Blocked “Next day”** soft click when button disabled.
  - **Bubble proximity** subtle loop or one-shot when near today’s orange pin (optional; can get noisy).
- **Foley**
  - Alternate footstep surfaces (tile vs street) if you add terrain tags later.
  - **Map scroll / whoosh** if you add pinch-zoom or fast travel.
- **UI**
  - Hover vs click on sidebar buttons.
- **Mix**
  - Master volume + separate **Music / SFX** sliders (Howler `volume` groups or two `Howl` buses).

## Code touchpoints

- `src/audio/useGameAudio.ts` — hook: BGM + SFX players.
- `src/App.tsx` — visit, next day, reset, passes `onJump` / `onFootstep` into the scene.
- `src/game/AmmoScene.tsx` — movement, jump, ground detection, collision visits.

## Asset sources (royalty-free)

- **Kenney — Music Jingles** (CC0): [Music Jingles](https://kenney.nl/assets/music-jingles)
- **Kenney — Impact Sounds** (CC0): [Impact Sounds](https://kenney.nl/assets/impact-sounds)

Bundled copies live under `public/assets/audio/`. Full packs are also extracted under `public/assets/audio/_downloads/` for reference (add `_downloads` to `.gitignore` if you do not want them in git).
