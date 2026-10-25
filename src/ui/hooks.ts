import { useSyncExternalStore } from 'react'
import { settingsStore, type Settings } from '../game/settings'
import { getFlightMode, subscribeFlightMode } from '../game/commands'
import type { FlightMode } from '../game/flightModel'

export const useSettings = (): Settings => useSyncExternalStore(settingsStore.subscribe, settingsStore.get)
export const useFlightMode = (): FlightMode => useSyncExternalStore(subscribeFlightMode, getFlightMode)
