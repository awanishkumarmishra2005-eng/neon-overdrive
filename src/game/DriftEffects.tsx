import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DRIFT_FX as FX } from '../config/drift'
import { vehicleState } from './vehicleState'

// Lightweight drift visuals: a fixed pool of smoke puffs (one Points draw call) and a
// fixed ring buffer of tire-mark quads (one mesh). Nothing is created or freed per frame.

const SMOKE_VS = `
attribute float aAlpha; attribute float aSize; varying float vAlpha;
void main(){ vAlpha=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=aSize*(300.0/max(0.1,-mv.z)); gl_Position=projectionMatrix*mv; }`
const SMOKE_FS = `
varying float vAlpha;
void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vAlpha;
  if(a<0.003) discard; gl_FragColor=vec4(0.78,0.84,0.92,a); }`
const MARK_VS = `
attribute float aBirth; attribute float aStrength; uniform float uTime; uniform float uLife; varying float vAlpha;
void main(){ vAlpha=aStrength*(1.0-clamp((uTime-aBirth)/uLife,0.0,1.0));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
const MARK_FS = `
varying float vAlpha;
void main(){ if(vAlpha<0.004) discard; gl_FragColor=vec4(0.02,0.02,0.03,vAlpha*0.6); }`

const NEVER = -1e9

export default function DriftEffects() {
  const smoke = useMemo(() => {
    const n = FX.smokeMax
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(n * 3).fill(-1000)
    const alpha = new Float32Array(n)
    const size = new Float32Array(n)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false
    })
    const pts = new THREE.Points(geo, mat)
    pts.frustumCulled = false
    return {
      pts, pos, alpha, size,
      vel: new Float32Array(n * 3), age: new Float32Array(n).fill(1e9), life: new Float32Array(n).fill(1),
      next: 0, acc: 0, side: 0
    }
  }, [])

  const marks = useMemo(() => {
    const n = FX.markMax
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(n * 4 * 3)
    const birth = new Float32Array(n * 4).fill(NEVER)
    const strength = new Float32Array(n * 4)
    const idx = new Uint16Array(n * 6)
    for (let i = 0; i < n; i++) {
      const v = i * 4
      idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6)
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1))
    geo.setAttribute('aStrength', new THREE.BufferAttribute(strength, 1))
    geo.setIndex(new THREE.BufferAttribute(idx, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: MARK_VS, fragmentShader: MARK_FS, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: { uTime: { value: 0 }, uLife: { value: FX.markLife } }
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    // per-wheel previous mark point
    const wheel = [0, 1].map(() => ({ has: false, x: 0, z: 0, px: 0, pz: 0 }))
    return { mesh, mat, pos, birth, strength, wheel, next: 0 }
  }, [])

  useFrame((state, delta) => {
    if (!FX.enabled) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const v = vehicleState
    const sinH = Math.sin(v.heading), cosH = Math.cos(v.heading)
    // rear wheel world positions (left = -1, right = +1)
    const wx = (side: number) => v.x + cosH * side * FX.wheelHalfTrack + sinH * FX.wheelRearOffset
    const wz = (side: number) => v.z - sinH * side * FX.wheelHalfTrack + cosH * FX.wheelRearOffset
    const sliding = v.slide > 0.01 && Math.abs(v.forward) > 3

    // ---- smoke ----
    const S = smoke
    if (sliding) {
      S.acc += FX.smokeRate * v.slide * dt
      while (S.acc >= 1) {
        S.acc -= 1
        const i = S.next; S.next = (S.next + 1) % FX.smokeMax
        S.side = 1 - S.side
        const side = S.side ? 1 : -1
        S.pos[i * 3] = wx(side) + (Math.random() - 0.5) * 0.3
        S.pos[i * 3 + 1] = 0.25
        S.pos[i * 3 + 2] = wz(side) + (Math.random() - 0.5) * 0.3
        S.vel[i * 3] = (Math.random() - 0.5) * 1.2 + v.lateral * cosH * -0.15
        S.vel[i * 3 + 1] = 0.6 + Math.random() * 0.6
        S.vel[i * 3 + 2] = (Math.random() - 0.5) * 1.2 + v.lateral * sinH * 0.15
        S.age[i] = 0; S.life[i] = FX.smokeLife * (0.7 + Math.random() * 0.6)
      }
    } else S.acc = 0
    for (let i = 0; i < FX.smokeMax; i++) {
      if (S.age[i] >= S.life[i]) { S.alpha[i] = 0; continue }
      S.age[i] += dt
      const k = S.age[i] / S.life[i]
      if (k >= 1) { S.alpha[i] = 0; S.pos[i * 3 + 1] = -1000; continue }
      S.pos[i * 3] += S.vel[i * 3] * dt
      S.pos[i * 3 + 1] += S.vel[i * 3 + 1] * dt
      S.pos[i * 3 + 2] += S.vel[i * 3 + 2] * dt
      S.alpha[i] = 0.32 * (1 - k) * Math.min(1, k * 8)
      S.size[i] = 0.8 + 2.2 * k
    }
    const g = S.pts.geometry
    g.getAttribute('position').needsUpdate = true
    g.getAttribute('aAlpha').needsUpdate = true
    g.getAttribute('aSize').needsUpdate = true

    // ---- tire marks ----
    const M = marks
    M.mat.uniforms.uTime.value = t
    let wrote = false
    for (let w = 0; w < 2; w++) {
      const side = w === 0 ? -1 : 1
      const W = M.wheel[w]
      if (v.slide < FX.markThreshold || Math.abs(v.forward) < 3) { W.has = false; continue }
      const cx = wx(side), cz = wz(side)
      if (!W.has) { W.has = true; W.x = cx; W.z = cz; W.px = 0; W.pz = 0; continue }
      const dx = cx - W.x, dz = cz - W.z
      const len = Math.hypot(dx, dz)
      if (len < FX.markMinStep) continue
      const nx = -dz / len, nz = dx / len // perpendicular to travel
      const hw = FX.markWidth / 2
      const pnx = W.px === 0 && W.pz === 0 ? nx : W.px
      const pnz = W.px === 0 && W.pz === 0 ? nz : W.pz
      const q = M.next; M.next = (M.next + 1) % FX.markMax
      const o = q * 12, y = 0.035
      M.pos.set([
        W.x + pnx * hw, y, W.z + pnz * hw,
        W.x - pnx * hw, y, W.z - pnz * hw,
        cx + nx * hw, y, cz + nz * hw,
        cx - nx * hw, y, cz - nz * hw
      ], o)
      for (let j = 0; j < 4; j++) { M.birth[q * 4 + j] = t; M.strength[q * 4 + j] = Math.min(1, 0.4 + v.slide) }
      W.x = cx; W.z = cz; W.px = nx; W.pz = nz
      wrote = true
    }
    if (wrote) {
      const geo = M.mesh.geometry
      geo.getAttribute('position').needsUpdate = true
      geo.getAttribute('aBirth').needsUpdate = true
      geo.getAttribute('aStrength').needsUpdate = true
    }
  })

  if (!FX.enabled) return null
  return (
    <>
      <primitive object={marks.mesh} />
      <primitive object={smoke.pts} />
    </>
  )
}
