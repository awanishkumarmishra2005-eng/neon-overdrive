
import type { CarParams } from '../config/car'
import type { DriftParams } from '../config/drift'
import type { FlightParams } from '../config/flight'
import { stepVehicle, type VehicleDynamics } from './driftModel'

export type FlightMode = 'road' | 'toFlight' | 'flight' | 'toRoad'

export interface FlightState {
  mode: FlightMode
  y: number
  vy: number
  pitch: number
  roll: number
  progress: number
  elapsed: number
  visualPitch: number
  visualRoll: number
}

export interface FlightInput {
  gas: boolean
  brake: boolean
  steer: number
  drift: boolean
  up: boolean
  down: boolean
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const smooth = (
  current: number,
  target: number,
  rate: number,
  dt: number
): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt))

export function createFlightState(): FlightState {
  return {
    mode: 'road',
    y: 0,
    vy: 0,
    pitch: 0,
    roll: 0,
    progress: 0,
    elapsed: 0,
    visualPitch: 0,
    visualRoll: 0
  }
}

export function updateVehicleMode(
  state: FlightState,
  vehicle: VehicleDynamics,
  input: FlightInput,
  toggleFlight: boolean,
  car: CarParams,
  drift: DriftParams,
  flight: FlightParams,
  dt: number
): string {
  const step = clamp(dt, 0, car.maxDt)
  const steer = clamp(input.steer, -1, 1)

  // Road driving uses the existing vehicle physics.
  if (state.mode === 'road') {
    state.y = 0
    state.vy = 0
    state.elapsed = 0

    stepVehicle(
      vehicle,
      {
        gas: input.gas,
        brake: input.brake,
        steer,
        drift: input.drift
      },
      car,
      drift,
      step
    )

    if (!toggleFlight) {
      state.pitch = smooth(
        state.pitch,
        0,
        flight.visualSmooth,
        step
      )
      state.roll = smooth(
        state.roll,
        0,
        flight.visualSmooth,
        step
      )

      state.visualPitch = state.pitch
      state.visualRoll = state.roll

      return ''
    }

    state.mode = 'toFlight'
    state.progress = 0
    state.elapsed = 0

    return 'Flight transformation started'
  }

  // Continue driving while the transformation plays.
  if (state.mode === 'toFlight') {
    stepVehicle(
      vehicle,
      {
        gas: input.gas,
        brake: input.brake,
        steer,
        drift: input.drift
      },
      car,
      drift,
      step
    )

    state.progress = clamp(
      state.progress + step / flight.transformTime,
      0,
      1
    )

    state.pitch = 0
    state.roll = 0
    state.visualPitch = 0
    state.visualRoll = 0

    if (state.progress >= 1) {
      state.mode = 'flight'
      state.elapsed = 0

      return 'Flight mode activated'
    }

    return ''
  }

  // Flight movement.
  if (state.mode === 'flight') {
    state.elapsed += step

    const forward =
      vehicle.vx * Math.sin(vehicle.heading) +
      vehicle.vz * Math.cos(vehicle.heading)

    let speed = forward

    if (input.gas) {
      speed += flight.thrust * step
    }

    if (input.brake) {
      speed -= flight.brake * step
    }

    speed -= speed * flight.drag * step

    speed = clamp(
      speed,
      flight.minSpeed,
      flight.maxSpeed
    )

    const yawStrength =
      flight.yawRate *
      (
        flight.yawMinScale +
        (1 - flight.yawMinScale) *
          clamp(
            Math.abs(speed) / flight.yawSpeedRef,
            0,
            1
          )
      )

    vehicle.heading +=
      steer * yawStrength * step * (speed < 0 ? -1 : 1)

    const sinHeading = Math.sin(vehicle.heading)
    const cosHeading = Math.cos(vehicle.heading)

    vehicle.vx = speed * sinHeading
    vehicle.vz = speed * cosHeading

    vehicle.x += vehicle.vx * step
    vehicle.z += vehicle.vz * step

    // Q: climb.
    if (input.up && !input.down) {
      state.vy = Math.min(
        flight.climbRate,
        state.vy + flight.liftAccel * step
      )
    }
    // E: descend.
    else if (input.down && !input.up) {
      state.vy = Math.max(
        -flight.descendRate,
        state.vy - flight.liftAccel * 2.5 * step
      )
    }
    // Release vertical controls to stabilize the car.
    else {
      state.vy = smooth(
        state.vy,
        0,
        flight.lateralGrip,
        step
      )
    }

    state.y = clamp(
      state.y + state.vy * step,
      0,
      flight.ceiling
    )

    if (state.y <= 0 && state.vy < 0) {
      state.vy = 0
    }

    const targetPitch = clamp(
      state.vy * flight.pitchPerVy,
      -flight.maxPitch,
      flight.maxPitch
    )

    // Reduce air roll while retaining steering feedback.
    const targetRoll = -steer * flight.maxRoll * 0.45

    state.pitch = smooth(
      state.visualPitch,
      targetPitch,
      flight.visualSmooth,
      step
    )

    state.roll = smooth(
      state.visualRoll,
      targetRoll,
      flight.visualSmooth,
      step
    )

    state.visualPitch = state.pitch
    state.visualRoll = state.roll

    // Respect the configured maximum flight duration.
    if (state.elapsed >= flight.maxFlightSeconds) {
      state.mode = 'toRoad'
      state.progress = 0

      return 'Flight time expired — landing required'
    }

    if (toggleFlight) {
      state.mode = 'toRoad'
      state.progress = 0

      return 'Landing initiated'
    }

    return ''
  }

  // Landing assistance.
  if (state.mode === 'toRoad') {
    state.progress = clamp(
      state.progress + step / flight.transformTime,
      0,
      1
    )

    const descentTarget = Math.min(
      flight.assistMaxDescent,
      Math.max(
        flight.assistMinDescent,
        state.y * flight.assistGain
      )
    )

    if (state.y > flight.landMaxAltitude) {
      state.vy = Math.max(
        -descentTarget,
        state.vy - flight.liftAccel * step
      )

      state.y = Math.max(
        0,
        state.y + state.vy * step
      )
    } else {
      state.vy = Math.max(
        -flight.landMaxDescent,
        state.vy
      )

      state.y = Math.max(
        0,
        state.y - flight.settleRate * step
      )
    }

    state.pitch = smooth(
      state.pitch,
      0,
      flight.visualSmooth,
      step
    )

    state.roll = smooth(
      state.roll,
      0,
      flight.visualSmooth,
      step
    )

    state.visualPitch = state.pitch
    state.visualRoll = state.roll

    if (
      state.y <= 0.01 &&
      Math.abs(state.vy) <= flight.landMaxDescent
    ) {
      state.y = 0
      state.vy = 0
      state.mode = 'road'
      state.progress = 0
      state.elapsed = 0
      state.pitch = 0
      state.roll = 0
      state.visualPitch = 0
      state.visualRoll = 0

      return 'Landing complete'
    }

    return ''
  }

  return ''
}
