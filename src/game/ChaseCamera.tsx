import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { vehicleState } from './vehicleState'
import { DRIFT_CAMERA as CAM } from '../config/drift'

const OFFSET_ROAD = new THREE.Vector3(0, 3.2, -9)    // behind and above the car (local space)
const OFFSET_AIR = new THREE.Vector3(0, 4.6, -12.5)  // a little further back in flight form
const LOOK = new THREE.Vector3(0, 1, 6)
const UP = new THREE.Vector3(0, 1, 0)
const _off = new THREE.Vector3()
const _target = new THREE.Vector3()
const _look = new THREE.Vector3()
const AIR_FOV = 6 // extra degrees of FOV in flight form
const MIN_CAMERA_Y = 0.8

export default function ChaseCamera({ target }: { target: React.RefObject<THREE.Group> }) {
  const { camera } = useThree()
  const smoothSlip = useRef(0)
  const smoothSlide = useRef(0)
  const baseFov = useRef<number | null>(null)

  useFrame((_, delta) => {
    const car = target.current
    if (!car) return
    const dt = Math.min(delta, 0.05)
    const cam = camera as THREE.PerspectiveCamera
    if (baseFov.current === null) baseFov.current = cam.fov

    // Camera swings part-way toward the direction the car is actually travelling.
    // Fades out near standstill so braking/reversing doesn't make it wobble.
    const slipWeight = THREE.MathUtils.clamp(vehicleState.forward / 6, 0, 1)
    smoothSlip.current += (vehicleState.slip * slipWeight - smoothSlip.current) * (1 - Math.exp(-CAM.slipSmoothing * dt))
    smoothSlide.current += (vehicleState.slide - smoothSlide.current) * (1 - Math.exp(-CAM.fovSmoothing * dt))
    const yaw = car.rotation.y + smoothSlip.current * CAM.slipYawFactor

    // Road <-> flight framing blends continuously with the transformation progress.
    const air = THREE.MathUtils.smoothstep(vehicleState.flightProgress, 0, 1)
    _off.lerpVectors(OFFSET_ROAD, OFFSET_AIR, air)

    _target.copy(_off).applyAxisAngle(UP, yaw).add(car.position)
    camera.position.lerp(_target, 1 - Math.exp(-5 * dt)) // frame-rate independent damping
    if (camera.position.y < MIN_CAMERA_Y) camera.position.y = MIN_CAMERA_Y // never underground
    _look.copy(LOOK).applyAxisAngle(UP, yaw).add(car.position)
    camera.lookAt(_look)

    const fov = baseFov.current + CAM.fovBoost * smoothSlide.current + AIR_FOV * air
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix() }
  })
  return null
}
