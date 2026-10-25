import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { vehicleState } from './vehicleState'
import { updateEngineAudio, playGameTone } from './audio'

export default function AudioEngine() {
  const wasCollision = useRef(false)
  const wasAirborne = useRef(false)
  useFrame(() => {
    const speed = Math.hypot(vehicleState.forward, vehicleState.lateral)
    updateEngineAudio(speed)
    if (vehicleState.collision && !wasCollision.current) playGameTone(95, .24, 'sawtooth', .08)
    const airborne = vehicleState.altitude > 1.2
    if (airborne && !wasAirborne.current) playGameTone(520, .22, 'sine', .035)
    wasCollision.current = vehicleState.collision
    wasAirborne.current = airborne
  })
  return null
}
