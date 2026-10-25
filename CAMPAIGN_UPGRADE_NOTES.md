# NEON OVERDRIVE — M4 campaign upgrade notes

This ZIP is based on the supplied `neon-overdrive-m4-steering-flight.zip` and keeps its existing React Three Fiber game, vehicle controller, mobile controls, drift and SKYLINE ONE flight code.

## Added in this iteration
- Campaign menu with five named levels and level selection.
- Level 1 starts unlocked; later levels unlock in sequence after a completed run.
- Local progress and best times saved under `neon-overdrive-campaign-v1` in localStorage.
- Race timer, checkpoint counter, finish/completion screen, continue-to-next-level, and reset-save button.
- Campaign tracking hooks into the existing car update loop.

## Important limitations
- The M4 baseline contains one existing closed-loop track. The five campaign entries currently use that same physical route; level-specific terrain, bridges, city/mountain scenery, and intentional flight route segments are NOT yet implemented. The difficulty/description entries are campaign metadata, not proof of five distinct tracks.
- The project build and browser gameplay have not been verified in this environment because npm dependency installation timed out. Running `tsc --noEmit` without installed dependencies fails on missing React/Three/Vite modules, so this is not a confirmed code compilation result.
- Checkpoint placement and completion must be manually tested in the browser before treating the campaign as release-ready.

## Run locally
1. Install Node.js LTS.
2. Extract this ZIP.
3. Open a terminal in the `neon-overdrive` folder.
4. Run `npm install`.
5. Run `npm run build`, then `npm run dev`.
