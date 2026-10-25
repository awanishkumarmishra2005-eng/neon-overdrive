# Changelog


## M13 — Free Flight, Rival Collision & Audio Finish
- Made the Skyline One flying feature free; removed the 1,000-coin unlock flow.
- Confirmed the Web Audio engine, collision tone, and airborne tone remain wired into the scene; sound is enabled by the user from the menu to comply with browser autoplay rules.
- Added player-to-rival overlap resolution, velocity damping, impact sound, and collision count.
- The second distinct rival collision restarts the current level and resets the per-attempt collision counter.
- Added a short collision debounce to avoid counting a single contact twice.
- Validation: ZIP integrity checked. A production build was not run because project dependencies are not installed in this environment.


## M14 — Limited free flight + paid unlock
- Five free flight activations per local save; each activation is limited to 3 seconds before automatic landing.
- After the five free uses, unlimited flight can be purchased for 1,000 in-game coins in the garage/campaign menu.
- Flight-use count and purchased unlock persist in local storage.
- Production build and browser gameplay were not run in this environment.
