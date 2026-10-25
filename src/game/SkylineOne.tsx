import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { vehicleState } from './vehicleState'
import { getSelectedCar } from './carCatalog'
import { getSelectedDriver } from './economy'

// Low-poly but recognisable fictional supercar silhouette. Each garage selection changes body
// proportions, paint, aero package and performance; no licensed logos/assets are used.
const WHEELS: Array<[number, number]> = [[-1, 1.38], [1, 1.38], [-1, -1.38], [1, -1.38]]
const FANS: Array<[number, number]> = [[-0.55, 1.5], [0.55, 1.5], [-0.55, -1.5], [0.55, -1.5]]

function WedgeHood({ color, length, width }: { color: string; length: number; width: number }) {
  const geometry = new THREE.BufferGeometry()
  const l = length * 0.46, w = width * 0.48
  const vertices = new Float32Array([
    -w, 0.27, 0.15,  w, 0.27, 0.15,  -w * 0.78, 0.12, l,  w * 0.78, 0.12, l,
    -w, 0.27, 0.15, -w * 0.78, 0.12, l, 0, 0.02, l * 1.03,
     w, 0.27, 0.15, 0, 0.02, l * 1.03, w * 0.78, 0.12, l,
    -w, 0.27, 0.15, 0, 0.02, l * 1.03, w, 0.27, 0.15,
  ])
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); geometry.computeVertexNormals()
  return <mesh geometry={geometry} position={[0, 0.12, length * 0.06]}><meshStandardMaterial color={color} metalness={0.7} roughness={0.26} side={THREE.DoubleSide} /></mesh>
}

export default function SkylineOne() {
  const wheelRefs = useRef<Array<THREE.Group | null>>([])
  const fanRefs = useRef<Array<THREE.Group | null>>([])
  const bladeRefs = useRef<Array<THREE.Group | null>>([])
  const glowRef = useRef<THREE.Mesh>(null)
  const spin = useRef(0)
  const car = getSelectedCar()
  const driver = getSelectedDriver()
  const headlightRefs = useRef<Array<THREE.Mesh | null>>([])
  const beamRefs = useRef<Array<THREE.Mesh | null>>([])
  const tailRefs = useRef<Array<THREE.Mesh | null>>([])
  const lampRefs = useRef<Array<THREE.PointLight | null>>([])
  const bodyWidth = car.width, bodyLength = car.length
  const cyan = car.accent

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = THREE.MathUtils.smoothstep(vehicleState.flightProgress, 0, 1)
    spin.current += (vehicleState.forward * dt / 0.4) * (1 - p)
    WHEELS.forEach(([x, z], i) => {
      const w = wheelRefs.current[i]; if (!w) return
      w.rotation.x = spin.current; w.scale.setScalar(1 - 0.35 * p)
      w.position.set(x * (1 - 0.12 * p), 0.12 * p, z * (bodyLength / 4.35))
    })
    FANS.forEach((_, i) => {
      const f = fanRefs.current[i], b = bladeRefs.current[i]; if (!f || !b) return
      f.visible = p > 0.02; f.scale.setScalar(Math.max(p, 0.001)); b.rotation.y += dt * 38 * p
    })
    const night = 1 - vehicleState.daylight
    headlightRefs.current.forEach(m => { if (m) (m.material as THREE.MeshBasicMaterial).opacity = 0.72 + night * 0.28 })
    beamRefs.current.forEach(m => { if (m) { (m.material as THREE.MeshBasicMaterial).opacity = 0.025 + night * 0.20; m.visible = night > 0.12 } })
    tailRefs.current.forEach(m => { if (m) (m.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(performance.now() * .003) * 0.1 })
    lampRefs.current.forEach(l => { if (l) l.intensity = night * 2.8 })
    const g = glowRef.current
    if (g) { g.visible = p > 0.02; (g.material as THREE.MeshBasicMaterial).opacity = 0.45 * p }
  })

  return <>
    {/* Main wide, low chassis and sculpted wedge nose */}
    <mesh position={[0, 0.29, 0]}><boxGeometry args={[bodyWidth, 0.38, bodyLength * 0.88]} /><meshStandardMaterial color={car.color} metalness={0.78} roughness={0.24} /></mesh>
    <WedgeHood color={car.color} length={bodyLength} width={bodyWidth} />
    <mesh position={[0, 0.27, -bodyLength * 0.43]}><boxGeometry args={[bodyWidth * 0.94, 0.28, 0.42]} /><meshStandardMaterial color={car.color} metalness={0.75} roughness={0.24} /></mesh>
    {/* Dark sloped canopy */}
    <mesh position={[0, 0.66, -0.18]} rotation={[-0.03, 0, 0]}><boxGeometry args={[car.cabinWidth, 0.43, car.cabinLength]} /><meshStandardMaterial color="#101722" metalness={0.92} roughness={0.09} /></mesh>
    <mesh position={[0, 0.89, 0.28]} rotation={[0.23, 0, 0]}><boxGeometry args={[car.cabinWidth * 0.86, 0.035, car.cabinLength * 0.36]} /><meshStandardMaterial color="#233a4a" metalness={0.8} roughness={0.12} /></mesh>
    {/* Driver silhouette and selected helmet colour */}
    <group position={[0, 0.62, -0.2]}>
      <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.2, 0.26, 3, 6]} /><meshStandardMaterial color="#171d27" roughness={0.72} /></mesh>
      <mesh position={[0, 0.12, 0.03]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color={driver.color} metalness={0.45} roughness={0.24} /></mesh>
      <mesh position={[0, 0.12, 0.17]}><boxGeometry args={[0.19, 0.055, 0.035]} /><meshStandardMaterial color="#101820" metalness={0.7} roughness={0.15} /></mesh>
    </group>
    {/* Sculpted side skirts, mirrors, side intakes and rear diffuser */}
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * (bodyWidth * 0.49), 0.18, -0.02]}><boxGeometry args={[0.13, 0.16, bodyLength * 0.58]} /><meshStandardMaterial color="#151a20" metalness={0.55} roughness={0.34} /></mesh>
      <mesh position={[side * (bodyWidth * 0.53), 0.49, 0.25]} rotation={[0, side * -0.12, side * -0.12]}><boxGeometry args={[0.24, 0.12, 0.2]} /><meshStandardMaterial color={car.color} metalness={0.72} roughness={0.25} /></mesh>
      <mesh position={[side * (bodyWidth * 0.51), 0.34, -0.18]} rotation={[0, side * 0.12, 0]}><boxGeometry args={[0.035, 0.1, 0.48]} /><meshStandardMaterial color="#090d12" metalness={0.4} roughness={0.45} /></mesh>
      <mesh position={[side * (bodyWidth * 0.34), 0.34, -bodyLength * 0.42]}><boxGeometry args={[0.16, 0.06, 0.12]} /><meshBasicMaterial color="#ff334e" /></mesh>
    </group>)}
    {/* Custom A insignia: original abstract mark, not a manufacturer logo */}
    <group position={[0, 0.31, bodyLength * 0.28]}>
      <mesh rotation={[0, 0, 0.38]} position={[-0.045, 0.018, 0]}><boxGeometry args={[0.045, 0.018, 0.24]} /><meshStandardMaterial color="#e8f1f7" metalness={0.95} roughness={0.18} /></mesh>
      <mesh rotation={[0, 0, -0.38]} position={[0.045, 0.018, 0]}><boxGeometry args={[0.045, 0.018, 0.24]} /><meshStandardMaterial color="#e8f1f7" metalness={0.95} roughness={0.18} /></mesh>
      <mesh position={[0, 0.029, 0.025]}><boxGeometry args={[0.105, 0.018, 0.035]} /><meshStandardMaterial color={cyan} metalness={0.9} roughness={0.2} /></mesh>
    </group>
    {/* Front / rear light bars and aero splitter */}
    <mesh position={[0, 0.38, bodyLength * 0.49]}><boxGeometry args={[bodyWidth * 0.66, 0.055, 0.045]} /><meshBasicMaterial color="#eafcff" /></mesh>
    <mesh position={[0, 0.39, -bodyLength * 0.49]}><boxGeometry args={[bodyWidth * 0.7, 0.055, 0.045]} /><meshBasicMaterial color="#ff274d" /></mesh>
    {[-1, 1].map((side, i) => <group key={side}>
      <mesh ref={el => { headlightRefs.current[i] = el }} position={[side * bodyWidth * .31, .38, bodyLength * .49 + .018]}><boxGeometry args={[.3, .065, .025]} /><meshBasicMaterial color="#ffffff" transparent opacity={1} /></mesh>
      <mesh ref={el => { beamRefs.current[i] = el }} position={[side * bodyWidth * .31, .34, bodyLength * .49 + 2.5]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.8, 5.2, 12, 1, true]} /><meshBasicMaterial color="#b9e9ff" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <pointLight ref={el => { lampRefs.current[i] = el }} position={[side * bodyWidth * .31, .45, bodyLength * .49 + .15]} color="#b9e9ff" intensity={0} distance={20} decay={2} />
      <mesh ref={el => { tailRefs.current[i] = el }} position={[side * bodyWidth * .31, .4, -bodyLength * .49 - .02]}><boxGeometry args={[.32, .065, .03]} /><meshBasicMaterial color="#ff173e" transparent opacity={.75} /></mesh>
    </group>)}
    <mesh position={[0, 0.12, bodyLength * 0.48]}><boxGeometry args={[bodyWidth * 1.06, 0.08, 0.32]} /><meshStandardMaterial color="#11151b" metalness={0.55} /></mesh>
    <mesh position={[0, 0.29, bodyLength * 0.485]}><boxGeometry args={[bodyWidth * 0.32, 0.12, 0.045]} /><meshStandardMaterial color="#080b10" metalness={0.4} roughness={0.6} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * bodyWidth * 0.32, 0.36, bodyLength * 0.48]}><boxGeometry args={[0.34, 0.075, 0.045]} /><meshBasicMaterial color={cyan} /></mesh>)}
    <mesh position={[0, 0.18, -bodyLength * 0.47]}><boxGeometry args={[bodyWidth * 0.55, 0.11, 0.18]} /><meshStandardMaterial color="#10141a" metalness={0.7} roughness={0.3} /></mesh>
    {car.spoiler && <group position={[0, 0.72, -bodyLength * 0.49]}>
      <mesh position={[0, 0.16, 0]}><boxGeometry args={[bodyWidth * 0.92, 0.1, 0.34]} /><meshStandardMaterial color="#15191f" metalness={0.8} /></mesh>
      {[-0.58, 0.58].map(x => <mesh key={x} position={[x, 0.06, 0]}><boxGeometry args={[0.07, 0.22, 0.12]} /><meshStandardMaterial color="#252a32" /></mesh>)}
    </group>}
    {/* Wheels and metallic hubs */}
    {WHEELS.map(([x, z], i) => <group key={i} position={[x, 0, z * (bodyLength / 4.35)]} ref={el => { wheelRefs.current[i] = el }}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.39, 0.39, 0.29, 16]} /><meshStandardMaterial color="#090b0f" roughness={0.85} /></mesh>
      <mesh position={[x * 0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.21, 0.21, 0.035, 12]} /><meshStandardMaterial color="#b8c2cc" metalness={0.92} roughness={0.25} /></mesh>
      {Array.from({ length: 6 }, (_, spoke) => <mesh key={spoke} position={[x * .16, Math.cos(spoke * Math.PI / 3) * .105, Math.sin(spoke * Math.PI / 3) * .105]} rotation={[spoke * Math.PI / 3, 0, Math.PI / 2]}><boxGeometry args={[.025, .19, .035]} /><meshStandardMaterial color="#d7e0e8" metalness={.95} roughness={.2} /></mesh>)}
    </group>)}
    {/* Flight fans deploy only during transformation */}
    {FANS.map(([x, z], i) => <group key={i} position={[x, 0.55, z * (bodyLength / 4.35)]} visible={false} ref={el => { fanRefs.current[i] = el }}>
      <mesh><cylinderGeometry args={[0.34, 0.34, 0.05, 16]} /><meshStandardMaterial color="#1a1d24" metalness={0.8} /></mesh>
      <mesh><ringGeometry args={[0.3, 0.37, 20]} /><meshBasicMaterial color={cyan} /></mesh>
      <group ref={el => { bladeRefs.current[i] = el }}><mesh><boxGeometry args={[0.58, 0.02, 0.07]} /><meshBasicMaterial color={cyan} /></mesh><mesh><boxGeometry args={[0.07, 0.02, 0.58]} /><meshBasicMaterial color={cyan} /></mesh></group>
    </group>)}
    <mesh ref={glowRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}><circleGeometry args={[1.5, 20]} /><meshBasicMaterial color="#2a8cff" transparent opacity={0} depthWrite={false} /></mesh>
  </>
}
