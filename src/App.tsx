import { Canvas } from '@react-three/fiber'
import GameScene from './game/GameScene'
import Hud from './ui/Hud'
import TouchControls from './ui/TouchControls'
import TopControls from './ui/TopControls'
import RotateHint from './ui/RotateHint'
import { LOW_GFX } from './config/device'
import * as THREE from 'three'
import CampaignOverlay from './ui/CampaignOverlay'

export default function App() {
  return (
    <>
      <Canvas
        // Phones/low-gfx: lower pixel ratio and no antialiasing (big GPU savings). Desktop unchanged.
        dpr={LOW_GFX ? [1, 1.25] : [1, 1.5]}
        camera={{ fov: 70, near: 0.1, far: 600, position: [0, 6, -12] }}
        gl={{ antialias: !LOW_GFX, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
        style={{ touchAction: 'none' }}
      >
        <GameScene />
      </Canvas>
      <Hud />
      <TouchControls />
      <TopControls />
      <RotateHint />
      <CampaignOverlay />
    </>
  )
}
