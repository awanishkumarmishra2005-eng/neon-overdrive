# NEON OVERDRIVE — M10 final feature freeze

A browser-based Three.js / React Three Fiber arcade racer with a campaign, transforming player car, fictional supercar garage, moving rival traffic, collectible coins, driver unlocks, automatic day/night lighting, and touch controls.

## Local run

```bash
npm install
npm run build
npm test
npm run dev
```

Open the local Vite URL printed in the terminal. Keyboard: W/Up accelerate, S/Down brake, A/D or arrows steer, Shift drift, F transform. Touch devices have on-screen controls.

## Garage economy

Start with the Vortex GT and Nova driver. Collect glowing track coins (25 each) and finish campaign levels to earn coins. Buy other fictional cars and drivers in the garage. Local progress is stored in the current browser; it is not synced across devices.

## Deploy

The included `vercel.json` is configured for Vercel's Vite build (`npm run build`, output `dist`, SPA fallback). Push this project to GitHub and import the repository into Vercel. Run the local build and tests before deploying. See `FINAL_RELEASE_M10.md` for the release checklist.

## Database later

M10 intentionally does not include a database. The post-deployment plan is documented in `docs/DATABASE_PHASE_LATER.md`. Keep database work in a separate branch/copy after the first production deployment is verified.

## Asset and verification note

Cars and logos are original fictional geometry and use no manufacturer logos. These are stylized game models, not photorealistic or licensed vehicle assets. The preparation environment could not complete dependency installation, so the build and browser playtest must be verified locally before production deployment.


## M11 cinematic post-processing
See `M11_CINEMATIC_POSTPROCESSING.md` for the bloom, SSAO, ACES Filmic tone mapping, speed-reactive chromatic aberration, low-GPU settings, and asphalt material notes. Validate with `npm install`, `npm run build`, and `npm test` before deployment.
