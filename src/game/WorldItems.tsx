import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { trackCurve, TRACK_WIDTH } from '../config/track'
import { vehicleState } from './vehicleState'
import { awardCoins } from './economy'
import { campaignRuntime } from './campaign'

const COIN_COUNT = 24
export const rivalPositions: THREE.Vector3[] = Array.from({ length: 5 }, () => new THREE.Vector3(0, 0, 0))
const RIVALS = [
  { t: 0.08, speed: 0.012, color: '#ffb21c' }, { t: 0.29, speed: 0.014, color: '#2764db' },
  { t: 0.48, speed: 0.011, color: '#20a45b' }, { t: 0.68, speed: 0.013, color: '#e7edf5' },
  { t: 0.86, speed: 0.015, color: '#7c4dff' },
]
function RivalCar({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .38, 0]}><boxGeometry args={[1.75, .45, 3.55]} /><meshStandardMaterial color={color} metalness={.72} roughness={.24} /></mesh>
    <mesh position={[0, .67, -.15]}><boxGeometry args={[1.12, .34, 1.45]} /><meshStandardMaterial color="#101b28" metalness={.75} roughness={.12} /></mesh>
    {[-1, 1].map(side => <group key={side}>
      {[-1.1, 1.1].map(z => <mesh key={z} position={[side * .91, .25, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.31, .31, .18, 10]} /><meshStandardMaterial color="#080a0d" roughness={.9} /></mesh>)}
      <mesh position={[side * .52, .4, 1.78]}><boxGeometry args={[.38, .09, .035]} /><meshBasicMaterial color="#dffbff" /></mesh>
      <mesh position={[side * .52, .4, -1.78]}><boxGeometry args={[.38, .09, .035]} /><meshBasicMaterial color="#ff244c" /></mesh>
    </group>)}
  </group>
}
export function RivalTraffic() {
  const refs = useRef<Array<THREE.Group | null>>([])
  const phases = useMemo(() => RIVALS.map(r => r.t), [])
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05)
    RIVALS.forEach((r, i) => {
      const g = refs.current[i]; if (!g) return
      phases[i] = (phases[i] + r.speed * dt) % 1
      const t = phases[i], p = trackCurve.getPointAt(t), tan = trackCurve.getTangentAt(t)
      const side = i % 2 === 0 ? -1 : 1
      const x = p.x - tan.z * side * 2.5, z = p.z + tan.x * side * 2.5
      g.position.set(x, .03, z); g.rotation.y = Math.atan2(tan.x, tan.z)
      rivalPositions[i].set(x, .03, z)
    })
  })
  return <group>{RIVALS.map((r, i) => <group key={i} ref={el => { refs.current[i] = el }}><RivalCar color={r.color} /></group>)}</group>
}
export function TrackCoins() {
  const collected = useRef(new Set<number>())
  const refs = useRef<Array<THREE.Group | null>>([])
  const lastRaceStart = useRef(0)
  const points = useMemo(() => Array.from({ length: COIN_COUNT }, (_, i) => {
    const t = (i + .5) / COIN_COUNT, p = trackCurve.getPointAt(t), tan = trackCurve.getTangentAt(t)
    const side = i % 2 ? 1 : -1, offset = TRACK_WIDTH * .22
    return new THREE.Vector3(p.x - tan.z * side * offset, .95, p.z + tan.x * side * offset)
  }), [])
  useFrame((state, delta) => {
    if (campaignRuntime.startAt !== lastRaceStart.current) {
      lastRaceStart.current = campaignRuntime.startAt
      collected.current.clear()
      refs.current.forEach(mesh => { if (mesh) mesh.visible = true })
    }
    points.forEach((p, i) => {
      const g = refs.current[i]; if (!g) return
      if (collected.current.has(i)) { g.visible = false; return }
      g.rotation.y += Math.min(delta, .05) * 2.2
      g.position.y = .95 + Math.sin(state.clock.elapsedTime * 2.8 + i) * .12
      if (campaignRuntime.status === 'racing' && Math.hypot(vehicleState.x - p.x, vehicleState.z - p.z) < 3.1 && vehicleState.altitude < 2.5) {
        collected.current.add(i); g.visible = false; awardCoins(25, 'track-pickup')
      }
    })
  })
  return <group>{points.map((p, i) => <group key={i} position={p} ref={el => { refs.current[i] = el }}>
    <mesh><torusGeometry args={[.48, .13, 8, 16]} /><meshStandardMaterial color="#ffc928" emissive="#ff9a00" emissiveIntensity={1.2} metalness={.85} roughness={.2} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.32, .32, .12, 12]} /><meshStandardMaterial color="#ffe88a" metalness={.9} roughness={.18} /></mesh>
  </group>)}</group>
}
export function CollisionSparks() {
  const sparks = useRef<Array<THREE.Mesh | null>>([])
  const active = useRef(0)
  const wasHit = useRef(false)
  const velocities = useRef(Array.from({ length: 14 }, (_, i) => new THREE.Vector3(Math.cos(i * 2.4) * (2 + i % 4), 1.5 + (i % 5), Math.sin(i * 2.4) * (2 + i % 4))))
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05)
    if (vehicleState.collision && !wasHit.current) {
      active.current = .55
      sparks.current.forEach((mesh, i) => { if (mesh) mesh.position.set(vehicleState.x + velocities.current[i].x * .05, .6 + Math.random() * .6, vehicleState.z + velocities.current[i].z * .05) })
    }
    wasHit.current = vehicleState.collision
    active.current = Math.max(0, active.current - dt)
    sparks.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.visible = active.current > 0
      if (mesh.visible) { mesh.position.addScaledVector(velocities.current[i], dt); velocities.current[i].y -= 9 * dt; mesh.scale.setScalar(Math.max(.05, active.current * 1.4)) }
    })
  })
  return <group>{Array.from({ length: 14 }, (_, i) => <mesh key={i} visible={false} ref={el => { sparks.current[i] = el }}><sphereGeometry args={[.075, 5, 5]} /><meshBasicMaterial color={i % 3 ? '#ffcc45' : '#ffffff'} /></mesh>)}</group>
}
