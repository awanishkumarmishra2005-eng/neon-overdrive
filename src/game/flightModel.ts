import type { CarParams } from '../config/car'
import type { DriftParams } from '../config/drift'
import type { FlightParams } from '../config/flight'
import { stepVehicle, type DriveInput, type VehicleDynamics } from './driftModel'

// SKYLINE ONE mode logic + simplified arcade flight. Pure (no Three.js/React) so it is testable.
// Horizontal state is shared with the road model (same VehicleDynamics), so switching modes
// keeps position, heading and velocity: nothing teleports.

export type FlightMode = 'road' | 'toFlight' | 'flight' | 'toRoad'
export interface FlightState {
  mode: FlightMode
  progress: number        // 0 road form .. 1 flight form
  y: number               // altitude above ride height (m)
  vy: number              // vertical speed (m/s)
  pitch: number           // visual tilt (rad, applied as rotation.x)
  roll: number            // visual bank (rad, applied as rotation.z)
  landingAssist: boolean
  flightElapsed: number
  forcedLanding: boolean
}
export interface ModeInput extends DriveInput { up: boolean; down: boolean }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function createFlightState(): FlightState {
  return { mode: 'road', progress: 0, y: 0, vy: 0, pitch: 0, roll: 0, landingAssist: false, flightElapsed: 0, forcedLanding: false }
}

export function canTakeOff(dyn: VehicleDynamics): { ok: boolean; reason: string } {
  if (dyn.drifting) return { ok: false, reason: 'Release drift before transforming' }
  return { ok: true, reason: '' }
}
export function canLand(f: FlightState, cfg: FlightParams): { ok: boolean; reason: string } {
  if (f.y > cfg.landMaxAltitude) return { ok: false, reason: 'Too high to land' }
  if (f.vy < -cfg.landMaxDescent) return { ok: false, reason: 'Descending too fast' }
  return { ok: true, reason: '' }
}

// Handles the transform button / F key. Returns a message to show, or null.
// Ignored while a transformation is already running, so it can't be interrupted.
export function requestToggle(f: FlightState, dyn: VehicleDynamics, cfg: FlightParams): string | null {
  if (f.mode === 'road') {
    const t = canTakeOff(dyn)
    if (!t.ok) return t.reason
    f.mode = 'toFlight'
    f.flightElapsed = 0
    f.forcedLanding = false
    f.landingAssist = false
    return null
  }
  if (f.mode === 'flight') {
    if (f.forcedLanding) return 'Flight limit reached: landing is mandatory'
    if (canLand(f, cfg).ok) { f.mode = 'toRoad'; f.landingAssist = false; return null }
    f.landingAssist = !f.landingAssist
    return f.landingAssist ? 'Landing assist on: descending' : 'Landing assist cancelled'
  }
  return null
}

// Horizontal air movement. Same shape as the road model: speed is redirected, not scrubbed.
function stepAir(s: VehicleDynamics, input: Pick<DriveInput, 'gas' | 'brake' | 'steer'>, cfg: FlightParams, dt: number): number {
  const sinH = Math.sin(s.heading), cosH = Math.cos(s.heading)
  let vf = s.vx * sinH + s.vz * cosH
  let vl = s.vx * cosH - s.vz * sinH
  const steer = clamp(input.steer, -1, 1)

  if (input.gas) vf += cfg.thrust * dt
  if (input.brake) vf -= cfg.brake * dt
  vf -= vf * cfg.drag * dt
  vf = clamp(vf, cfg.minSpeed, cfg.maxSpeed)

  const total = Math.min(Math.hypot(vf, vl), cfg.maxSpeed)
  vl *= Math.exp(-cfg.lateralGrip * dt)
  const m = Math.sqrt(Math.max(0, total * total - vl * vl))
  vf = clamp(vf < 0 ? -m : m, cfg.minSpeed, cfg.maxSpeed)

  const speed = Math.hypot(vf, vl)
  const scale = cfg.yawMinScale + (1 - cfg.yawMinScale) * (speed / (speed + cfg.yawSpeedRef))
  const yaw = steer * cfg.yawRate * scale

  s.vx = vf * sinH + vl * cosH
  s.vz = vf * cosH - vl * sinH
  s.heading += yaw * dt
  s.x += s.vx * dt
  s.z += s.vz * dt
  return yaw
}

// One simulation step for the whole vehicle in any mode. Returns a message to show, or null.
export function updateVehicleMode(
  f: FlightState, dyn: VehicleDynamics, input: ModeInput, toggle: boolean,
  car: CarParams, drift: DriftParams, cfg: FlightParams, dt: number
): string | null {
  let message: string | null = null
  if (toggle) message = requestToggle(f, dyn, cfg)

  let steerForVisual = 0
  switch (f.mode) {
    case 'road': {
      stepVehicle(dyn, input, car, drift, dt)
      f.y = 0; f.vy = 0
      break
    }
    case 'toFlight': {
      // Still drivable while the fans deploy (no drifting, no climbing yet).
      stepVehicle(dyn, { ...input, drift: false }, car, drift, dt)
      f.y = 0; f.vy = 0
      f.progress = Math.min(1, f.progress + dt / cfg.transformTime)
      if (f.progress >= 1) f.mode = 'flight'
      break
    }
    case 'flight': {
      const yaw = stepAir(dyn, input, cfg, dt)
      steerForVisual = yaw / cfg.yawRate
      f.flightElapsed += dt
      if (f.flightElapsed >= cfg.maxFlightSeconds && !f.forcedLanding) {
        f.forcedLanding = true
        f.landingAssist = true
        message = 'Flight limit reached: automatic landing'
      }
      dyn.drifting = false

      let target = 0
      if (f.landingAssist) {
        if (input.up && !f.forcedLanding) { f.landingAssist = false; message = 'Landing assist cancelled' }
        else target = -clamp(f.y * cfg.assistGain, cfg.assistMinDescent, cfg.assistMaxDescent)
      }
      if (!f.landingAssist) {
        const lift = (input.up ? 1 : 0) - (input.down ? 1 : 0)
        target = lift > 0 ? cfg.climbRate : lift < 0 ? -cfg.descendRate : 0
      }
      const maxDv = cfg.liftAccel * dt
      f.vy += clamp(target - f.vy, -maxDv, maxDv)
      f.y += f.vy * dt

      if (f.y > cfg.ceiling) { f.y = cfg.ceiling; f.vy = Math.min(f.vy, 0) }
      if (f.y <= 0) {
        const impact = -f.vy
        f.y = 0
        if (f.vy < 0) f.vy = 0
        if (impact > cfg.hardLandingSpeed) {
          dyn.vx *= cfg.hardLandingKeep; dyn.vz *= cfg.hardLandingKeep
          message = 'Hard landing!'
        }
      }
      // Landing assist finishes by transforming back as soon as it is legal.
      if (f.landingAssist && canLand(f, cfg).ok) { f.landingAssist = false; f.mode = 'toRoad' }
      break
    }
    case 'toRoad': {
      const yaw = stepAir(dyn, input, cfg, dt)
      steerForVisual = yaw / cfg.yawRate
      // settle smoothly onto the road: no teleport, no impulse
      const oldY = f.y
      f.y = Math.max(0, f.y * Math.exp(-cfg.settleRate * dt) - 0.2 * dt)
      f.vy = (f.y - oldY) / dt
      f.progress = Math.max(0, f.progress - dt / cfg.transformTime)
      if (f.progress <= 0) {
        if (f.y <= 0.02) {
          f.y = 0; f.vy = 0; f.progress = 0; f.mode = 'road'
          dyn.drifting = false; dyn.grip = drift.gripNormal
          f.flightElapsed = 0; f.forcedLanding = false; f.landingAssist = false
        } else f.progress = 0.001
      }
      break
    }
  }

  // Visual tilt (nose follows climb, bank into turns), eased so it never snaps.
  const airborne = f.mode === 'flight' || f.mode === 'toRoad'
  const speed = Math.hypot(dyn.vx, dyn.vz)
  const targetPitch = airborne ? clamp(-f.vy * cfg.pitchPerVy, -cfg.maxPitch, cfg.maxPitch) : 0
  const targetRoll = airborne ? -steerForVisual * cfg.maxRoll * Math.min(1, 0.3 + speed / 10) : 0
  const k = 1 - Math.exp(-cfg.visualSmooth * dt)
  f.pitch += (targetPitch - f.pitch) * k
  f.roll += (targetRoll - f.roll) * k
  return message
}
