import { useEffect, useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

const CARD_COLORS = ['#E91E8C','#2196F3','#FF9800','#4CAF50','#9C27B0','#00BCD4','#F44336','#827717']

function ScoreCard({ a, i, lang }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), i * 350)
    return () => clearTimeout(timer)
  }, [i])

  const medals = ['', '🥉', '🥈', '🥇']
  const totalNonReal = 4 // max medals we show
  const medalIdx = Math.max(0, Math.min(3, i - (totalNonReal - 4)))
  const color = CARD_COLORS[i % CARD_COLORS.length]
  const voters = a.voters || []
  const funnyVoters = a.funny_voters || []

  if (!visible) return <div style={{ height: 90 }} />

  return (
    <div
      className={`scoring-answer-card ${a.is_real ? 'correct-answer' : ''}`}
      style={{
        borderColor: a.is_real ? 'var(--green)' : color,
        background: a.is_real
          ? 'linear-gradient(135deg,rgba(46,125,50,0.3) 0%,rgba(76,175,80,0.1) 100%)'
          : `${color}18`,
      }}
    >
      {medals[medalIdx] && (
        <span className="scoring-rank-badge">{medals[medalIdx]}</span>
      )}

      <div className="scoring-answer-text">{a.text}</div>

      <div className="scoring-answer-meta">
        {a.is_real ? (
          <span className="scoring-correct-label">{t(lang, 'correctAnswerLabel')}</span>
        ) : (
          a.author && <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{a.author}</span>
        )}

        {voters.length > 0 && (
          <span className="scoring-votes">{t(lang, 'votes', voters.length)}</span>
        )}

        {!a.is_real && voters.length > 0 && (
          <span className="scoring-points">{t(lang, 'fooledPts', voters.length * 150)}</span>
        )}

        {a.is_real && voters.length > 0 && (
          <span className="scoring-points">{t(lang, 'correctPts', voters.length * 500)}</span>
        )}

        {funnyVoters.length > 0 && (
          <span className="scoring-funny">{t(lang, 'funny', funnyVoters.length)}</span>
        )}
      </div>

      {voters.length > 0 && (
        <div className="reveal-card-voters" style={{ marginTop: 8 }}>
          {voters.map((v, vi) => (
            <div key={vi} className="voter-chip">
              <span>{v.avatar}</span>
              <span>{v.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RevealScoringScreen({ state }) {
  const data = state.revealScoringData
  const lang = state.lang
  if (!data) return null

  const answers = data.answers || []
  const myPts = (data.player_points || {})[state.playerId] || 0

  return (
    <div className="screen reveal-screen">
      <div className="reveal-header">
        <div className="reveal-sentence">"{data.sentence}"</div>
        <div className="reveal-title">
          {t(lang, 'theVerdict')}
          {state.isWarmup && <span className="warmup-badge" style={{ marginInlineStart: 8 }}>{t(lang, 'warmup')}</span>}
        </div>
        {myPts > 0 && !state.isDisplay && !state.isWarmup && (
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,193,7,0.2)',
            border: '1px solid rgba(255,193,7,0.4)',
            borderRadius: 100,
            padding: '4px 14px',
            color: 'var(--yellow)',
            fontSize: '0.85rem',
            fontWeight: 900,
            marginTop: 8,
            animation: 'popIn 0.5s ease',
          }}>
            {t(lang, 'youEarned', myPts)}
          </div>
        )}
      </div>

      <div className="scoring-podium">
        {answers.map((a, i) => (
          <ScoreCard key={a.id} a={a} i={i} lang={lang} />
        ))}
      </div>

      {(state.isHost || state.isDisplay) && (
        <div className="reveal-footer">
          <button className="btn btn-primary btn-full" onClick={() => send('host_advance', {})}>
            {t(lang, 'seeScoreboard')}
          </button>
        </div>
      )}
    </div>
  )
}
