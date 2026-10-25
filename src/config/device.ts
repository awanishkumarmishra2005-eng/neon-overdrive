// Device profile. Safe to import from Node (no window access without a guard).
// URL switches for testing on a PC:  ?touch=1  (force touch controls + low graphics)
//                                    ?touch=0  (force them off)
//                                    ?lowgfx=1 (low graphics on desktop)
const hasWindow = typeof window !== 'undefined'
const params = hasWindow ? new URLSearchParams(window.location.search) : null
const coarse =
  hasWindow && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
const touchParam = params ? params.get('touch') : null

export const IS_MOBILE: boolean = touchParam === '1' ? true : touchParam === '0' ? false : coarse
export const LOW_GFX: boolean = IS_MOBILE || (params ? params.get('lowgfx') === '1' : false)
