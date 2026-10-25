// Player settings with safe persistence. Pure logic (storage is injected) so it can be tested.
export type SteeringMode = 'buttons' | 'joystick'
export interface Settings { steeringMode: SteeringMode; remember: boolean }
export interface KV {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export const SETTINGS_KEY = 'neon-overdrive:settings:v1'
export const DEFAULT_SETTINGS: Settings = { steeringMode: 'buttons', remember: true }

// Returns the saved steering mode, or null for missing / corrupt / outdated data.
export function parseSteering(raw: string | null): SteeringMode | null {
  if (!raw) return null
  try {
    const o: unknown = JSON.parse(raw)
    if (typeof o !== 'object' || o === null) return null
    const rec = o as Record<string, unknown>
    if (rec.v !== 1) return null
    return rec.steeringMode === 'buttons' || rec.steeringMode === 'joystick' ? rec.steeringMode : null
  } catch {
    return null
  }
}

const safeGet = (kv: KV | null): string | null => { try { return kv ? kv.getItem(SETTINGS_KEY) : null } catch { return null } }
const safeSet = (kv: KV | null, v: string) => { try { kv?.setItem(SETTINGS_KEY, v) } catch { /* storage full/blocked: ignore */ } }
const safeRemove = (kv: KV | null) => { try { kv?.removeItem(SETTINGS_KEY) } catch { /* ignore */ } }

// "remember" ON  -> saved in localStorage (kept after closing the browser)
// "remember" OFF -> saved in sessionStorage only (forgotten when the tab closes)
export function createSettingsStore(local: KV | null, session: KV | null) {
  let current: Settings = { ...DEFAULT_SETTINGS }
  const fromLocal = parseSteering(safeGet(local))
  if (fromLocal) current = { steeringMode: fromLocal, remember: true }
  else {
    const fromSession = parseSteering(safeGet(session))
    if (fromSession) current = { steeringMode: fromSession, remember: false }
  }
  const listeners = new Set<() => void>()

  const persist = () => {
    const payload = JSON.stringify({ v: 1, steeringMode: current.steeringMode })
    if (current.remember) { safeSet(local, payload); safeRemove(session) }
    else { safeSet(session, payload); safeRemove(local) }
  }

  return {
    get: (): Settings => current,
    set(patch: Partial<Settings>): void {
      const next = { ...current, ...patch }
      if (next.steeringMode === current.steeringMode && next.remember === current.remember) return
      current = next
      persist()
      listeners.forEach((fn) => fn())
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    }
  }
}

function browserStorage(kind: 'localStorage' | 'sessionStorage'): KV | null {
  try { return typeof window === 'undefined' ? null : window[kind] } catch { return null }
}
export const settingsStore = createSettingsStore(browserStorage('localStorage'), browserStorage('sessionStorage'))
