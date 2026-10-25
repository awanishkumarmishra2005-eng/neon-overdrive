import { useEffect, useState } from 'react'
import { beginRace, CAMPAIGN_LEVELS, campaignRuntime, loadCampaignSave, saveCampaignSave } from '../game/campaign'
import { CAR_CATALOG, getSelectedCarId, saveSelectedCarId } from '../game/carCatalog'
import { buyCar, buyDriver, DRIVER_CATALOG, getEconomy, ownsCar, ownsDriver, selectDriver, hasFlyingUnlock, getFreeFlightUsesRemaining, unlockFlyingAbility, FLYING_UNLOCK_PRICE } from '../game/economy'
import { enableGameAudio, isGameAudioEnabled, playGameTone } from '../game/audio'

const panel: React.CSSProperties = {
  width: 'min(920px, 94vw)', maxHeight: '90dvh', overflowY: 'auto', boxSizing: 'border-box',
  padding: 'clamp(18px, 4vw, 34px)', border: '1px solid rgba(85,244,255,.45)', borderRadius: 18,
  background: 'linear-gradient(145deg, rgba(5,10,22,.97), rgba(20,7,32,.96))',
  boxShadow: '0 0 45px rgba(0,229,255,.16)', color: '#eafaff', fontFamily: 'system-ui, sans-serif'
}
const button: React.CSSProperties = { border: '1px solid #55f4ff', borderRadius: 9, padding: '10px 16px', color: '#071018', background: '#55f4ff', fontWeight: 900, letterSpacing: 1, cursor: 'pointer' }

export default function CampaignOverlay() {
  const [save, setSave] = useState(loadCampaignSave)
  const [, refresh] = useState(0)
  const [selected, setSelected] = useState(1)
  const [selectedCar, setSelectedCar] = useState(getSelectedCarId())
  const [wallet, setWallet] = useState(getEconomy)
  const [selectedDriver, setSelectedDriver] = useState(getEconomy().selectedDriver)
  const [flyingUnlocked, setFlyingUnlocked] = useState(getEconomy().flyingUnlocked)
  const [freeFlightUses, setFreeFlightUses] = useState(getFreeFlightUsesRemaining())
  const [audioOn, setAudioOn] = useState(isGameAudioEnabled())
  useEffect(() => { const update = () => { setWallet(getEconomy()); setSelectedDriver(getEconomy().selectedDriver); setSelectedCar(getSelectedCarId()); setFlyingUnlocked(getEconomy().flyingUnlocked); setFreeFlightUses(getFreeFlightUsesRemaining()) }; window.addEventListener('neon-overdrive-economy', update); window.addEventListener('neon-overdrive-driver-change', update); window.addEventListener('neon-overdrive-car-change', update); return () => { window.removeEventListener('neon-overdrive-economy', update); window.removeEventListener('neon-overdrive-driver-change', update); window.removeEventListener('neon-overdrive-car-change', update) } }, [])
  useEffect(() => {
    const id = window.setInterval(() => refresh(n => n + 1), 200)
    return () => window.clearInterval(id)
  }, [])

  const status = campaignRuntime.status
  const level = CAMPAIGN_LEVELS[campaignRuntime.selectedLevel - 1]
  const visible = status !== 'racing'
  const resetProgress = () => {
    const fresh = { unlockedLevel: 1, bestTimes: {} }
    saveCampaignSave(fresh); setSave(fresh); setSelected(1)
  }

  return <>
    {status === 'racing' && <div style={{ position: 'fixed', zIndex: 8, top: 'calc(env(safe-area-inset-top, 0px) + 2vmin)', right: '3vmin', color: level.accent, textAlign: 'right', font: '800 12px system-ui', textShadow: `0 0 10px ${level.accent}`, pointerEvents: 'none' }}>
      <div>LEVEL {level.id} · {level.title.toUpperCase()}</div>
      <div style={{ fontSize: 22 }}>{Math.floor(campaignRuntime.elapsed / 60).toString().padStart(2, '0')}:{Math.floor(campaignRuntime.elapsed % 60).toString().padStart(2, '0')}.{Math.floor((campaignRuntime.elapsed % 1) * 10)}</div>
      <div>CHECKPOINTS {campaignRuntime.nextCheckpoint}/{level.checkpointCount}</div><div>🪙 {wallet.coins} COINS</div>
      {campaignRuntime.noticeUntil > performance.now() && <div style={{ marginTop: 6 }}>{campaignRuntime.notice}</div>}
    </div>}
    {visible && <div style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: 12, boxSizing: 'border-box', background: 'rgba(1,3,10,.78)', backdropFilter: 'blur(8px)' }}>
      <section style={panel}>
        <div style={{ color: '#55f4ff', fontSize: 11, letterSpacing: 4, fontWeight: 900 }}>SOLOFORCE RACING DIVISION · CAMPAIGN</div>
        <h1 style={{ fontSize: 'clamp(30px, 6vw, 54px)', lineHeight: 1, margin: '12px 0 8px', fontWeight: 1000, letterSpacing: -1 }}>NEON <span style={{ color: '#55f4ff' }}>OVERDRIVE</span></h1>
        <p style={{ color: '#9db5c5', marginTop: 0, fontSize: 13 }}>M12 · GARAGE, CITYSCAPES, RIVALS, COINS & DAY/NIGHT DRIVING.</p>
        {status === 'failed' && <div style={{ border: '1px solid #ff5555', borderRadius: 12, padding: 18, margin: '20px 0', background: 'rgba(255,60,80,.08)' }}>
          <div style={{ color: '#ff7777', letterSpacing: 3, fontSize: 12, fontWeight: 900 }}>TIME LIMIT EXCEEDED</div>
          <h2 style={{ margin: '8px 0' }}>{level.title}</h2>
          <div style={{ color: '#b8d2df' }}>Your run took {campaignRuntime.elapsed.toFixed(1)} seconds. The time limit was {Math.floor(level.targetSeconds / 60)}:{String(level.targetSeconds % 60).padStart(2, '0')}.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button style={button} onClick={() => { beginRace(campaignRuntime.selectedLevel); refresh(n => n + 1) }}>RETRY RACE ↻</button>
            <button style={{ ...button, background: 'transparent', color: '#9db5c5', borderColor: '#405361' }} onClick={() => { campaignRuntime.status = 'menu'; setSelected(campaignRuntime.selectedLevel); refresh(n => n + 1) }}>LEVEL SELECT</button>
          </div>
        </div>}
        {status === 'complete' ? <div style={{ border: `1px solid ${level.accent}`, borderRadius: 12, padding: 18, margin: '20px 0', background: 'rgba(85,244,255,.06)' }}>
          <div style={{ color: level.accent, letterSpacing: 3, fontSize: 12, fontWeight: 900 }}>RACE COMPLETE</div>
          <h2 style={{ margin: '8px 0' }}>{level.title}</h2>
          <div style={{ color: '#b8d2df' }}>Time: {campaignRuntime.elapsed.toFixed(1)} seconds · Checkpoints: {campaignRuntime.nextCheckpoint}/{level.checkpointCount}</div>
          {campaignRuntime.selectedLevel < 5 ? <p style={{ color: '#55f4ff' }}>Level {campaignRuntime.selectedLevel + 1} unlocked!</p> : <p style={{ color: '#55f4ff' }}>Campaign finale cleared!</p>}
          <button style={button} onClick={() => { setSave(loadCampaignSave()); setSelected(Math.min(5, campaignRuntime.selectedLevel + 1)); campaignRuntime.status = 'menu' }}>CONTINUE</button>
        </div> : null}
        {status === 'menu' && <>
          <div style={{ marginTop: 18, padding: 12, border: '1px solid rgba(255,201,40,.4)', borderRadius: 12, background: 'rgba(255,190,40,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div><div style={{ color: '#ffc928', fontWeight: 900, letterSpacing: 2 }}>🪙 {wallet.coins} COINS</div><div style={{ color: '#9db5c5', fontSize: 11 }}>Collect track coins (+25) and finish races (+350–750) to unlock rides.</div></div><div style={{ color: '#9db5c5', fontSize: 11 }}>11 CARS · 5 DRIVERS</div></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18, marginBottom: 12 }}>
            <button style={button} onClick={() => document.getElementById('neon-garage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>🚘 GARAGE</button>
            <button style={{ ...button, background: 'transparent', color: '#55f4ff' }} onClick={() => document.getElementById('neon-drivers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>🏁 DRIVERS</button>
            <button style={{ ...button, background: 'transparent', color: '#55f4ff' }} onClick={() => document.getElementById('neon-levels')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>🌆 TRACKS & RACES</button>
            <button style={{ ...button, background: audioOn ? '#7dff9d' : 'transparent', color: audioOn ? '#06140b' : '#55f4ff', borderColor: audioOn ? '#7dff9d' : '#55f4ff' }} onClick={() => { const ok = enableGameAudio(); setAudioOn(ok); if (ok) playGameTone(660, .12) }}>{audioOn ? '🔊 SOUND ON' : '🔈 ENABLE SOUND'}</button>
          </div>
          <div id="neon-garage" style={{ marginTop: 18, scrollMarginTop: 12 }}>
            <div style={{ color: '#55f4ff', fontSize: 11, letterSpacing: 3, fontWeight: 900, marginBottom: 10 }}>SUPERCAR GARAGE · BUY & SELECT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 8 }}>
              {CAR_CATALOG.map(car => {
                const owned = ownsCar(car.id), selectedNow = selectedCar === car.id
                return <button key={car.id} onClick={() => {
                  if (owned) { setSelectedCar(car.id); saveSelectedCarId(car.id) }
                  else if (buyCar(car.id, car.price)) { setWallet(getEconomy()); setSelectedCar(car.id); saveSelectedCarId(car.id) }
                  else { window.alert(`You need ${car.price - wallet.coins} more coins to buy ${car.name}.`) }
                }} style={{ textAlign: 'left', padding: 11, borderRadius: 10, border: `1px solid ${selectedNow ? car.color : 'rgba(135,170,190,.25)'}`, background: selectedNow ? `${car.color}22` : 'rgba(255,255,255,.025)', color: '#eafaff', cursor: 'pointer' }}>
                  <div style={{ height: 7, width: '100%', borderRadius: 6, background: car.color, marginBottom: 9, boxShadow: `0 0 12px ${car.color}55` }} />
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{car.name}</div><div style={{ fontSize: 10, color: '#9db5c5', marginTop: 4 }}>{car.style}</div>
                  <div style={{ fontSize: 10, color: car.accent, marginTop: 7 }}>{Math.round(car.maxSpeed * 3.6)} km/h · {car.spoiler ? 'TRACK AERO' : 'ROAD SPEC'}</div>
                  <div style={{ fontSize: 11, fontWeight: 900, marginTop: 7, color: owned ? car.accent : '#ffc928' }}>{selectedNow ? '✓ SELECTED' : owned ? 'OWNED · SELECT' : `🔒 BUY · 🪙 ${car.price}`}</div>
                </button>
              })}
            </div>
          </div>
          <div id="neon-drivers" style={{ marginTop: 20, scrollMarginTop: 12 }}>
            <div style={{ color: '#55f4ff', fontSize: 11, letterSpacing: 3, fontWeight: 900, marginBottom: 10 }}>DRIVER ROSTER · 5 RACERS TO UNLOCK</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 8 }}>
              {DRIVER_CATALOG.map(driver => { const owned = ownsDriver(driver.id), active = selectedDriver === driver.id; return <button key={driver.id} onClick={() => { if (owned) { selectDriver(driver.id); setSelectedDriver(driver.id) } else if (buyDriver(driver.id, driver.price)) { selectDriver(driver.id); setSelectedDriver(driver.id); setWallet(getEconomy()) } else window.alert(`You need ${driver.price - wallet.coins} more coins to unlock ${driver.name}.`) }} style={{ textAlign: 'left', padding: 11, borderRadius: 10, border: `1px solid ${active ? driver.color : 'rgba(135,170,190,.25)'}`, background: active ? `${driver.color}18` : 'rgba(255,255,255,.025)', color: '#eafaff', cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: '50%', background: driver.color, border: '5px solid #192432', boxShadow: `0 0 10px ${driver.color}66` }} /><div><div style={{ fontWeight: 900 }}>{driver.name}</div><div style={{ color: '#9db5c5', fontSize: 10 }}>{driver.style}</div></div></div><div style={{ color: owned ? driver.color : '#ffc928', fontWeight: 900, fontSize: 11, marginTop: 8 }}>{active ? '✓ SELECTED' : owned ? 'OWNED · SELECT' : `🔒 🪙 ${driver.price}`}</div></button> })}
            </div>
          </div>
          <div style={{ marginTop: 18, padding: 15, border: `1px solid ${flyingUnlocked ? '#7dff9d' : '#55f4ff'}`, borderRadius: 12, background: 'rgba(85,244,255,.045)' }}>
            <div style={{ fontWeight: 900, letterSpacing: 2, color: '#55f4ff' }}>✦ SKYLINE ONE · FLYING CAR</div>
            <p style={{ color: '#9db5c5', fontSize: 12, margin: '7px 0 12px' }}>{flyingUnlocked ? 'UNLIMITED FLIGHT UNLOCKED. Each flight lasts up to 3 seconds before automatic landing.' : `Try flying free ${freeFlightUses} more ${freeFlightUses === 1 ? 'time' : 'times'} — each activation lasts 3 seconds. After all 5 free uses, unlock unlimited flight for ${FLYING_UNLOCK_PRICE.toLocaleString()} coins.`}</p>
            {flyingUnlocked ? <div style={{ ...button, display: 'inline-block', background: '#7dff9d', borderColor: '#7dff9d', cursor: 'default' }}>✓ UNLIMITED FLIGHT · OWNED</div> : <button style={{ ...button, background: wallet.coins >= FLYING_UNLOCK_PRICE ? '#7dff9d' : 'transparent', color: wallet.coins >= FLYING_UNLOCK_PRICE ? '#06140b' : '#55f4ff', borderColor: wallet.coins >= FLYING_UNLOCK_PRICE ? '#7dff9d' : '#55f4ff' }} onClick={() => { if (unlockFlyingAbility()) { setWallet(getEconomy()); setFlyingUnlocked(true); setFreeFlightUses(getFreeFlightUsesRemaining()) } else window.alert(`You need ${FLYING_UNLOCK_PRICE - wallet.coins} more coins to unlock unlimited flight.`) }}>🔓 UNLOCK UNLIMITED FLIGHT · 🪙 {FLYING_UNLOCK_PRICE.toLocaleString()}</button>}
            {!flyingUnlocked && <div style={{ color: '#9db5c5', fontSize: 11, marginTop: 8 }}>FREE USES REMAINING: {freeFlightUses}/5 · Unlimited flight purchase is saved on this device.</div>}
          </div>
          <div id="neon-levels" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 10, marginTop: 20, scrollMarginTop: 12 }}>
            {CAMPAIGN_LEVELS.map(item => {
              const unlocked = item.id <= save.unlockedLevel
              const active = selected === item.id
              return <button key={item.id} disabled={!unlocked} onClick={() => setSelected(item.id)} style={{ textAlign: 'left', minHeight: 108, padding: 14, borderRadius: 12, border: `1px solid ${active ? item.accent : 'rgba(135,170,190,.25)'}`, background: active ? `${item.accent}14` : 'rgba(255,255,255,.025)', color: unlocked ? '#eafaff' : '#5e6c78', cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : .65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: active ? item.accent : '#9db5c5', fontSize: 10, fontWeight: 900, letterSpacing: 2 }}><span>LEVEL {String(item.id).padStart(2, '0')}</span><span>{unlocked ? item.difficulty : '🔒 LOCKED'}</span></div>
                <div style={{ fontWeight: 900, fontSize: 18, margin: '8px 0 4px' }}>{item.title}</div>
                <div style={{ color: '#9db5c5', fontSize: 11 }}>{item.description}</div><div style={{ color: item.accent, fontSize: 10, fontWeight: 900, marginTop: 7 }}>RACE TARGET {Math.floor(item.targetSeconds / 60)}:{String(item.targetSeconds % 60).padStart(2, '0')}</div>
                {save.bestTimes[String(item.id)] && <div style={{ marginTop: 8, fontSize: 11, color: item.accent }}>BEST {save.bestTimes[String(item.id)].toFixed(1)}s</div>}
              </button>
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
            <div style={{ color: '#9db5c5', fontSize: 12 }}>UNLOCKED {save.unlockedLevel}/5 · Coins, garage and progress save on this device</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={{ ...button, background: 'transparent', color: '#9db5c5', borderColor: '#405361' }} onClick={resetProgress}>RESET SAVE</button>
              <button style={button} onClick={() => { beginRace(selected); refresh(n => n + 1) }}>START RACE ↗</button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#6e8b9c', marginBottom: 0, marginTop: 16 }}>Controls: W/↑ accelerate · S/↓ brake · A/D or ←/→ steer · Shift drift · F transform</p>
        </>}
      </section>
    </div>}
  </>
}
