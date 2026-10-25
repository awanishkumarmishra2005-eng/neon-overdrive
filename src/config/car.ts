// Car tuning. Units: metres, seconds, m/s, m/s^2. Placeholder arcade values (not real vehicle data).
export const CAR_CONFIG = {
  maxSpeed: 45,        // m/s (~162 km/h)
  reverseSpeed: 8,     // m/s max reverse
  acceleration: 16,    // m/s^2
  brake: 28,           // m/s^2
  drag: 0.35,          // 1/s, simple placeholder (NOT real aero yet)
  steerRate: 2.0,      // rad/s at ideal speed
  maxDt: 0.05          // clamp for slow frames / tab switches
}
export type CarParams = typeof CAR_CONFIG
