import { useEffect, useRef } from 'react'
import { IS_MOBILE } from '../config/device'
import { vehicleState } from '../game/vehicleState'
import { currentMessage } from '../game/commands'
import { useFlightMode } from './hooks'

// Speed, drift, mode and altitude. Updated ~10x/second by writing straight to the DOM,
// so the game never re-renders React every frame (mode text re-renders only when the mode changes).
export default function Hud() {
  const mode = useFlightMode()
  const speedRef = useRef<HTMLSpanElement>(null)
  const driftRef = useRef<HTMLDivElement>(null)
  const altRef = useRef<HTMLSpanElement>(null)
  const msgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      const kmh = Math.hypot(vehicleState.forward, vehicleState.lateral) * 3.6 // m/s -> km/h
      if (speedRef.current) speedRef.current.textContent = String(Math.round(kmh))
      if (driftRef.current) driftRef.current.style.opacity = vehicleState.drifting ? '1' : '0.25'
      if (altRef.current) altRef.current.textContent = String(Math.round(vehicleState.altitude))
      if (msgRef.current) {
        const m = currentMessage(performance.now())
        msgRef.current.textContent = m
        msgRef.current.style.opacity = m ? '1' : '0'
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [])

  const flying = mode === 'flight' || mode === 'toRoad'
  const modeText = mode === 'road' ? 'ROAD MODE' : mode === 'flight' ? 'FLIGHT MODE' : 'TRANSFORMING…'
  const modeColor = mode === 'road' ? '#aef6ff' : '#ff9cf2'

  return (
    <>
      <div style={{
        position: 'fixed', zIndex: 5, pointerEvents: 'none',
        left: 'calc(env(safe-area-inset-left, 0px) + 3vmin)', top: 'calc(env(safe-area-inset-top, 0px) + 2vmin)',
        color: '#aef6ff', textShadow: '0 0 10px #00e5ff', font: '700 12px system-ui, sans-serif'
      }}>
        <div>
          <span ref={speedRef} style={{ font: '800 clamp(28px, 8vmin, 56px) system-ui, sans-serif' }}>0</span>
          <span style={{ marginLeft: 6, fontSize: 'clamp(10px, 2.2vmin, 16px)' }}>KM/H</span>
        </div>
        <div ref={driftRef} style={{
          opacity: 0.25, color: '#ff8cf0', textShadow: '0 0 8px #ff3cdc',
          fontSize: 'clamp(10px, 2.4vmin, 16px)', letterSpacing: 2, transition: 'opacity 0.12s'
        }}>DRIFT</div>
        <div style={{ color: modeColor, fontSize: 'clamp(10px, 2.4vmin, 16px)', letterSpacing: 2, marginTop: 2 }}>
          {modeText}
          <span style={{ marginLeft: 8, display: flying ? 'inline' : 'none' }}>
            ALT <span ref={altRef}>0</span> m
          </span>
        </div>
      </div>
      <div ref={msgRef} style={{
        position: 'fixed', zIndex: 6, pointerEvents: 'none', left: '50%', transform: 'translateX(-50%)',
        top: 'calc(env(safe-area-inset-top, 0px) + 12vmin)', opacity: 0, transition: 'opacity 0.2s',
        padding: '6px 14px', borderRadius: 18, background: 'rgba(5,12,22,0.7)', border: '1px solid rgba(255,60,220,0.7)',
        color: '#ffc4f6', font: '700 clamp(12px, 2.6vmin, 16px) system-ui, sans-serif', whiteSpace: 'nowrap'
      }} />
      {!IS_MOBILE && (
        <div style={{
          position: 'fixed', left: 16, bottom: 16, color: '#7df9ff', pointerEvents: 'none',
          font: '14px system-ui, sans-serif', textShadow: '0 0 8px #00e5ff', lineHeight: 1.5
        }}>
          W/↑ gas · S/↓ brake · A/D or ←/→ steer · Shift + steer at speed = drift<br />
          F = transform (fly / land) · in flight: Q = up, E = down
        </div>
      )}
    </>
  )
}
