import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { axisFromOffset, joystick, joystickMove, joystickPress, joystickRelease, onTouchChange } from '../game/touchInput'

const SIZE = 'clamp(110px, 30vmin, 190px)'
const DEADZONE = 0.1

// Circular steering stick. Drag left/right = proportional steering. Releasing (or any
// cancel / focus loss) returns to neutral. Only the horizontal offset steers.
export default function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  const resetThumb = () => {
    const t = thumbRef.current
    if (!t) return
    t.style.transition = 'transform 0.14s ease-out'
    t.style.transform = 'translate(0px, 0px)'
  }

  // If the shared state is reset from elsewhere (tab hidden, mode switch), recentre the thumb.
  useEffect(() => onTouchChange(() => { if (joystick.pointer === null) resetThumb() }), [])

  const place = (e: ReactPointerEvent<HTMLDivElement>) => {
    const base = baseRef.current, thumb = thumbRef.current
    if (!base || !thumb) return
    const r = base.getBoundingClientRect()
    const radius = r.width * 0.32
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > radius) { dx *= radius / len; dy *= radius / len }
    thumb.style.transition = 'none'
    thumb.style.transform = `translate(${dx}px, ${dy}px)`
    joystickMove(e.pointerId, axisFromOffset(dx, radius, DEADZONE))
  }

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!joystickPress(e.pointerId)) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    place(e)
  }
  const move = (e: ReactPointerEvent<HTMLDivElement>) => { if (joystick.pointer === e.pointerId) place(e) }
  const end = (e: ReactPointerEvent<HTMLDivElement>) => { joystickRelease(e.pointerId); if (joystick.pointer === null) resetThumb() }

  const base: CSSProperties = {
    position: 'relative', width: SIZE, height: SIZE, borderRadius: '50%', boxSizing: 'border-box',
    border: '2px solid rgba(0,229,255,0.55)', background: 'radial-gradient(rgba(0,229,255,0.12), rgba(5,12,22,0.5))',
    boxShadow: '0 0 10px rgba(0,229,255,0.25)', touchAction: 'none', pointerEvents: 'auto',
    userSelect: 'none', WebkitUserSelect: 'none'
  }
  const thumb: CSSProperties = {
    position: 'absolute', left: '30%', top: '30%', width: '40%', height: '40%', borderRadius: '50%',
    background: 'rgba(0,229,255,0.45)', border: '2px solid #aef6ff', boxShadow: '0 0 14px rgba(0,229,255,0.7)',
    pointerEvents: 'none', willChange: 'transform'
  }
  return (
    <div
      ref={baseRef}
      role="slider"
      aria-label="Steering joystick"
      style={base}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={{ position: 'absolute', left: '50%', top: '8%', bottom: '8%', width: 1, background: 'rgba(0,229,255,0.2)' }} />
      <div ref={thumbRef} style={thumb} />
    </div>
  )
}
