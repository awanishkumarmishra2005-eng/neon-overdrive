import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { IS_MOBILE } from '../config/device'
import { commands, gameFlags } from '../game/commands'
import { releaseAllTouch } from '../game/touchInput'
import { settingsStore, type SteeringMode } from '../game/settings'
import { useFlightMode, useSettings } from './hooks'

const pill: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box',
  height: 'clamp(40px, 9vmin, 56px)', minWidth: 'clamp(40px, 9vmin, 56px)', padding: '0 12px',
  borderRadius: 28, border: '2px solid rgba(0,229,255,0.7)', background: 'rgba(5,12,22,0.55)',
  color: '#aef6ff', font: '700 clamp(12px, 2.6vmin, 16px) system-ui, sans-serif', letterSpacing: 1,
  boxShadow: '0 0 8px rgba(0,229,255,0.3)', cursor: 'pointer', pointerEvents: 'auto',
  touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none'
} as CSSProperties

function Option(props: { selected: boolean; title: string; text: string; onPick: () => void }) {
  return (
    <div
      role="radio"
      aria-checked={props.selected}
      onClick={props.onPick}
      style={{
        padding: '10px 12px', borderRadius: 12, cursor: 'pointer', touchAction: 'manipulation',
        border: `2px solid ${props.selected ? '#00e5ff' : 'rgba(0,229,255,0.25)'}`,
        background: props.selected ? 'rgba(0,229,255,0.15)' : 'transparent',
        boxShadow: props.selected ? '0 0 10px rgba(0,229,255,0.4)' : 'none'
      }}
    >
      <div style={{ fontWeight: 700, color: props.selected ? '#aef6ff' : '#8fd8e6' }}>
        {props.selected ? '● ' : '○ '}{props.title}
      </div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{props.text}</div>
    </div>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettings()
  const pick = (m: SteeringMode) => { releaseAllTouch(); settingsStore.set({ steeringMode: m }) }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(5,6,10,0.78)', pointerEvents: 'auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12
    }}>
      <div style={{
        width: 'min(420px, 94vw)', maxHeight: '92dvh', boxSizing: 'border-box', padding: 16, borderRadius: 16,
        border: '2px solid rgba(0,229,255,0.6)', background: 'rgba(8,14,26,0.96)', color: '#cfeff5',
        font: '14px system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: '0 0 24px rgba(0,229,255,0.35)'
      }}>
        <div style={{ font: '800 18px system-ui, sans-serif', color: '#aef6ff', letterSpacing: 1 }}>DRIVING SETTINGS</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Steering style{IS_MOBILE ? '' : ' (touch screens; add ?touch=1 to the address to preview on a PC)'}
        </div>
        <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Option selected={settings.steeringMode === 'buttons'} title="Button Steering"
            text="◀ ▶ buttons. Hold to steer, release to go straight." onPick={() => pick('buttons')} />
          <Option selected={settings.steeringMode === 'joystick'} title="Virtual Joystick"
            text="Drag the stick left/right. Further = sharper turn." onPick={() => pick('joystick')} />
        </div>
        <div
          role="checkbox"
          aria-checked={settings.remember}
          onClick={() => settingsStore.set({ remember: !settings.remember })}
          style={{ cursor: 'pointer', padding: '6px 2px', touchAction: 'manipulation' }}
        >
          {settings.remember ? '☑' : '☐'} Remember on this device
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {settings.remember ? 'Saved until you change it.' : 'This session only: forgotten when the tab closes.'}
          </div>
        </div>
        <div role="button" onClick={onClose} style={{ ...pill, alignSelf: 'flex-end' }}>DONE</div>
      </div>
    </div>
  )
}

export default function TopControls() {
  const mode = useFlightMode()
  const [open, setOpen] = useState(false)

  // Panel open = game paused, nothing held.
  useEffect(() => {
    gameFlags.paused = open
    if (open) releaseAllTouch()
    return () => { gameFlags.paused = false }
  }, [open])

  const busy = mode === 'toFlight' || mode === 'toRoad'
  const label = mode === 'flight' ? '▼ LAND' : mode === 'road' ? '▲ FLY' : '… MORPHING'
  const press = () => { if (!busy) commands.toggleFlight = true }

  return (
    <>
      <div style={{
        position: 'fixed', zIndex: 12, pointerEvents: 'none', display: 'flex', gap: 8,
        right: 'calc(env(safe-area-inset-right, 0px) + 3vmin)', top: 'calc(env(safe-area-inset-top, 0px) + 2vmin)'
      }}>
        <div
          role="button"
          aria-label="Transform SKYLINE ONE"
          onPointerDown={(e) => { e.preventDefault(); press() }}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...pill,
            opacity: busy ? 0.55 : 1,
            borderColor: mode === 'road' ? 'rgba(0,229,255,0.8)' : 'rgba(255,60,220,0.85)',
            color: mode === 'road' ? '#aef6ff' : '#ff9cf2'
          }}
        >
          {label}{!IS_MOBILE && mode !== 'toFlight' && mode !== 'toRoad' ? ' [F]' : ''}
        </div>
        <div role="button" aria-label="Driving settings" onClick={() => setOpen(true)} style={pill}>⚙</div>
      </div>
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </>
  )
}
