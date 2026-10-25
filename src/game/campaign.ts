import { trackCurve } from '../config/track'
import { awardCoins } from './economy'
import { vehicleState } from './vehicleState'

export type CampaignLevel = {
  id: number
  title: string
  subtitle: string
  difficulty: string
  accent: string
  targetSeconds: number
  checkpointCount: number
  description: string
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  { id: 1, title: 'Neon Awakening', subtitle: 'FIRST IGNITION', difficulty: 'ROOKIE', accent: '#55f4ff', targetSeconds: 300, checkpointCount: 3, description: 'Learn the road, steering, drifting and checkpoints.' },
  { id: 2, title: 'City Chaos', subtitle: 'URBAN PRESSURE', difficulty: 'HARD', accent: '#ff4fd8', targetSeconds: 330, checkpointCount: 4, description: 'A high-pressure city run with tighter racing targets.' },
  { id: 3, title: 'Mountain Fury', subtitle: 'NO ROOM FOR ERROR', difficulty: 'EXTREME', accent: '#ffad55', targetSeconds: 390, checkpointCount: 5, description: 'A demanding precision run through the mountain sector.' },
  { id: 4, title: 'Bridge Breaker', subtitle: 'TRUST YOUR LINE', difficulty: 'EXPERT', accent: '#a88bff', targetSeconds: 420, checkpointCount: 5, description: 'A precision challenge built around clean checkpoint runs.' },
  { id: 5, title: 'Skyline Apocalypse', subtitle: 'THE FINAL RUN', difficulty: 'MASTER', accent: '#ff5555', targetSeconds: 480, checkpointCount: 6, description: 'The final campaign test for your driving and flight skills.' },
]

export type CampaignSave = { unlockedLevel: number; bestTimes: Record<string, number> }
const SAVE_KEY = 'neon-overdrive-campaign-v1'
const defaultSave = (): CampaignSave => ({ unlockedLevel: 1, bestTimes: {} })
export function loadCampaignSave(): CampaignSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultSave()
    const value = JSON.parse(raw) as Partial<CampaignSave>
    return {
      unlockedLevel: Math.max(1, Math.min(5, Number(value.unlockedLevel) || 1)),
      bestTimes: value.bestTimes && typeof value.bestTimes === 'object' ? value.bestTimes : {},
    }
  } catch { return defaultSave() }
}
export function saveCampaignSave(save: CampaignSave) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch { /* Private browsing/storage disabled: keep the run playable. */ }
}

export type RaceStatus = 'menu' | 'racing' | 'complete' | 'failed'
export const campaignRuntime = {
  selectedLevel: 1,
  status: 'menu' as RaceStatus,
  startAt: 0,
  elapsed: 0,
  nextCheckpoint: 0,
  lastT: 0,
  crossedStart: false,
  notice: '',
  noticeUntil: 0,
}

export function beginRace(level: number, now = performance.now()) {
  // Collision penalties are tracked per attempt, not across the whole campaign.
  vehicleState.collisionCount = 0
  campaignRuntime.selectedLevel = Math.max(1, Math.min(5, level))
  campaignRuntime.status = 'racing'
  campaignRuntime.startAt = now
  campaignRuntime.elapsed = 0
  campaignRuntime.nextCheckpoint = 0
  campaignRuntime.lastT = 0
  campaignRuntime.crossedStart = false
  campaignRuntime.notice = `LEVEL ${campaignRuntime.selectedLevel} — GO!`
  campaignRuntime.noticeUntil = now + 2200
}

export function updateRace(x: number, z: number, now = performance.now()) {
  if (campaignRuntime.status !== 'racing') return
  campaignRuntime.elapsed = Math.max(0, (now - campaignRuntime.startAt) / 1000)
  const level = CAMPAIGN_LEVELS[campaignRuntime.selectedLevel - 1]
  if (campaignRuntime.elapsed > level.targetSeconds) {
    campaignRuntime.status = 'failed'
    campaignRuntime.notice = 'TIME LIMIT EXCEEDED — TRY AGAIN'
    campaignRuntime.noticeUntil = now + 5000
    return
  }
  // Project the car onto the existing closed track using a modest sample count.
  let nearestT = 0, nearestD = Infinity
  for (let i = 0; i < 720; i++) {
    const t = i / 720
    const p = trackCurve.getPointAt(t)
    const d = (p.x - x) ** 2 + (p.z - z) ** 2
    if (d < nearestD) { nearestD = d; nearestT = t }
  }
  const distance = Math.sqrt(nearestD)
  if (distance < 17) {
    const target = (campaignRuntime.nextCheckpoint + 1) / (level.checkpointCount + 1)
    if (campaignRuntime.nextCheckpoint < level.checkpointCount && Math.abs(nearestT - target) < 0.035) {
      campaignRuntime.nextCheckpoint++
      campaignRuntime.notice = `CHECKPOINT ${campaignRuntime.nextCheckpoint}/${level.checkpointCount}`
      campaignRuntime.noticeUntil = now + 1500
    }
    if (nearestT > 0.78) campaignRuntime.crossedStart = true
    if (campaignRuntime.crossedStart && nearestT < 0.045 && campaignRuntime.nextCheckpoint >= level.checkpointCount) {
      campaignRuntime.status = 'complete'
      campaignRuntime.notice = 'FINISH — CAMPAIGN CLEAR'
      campaignRuntime.noticeUntil = now + 5000
      const saved = loadCampaignSave()
      const key = String(campaignRuntime.selectedLevel)
      const previous = saved.bestTimes[key]
      if (!previous || campaignRuntime.elapsed < previous) saved.bestTimes[key] = campaignRuntime.elapsed
      saved.unlockedLevel = Math.max(saved.unlockedLevel, Math.min(5, campaignRuntime.selectedLevel + 1))
      saveCampaignSave(saved)
      awardCoins(250 + campaignRuntime.selectedLevel * 100, 'race-finish')
    }
  }
  campaignRuntime.lastT = nearestT
}
