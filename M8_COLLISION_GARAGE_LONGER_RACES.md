# NEON OVERDRIVE M8 — Collision, Supercar Garage, Longer Races

## Changes
- Roadside guardrails now have a gameplay collision response while in road mode / transformation-to-flight. The car is kept inside the road edge, outward velocity is reduced, and a guardrail impact message appears. Flight remains exempt so the short SKYLINE ONE flight mechanic still works.
- Added a garage with seven fictional supercar variants, each with its own paint, proportions, aero/spoiler option, top speed and acceleration. They use original generic designs and no manufacturer logos or licensed 3D assets.
- Selected car is saved locally and updates the rendered vehicle.
- Enlarged the circuit substantially to increase the time needed to complete a lap.
- Added more generous per-level race time limits (5:00, 5:30, 6:30, 7:00, 8:00). Exceeding the time limit now opens a retry / level-select screen.

## Controls
Existing controls remain: W/Up accelerate, S/Down brake, A/D or arrows steer, Shift drift, F transform; Q/E control altitude while airborne.

## Verification
The ZIP archive is integrity-checked. Dependency installation timed out in this environment, so `npm run build`, `npm test`, and browser gameplay have not been verified here. Run these in the project folder after extraction:

```bash
npm install
npm run build
npm test
npm run dev
```
