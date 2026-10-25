import { LOW_GFX } from './device'

// ===== DRIFT TUNING =====
// Units: grip values are 1/s (how fast sideways speed is killed). Angles in radians.
export const DRIFT_CONFIG = {
  gripNormal: 18,        // 1/s  normal lateral grip (high = car tracks its heading)
  gripDrift: 3.5,        // 1/s  lateral grip while drifting (LOWER = slidier)
  gripEntryRate: 12,     // 1/s  how fast grip drops when a drift starts
  gripRecoveryRate: 1.6, // 1/s  how fast grip returns after drifting (LOWER = slower recovery)
  minSpeed: 10,          // m/s  minimum forward speed to start a drift
  exitSpeed: 5,          // m/s  drift ends below this forward speed
  steerMultiplier: 1.0,  // steering strength multiplier while drifting
  speedBleed: 0.25,      // 1/s  extra speed loss while drifting
  maxSlipAngle: 0.85,    // rad  (~49 deg) steering stops deepening the slide past this
  slideStart: 1.0,       // m/s  sideways speed where effects begin
  slideFull: 6.0         // m/s  sideways speed for full-intensity effects
}
export type DriftParams = typeof DRIFT_CONFIG

// ===== DRIFT VISUAL EFFECTS =====
export const DRIFT_FX = {
  enabled: true,         // set false for a "reduced effects" mode
  smokeMax: LOW_GFX ? 40 : 80,   // particle pool size (smaller on phones)
  smokeRate: LOW_GFX ? 24 : 40,  // particles/s at full slide
  smokeLife: 0.9,        // s
  markMax: LOW_GFX ? 250 : 500,  // tire-mark quads kept (ring buffer)
  markLife: 6,           // s before a mark fully fades
  markWidth: 0.28,       // m
  markMinStep: 0.35,     // m between mark segments
  markThreshold: 0.25,   // slide intensity needed to leave marks
  wheelHalfTrack: 1.0,   // m rear wheel lateral offset (matches car model)
  wheelRearOffset: -1.4  // m rear wheel distance behind car centre
}

// ===== DRIFT CAMERA =====
export const DRIFT_CAMERA = {
  slipYawFactor: 0.45,   // how much the camera swings toward travel direction (0 = none)
  slipSmoothing: 3,      // 1/s  (lower = lazier camera)
  fovBoost: 4,           // degrees of extra FOV at full slide
  fovSmoothing: 4        // 1/s
}
