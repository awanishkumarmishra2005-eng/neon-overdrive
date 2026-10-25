# M12 — Garage, Cityscape, Driver Roster, Flying Unlock & Audio

## Changes in this increment
- Added a free-to-own Skyline One entry to the car catalogue; the flying ability remains separately locked.
- Added a persistent one-time flying ability unlock costing exactly 1,000 in-game coins. Flight activation is blocked until the unlock is saved.
- Expanded the driver roster from three to five with Kai and Amara and clearly configured prices.
- Added Garage, Drivers, Tracks & Races navigation buttons in the campaign menu.
- Added procedural city buildings with lit windows to the existing 3D track environment.
- Added a user-initiated Web Audio engine tone that changes with speed, plus synthesized collision and airborne cues.
- Kept the existing localStorage economy and the prior campaign/track/vehicle systems.

## Verification status
- ZIP integrity is checked after packaging.
- A full TypeScript/Vite build was **not verified** in this environment because `npm install` timed out and dependencies were not available. Running global `tsc` reports missing project dependencies, so that output is not evidence of source-level errors or a successful build.
- Browser gameplay, audio, physics, and Vercel deployment have not been verified in this environment.

## Known limitations for the next pass
- The existing garage remains a functional menu catalogue rather than a full rotatable 3D showroom.
- The existing game still uses its existing procedural vehicle/track systems; the five distinct track themes, fully realistic 3D car models, full nitro/race-mode overhaul, and full effects/audio mix from the master specification need further implementation and gameplay testing.
- Driver perks are descriptive in this increment; they are not yet wired into the physics/reward calculations.
- LocalStorage saves are local and can be edited by the player; this is not a secure server-side economy.
