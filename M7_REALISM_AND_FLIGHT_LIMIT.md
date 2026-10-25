# NEON OVERDRIVE M7 — Scenic Track + Flight Timer

## Changes
- Added a low-poly mountain ridge environment around the existing circuit.
- Improved road/shoulder contrast and added dashed center-line markings.
- Added lightweight metal guardrails with support posts along both road edges.
- Added a scenic bridge/overpass deck, railings and support columns.
- SKYLINE ONE now has a 4-second powered flight window after transformation completes. At the limit, forced landing assist begins and cannot be cancelled; the car descends and returns to road mode.
- Shortened transformation animation to 0.65 seconds.
- Updated flight simulation coverage for mandatory landing.

## Controls
- Transform: F / on-screen flight button.
- Climb: Q / on-screen up control.
- Descend: E / on-screen down control.
- After four seconds of flight, the game automatically starts landing. Steering and forward/brake controls remain available while descending.

## Run
```bash
npm install
npm run build
npm test
npm run dev
```

## Notes
This upgrade adds scenic mountain and bridge geometry around the existing circuit; it does not yet create a fully elevation-following mountain road or physically separate track routes. Those require track-following vertical physics and per-level track data. The package was archive-checked, but dependency installation timed out in the build environment, so run the commands above locally to verify the build and gameplay.
