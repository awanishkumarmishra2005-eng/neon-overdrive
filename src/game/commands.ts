import type { FlightMode } from './flightModel'

// One-shot commands from the UI to the game loop, plus small shared flags.
export const commands = { toggleFlight: false }
export const gameFlags = { paused: false }

// Short on-screen message ("Release drift first", ...). Read by the HUD ~10x/s.
let msg = { text: '', until: 0 }
export function showMessage(text: string, ms = 2200): void { msg = { text, until: performance.now() + ms } }
export function currentMessage(now: number): string { return now < msg.until ? msg.text : '' }

// Flight mode changes rarely, so the UI can subscribe to it (no per-frame React updates).
let flightMode: FlightMode = 'road'
const modeListeners = new Set<() => void>()
export function publishFlightMode(m: FlightMode): void {
  if (m !== flightMode) { flightMode = m; modeListeners.forEach((fn) => fn()) }
}
export const getFlightMode = (): FlightMode => flightMode
export function subscribeFlightMode(fn: () => void): () => void {
  modeListeners.add(fn)
  return () => { modeListeners.delete(fn) }
}
