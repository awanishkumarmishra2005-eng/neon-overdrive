let context: AudioContext | null = null
let engineOsc: OscillatorNode | null = null
let engineGain: GainNode | null = null
let enabled = false
export function enableGameAudio() {
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return false
  if (!context) {
    context = new Ctx()
    engineOsc = context.createOscillator(); engineOsc.type = 'sawtooth'
    engineGain = context.createGain(); engineGain.gain.value = 0.0001
    engineOsc.connect(engineGain); engineGain.connect(context.destination); engineOsc.start()
  }
  void context.resume(); enabled = true
  return true
}
export function isGameAudioEnabled() { return enabled }
export function updateEngineAudio(speed: number) {
  if (!enabled || !context || !engineOsc || !engineGain) return
  const now = context.currentTime
  engineOsc.frequency.setTargetAtTime(65 + Math.min(1, Math.abs(speed) / 55) * 210, now, .08)
  engineGain.gain.setTargetAtTime(.012 + Math.min(1, Math.abs(speed) / 55) * .025, now, .1)
}
export function playGameTone(frequency: number, duration = .14, type: OscillatorType = 'sine', volume = .06) {
  if (!enabled || !context) return
  const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime
  osc.type = type; osc.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration)
  osc.connect(gain); gain.connect(context.destination); osc.start(now); osc.stop(now + duration)
}
