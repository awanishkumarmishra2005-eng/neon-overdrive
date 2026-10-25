export type DriverSpec = { id: string; name: string; style: string; color: string; price: number }
export const DRIVER_CATALOG: DriverSpec[] = [
  { id: 'nova', name: 'Nova', style: 'Rookie racer', color: '#55f4ff', price: 0 },
  { id: 'jax', name: 'Jax', style: 'Street specialist', color: '#ffb21c', price: 700 },
  { id: 'rhea', name: 'Rhea', style: 'Precision champion · handling bonus', color: '#ff4e83', price: 1200 },
  { id: 'kai', name: 'Kai', style: 'Nitro tactician · boost efficiency', color: '#a879ff', price: 1800 },
  { id: 'amara', name: 'Amara', style: 'Endurance ace · race reward bonus', color: '#7dff9d', price: 2400 },
]
const SAVE_KEY = 'neon-overdrive-economy-v1'
type EconomySave = { coins: number; ownedCars: string[]; ownedDrivers: string[]; selectedDriver: string; flyingUnlocked: boolean; freeFlightUsesRemaining: number }
export const FLYING_UNLOCK_PRICE = 1000
export const FREE_FLIGHT_USES = 5
const starter: EconomySave = { coins: 0, ownedCars: ['vortex', 'skyline-one'], ownedDrivers: ['nova'], selectedDriver: 'nova', flyingUnlocked: false, freeFlightUsesRemaining: FREE_FLIGHT_USES }
function read(): EconomySave {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { ...starter, ownedCars: [...starter.ownedCars], ownedDrivers: [...starter.ownedDrivers] }
    const value = JSON.parse(raw) as Partial<EconomySave>
    const ownedDrivers = Array.isArray(value.ownedDrivers) ? [...new Set(['nova', ...value.ownedDrivers])] : ['nova']
    return { coins: Math.max(0, Number(value.coins) || 0), ownedCars: Array.isArray(value.ownedCars) ? [...new Set(['vortex', 'skyline-one', ...value.ownedCars])] : ['vortex', 'skyline-one'], ownedDrivers, selectedDriver: typeof value.selectedDriver === 'string' && ownedDrivers.includes(value.selectedDriver) ? value.selectedDriver : 'nova', flyingUnlocked: value.freeFlightUsesRemaining === undefined ? false : value.flyingUnlocked === true, freeFlightUsesRemaining: Math.max(0, Math.min(FREE_FLIGHT_USES, Number.isFinite(Number(value.freeFlightUsesRemaining)) ? Math.floor(Number(value.freeFlightUsesRemaining)) : FREE_FLIGHT_USES)) }
  } catch { return { ...starter, ownedCars: [...starter.ownedCars], ownedDrivers: [...starter.ownedDrivers] } }
}
let state = read()
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)) } catch { /* local play remains available without storage */ } }
export function getEconomy() { return { ...state, ownedCars: [...state.ownedCars], ownedDrivers: [...state.ownedDrivers] } }
export function hasFlyingUnlock() { return state.flyingUnlocked || state.freeFlightUsesRemaining > 0 }
export function getFreeFlightUsesRemaining() { return state.freeFlightUsesRemaining }
export function consumeFreeFlightUse() { if (state.flyingUnlocked) return true; if (state.freeFlightUsesRemaining <= 0) return false; state.freeFlightUsesRemaining -= 1; persist(); if (typeof window !== 'undefined') window.dispatchEvent(new Event('neon-overdrive-economy')); return true }
export function unlockFlyingAbility() { if (state.flyingUnlocked) return true; if (!spendCoins(FLYING_UNLOCK_PRICE)) return false; state.flyingUnlocked = true; persist(); if (typeof window !== 'undefined') window.dispatchEvent(new Event('neon-overdrive-economy')); return true }
export function awardCoins(amount: number, reason = 'reward') { const n = Math.max(0, Math.floor(amount)); if (!n) return; state.coins += n; persist(); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('neon-overdrive-economy', { detail: { reason, amount: n } })) }
export function spendCoins(amount: number) { const n = Math.max(0, Math.floor(amount)); if (state.coins < n) return false; state.coins -= n; persist(); window.dispatchEvent(new CustomEvent('neon-overdrive-economy', { detail: { reason: 'purchase', amount: -n } })); return true }
export function ownsCar(id: string) { return state.ownedCars.includes(id) }
export function buyCar(id: string, price: number) { if (ownsCar(id) || !spendCoins(price)) return false; state.ownedCars.push(id); persist(); window.dispatchEvent(new Event('neon-overdrive-economy')); return true }
export function ownsDriver(id: string) { return state.ownedDrivers.includes(id) }
export function buyDriver(id: string, price: number) { if (ownsDriver(id) || !spendCoins(price)) return false; state.ownedDrivers.push(id); persist(); window.dispatchEvent(new Event('neon-overdrive-economy')); return true }
export function selectDriver(id: string) { if (!ownsDriver(id)) return; state.selectedDriver = id; persist(); window.dispatchEvent(new Event('neon-overdrive-driver-change')) }
export function getSelectedDriver() { return DRIVER_CATALOG.find(d => d.id === state.selectedDriver) ?? DRIVER_CATALOG[0] }
