import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  SSAO,
  ToneMapping,
  Vignette
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { LOW_GFX } from '../config/device'
import { vehicleState } from './vehicleState'

/**
 * Cinematic, mobile-aware post-processing for NEON OVERDRIVE.
 * The velocity hook drives a restrained chromatic-aberration cue at speed.
 * The asphalt itself is authored in Track.tsx with high roughness and low metalness;
 * these screen-space effects complement, rather than replace, correct PBR materials.
 */
export default function PostProcessing() {
  const chromaticOffset = useMemo(() => new THREE.Vector2(0.00008, 0.00005), [])
  const targetOffset = useRef(new THREE.Vector2())

  useFrame(() => {
    // forward is the live road-vehicle speed readout; clamp the effect to avoid a distracting fringe.
    const speed = Math.min(1, Math.abs(vehicleState.forward) / 48)
    const driftBoost = vehicleState.drifting ? 0.00022 : 0
    const fringe = 0.00005 + speed * 0.00028 + driftBoost
    targetOffset.current.set(fringe, fringe * 0.58)
    chromaticOffset.lerp(targetOffset.current, 0.12)
  })

  return (
    <EffectComposer
      multisampling={LOW_GFX ? 0 : 2}
      resolutionScale={LOW_GFX ? 0.62 : 0.82}
      enableNormalPass={!LOW_GFX}
    >
      {/* Mipmap bloom targets high-luminance lights and neon without washing out asphalt. */}
      <Bloom
        mipmapBlur
        intensity={LOW_GFX ? 0.48 : 0.72}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.16}
        radius={0.58}
        levels={LOW_GFX ? 4 : 6}
      />

      {/* Contact shading improves tire/road and body/ground separation; skipped on low-end devices. */}
      {!LOW_GFX && (
        <SSAO
          samples={16}
          rings={4}
          radius={0.16}
          intensity={1.35}
          luminanceInfluence={0.62}
          bias={0.035}
          worldDistanceThreshold={0.12}
          worldDistanceFalloff={0.04}
          worldProximityThreshold={0.18}
          worldProximityFalloff={0.06}
        />
      )}

      <ChromaticAberration offset={chromaticOffset} radialModulation modulationOffset={0.25} />
      <Vignette eskil={false} offset={0.18} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
