// Headless test of the vehicle model. Run: npm run test:drift
import assert from 'node:assert/strict'
import { CAR_CONFIG as car } from '../src/config/car'
import { DRIFT_CONFIG as d } from '../src/config/drift'
import { createDynamics, stepVehicle, getReadout, type DriveInput, type VehicleDynamics } from '../src/game/driftModel'

const DT = 1 / 60
const none: DriveInput = { gas: false, brake: false, steer: 0, drift: false }
const run = (s: VehicleDynamics, input: DriveInput, secs: number, each?: (t: number) => void) => {
  for (let i = 0; i < Math.round(secs / DT); i++) { stepVehicle(s, input, car, d, DT); each?.((i + 1) * DT) }
}
const deg = (r: number) => (r * 180) / Math.PI
const fresh = () => createDynamics(0, 0, 0, d.gripNormal)

// Original (Milestone 1) model, reproduced for regression comparison.
function oldModel(script: Array<[Partial<DriveInput>, number]>) {
  let speed = 0, h = 0, x = 0, z = 0
  for (const [inp, secs] of script) for (let i = 0; i < Math.round(secs / DT); i++) {
    if (inp.gas) speed += car.acceleration * DT
    if (inp.brake) speed -= car.brake * DT
    speed -= speed * car.drag * DT
    speed = Math.min(car.maxSpeed, Math.max(-8, speed))
    const g = Math.abs(speed) / (Math.abs(speed) + 6)
    h += (inp.steer ?? 0) * car.steerRate * g * Math.sign(speed || 1) * DT
    x += Math.sin(h) * speed * DT; z += Math.cos(h) * speed * DT
  }
  return { speed, x, z, h }
}
function newModel(script: Array<[Partial<DriveInput>, number]>) {
  const s = fresh()
  for (const [inp, secs] of script) run(s, { ...none, ...inp }, secs)
  return { s, r: getReadout(s, d) }
}

console.log('--- 1. Regression vs original model (no Shift) ---')
const scripts: Record<string, Array<[Partial<DriveInput>, number]>> = {
  'accelerate 6s': [[{ gas: true }, 6]],
  'accelerate 4s, brake 3s': [[{ gas: true }, 4], [{ brake: true }, 3]],
  'reverse 2s': [[{ brake: true }, 2]],
  'accel 5s then gentle turn 4s': [[{ gas: true }, 5], [{ gas: true, steer: 1 }, 4]]
}
for (const [name, sc] of Object.entries(scripts)) {
  const o = oldModel(sc), n = newModel(sc)
  const dPos = Math.hypot(o.x - n.s.x, o.z - n.s.z)
  console.log(`${name}: speed old ${o.speed.toFixed(2)} new ${n.r.forward.toFixed(2)} m/s | position diff ${dPos.toFixed(2)} m | heading diff ${deg(Math.abs(o.h - n.s.heading)).toFixed(2)} deg`)
  assert.ok(Math.abs(o.speed - n.r.forward) < 0.6, `${name}: speed regression`)
  assert.ok(n.s.drifting === false)
}
{
  const o = oldModel(scripts['accelerate 6s']), n = newModel(scripts['accelerate 6s'])
  assert.ok(Math.abs(o.z - n.s.z) < 0.5, 'straight-line distance regression')
}

console.log('--- 2. Shift alone must not change acceleration/braking ---')
{
  const a = fresh(), b = fresh()
  run(a, { ...none, gas: true }, 5); run(b, { ...none, gas: true, drift: true }, 5)
  console.log(`accel 5s: without Shift ${getReadout(a, d).forward.toFixed(3)} m/s, with Shift (no steer) ${getReadout(b, d).forward.toFixed(3)} m/s, drifting=${b.drifting}`)
  assert.equal(b.drifting, false)
  assert.ok(Math.abs(getReadout(a, d).forward - getReadout(b, d).forward) < 1e-9)
}

console.log('--- 3. Drift start conditions ---')
{
  const slow = fresh(); run(slow, { ...none, gas: true }, 0.3)
  run(slow, { ...none, gas: true, steer: 1, drift: true }, 0.2)
  console.log(`speed ${getReadout(slow, d).forward.toFixed(1)} m/s (< ${d.minSpeed}) with Shift+steer -> drifting=${slow.drifting}`)
  assert.equal(slow.drifting, false)
}

console.log('--- 4. Drift behaviour at speed ---')
{
  const s = fresh(); run(s, { ...none, gas: true }, 6)
  const startSpeed = getReadout(s, d).forward
  let peakSlip = 0, peakLat = 0
  const driftInput = { ...none, gas: true, steer: 1, drift: true }
  run(s, driftInput, 2.0, () => { const r = getReadout(s, d); peakSlip = Math.max(peakSlip, Math.abs(r.slip)); peakLat = Math.max(peakLat, Math.abs(r.lateral)) })
  const r = getReadout(s, d)
  console.log(`before drift: ${(startSpeed * 3.6).toFixed(0)} km/h | after 2s drift: ${(Math.hypot(r.forward, r.lateral) * 3.6).toFixed(0)} km/h, drifting=${s.drifting}`)
  console.log(`peak slip angle ${deg(peakSlip).toFixed(1)} deg (limit ${deg(d.maxSlipAngle).toFixed(0)}), peak sideways speed ${peakLat.toFixed(1)} m/s, grip ${s.grip.toFixed(2)} (normal ${d.gripNormal})`)
  assert.ok(s.drifting)
  assert.ok(peakSlip > 0.2 && peakSlip < d.maxSlipAngle + 0.15, 'slip angle out of expected range')
  assert.ok(Math.hypot(r.forward, r.lateral) < car.maxSpeed + 0.01)

  // Release Shift, keep steering: grip recovers gradually.
  let tGrip90 = -1, tHalf = -1
  run(s, { ...none, gas: true, steer: 1 }, 2.0, (t) => {
    const rr = getReadout(s, d)
    if (tGrip90 < 0 && s.grip >= 0.9 * d.gripNormal) tGrip90 = t
    if (tHalf < 0 && Math.abs(rr.lateral) < 0.5 * peakLat) tHalf = t
  })
  console.log(`after Shift release: grip back to 90% in ${tGrip90.toFixed(2)} s, sideways speed under half its peak after ${tHalf.toFixed(2)} s, sideways speed at 2 s ${Math.abs(getReadout(s, d).lateral).toFixed(1)} m/s (steady cornering lean), drifting=${s.drifting}`)
  assert.equal(s.drifting, false)
  assert.ok(tHalf > 0 && tHalf < 1.0, 'sideways speed should decay quickly after release')
  assert.ok(tGrip90 > 0.3 && tGrip90 < 2.0, 'grip recovery should be gradual but finish')
}

console.log('--- 5. Drift ends when speed drops ---')
{
  const s = fresh(); run(s, { ...none, gas: true }, 5)
  run(s, { ...none, steer: 1, brake: true, drift: true }, 0.2)
  run(s, { ...none, steer: 1, brake: true, drift: true }, 3)
  console.log(`braking while Shift held: forward ${getReadout(s, d).forward.toFixed(2)} m/s, drifting=${s.drifting}`)
  assert.equal(s.drifting, false)
}

console.log('--- 6. Stability: 60 s of drifting with large dt (50 ms) ---')
{
  const s = fresh()
  for (let i = 0; i < 1200; i++) stepVehicle(s, { gas: true, brake: false, steer: i % 400 < 200 ? 1 : -1, drift: true }, car, d, 0.05)
  assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.heading))
  assert.ok(Math.hypot(s.vx, s.vz) < car.maxSpeed + 0.01)
  console.log(`finite state OK, speed ${(Math.hypot(s.vx, s.vz) * 3.6).toFixed(0)} km/h`)
}
console.log('ALL DRIFT MODEL CHECKS PASSED')
