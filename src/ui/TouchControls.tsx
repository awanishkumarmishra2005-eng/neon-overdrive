import { campaignRuntime } from '../game/campaign'
import { useEffect, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { IS_MOBILE } from '../config/device'
import {
  isTouchActive,
  onTouchChange,
  pressTouch,
  releaseAllTouch,
  releaseTouch,
  type TouchControl
} from '../game/touchInput'
import { campaignRuntime } from '../game/campaign'
import Joystick from './Joystick'
import { useFlightMode, useSettings } from './hooks'

// Button size scales with the smaller screen side.
const BTN = 'clamp(58px, 15vmin, 104px)'
const GAP = '2.5vmin'

const base: CSSProperties = {
  width: BTN,
  height: BTN,
  borderRadius: '50%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '700 clamp(11px, 2.6vmin, 18px) system-ui, sans-serif',
  letterSpacing: 1,
  color: '#aef6ff',
  background: 'rgba(5,12,22,0.5)',
  border: '2px solid rgba(0,229,255,0.55)',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  pointerEvents: 'auto',
  cursor: 'pointer'
} as CSSProperties

function PadButton(props: {
  control: TouchControl
  label: string
  accent?: string
  size?: number
  area?: string
}) {
  const {
    control,
    label,
    accent = '0,229,255',
    size = 1,
    area
  } = props

  const down = isTouchActive(control)

  const start = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture may not be supported.
    }

    pressTouch(control, e.pointerId)
  }

  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    releaseTouch(control, e.pointerId)
  }

  const style: CSSProperties = {
    ...base,
    width: `calc(${BTN} * ${size})`,
    height: `calc(${BTN} * ${size})`,
    borderColor: `rgba(${accent},0.7)`,
    color: `rgb(${accent})`,
    background: down
      ? `rgba(${accent},0.35)`
      : 'rgba(5,12,22,0.5)',
    boxShadow: down
      ? `0 0 18px rgba(${accent},0.8)`
      : `0 0 8px rgba(${accent},0.25)`,
    transform: down ? 'scale(0.94)' : 'none',
    gridArea: area
  }

  return (
    <div
      role="button"
      aria-label={label}
      style={style}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </div>
  )
}

export default function TouchControls() {
  const [, force] = useState(0)
  const settings = useSettings()
  const mode = useFlightMode()
  const flying = mode === 'flight' || mode === 'toRoad'

  useEffect(() => {
    if (!IS_MOBILE) return

    const unsubscribe = onTouchChange(() => force((n) => n + 1))

    // Release controls after focus loss, tab switching, or rotation.
    const release = () => releaseAllTouch()
    const onHidden = () => {
      if (document.hidden) releaseAllTouch()
    }

    // Allow menu scrolling; prevent page scrolling only during a race.
    const stopMove = (e: TouchEvent) => {
      if (campaignRuntime.status === 'racing') {
        e.preventDefault()
      }
    }

    const stopGesture = (e: Event) => e.preventDefault()
    const stopMenu = (e: Event) => e.preventDefault()

    window.addEventListener('blur', release)
    window.addEventListener('pagehide', release)
    window.addEventListener('orientationchange', release)

    document.addEventListener('visibilitychange', onHidden)
    document.addEventListener('touchmove', stopMove, { passive: false })
    document.addEventListener('gesturestart', stopGesture)
    document.addEventListener('contextmenu', stopMenu)

    return () => {
      unsubscribe()
      releaseAllTouch()

      window.removeEventListener('blur', release)
      window.removeEventListener('pagehide', release)
      window.removeEventListener('orientationchange', release)

      document.removeEventListener('visibilitychange', onHidden)
      document.removeEventListener('touchmove', stopMove)
      document.removeEventListener('gesturestart', stopGesture)
      document.removeEventListener('contextmenu', stopMenu)
    }
  }, [])

  // Release controls when steering style or flight mode changes.
  useEffect(() => {
    releaseAllTouch()
  }, [settings.steeringMode, flying])

  if (!IS_MOBILE) return null

  const inset = (side: 'left' | 'right' | 'bottom') =>
    `calc(env(safe-area-inset-${side}, 0px) + 3vmin)`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none'
      }}
    >
      {/* Steering controls: bottom-left. */}
      <div
        style={{
          position: 'absolute',
          left: inset('left'),
          bottom: inset('bottom'),
          display: 'flex',
          gap: GAP,
          pointerEvents: 'none'
        }}
      >
        {settings.steeringMode === 'joystick' ? (
          <Joystick />
        ) : (
          <>
            <PadButton control="left" label="◀" />
            <PadButton control="right" label="▶" />
          </>
        )}
      </div>

      {/* Pedals and drift, or flight altitude controls: bottom-right. */}
      <div
        style={{
          position: 'absolute',
          right: inset('right'),
          bottom: inset('bottom'),
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gridTemplateAreas: flying
            ? '"up brake" "down gas"'
            : '". brake" "drift gas"',
          gap: GAP,
          alignItems: 'end',
          pointerEvents: 'none'
        }}
      >
        <PadButton
          control="brake"
          label="BRAKE"
          accent="255,90,140"
          area="brake"
        />

        {flying ? (
          <>
            <PadButton
              control="up"
              label="▲ UP"
              accent="120,200,255"
              area="up"
            />
            <PadButton
              control="down"
              label="▼ DOWN"
              accent="120,200,255"
              area="down"
            />
          </>
        ) : (
          <PadButton
            control="drift"
            label="DRIFT"
            accent="255,60,220"
            area="drift"
          />
        )}

        <PadButton
          control="gas"
          label="GAS"
          size={1.3}
          area="gas"
        />
      </div>
    </div>
  )
}
