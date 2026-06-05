import { useEffect, useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

const CONFETTI_COLORS = ['#E91E8C','#2196F3','#FF9800','#4CAF50','#9C27B0','#FFC107','#F44336','#00BCD4']

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${Math.random() * 3}s`,
    duration: `${3 + Math.random() * 3}s`,
    width: `${6 + Math.random() * 8}px`,
    height: `${10 + Math.random() * 8}px`,
  }))

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{ left: p.left, background: p.color, width: p.width, height: p.height, animationDuration: p.duration, animationDelay: p.delay }}
        />
      ))}
    </div>
  )
}

export default function GameOverScreen({ state, dispatch }) {
  const data = state.gameOverData
  const lang = state.lang
  const [showConfetti, setShowConfetti] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  if (!data) return null

  const scores = data.scores || []
  const top3 = scores.slice(0, 3)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const hasPassword = state.room?.has_password

  return (
    <div className="screen gameover-screen">
      {showConfetti && <Confetti />}

      <div className="gameover-title">{t(lang, 'gameOver')}</div>

      {top3.length > 0 && (
        <div className="podium">
          {podiumOrder.map((p) => {
            const platformClass = p.rank === 1 ? 'p1' : p.rank === 2 ? 'p2' : 'p3'
            const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'
            return (
              <div key={p.id} className="podium-place">
                <div className="podium-avatar">{p.avatar}</div>
                <div className={`podium-platform ${platformClass}`}>
                  <span className="podium-medal">{medal}</span>
                  <span className="podium-name">{p.name}</span>
                  <span className="podium-score">{p.score.toLocaleString()}</span>
                </div>
                <span className="podium-place-num">{t(lang, 'rank', p.rank)}</span>
              </div>
            )
          })}
        </div>
      )}

      {scores.length > 0 && (
        <div className="gameover-list">
          {scores.map((p, i) => (
            <div key={p.id} className="gameover-row" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="gameover-rank">{p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : t(lang, 'rank', p.rank)}</span>
              <span className="gameover-avatar">{p.avatar}</span>
              <span className="gameover-name">
                {p.name}
                {p.id === state.playerId && (
                  <span style={{ color: 'var(--cyan)', fontSize: '0.7rem', marginInlineStart: 6 }}>{t(lang, 'you')}</span>
                )}
              </span>
              <span className="gameover-pts">{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 420 }}>
        {state.isHost && (
          <button className="btn btn-primary btn-full" onClick={() => send('restart_game', {})}>
            {t(lang, 'playAgain')}
          </button>
        )}
        <button className="btn btn-secondary btn-full" onClick={() => dispatch({ type: 'GO_HOME' })}>
          {t(lang, 'backHome')}
        </button>
        {state.isHost && !showDelete && (
          <button
            className="btn btn-secondary btn-full"
            style={{ color: 'var(--red)', borderColor: 'rgba(244,67,54,0.3)', fontSize: '0.85rem' }}
            onClick={() => setShowDelete(true)}
          >
            {t(lang, 'deleteRoom')}
          </button>
        )}
        {state.isHost && showDelete && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {hasPassword && (
              <input
                className="input"
                style={{ flex: 1, fontSize: '0.9rem' }}
                placeholder={t(lang, 'enterPasswordToDelete')}
                type="password"
                value={deletePw}
                onChange={e => setDeletePw(e.target.value)}
                autoFocus
              />
            )}
            <button
              className="btn btn-full"
              style={{ background: 'var(--red)', color: '#fff', flex: hasPassword ? 0 : 1 }}
              onClick={() => { send('delete_room', { password: deletePw }); setShowDelete(false) }}
            >
              {t(lang, 'confirmDelete')}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowDelete(false); setDeletePw('') }}>
              {t(lang, 'cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
