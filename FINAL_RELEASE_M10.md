# NEON OVERDRIVE M10 — release and deployment checklist

## Included
- Ten original, unbranded fictional supercar choices with in-game coin prices and performance differences.
- Three selectable drivers with helmet colours and coin unlock costs.
- Five moving AI rival cars circulating around the road.
- Twenty-four track coin pickups worth 25 coins each while a race is active.
- Race completion rewards: 250 coins plus 100 coins per campaign level.
- Local persistence for coin wallet, owned cars/drivers, selections and campaign progress.
- Automatic 180-second day/sunset/night lighting cycle, headlights/visible beam cones, taillights and night-time point lights.
- More detailed wheel hubs/spokes, driver silhouette, and brief sparks when a guardrail impact begins.
- Vercel configuration for static Vite deployment.
- Planned database architecture documented separately in `docs/DATABASE_PHASE_LATER.md`; no database is connected yet.

## Deploy after local validation
1. Extract this folder and open it in VS Code.
2. Run `npm install`.
3. Run `npm run build` and `npm test`; fix any reported issue before publishing.
4. Run `npm run dev` and test desktop keyboard and mobile touch controls, rivals, coin collection, car/driver purchases, night lighting, collisions and all five levels.
5. Push the project to a GitHub repository.
6. In Vercel, import that repository. The included `vercel.json` configures `npm run build`, `dist`, and SPA routing. Deploy and test the production URL.
7. Only after the deployed version is stable, plan the database phase using `docs/DATABASE_PHASE_LATER.md`.

## Release caveat
The working environment used to prepare this ZIP could not finish `npm install`, so a successful TypeScript build, automated test run and browser playtest have **not** been confirmed here. Do not call this deployment-ready until the validation checklist passes on a machine with working package-registry access. The project contains original stylized 3D geometry, not photorealistic licensed manufacturer models.

## Freeze policy
This is the proposed M10 feature freeze. After you validate and deploy it, keep this ZIP as the release artifact and avoid editing the release folder. Database work should be done later in a separate branch or copy.
