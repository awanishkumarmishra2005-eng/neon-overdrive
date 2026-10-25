// Headless test of SKYLINE ONE mode switching + flight. Run: npm run test:flight
import assert from 'node:assert/strict'
import { CAR_CONFIG as car } from '../src/config/car'
import { DRIFT_CONFIG as d } from '../src/config/drift'
import { FLIGHT_CONFIG as F } from '../src/config/flight'
import { createDynamics, stepVehicle, getReadout, type VehicleDynamics } from '../src/game/driftModel'
import { createFlightState, updateVehicleMode, type FlightState, type ModeInput } from '../src/game/flightModel'

const DT = 1 / 60
const idle: ModeInput = { gas: false, brake: false, steer: 0, drift: false, up: false, down: false }
const fresh = (): { f: FlightState; s: VehicleDynamics } => ({ f: createFlightState(), s: createDynamics(0, 0, 0, d.gripNormal) })
type Ctx = ReturnType<typeof fresh>
const msgs: string[] = []
function run(c: Ctx, input: Partial<ModeInput>, secs: number, dt = DT, each?: () => void) {
  const inp = { ...idle, ...input }
  for (let i = 0; i < Math.round(secs / dt); i++) {
    const m = updateVehicleMode(c.f, c.s, inp, false, car, d, F, dt)
    if (m) msgs.push(m)
    each?.()
  }
}
function toggle(c: Ctx, input: Partial<ModeInput> = {}) {
  const m = updateVehicleMode(c.f, c.s, { ...idle, ...input }, true, car, d, F, DT)
  if (m) msgs.push(m)
}
const takeOff = (c: Ctx) => { toggle(c); run(c, {}, F.transformTime + 0.2); assert.equal(c.f.mode, 'flight') }
const kmh = (s: VehicleDynamics) => Math.hypot(s.vx, s.vz) * 3.6

console.log('--- 1. Road mode is unchanged (same as stepVehicle) ---')
{
  const c = fresh(), ref = createDynamics(0, 0, 0, d.gripNormal)
  const inp = { ...idle, gas: true, steer: 0.5 }
  for (let i = 0; i < 600; i++) { updateVehicleMode(c.f, c.s, inp, false, car, d, F, DT); stepVehicle(ref, inp, car, d, DT) }
  assert.ok(Math.hypot(c.s.x - ref.x, c.s.z - ref.z) < 1e-9 && Math.abs(c.s.heading - ref.heading) < 1e-12)
  assert.equal(c.f.mode, 'road')
  console.log('600 steps identical to the drift model: OK')
}

console.log('--- 2. Transformation: valid state, animation, no interruption ---')
{
  const c = fresh()
  run(c, { gas: true }, 3)
  toggle(c)
  assert.equal(c.f.mode, 'toFlight')
  for (let i = 0; i < 20; i++) toggle(c)           // button mashing
  assert.equal(c.f.mode, 'toFlight', 'mashing must not interrupt')
  let tDone = 0
  const speedBefore = kmh(c.s)
  run(c, { gas: true }, 2, DT, () => { if (c.f.mode === 'flight' && !tDone) tDone = 1 })
  assert.equal(c.f.mode, 'flight')
  assert.ok(c.f.progress === 1)
  console.log(`transformation completed; speed before ${speedBefore.toFixed(0)} km/h, car still driving during animation`)
  for (let i = 0; i < 5; i++) toggle(c)             // in flight at y=0: first toggle lands, rest ignored while transforming
  assert.ok(c.f.mode === 'toRoad' || c.f.mode === 'road')
}
{
  // cannot transform while drifting
  const c = fresh(); run(c, { gas: true }, 6)
  run(c, { gas: true, steer: 1, drift: true }, 0.5)
  assert.ok(c.s.drifting)
  toggle(c, { gas: true, steer: 1, drift: true })
  assert.equal(c.f.mode, 'road')
  assert.ok(msgs.includes('Release drift before transforming'))
  console.log('transform refused while drifting, message shown: OK')
}

console.log('--- 3. Flight is time-limited to 4 seconds, then auto-lands ---')
{
  const c = fresh(); takeOff(c)
  run(c, { up: true }, 1.5)
  assert.ok(c.f.y > 0, 'vehicle should climb during the short flight window')
  run(c, { up: true }, F.maxFlightSeconds + 0.2)
  assert.ok(c.f.forcedLanding, 'forced landing must engage after the flight time limit')
  assert.ok(c.f.landingAssist, 'automatic landing assist must engage')
  assert.ok(msgs.includes('Flight limit reached: automatic landing'))
  let elapsed = 0
  while (c.f.mode !== 'road' && elapsed < 15) { run(c, {}, DT, DT); elapsed += DT }
  assert.equal(c.f.mode, 'road', 'vehicle must return to road after its short flight')
  assert.equal(c.f.flightElapsed, 0, 'flight timer resets after landing')
  console.log(`automatic landing completed in ${elapsed.toFixed(1)} s after forced descent`)
}

console.log('--- 4. Flight horizontal control works before the time limit ---')
{
  const c = fresh(); takeOff(c); run(c, { up: true }, 0.5)
  run(c, { gas: true, steer: 1 }, 0.7)
  assert.ok(Math.hypot(c.s.vx, c.s.vz) <= F.maxSpeed + 1e-6)
  assert.ok(c.f.flightElapsed < F.maxFlightSeconds, 'manual flight test stays inside the allowed window')
  console.log(`air control works; speed ${kmh(c.s).toFixed(0)} km/h, timer ${c.f.flightElapsed.toFixed(1)} s`)
}

console.log('--- 5. Landing: refused when high, assist lands it, hard landing penalty ---')
{
  const c = fresh(); takeOff(c); run(c, { gas: true, up: true }, 1.5)
  const alt = c.f.y
  msgs.length = 0
  toggle(c)
  assert.equal(c.f.mode, 'flight'); assert.ok(c.f.landingAssist)
  assert.ok(msgs.includes('Landing assist on: descending'))
  const speedBefore = kmh(c.s)
  let t = 0, maxSink = 0, maxStep = 0
  const prev = { x: c.s.x, z: c.s.z, vx: c.s.vx, vz: c.s.vz, y: c.f.y }
  while (c.f.mode !== 'road' && t < 20) {
    run(c, { gas: true }, DT, DT, () => {
      maxSink = Math.min(maxSink, c.f.vy)
      maxStep = Math.max(maxStep, Math.abs(c.f.y - prev.y) / DT, Math.hypot(c.s.vx - prev.vx, c.s.vz - prev.vz) / DT)
      prev.y = c.f.y; prev.vx = c.s.vx; prev.vz = c.s.vz
    })
    t += DT
  }
  console.log(`landing assist from ${alt.toFixed(0)} m: back on road after ${t.toFixed(1)} s, fastest sink ${(-maxSink).toFixed(1)} m/s, speed ${speedBefore.toFixed(0)} -> ${kmh(c.s).toFixed(0)} km/h`)
  assert.equal(c.f.mode, 'road'); assert.equal(c.f.y, 0); assert.equal(c.f.vy, 0); assert.equal(c.f.progress, 0)
  assert.ok(-maxSink <= F.assistMaxDescent + 0.5, 'gentle descent')
  assert.ok(maxStep < 60, 'no violent impulses (largest per-second change < 60 m/s^2 equivalents)')
  // road controls work again
  const x0 = c.s.x, z0 = c.s.z
  run(c, { gas: true }, 1)
  assert.ok(Math.hypot(c.s.x - x0, c.s.z - z0) > 3)
  assert.equal(getReadout(c.s, d).slide >= 0, true)
}
{
  // cancel assist by pressing ascend
  const c = fresh(); takeOff(c); run(c, { up: true }, 3)
  toggle(c); assert.ok(c.f.landingAssist)
  run(c, { up: true }, 0.2)
  assert.equal(c.f.landingAssist, false)
  // second toggle cancels assist too
  toggle(c); assert.ok(c.f.landingAssist); toggle(c); assert.equal(c.f.landingAssist, false)
}
{
  // direct landing when low and slow: toggle lands without assist
  const c = fresh(); takeOff(c); run(c, { up: true }, 0.2); run(c, { down: true }, 1)
  assert.equal(c.f.y, 0)
  toggle(c); assert.equal(c.f.mode, 'toRoad')
  run(c, {}, F.transformTime + 0.5); assert.equal(c.f.mode, 'road')
  console.log('direct landing at ground level: OK')
}
{
  // A long flight cannot bypass the mandatory four-second timer.
  const c = fresh(); takeOff(c); run(c, { up: true }, F.maxFlightSeconds + 1)
  assert.ok(c.f.forcedLanding)
  assert.ok(c.f.landingAssist)
  console.log('long flight forces landing and cannot be extended: OK')
}

console.log('--- 6. Stability with 50 ms frames and key mashing ---')
{
  const c = fresh()
  for (let i = 0; i < 2000; i++) {
    const t = i % 120
    updateVehicleMode(c.f, c.s, { gas: true, brake: t > 100, steer: t < 60 ? 1 : -1, drift: t % 40 < 8, up: t < 50, down: t > 90 }, i % 37 === 0, car, d, F, 0.05)
    assert.ok(Number.isFinite(c.s.x) && Number.isFinite(c.f.y) && Number.isFinite(c.f.vy) && Number.isFinite(c.f.pitch))
    assert.ok(c.f.y >= 0 && c.f.y <= F.ceiling)
    assert.ok(Math.hypot(c.s.vx, c.s.vz) <= Math.max(F.maxSpeed, car.maxSpeed) + 0.01)
  }
  console.log(`2000 random frames OK (mode ended as ${c.f.mode})`)
}
console.log('ALL FLIGHT MODEL CHECKS PASSED')
