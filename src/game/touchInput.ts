// On-screen control state. Plain module (no React/DOM) so it is easy to test.
// Each button remembers WHICH fingers (pointer ids) hold it, so two fingers on one button work,
// and lifting one finger doesn't release the other.
export type TouchControl = 'gas' | 'brake' | 'left' | 'right' | 'drift' | 'up' | 'down'
const CONTROLS: TouchControl[] = ['gas', 'brake', 'left', 'right', 'drift', 'up', 'down']

const active: Record<TouchControl, Set<number>> = {
  gas: new Set(), brake: new Set(), left: new Set(), right: new Set(),
  drift: new Set(), up: new Set(), down: new Set()
}
// Read by Car every frame.
export const touchInput: Record<TouchControl, boolean> = {
  gas: false, brake: false, left: false, right: false, drift: false, up: false, down: false
}
// Virtual joystick. axis: -1..1, LEFT is positive (same sign as the keyboard steer).
export const joystick: { pointer: number | null; axis: number } = { pointer: null, axis: 0 }

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())
export function onTouchChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export const isTouchActive = (c: TouchControl): boolean => active[c].size > 0

export function pressTouch(c: TouchControl, pointerId: number): void {
  active[c].add(pointerId)
  if (!touchInput[c]) { touchInput[c] = true; notify() }
}
export function releaseTouch(c: TouchControl, pointerId: number): void {
  active[c].delete(pointerId)
  const now = active[c].size > 0
  if (touchInput[c] !== now) { touchInput[c] = now; notify() }
}

export function joystickPress(pointerId: number): boolean {
  if (joystick.pointer !== null && joystick.pointer !== pointerId) return false // one finger only
  joystick.pointer = pointerId
  notify()
  return true
}
export function joystickMove(pointerId: number, axis: number): void {
  if (joystick.pointer !== pointerId) return
  joystick.axis = Math.max(-1, Math.min(1, axis))
}
export function joystickRelease(pointerId: number): void {
  if (joystick.pointer !== pointerId) return
  joystick.pointer = null
  joystick.axis = 0
  notify()
}

// Focus loss, tab switch, rotation, mode change, unmount: nothing may stay pressed.
export function releaseAllTouch(): void {
  let changed = false
  for (const c of CONTROLS) {
    active[c].clear()
    if (touchInput[c]) { touchInput[c] = false; changed = true }
  }
  if (joystick.pointer !== null || joystick.axis !== 0) { joystick.pointer = null; joystick.axis = 0; changed = true }
  if (changed) notify()
}

// Finger offset from the joystick centre -> steering axis (left positive) with a small dead zone.
export function axisFromOffset(dx: number, radius: number, deadzone: number): number {
  const v = Math.max(-1, Math.min(1, -dx / radius))
  const a = Math.abs(v)
  if (a <= deadzone) return 0
  return Math.sign(v) * ((a - deadzone) / (1 - deadzone))
}

// Smooths the analog steering: quick to follow the finger, a little slower to return to neutral.
export function smoothAxis(current: number, target: number, dt: number, riseRate = 30, fallRate = 14): number {
  const rate = Math.abs(target) > Math.abs(current) ? riseRate : fallRate
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}
