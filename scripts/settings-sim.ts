// Headless test of settings persistence. Run: npm run test:settings
import assert from 'node:assert/strict'
import { createSettingsStore, parseSteering, SETTINGS_KEY, DEFAULT_SETTINGS, type KV } from '../src/game/settings'

const fakeKV = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v) }, removeItem: (k) => { data.delete(k) } }
}
const brokenKV: KV = {
  getItem() { throw new Error('blocked') }, setItem() { throw new Error('quota') }, removeItem() { throw new Error('blocked') }
}

console.log('--- parsing: missing / corrupt / outdated / unknown values ---')
assert.equal(parseSteering(null), null)
assert.equal(parseSteering(''), null)
assert.equal(parseSteering('{not json'), null)
assert.equal(parseSteering('42'), null)
assert.equal(parseSteering('null'), null)
assert.equal(parseSteering('{"v":0,"steeringMode":"joystick"}'), null)
assert.equal(parseSteering('{"v":1,"steeringMode":"mouse"}'), null)
assert.equal(parseSteering('{"v":1,"steeringMode":"joystick","extra":1}'), 'joystick')
assert.equal(parseSteering('{"v":1,"steeringMode":"buttons"}'), 'buttons')

console.log('--- defaults, then saving to localStorage (remember ON) ---')
{
  const local = fakeKV(), session = fakeKV()
  const s = createSettingsStore(local, session)
  assert.deepEqual(s.get(), DEFAULT_SETTINGS)
  let calls = 0
  const off = s.subscribe(() => calls++)
  s.set({ steeringMode: 'joystick' })
  assert.equal(s.get().steeringMode, 'joystick')
  assert.equal(calls, 1)
  s.set({ steeringMode: 'joystick' }) // no change -> no notification
  assert.equal(calls, 1)
  assert.ok(local.data.has(SETTINGS_KEY) && !session.data.has(SETTINGS_KEY))
  off()
  // "reload": a new store must restore it
  const again = createSettingsStore(local, session)
  assert.deepEqual(again.get(), { steeringMode: 'joystick', remember: true })
  console.log('persisted + restored from localStorage OK')
}

console.log('--- session-only (remember OFF): kept in this tab, not in localStorage ---')
{
  const local = fakeKV(), session = fakeKV()
  const s = createSettingsStore(local, session)
  s.set({ steeringMode: 'joystick' })
  s.set({ remember: false })
  assert.ok(!local.data.has(SETTINGS_KEY), 'localStorage must be cleared')
  assert.ok(session.data.has(SETTINGS_KEY))
  const sameTab = createSettingsStore(local, session)
  assert.deepEqual(sameTab.get(), { steeringMode: 'joystick', remember: false })
  const newBrowserSession = createSettingsStore(local, fakeKV())
  assert.deepEqual(newBrowserSession.get(), DEFAULT_SETTINGS)
  console.log('session-only behaves correctly')
}

console.log('--- corrupt saved data falls back to defaults ---')
{
  const local = fakeKV(); local.data.set(SETTINGS_KEY, '{"v":1,"steeringMode":"banana"}')
  assert.deepEqual(createSettingsStore(local, fakeKV()).get(), DEFAULT_SETTINGS)
}

console.log('--- blocked/full storage never crashes the game ---')
{
  const s = createSettingsStore(brokenKV, brokenKV)
  assert.deepEqual(s.get(), DEFAULT_SETTINGS)
  s.set({ steeringMode: 'joystick' })
  assert.equal(s.get().steeringMode, 'joystick')
  const none = createSettingsStore(null, null)
  none.set({ remember: false })
  assert.equal(none.get().remember, false)
}
console.log('ALL SETTINGS CHECKS PASSED')
