import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Track from './Track'
import Car from './Car'
import ChaseCamera from './ChaseCamera'
import DriftEffects from './DriftEffects'
import { CollisionSparks, RivalTraffic, TrackCoins } from './WorldItems'
import { vehicleState } from './vehicleState'
import PostProcessing from './PostProcessing'
import AudioEngine from './AudioEngine'

// The world smoothly cycles through daylight, sunset and night automatically.
const DAY = new THREE.Color('#8bc9e8')
const SUNSET = new THREE.Color('#db765e')
const NIGHT = new THREE.Color('#05060f')
const DAY_GROUND = new THREE.Color('#657b68')
const NIGHT_GROUND = new THREE.Color('#151b2a')

export default function GameScene() {
  const carRef = useRef<THREE.Group>(null)
  const worldRef = useRef<THREE.Color>(null)
  const fogRef = useRef<THREE.Fog>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const cycle = useRef(0)

  useFrame((_, delta) => {
    cycle.current = (cycle.current + Math.min(delta, 0.05)) % 180
    // 180-second loop: daylight, warm sunset, then night.
    const t = cycle.current / 180
    const daylight = THREE.MathUtils.smoothstep(Math.sin(t * Math.PI * 2) * 0.5 + 0.5, 0.12, 0.86)
    const sunset = Math.max(0, 1 - Math.abs(t - 0.5) / 0.13)
    const nightMix = 1 - daylight
    vehicleState.daylight = daylight
    const sky = DAY.clone().lerp(NIGHT, nightMix).lerp(SUNSET, sunset * 0.72)
    const ground = DAY_GROUND.clone().lerp(NIGHT_GROUND, nightMix)
    if (worldRef.current) worldRef.current.copy(sky)
    if (fogRef.current) fogRef.current.color.copy(sky)
    if (ambientRef.current) ambientRef.current.intensity = 0.18 + daylight * 0.55
    if (sunRef.current) {
      sunRef.current.intensity = 0.16 + daylight * 1.45
      sunRef.current.position.set(Math.cos(t * Math.PI * 2) * 65, 20 + daylight * 65, Math.sin(t * Math.PI * 2) * 55)
      sunRef.current.color.set(sunset > 0.05 ? '#ffc09a' : '#ffffff')
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.15 + daylight * 0.58
      hemiRef.current.color.set(daylight > 0.45 ? '#8bdfff' : '#263a78')
      hemiRef.current.groundColor.copy(ground)
    }
  })

  return (
    <>
      <color ref={worldRef} attach="background" args={['#8bc9e8']} />
      <fog ref={fogRef} attach="fog" args={['#8bc9e8', 60, 320]} />
      <ambientLight ref={ambientRef} intensity={0.7} />
      <directionalLight ref={sunRef} position={[40, 60, 20]} intensity={1.4} />
      <hemisphereLight ref={hemiRef} args={['#4fd8ff', '#1a0a22', 0.6]} />
      <Track />
      <RivalTraffic />
      <TrackCoins />
      <CollisionSparks />
      <DriftEffects />
      <Car ref={carRef} />
      <ChaseCamera target={carRef} />
      <PostProcessing />
      <AudioEngine />
    </>
  )
}
