# Phase 8 QA Checklist (Godot Migration)

Use this checklist before declaring migration release-ready.

## Functional smoke tests

- Project opens in Godot without script parse/runtime errors.
- Main scene runs and shows:
  - OSM map tile layer
  - Player avatar
  - HUD (day/progress/route/buttons/map status)
- Player movement works (W/S swapped as intended, plus arrows).
- Camera follows player smoothly.
- Restaurant stamps trigger when entering radius.
- `Next day` stays disabled until all current-day spots are stamped.
- `Start over` fully resets day, progress, and player position.
- Audio plays:
  - BGM loop on scene start
  - Stamp SFX on new stamp
  - Day complete / UI / step / jump SFX on events

## Data integrity

- `data/ramen_itinerary.json` loads with expected day and restaurant counts.
- Projected map points match expected relative Tokyo positions.
- Day route list in HUD matches JSON data for current day.

## Performance checks

- OSM requests are throttled (`max_concurrent_requests`) and do not spike.
- Map status reaches steady state (pending near 0 after initial load).
- No persistent frame hitching during normal movement.
- Continuous play for 10+ minutes without escalating memory usage.

## Failure handling

- Missing local tile cache still allows remote fallback.
- Remote tile failures increment `failed` and keep scene playable.
- Buttons remain responsive during map loading.

## Release gate

- All items above pass on target machine(s).
- Version tag and changelog drafted.
- Export build generated and tested.
