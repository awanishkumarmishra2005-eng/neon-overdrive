import { forwardRef, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { trackCurve, TRACK_WIDTH } from '../config/track'
import { CAR_CONFIG as C } from '../config/car'
import { DRIFT_CONFIG as D } from '../config/drift'
import { FLIGHT_CONFIG as F } from '../config/flight'
import { createDynamics, getReadout } from './driftModel'
import { createFlightState, updateVehicleMode } from './flightModel'
import { vehicleState } from './vehicleState'
import { commands, gameFlags, publishFlightMode, showMessage } from './commands'
import { useKeys } from './useKeys'
import { joystick, smoothAxis, touchInput as touch } from './touchInput'
import SkylineOne from './SkylineOne'
import { updateRace } from './campaign'
import { getSelectedCar } from './carCatalog'
import { consumeFreeFlightUse, getFreeFlightUsesRemaining, getEconomy, hasFlyingUnlock } from './economy'
import { rivalPositions } from './WorldItems'
import { campaignRuntime, beginRace } from './campaign'
import { playGameTone } from './audio'

// Input glue only: keyboard + touch buttons + joystick feed ONE steering value into the single
// vehicle controller (driftModel for the road, flightModel for the air). Movement maths lives
// in those pure modules; this component reads inputs, steps them and moves the 3D group.
const Car = forwardRef<THREE.Group>((_, ref) => {
  const keys = useKeys()
  const [carVersion, setCarVersion] = useState(0)
  useEffect(() => { const update = () => setCarVersion(v => v + 1); window.addEventListener('neon-overdrive-car-change', update); window.addEventListener('neon-overdrive-driver-change', update); return () => { window.removeEventListener('neon-overdrive-car-change', update); window.removeEventListener('neon-overdrive-driver-change', update) } }, [])
  const dyn = useRef(createDynamics(0, 0, 0, D.gripNormal))
  const flight = useRef(createFlightState())
  const touchSteer = useRef(0)
  const prevToggleKey = useRef(false)
  const touchingRival = useRef(false)
  const rivalCollisionCooldown = useRef(0)
  const innerRef = useRef<THREE.Group>(null)
  const group = (ref as React.RefObject<THREE.Group>) ?? innerRef

  useEffect(() => {
    const start = trackCurve.getPointAt(0)
    const tan = trackCurve.getTangentAt(0)
    dyn.current = createDynamics(start.x, start.z, Math.atan2(tan.x, tan.z), D.gripNormal)
    flight.current = createFlightState()
    publishFlightMode('road')
    if (group.current) {
      group.current.rotation.order = 'YXZ' // heading first, then pitch, then bank
      group.current.position.set(start.x, F.roadY, start.z)
      group.current.rotation.y = dyn.current.heading
    }
  }, [group])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (gameFlags.paused) { commands.toggleFlight = false; vehicleState.slide = 0; return }
    const dt = Math.min(delta, C.maxDt)
    rivalCollisionCooldown.current = Math.max(0, rivalCollisionCooldown.current - dt)
    const k = keys.current

    // Steering sources: keyboard (digital), touch buttons (digital), joystick (analog, smoothed).
    const left = k.has('KeyA') || k.has('ArrowLeft') || touch.left
    const right = k.has('KeyD') || k.has('ArrowRight') || touch.right
    touchSteer.current = smoothAxis(touchSteer.current, joystick.axis, dt)
    const steer = Math.max(-1, Math.min(1, (left ? 1 : 0) - (right ? 1 : 0) + touchSteer.current))

    // Transform: F key (edge-triggered, ignores key repeat) or the on-screen button.
    const toggleKey = k.has('KeyF')
    const toggle = (toggleKey && !prevToggleKey.current) || commands.toggleFlight
    prevToggleKey.current = toggleKey
    commands.toggleFlight = false

    const wasRoadMode = flight.current.mode === 'road'
    const hadUnlimitedFlight = getEconomy().flyingUnlocked
    if (toggle && wasRoadMode && !hasFlyingUnlock()) { showMessage('FREE FLIGHT USES FINISHED — UNLOCK UNLIMITED FLIGHT IN THE GARAGE FOR 1,000 COINS'); }
    const selectedCar = getSelectedCar()
    const carParams = { ...C, maxSpeed: selectedCar.maxSpeed, acceleration: selectedCar.acceleration }
    const msg = updateVehicleMode(flight.current, dyn.current, {
      gas: k.has('KeyW') || k.has('ArrowUp') || touch.gas,
      brake: k.has('KeyS') || k.has('ArrowDown') || touch.brake,
      steer,
      drift: k.has('ShiftLeft') || k.has('ShiftRight') || touch.drift,
      up: k.has('KeyQ') || touch.up,
      down: k.has('KeyE') || touch.down
    }, toggle && hasFlyingUnlock(), carParams, D, F, dt)
    if (toggle && wasRoadMode && flight.current.mode === 'toFlight' && !hadUnlimitedFlight) { consumeFreeFlightUse(); showMessage(`FREE FLIGHT USED · ${getFreeFlightUsesRemaining()} FREE USE${getFreeFlightUsesRemaining() === 1 ? '' : 'S'} LEFT`); }
    if (msg) showMessage(msg)

    const s = dyn.current, f = flight.current
    // Physical guardrail collision: rails are not just decoration. While on the road, project
    // the car to the nearest centreline sample and prevent it crossing either track edge.
    // Air mode is intentionally exempt so the short flight mechanic can clear the road.
    let hitBoundary = false
    if (f.mode === 'road' || f.mode === 'toFlight') {
      let nearestT = 0, nearestD = Infinity, cx = 0, cz = 0, tx = 0, tz = 1
      const samples = 720
      for (let i = 0; i < samples; i++) {
        const t = i / samples
        const p = trackCurve.getPointAt(t)
        const dx = p.x - s.x, dz = p.z - s.z, d2 = dx * dx + dz * dz
        if (d2 < nearestD) {
          nearestD = d2; nearestT = t; cx = p.x; cz = p.z
          const tangent = trackCurve.getTangentAt(t); tx = tangent.x; tz = tangent.z
        }
      }
      void nearestT
      const nx = -tz, nz = tx
      const lateral = (s.x - cx) * nx + (s.z - cz) * nz
      const safeEdge = TRACK_WIDTH / 2 - 1.15
      if (Math.abs(lateral) > safeEdge) {
        hitBoundary = true
        const sign = Math.sign(lateral) || 1
        s.x = cx + nx * safeEdge * sign
        s.z = cz + nz * safeEdge * sign
        const outward = s.vx * nx * sign + s.vz * nz * sign
        if (outward > 0) {
          s.vx -= nx * sign * outward * 1.15
          s.vz -= nz * sign * outward * 1.15
        }
        s.vx *= 0.82; s.vz *= 0.82
        showMessage('GUARDRAIL IMPACT — STAY ON THE ROAD')
      }
    }
    // Vehicle-to-vehicle collision: rivals are solid gameplay obstacles, not ghost cars.
    // Count only a new impact, not every frame spent touching a rival.
    let hitRival = false
    if (campaignRuntime.status === 'racing' && f.y < 1.6) {
      for (const rival of rivalPositions) {
        const dx = s.x - rival.x, dz = s.z - rival.z
        const distance = Math.hypot(dx, dz)
        if (distance < 2.65) {
          hitRival = true
          const nx = distance > 0.001 ? dx / distance : Math.sin(s.heading + Math.PI)
          const nz = distance > 0.001 ? dz / distance : Math.cos(s.heading + Math.PI)
          const overlap = 2.65 - distance
          s.x += nx * (overlap + 0.12)
          s.z += nz * (overlap + 0.12)
          const impactSpeed = s.vx * nx + s.vz * nz
          if (impactSpeed < 0) { s.vx -= 1.45 * impactSpeed * nx; s.vz -= 1.45 * impactSpeed * nz }
          s.vx *= 0.62; s.vz *= 0.62
          break
        }
      }
    }
    if (hitRival && !touchingRival.current && rivalCollisionCooldown.current <= 0) {
      vehicleState.collisionCount += 1
      rivalCollisionCooldown.current = 0.4
      showMessage(`RIVAL COLLISION ${vehicleState.collisionCount}/2`, 1800)
      playGameTone(82, .28, 'sawtooth', .11)
      if (vehicleState.collisionCount >= 2) {
        const level = campaignRuntime.selectedLevel
        beginRace(level)
        const start = trackCurve.getPointAt(0), tan = trackCurve.getTangentAt(0)
        dyn.current = createDynamics(start.x, start.z, Math.atan2(tan.x, tan.z), D.gripNormal)
        flight.current = createFlightState()
        s.x = start.x; s.z = start.z; s.vx = 0; s.vz = 0
        touchingRival.current = false
        rivalCollisionCooldown.current = 1.1
        showMessage('TWO COLLISIONS — LEVEL RESTARTED', 2600)
      }
    }
    touchingRival.current = hitRival
    vehicleState.collision = hitBoundary || hitRival
    g.position.set(s.x, F.roadY + f.y, s.z)
    g.rotation.set(f.pitch, s.heading, f.roll)

    const r = getReadout(s, D)
    const onRoad = f.mode === 'road' || f.mode === 'toFlight'
    vehicleState.x = s.x; vehicleState.z = s.z; vehicleState.heading = s.heading
    vehicleState.forward = r.forward; vehicleState.lateral = r.lateral
    vehicleState.slip = r.slip
    vehicleState.slide = onRoad ? r.slide : 0 // no tire smoke/marks in the air
    vehicleState.drifting = s.drifting && onRoad
    vehicleState.altitude = f.y; vehicleState.vy = f.vy; vehicleState.flightProgress = f.progress
    publishFlightMode(f.mode)
    updateRace(s.x, s.z)
  })

  return (
    <group ref={group}>
      <SkylineOne key={carVersion} />
    </group>
  )
})

export default Car