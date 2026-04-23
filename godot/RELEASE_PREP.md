# Phase 8 Release Prep Notes

## Current status

- Migration phases 1-7 are in-progress/implemented in code.
- Phase 8 started with:
  - tile request throttling for stability/perf
  - QA checklist baseline

## Export targets (initial)

1. Windows desktop build (primary)
2. Optional: Web export after desktop parity is stable

## Build and packaging plan

- Confirm Godot executable path (`GODOT_PATH`) and editor launch.
- Open project and ensure import pipeline completes.
- Configure export presets in editor:
  - Windows Desktop
  - set app name/icon/version
- Produce release artifact and run smoke test on fresh machine profile.

## Known blocker

- MCP cannot execute Godot tools until `GODOT_PATH` points to the installed Godot executable.

## Troubleshooting: editor or game closes right after opening

- **Project path:** Open the folder that contains `project.godot` — `hungry-g/godot` — not the parent `hungry-g` (Vite app only).
- **Audio buses:** `default_bus_layout.tres` must define **`bus/0` = Master** before named buses (`Music`, `SFX`). A layout that only listed `bus/1` / `bus/2` could break the audio server at startup.
- **GDScript `class_name`:** Use `extends …` **before** `class_name` in scripts (e.g. `Player.gd`). `Main.gd` can use `@onready var _player = $Player` so startup does not depend on global class resolution order.
- **If the window still dies on Vulkan:** In **Project → Project Settings → Rendering → Renderer**, try **Rendering method** = `gl_compatibility` (OpenGL) on machines with flaky Vulkan drivers.
- **Godot 4 `draw_string` on `Node2D`:** Use `ThemeDB.fallback_font` as the font argument — `get_theme_default_font()` is not valid on `Node2D` and triggers a parser error at load.

## Suggested final validation package

- Screenshots/video of:
  - map loading + HUD status
  - stamping and day progression
  - reset flow
- QA checklist run log
- Build artifact hash and timestamp
