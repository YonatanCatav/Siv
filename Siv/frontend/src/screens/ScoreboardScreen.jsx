import { useEffect, useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

function AnimatedScore({ target }) {
  const [val, setVal] = useState(target)
  useEffect(() => {
    const start = Math.max(0, target - 600)
    let cur = start
    const step = () => {
      cur = Math.min(target, cur + Math.ceil((target - cur) / 8) + 2)
      setVal(cur)
      if (cur < target) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target])
  return <span>{val.toLocaleString()}</span>
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function ScoreboardScreen({ state }) {
  const data = state.scoreboardData
  const lang = state.lang
  if (!data) return null

  const { scores, qLeft } = data

  return (
    <div className="screen scoreboard-screen">
      <div className="scoreboard-header">
        <div className="scoreboard-title">{t(lang, 'scoreboard')}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>
          {qLeft > 0 ? t(lang, 'questionsLeft', qLeft) : t(lang, 'lastQuestion')}
        </div>
      </div>

      <div className="scoreboard-list">
        {scores.map((p, i) => {
          const rowClass = p.rank === 1 ? 'top1' : p.rank === 2 ? 'top2' : p.rank === 3 ? 'top3' : ''
          const rankDelta = p.prev_rank === 0 ? null : p.prev_rank - p.rank
          const isMe = p.id === state.playerId

          return (
            <div
              key={p.id}
              className={`score-row ${rowClass}`}
              style={{ animationDelay: `${i * 0.08}s`, border: isMe ? '2px solid var(--cyan)' : undefined }}
            >
              <div className="score-rank">{MEDALS[p.rank] || p.rank}</div>
              <div className="score-avatar">{p.avatar}</div>
              <div className="score-info">
                <div className="score-name">
                  {p.name}
                  {isMe && <span style={{ color: 'var(--cyan)', fontSize: '0.7rem', marginInlineStart: 6 }}>{t(lang, 'you')}</span>}
                </div>
                {p.streak >= 2 && (
                  <div className="score-streak">{t(lang, 'streak', p.streak)}</div>
                )}
              </div>
              <div className="score-points"><AnimatedScore target={p.score} /></div>
              {rankDelta !== null && (
                <div className={`rank-change ${rankDelta > 0 ? 'up' : rankDelta < 0 ? 'down' : 'same'}`}>
                  {rankDelta > 0 ? `↑${rankDelta}` : rankDelta < 0 ? `↓${Math.abs(rankDelta)}` : '—'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(state.isHost || state.isDisplay) && (
        <div className="scoreboard-footer">
          <button className="btn btn-primary btn-full btn-lg" onClick={() => send('host_advance', {})}>
            {qLeft > 0 ? t(lang, 'nextQuestion') : t(lang, 'seeFinalResults')}
          </button>
        </div>
      )}
    </div>
  )
}
