import { useMemo } from 'react'
import * as THREE from 'three'
import { trackCurve, TRACK_WIDTH, TRACK_SEGMENTS } from '../config/track'

function buildRibbon(width: number, yOffset = 0): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const half = width / 2
  for (let i = 0; i <= TRACK_SEGMENTS; i++) {
    const t = (i % TRACK_SEGMENTS) / TRACK_SEGMENTS
    const p = trackCurve.getPointAt(t)
    const tan = trackCurve.getTangentAt(t)
    const nx = -tan.z, nz = tan.x
    positions.push(p.x + nx * half, p.y + yOffset, p.z + nz * half)
    positions.push(p.x - nx * half, p.y + yOffset, p.z - nz * half)
    if (i < TRACK_SEGMENTS) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function buildCenterDashes() {
  const items: THREE.Vector3[] = []
  const count = 100
  for (let i = 0; i < count; i++) {
    const t = (i + 0.15) / count
    items.push(trackCurve.getPointAt(t))
  }
  return items
}

function GuardRails() {
  const rails = useMemo(() => {
    const points: THREE.Vector3[][] = [[], []]
    const posts: THREE.Vector3[] = []
    const n = 180
    for (let i = 0; i < n; i++) {
      const t = i / n
      const p = trackCurve.getPointAt(t), tan = trackCurve.getTangentAt(t)
      const nx = -tan.z, nz = tan.x
      for (const side of [-1, 1]) {
        const x = p.x + nx * side * (TRACK_WIDTH / 2 + 0.8)
        const z = p.z + nz * side * (TRACK_WIDTH / 2 + 0.8)
        posts.push(new THREE.Vector3(x, p.y + 0.48, z))
        points[side === -1 ? 0 : 1].push(new THREE.Vector3(x, p.y + 0.78, z))
      }
    }
    return { points, posts }
  }, [])
  const railGeos = useMemo(() => rails.points.map(points => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 360, 0.13, 5, true)), [rails])
  return <group>
    {railGeos.map((geometry, i) => <mesh key={i} geometry={geometry}><meshStandardMaterial color="#a9b4c0" metalness={0.78} roughness={0.32} /></mesh>)}
    {rails.posts.map((p, i) => <mesh key={i} position={p.toArray()}><boxGeometry args={[0.12, 0.85, 0.12]} /><meshStandardMaterial color="#737d88" metalness={0.6} /></mesh>)}
  </group>
}

function MountainScenery() {
  const peaks = useMemo(() => {
    const arr: Array<{x:number; z:number; h:number; r:number; shade:string}> = []
    // Distant low-poly mountain ridges around the circuit; intentionally low count for mobile GPUs.
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      const r = 430 + (i % 4) * 38
      arr.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.72, h: 48 + (i % 5) * 13, r: 42 + (i % 3) * 12, shade: i % 2 ? '#202b39' : '#293344' })
    }
    return arr
  }, [])
  return <group>
    {peaks.map((p, i) => <mesh key={i} position={[p.x, p.h * 0.42 - 2, p.z]} scale={[p.r, p.h, p.r]}>
      <coneGeometry args={[1, 1.9, 6, 1]} /><meshStandardMaterial color={p.shade} roughness={1} flatShading />
    </mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
      <planeGeometry args={[1600, 1600]} /><meshStandardMaterial color="#18251f" roughness={1} />
    </mesh>
  </group>
}


function CityBuildings() {
  const buildings = useMemo(() => {
    const out: Array<{x:number; z:number; w:number; h:number; d:number; color:string; seed:number}> = []
    const colors = ['#273546', '#344454', '#202b3b', '#3d4b5b', '#283d4c']
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      const radius = 105 + (i % 4) * 17
      out.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius * .78, w: 7 + (i % 4) * 2.2, h: 12 + ((i * 17) % 8) * 5, d: 7 + (i % 3) * 2, color: colors[i % colors.length], seed: i })
    }
    return out
  }, [])
  return <group>{buildings.map((b) => <group key={b.seed} position={[b.x, b.h / 2 - .1, b.z]}>
    <mesh><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial color={b.color} metalness={.38} roughness={.48} /></mesh>
    {Array.from({length: Math.max(2, Math.floor(b.h / 4))}, (_, row) => <mesh key={row} position={[0, -b.h/2 + 2 + row*3.5, b.d/2 + .012]}>
      <boxGeometry args={[b.w*.72, .55, .025]} /><meshBasicMaterial color={(row + b.seed) % 3 === 0 ? '#ffb64d' : (row+b.seed)%2 ? '#4ceaff' : '#b3d8ff'} />
    </mesh>)}
    <mesh position={[0, b.h/2 + 1, 0]}><boxGeometry args={[b.w*.18, 2, b.d*.18]} /><meshStandardMaterial color="#8494a4" metalness={.55} /></mesh>
  </group>)}</group>
}

function BridgeSection() {
  // A scenic overpass across one part of the circuit. Kept as lightweight box geometry.
  const deck = useMemo(() => {
    const p = trackCurve.getPointAt(0.245)
    const tangent = trackCurve.getTangentAt(0.245)
    return { p, angle: Math.atan2(tangent.x, tangent.z) }
  }, [])
  return <group position={[deck.p.x, 0, deck.p.z]} rotation={[0, deck.angle, 0]}>
    <mesh position={[0, -0.18, 0]}><boxGeometry args={[TRACK_WIDTH + 4, 0.45, 62]} /><meshStandardMaterial color="#555d68" roughness={0.85} /></mesh>
    {[-1, 1].map(side => <group key={side} position={[side * (TRACK_WIDTH / 2 + 1.25), 1.05, 0]}>
      <mesh><boxGeometry args={[0.2, 2.2, 62]} /><meshStandardMaterial color="#8e9aa6" metalness={0.6} /></mesh>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, -0.7, -27 + i * 6.75]}><boxGeometry args={[0.25, 1.5, 0.25]} /><meshStandardMaterial color="#bac3cc" metalness={0.65} /></mesh>)}
    </group>)}
    {[-22, 0, 22].map(z => <mesh key={z} position={[0, -5.5, z]}><boxGeometry args={[1.1, 10.5, 1.1]} /><meshStandardMaterial color="#4c5662" /></mesh>)}
  </group>
}

export default function Track() {
  const road = useMemo(() => buildRibbon(TRACK_WIDTH, 0.02), [])
  const shoulder = useMemo(() => buildRibbon(TRACK_WIDTH + 2.4, 0), [])
  const dashes = useMemo(() => buildCenterDashes(), [])
  return <group>
    <MountainScenery />
    <CityBuildings />
    <BridgeSection />
    <mesh geometry={shoulder} position={[0, -0.025, 0]}><meshStandardMaterial color="#343b45" roughness={0.95} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={road}><meshStandardMaterial color="#242830" roughness={0.86} metalness={0.08} side={THREE.DoubleSide} /></mesh>
    {dashes.map((p, i) => <mesh key={i} position={[p.x, p.y + 0.045, p.z]} rotation={[0, -Math.atan2(trackCurve.getTangentAt((i + 0.15) / 100).x, trackCurve.getTangentAt((i + 0.15) / 100).z), 0]}>
      <boxGeometry args={[0.16, 0.025, 2.4]} /><meshBasicMaterial color="#e8edf5" />
    </mesh>)}
    <GuardRails />
  </group>
}
