import type { CarParams } from '../config/car'
import type { DriftParams } from '../config/drift'

// Pure vehicle model (no Three.js / React) so it can be tested from the command line.
// World: forward = (sin h, cos h), right = (cos h, -sin h). Positive steer = turn left (heading increases).

export interface VehicleDynamics {
  x: number; z: number
  heading: number
  vx: number; vz: number
  grip: number
  drifting: boolean
}
export interface DriveInput { gas: boolean; brake: boolean; steer: number; drift: boolean }
export interface VehicleReadout { forward: number; lateral: number; slip: number; slide: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function createDynamics(x: number, z: number, heading: number, grip: number): VehicleDynamics {
  return { x, z, heading, vx: 0, vz: 0, grip, drifting: false }
}

export function getReadout(s: VehicleDynamics, d: DriftParams): VehicleReadout {
  const sinH = Math.sin(s.heading), cosH = Math.cos(s.heading)
  const forward = s.vx * sinH + s.vz * cosH
  const lateral = s.vx * cosH - s.vz * sinH
  // Slip only means something while moving forward; when braking to a stop or reversing the angle flips wildly.
  const slip = forward > 1 ? Math.atan2(lateral, forward) : 0
  const slide = clamp((Math.abs(lateral) - d.slideStart) / (d.slideFull - d.slideStart), 0, 1)
  return { forward, lateral, slip, slide }
}

export function stepVehicle(s: VehicleDynamics, input: DriveInput, car: CarParams, d: DriftParams, dt: number): void {
  const sinH = Math.sin(s.heading), cosH = Math.cos(s.heading)
  let vf = s.vx * sinH + s.vz * cosH
  let vl = s.vx * cosH - s.vz * sinH
  const steer = clamp(input.steer, -1, 1)

  // Drift state: needs Shift + speed + steering to start; ends on release or low speed.
  if (!s.drifting) {
    if (input.drift && vf > d.minSpeed && steer !== 0) s.drifting = true
  } else if (!input.drift || vf < d.exitSpeed) {
    s.drifting = false
  }

  // Forward speed: same rules as the original model.
  if (input.gas) vf += car.acceleration * dt
  if (input.brake) vf -= car.brake * dt
  vf -= vf * car.drag * dt
  if (s.drifting) vf -= vf * d.speedBleed * dt
  vf = clamp(vf, -car.reverseSpeed, car.maxSpeed)

  // Lateral grip eases toward its target (fast down, slow back up), then kills sideways speed.
  const target = s.drifting ? d.gripDrift : d.gripNormal
  const rate = target < s.grip ? d.gripEntryRate : d.gripRecoveryRate
  s.grip += (target - s.grip) * (1 - Math.exp(-rate * dt))

  // Grip redirects sideways momentum into forward momentum (speed magnitude is kept),
  // so normal cornering doesn't scrub speed. Drifting speed loss comes from speedBleed only.
  const total = Math.min(Math.hypot(vf, vl), car.maxSpeed)
  vl *= Math.exp(-s.grip * dt)
  const vfMag = Math.sqrt(Math.max(0, total * total - vl * vl))
  vf = clamp(vf < 0 ? -vfMag : vfMag, -car.reverseSpeed, car.maxSpeed)

  // Steering (same speed scaling as the original), limited once the slide gets too deep.
  const slip = Math.hypot(vf, vl) > 1 ? Math.atan2(vl, vf) : 0
  const steerGrip = Math.abs(vf) / (Math.abs(vf) + 6)
  let yaw = steer * car.steerRate * steerGrip * (vf < 0 ? -1 : 1) * (s.drifting ? d.steerMultiplier : 1)
  if (vf > 1 && steer * slip < 0) {
    const r = Math.min(1, Math.abs(slip) / d.maxSlipAngle)
    yaw *= 1 - r * r
  }

  s.vx = vf * sinH + vl * cosH
  s.vz = vf * cosH - vl * sinH
  s.heading += yaw * dt
  s.x += s.vx * dt
  s.z += s.vz * dt
}
