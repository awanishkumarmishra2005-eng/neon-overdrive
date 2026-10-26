import { useMemo, useRef } from 'react'
import type { ComponentType, ReactNode } from 'react'
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

interface ComposerProps {
  multisampling?: number
  resolutionScale?: number
  enableNormalPass?: boolean
  children?: ReactNode
}

const Composer = EffectComposer as unknown as ComponentType<ComposerProps>

// Normalize effect component typings while preserving their runtime behavior.
const BloomEffect = Bloom as unknown as ComponentType<any>
const ChromaticAberrationEffect =
  ChromaticAberration as unknown as ComponentType<any>
const SSAOEffect = SSAO as unknown as ComponentType<any>
const VignetteEffect = Vignette as unknown as ComponentType<any>
const ToneMappingEffect = ToneMapping as unknown as ComponentType<any>

/**
 * Cinematic, mobile-aware post-processing for NEON OVERDRIVE.
 * Chromatic aberration responds to vehicle speed and drifting.
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

  if (LOW_GFX) {
    return (
      <Composer
        multisampling={0}
        resolutionScale={0.62}
        enableNormalPass={false}
      >
        <BloomEffect
          mipmapBlur
          intensity={0.48}
          luminanceThreshold={0.86}
          luminanceSmoothing={0.16}
          radius={0.58}
          levels={4}
        />
        <ChromaticAberrationEffect
          offset={chromaticOffset}
          radialModulation
          modulationOffset={0.25}
        />
        <VignetteEffect eskil={false} offset={0.18} darkness={0.42} />
        <ToneMappingEffect mode={ToneMappingMode.ACES_FILMIC} />
      </Composer>
    )
  }

  return (
    <Composer
      multisampling={2}
      resolutionScale={0.82}
      enableNormalPass={true}
    >
      <BloomEffect
        mipmapBlur
        intensity={0.72}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.16}
        radius={0.58}
        levels={6}
      />
      <SSAOEffect
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
      <ChromaticAberrationEffect
        offset={chromaticOffset}
        radialModulation
        modulationOffset={0.25}
      />
      <VignetteEffect eskil={false} offset={0.18} darkness={0.42} />
      <ToneMappingEffect mode={ToneMappingMode.ACES_FILMIC} />
    </Composer>
  )
}