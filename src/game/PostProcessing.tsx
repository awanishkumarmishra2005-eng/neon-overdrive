import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  SSAO,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { LOW_GFX } from '../config/device'
import { vehicleState } from './vehicleState'

/**
 * Cinematic, mobile-aware post-processing for NEON OVERDRIVE.
 */
export default function PostProcessing() {
  const chromaticOffset = useMemo(
    () => new THREE.Vector2(0.00008, 0.00005),
    [],
  )

  const targetOffset = useRef(new THREE.Vector2())

  useFrame(() => {
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
      <Bloom
        mipmapBlur
        intensity={LOW_GFX ? 0.48 : 0.72}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.16}
        radius={0.58}
        levels={LOW_GFX ? 4 : 6}
      />

      <SSAO
        samples={LOW_GFX ? 4 : 16}
        rings={LOW_GFX ? 2 : 4}
        radius={0.16}
        intensity={LOW_GFX ? 0.7 : 1.35}
        luminanceInfluence={0.62}
        bias={0.035}
        worldDistanceThreshold={0.12}
        worldDistanceFalloff={0.04}
        worldProximityThreshold={0.18}
        worldProximityFalloff={0.06}
      />

      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation
        modulationOffset={0.25}
      />

      <Vignette eskil={false} offset={0.18} darkness={0.42} />

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
