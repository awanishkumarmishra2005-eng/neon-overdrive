// Shared, mutable per-frame vehicle readout. Written by Car, read by camera/effects/HUD.
// Plain object on purpose: updating it never triggers React renders.
export const vehicleState = {
  x: 0, z: 0, heading: 0,
  forward: 0, lateral: 0, slip: 0, slide: 0,
  drifting: false,
  altitude: 0,        // m above road ride height
  vy: 0,              // m/s vertical speed
  flightProgress: 0,  // 0 = road form, 1 = flight form (transformation progress)
  collision: false,
  collisionCount: 0,
  daylight: 1
}
