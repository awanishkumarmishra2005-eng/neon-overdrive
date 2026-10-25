// ===== SKYLINE ONE FLIGHT TUNING (fictional arcade values, SI units) =====
export const FLIGHT_CONFIG = {
  transformTime: 0.65,     // s   quick transformation animation length
  maxFlightSeconds: 3,     // s   each free flight activation lasts 3 seconds, then landing is mandatory
  roadY: 0.4,              // m   car group height when on the road (ride height)

  thrust: 22,              // m/s^2 forward acceleration in the air
  brake: 26,               // m/s^2 air braking
  drag: 0.22,              // 1/s
  maxSpeed: 62,            // m/s (~223 km/h)
  minSpeed: -4,            // m/s slow back-up allowed
  lateralGrip: 5,          // 1/s  sideways damping in the air (lower = floatier)
  yawRate: 1.7,            // rad/s turning at full steer
  yawMinScale: 0.45,       // turning strength when hovering
  yawSpeedRef: 12,         // m/s where turning reaches ~75%

  climbRate: 14,           // m/s max ascent
  descendRate: 12,         // m/s max descent
  liftAccel: 20,           // m/s^2 how fast vertical speed changes
  ceiling: 100,            // m   altitude limit above ride height

  landMaxAltitude: 1.2,    // m   must be this low to transform back
  landMaxDescent: 5,       // m/s must not be sinking faster than this
  assistMaxDescent: 6,     // m/s landing-assist descent speed (far from ground)
  assistMinDescent: 1.5,   // m/s landing-assist speed near the ground
  assistGain: 0.9,         // 1/s descent speed = altitude * gain (clamped)
  settleRate: 3.5,          // 1/s final settle onto the road while transforming back

  hardLandingSpeed: 9,     // m/s impact speed that counts as a hard landing
  hardLandingKeep: 0.7,    // speed multiplier after a hard landing

  pitchPerVy: 0.03,        // rad of nose tilt per m/s of climb/sink
  maxPitch: 0.3,           // rad
  maxRoll: 0.4,            // rad bank when turning
  visualSmooth: 6          // 1/s tilt smoothing
}
export type FlightParams = typeof FLIGHT_CONFIG
