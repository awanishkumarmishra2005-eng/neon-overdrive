  const end = (e: ReactPointerEvent<HTMLDivElement>) => releaseTouch(control, e.pointerId)

  const style: CSSProperties = {
    ...base,
    width: `calc(${BTN} * ${size})`, height: `calc(${BTN} * ${size})`,
    borderColor: `rgba(${accent},0.7)`, color: `rgb(${accent})`,
    background: down ? `rgba(${accent},0.35)` : 'rgba(5,12,22,0.5)',
    boxShadow: down ? `0 0 18px rgba(${accent},0.8)` : `0 0 8px rgba(${accent},0.25)`,
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
    // Nothing may stay pressed after focus loss, tab switch or rotation.
    const release = () => releaseAllTouch()
    const onHidden = () => { if (document.hidden) releaseAllTouch() }
    // Allow menu scrolling before the race; prevent page scrolling during racing.
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

  // Switching steering style (or flight/road controls) while a finger is down must not leave anything stuck.
  useEffect(() => { releaseAllTouch() }, [settings.steeringMode, flying])

  if (!IS_MOBILE) return null

  const inset = (side: 'left' | 'right' | 'bottom') =>
    `calc(env(safe-area-inset-${side}, 0px) + 3vmin)`

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      {/* steering: bottom-left. Only the chosen style is shown. */}
      <div style={{ position: 'absolute', left: inset('left'), bottom: inset('bottom'), display: 'flex', gap: GAP, pointerEvents: 'none' }}>
        {settings.steeringMode === 'joystick' ? (
          <Joystick />
        ) : (
          <>
            <PadButton control="left" label="◀" />
            <PadButton control="right" label="▶" />
          </>
        )}
      </div>
      {/* pedals + drift (road) or altitude (flight): bottom-right */}
      <div style={{
        position: 'absolute', right: inset('right'), bottom: inset('bottom'),
        display: 'grid', gridTemplateColumns: 'auto auto',
        gridTemplateAreas: flying ? '"up brake" "down gas"' : '". brake" "drift gas"',
        gap: GAP, alignItems: 'end', pointerEvents: 'none'
      }}>
        <PadButton control="brake" label="BRAKE" accent="255,90,140" area="brake" />
        {flying ? (
          <>
            <PadButton control="up" label="▲ UP" accent="120,200,255" area="up" />
            <PadButton control="down" label="▼ DOWN" accent="120,200,255" area="down" />
          </>
        ) : (
          <PadButton control="drift" label="DRIFT" accent="255,60,220" area="drift" />
        )}
        <PadButton control="gas" label="GAS" size={1.3} area="gas" />
      </div>
    </div>
  )
}
