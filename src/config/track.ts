import * as THREE from 'three'

// All distances in metres.
export const TRACK_WIDTH = 14
export const TRACK_SEGMENTS = 240

// Closed loop built from control points (x, z). Y is always 0 for now.
const controlPoints: [number, number][] = []
const COUNT = 14
for (let i = 0; i < COUNT; i++) {
  const a = (i / COUNT) * Math.PI * 2
  const wobble = 1 + 0.18 * Math.sin(a * 3)
  controlPoints.push([Math.cos(a) * 235 * wobble, Math.sin(a) * 155 * wobble])
}

export const trackCurve = new THREE.CatmullRomCurve3(
  controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  'catmullrom',
  0.5
)

// CAR_CONFIG moved to ./car.ts (re-exported so existing imports keep working)
export { CAR_CONFIG } from './car'
