# M11 — Cinematic Post-Processing

This update adds `src/game/PostProcessing.tsx` and mounts it inside the React Three Fiber scene. It uses `@react-three/postprocessing` and `postprocessing`.

## Effects
- Mipmap bloom with a high luminance threshold to keep dark asphalt from blooming broadly.
- SSAO for contact shading on desktop-class devices; disabled on low-graphics devices.
- ACES Filmic tone mapping at the end of the effect chain. The WebGL renderer uses `THREE.NoToneMapping` to avoid double tone mapping.
- Speed/drift-reactive chromatic aberration, updated through `useFrame` without React state renders.
- A subtle vignette for a cinematic frame.
- Reduced composer resolution and disabled SSAO on low-end/mobile profiles.

## Asphalt material
`src/game/Track.tsx` currently uses a dark road material with `roughness={0.86}` and `metalness={0.08}`. This is intentional: asphalt should be predominantly diffuse and rough, not metallic. Wet asphalt can be a separate future surface material with lower roughness.

## Motion blur note
The installed `postprocessing` effect stack does not provide a built-in velocity-buffer motion-blur effect. This version adds a restrained velocity-reactive chromatic-aberration hook as a speed cue; it does **not** claim to implement true per-pixel motion blur. True motion blur needs a camera/object velocity pass or a dedicated custom shader and should be added only after checking performance on target devices.

## Validation
Run `npm install`, `npm run build`, and `npm test` locally. Dependency installation and browser rendering could not be verified in the packaging environment, so treat this as an implementation update pending local build/gameplay validation.
