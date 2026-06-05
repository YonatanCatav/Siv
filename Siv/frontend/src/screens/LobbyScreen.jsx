import { t } from '../i18n.js'

export default function LobbyScreen({ state }) {
  const room = state.room
  const lang = state.lang
  if (!room) return null

  const players = room.players || []
  const me = players.find(p => p.id === state.playerId)

  return (
    <div className="screen lobby">
      <div style={{ padding: '16px 20px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 900, fontSize: '1.3rem' }}>SIV</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{me?.avatar} {me?.name}</span>
      </div>

      <div className="lobby-header">
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>
          {t(lang, 'roomCodeLabel')}
        </div>
        <div className="lobby-room-code" dir="ltr">{room.code}</div>
        <div className="lobby-hint">{t(lang, 'shareCode')}</div>
      </div>

      <div className="lobby-waiting">
        <span>{t(lang, 'waitingForHost')}</span>
        <span className="dot-pulse">
          <span /><span /><span />
        </span>
      </div>

      <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
        <div className="section-title">{t(lang, 'playersJoined', players.length)}</div>
      </div>

      <div className="player-grid">
        {players.map(p => (
          <div key={p.id} className="player-chip">
            <div className="player-chip-avatar">{p.avatar}</div>
            <div className="player-chip-name">{p.name}</div>
            {p.is_host && <div className="player-chip-host">{t(lang, 'host')}</div>}
            {p.id === state.playerId && <div style={{ fontSize: '0.6rem', color: 'var(--cyan)', fontWeight: 700 }}>{t(lang, 'you')}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
