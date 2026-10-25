import { useEffect, useState } from 'react'
import { IS_MOBILE } from '../config/device'

// Friendly "rotate your phone" overlay, only on touch devices held in portrait.
export default function RotateHint() {
  const [portrait, setPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
  )
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const onChange = () => setPortrait(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!IS_MOBILE || !portrait || dismissed) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(5,6,10,0.9)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, color: '#aef6ff', font: '600 18px system-ui, sans-serif', textAlign: 'center', padding: 24
    }}>
      <style>{`@keyframes nd-rotate { 0%,20% { transform: rotate(0deg) } 60%,100% { transform: rotate(-90deg) } }`}</style>
      <div style={{
        width: 44, height: 78, border: '3px solid #00e5ff', borderRadius: 10,
        boxShadow: '0 0 14px #00e5ff', animation: 'nd-rotate 2s ease-in-out infinite alternate'
      }} />
      <div>Turn your phone sideways<br />for the best view of NEON OVERDRIVE</div>
      <div
        role="button"
        onPointerDown={() => setDismissed(true)}
        style={{
          padding: '10px 22px', border: '2px solid #ff3cdc', borderRadius: 24, color: '#ff8cf0',
          font: '700 15px system-ui, sans-serif', cursor: 'pointer', touchAction: 'none'
        }}
      >
        Play anyway
      </div>
    </div>
  )
}
