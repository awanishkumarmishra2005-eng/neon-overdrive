import { ownsCar } from './economy'
export type CarSpec = {
  id: string; name: string; style: string; color: string; accent: string
  width: number; length: number; cabinWidth: number; cabinLength: number; spoiler: boolean
  maxSpeed: number; acceleration: number; price: number
}

// Fictional, unlicensed supercar designs inspired by broad automotive design categories.
// No manufacturer logos or trademarked body assets are used.
export const CAR_CATALOG: CarSpec[] = [
  { id: 'skyline-one', name: 'Skyline One', style: 'Free futuristic flying-car concept · flight unlock sold separately', color: '#55f4ff', accent: '#c9fbff', width: 2.0, length: 4.65, cabinWidth: 1.4, cabinLength: 1.8, spoiler: false, maxSpeed: 46, acceleration: 18, price: 0 },
  { id: 'vortex', name: 'Vortex GT', style: 'European mid-engine hypercar', color: '#e63946', accent: '#fff0f0', width: 1.95, length: 4.35, cabinWidth: 1.34, cabinLength: 1.72, spoiler: false, maxSpeed: 45, acceleration: 16, price: 0 },
  { id: 'monarch', name: 'Monarch S', style: 'Precision German sports coupe', color: '#e7edf5', accent: '#5ce1ff', width: 2.02, length: 4.55, cabinWidth: 1.48, cabinLength: 1.82, spoiler: false, maxSpeed: 44, acceleration: 15, price: 650 },
  { id: 'nightfall', name: 'Nightfall M', style: 'Track-focused performance coupe', color: '#2764db', accent: '#7fffd4', width: 2.0, length: 4.6, cabinWidth: 1.45, cabinLength: 1.8, spoiler: true, maxSpeed: 44, acceleration: 16, price: 900 },
  { id: 'tempest', name: 'Tempest R', style: 'Low-slung Italian supercar', color: '#20a45b', accent: '#d7ffe9', width: 2.04, length: 4.42, cabinWidth: 1.32, cabinLength: 1.58, spoiler: false, maxSpeed: 47, acceleration: 17, price: 1200 },
  { id: 'raptor', name: 'Raptor X', style: 'Aggressive wedge-shaped hypercar', color: '#ffb21c', accent: '#fff2c7', width: 2.08, length: 4.5, cabinWidth: 1.3, cabinLength: 1.5, spoiler: true, maxSpeed: 48, acceleration: 17, price: 1500 },
  { id: 'phantom', name: 'Phantom 720', style: 'Carbon aero track hypercar', color: '#7c4dff', accent: '#e6dcff', width: 2.06, length: 4.48, cabinWidth: 1.34, cabinLength: 1.62, spoiler: true, maxSpeed: 49, acceleration: 18, price: 1900 },
  { id: 'aurora', name: 'Aurora E', style: 'Electric grand-tourer', color: '#12a9b8', accent: '#b9ffff', width: 1.98, length: 4.7, cabinWidth: 1.5, cabinLength: 1.95, spoiler: false, maxSpeed: 43, acceleration: 19, price: 1100 },
  { id: 'solstice', name: 'Solstice RS', style: 'Wide-body endurance racer', color: '#f2f2f2', accent: '#ff6633', width: 2.12, length: 4.62, cabinWidth: 1.4, cabinLength: 1.65, spoiler: true, maxSpeed: 46, acceleration: 18, price: 1750 },
  { id: 'spectre', name: 'Spectre V', style: 'Carbon-fibre night runner', color: '#353944', accent: '#b6a0ff', width: 2.05, length: 4.55, cabinWidth: 1.32, cabinLength: 1.55, spoiler: true, maxSpeed: 50, acceleration: 17, price: 2200 },
  { id: 'zephyr', name: 'Zephyr X', style: 'Aero electric hypercar', color: '#f3f1dc', accent: '#68ffd0', width: 2.0, length: 4.75, cabinWidth: 1.42, cabinLength: 1.8, spoiler: false, maxSpeed: 48, acceleration: 20, price: 2500 },
]

const KEY = 'neon-overdrive-selected-car-v1'
function initialCarId(): string {
  try { const id = localStorage.getItem(KEY); return CAR_CATALOG.some(c => c.id === id) && ownsCar(id!) ? id! : CAR_CATALOG[0].id } catch { return CAR_CATALOG[0].id }
}
let selectedCarId = initialCarId()
export function getSelectedCarId(): string { return selectedCarId }
export function saveSelectedCarId(id: string) {
  if (!CAR_CATALOG.some(c => c.id === id) || !ownsCar(id)) return
  selectedCarId = id
  try { localStorage.setItem(KEY, id) } catch { /* storage optional */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('neon-overdrive-car-change'))
}
export function getSelectedCar(): CarSpec { return CAR_CATALOG.find(c => c.id === selectedCarId) ?? CAR_CATALOG[0] }
