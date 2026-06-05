import { useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

const CARD_COLORS = ['#E91E8C','#2196F3','#FF9800','#4CAF50','#9C27B0','#00BCD4','#F44336','#827717']

export default function VotingScreen({ state }) {
  const [vote, setVote] = useState(null)
  const [funny, setFunny] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const lang = state.lang

  const data = state.votingData
  const funnyCounts = state.funnyCounts || {}
  const { n, total } = state.timer
  const { voted, total: totalPlayers } = state.voteProgress
  const pct = total > 0 ? n / total : 0

  const timerColor = pct > 0.5 ? 'var(--green)' : pct > 0.25 ? 'var(--yellow)' : 'var(--red)'

  function submitVote() {
    if (!vote || submitted) return
    send('submit_vote', { answer_id: vote, funny_ids: funny.size > 0 ? [...funny] : undefined })
    setSubmitted(true)
  }

  function toggleFunny(e, id) {
    e.stopPropagation()
    setFunny(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!data) return null

  const sentence = data.sentence?.replace('___', '___ ')?.trim()

  return (
    <div className="screen voting-screen">
      <div className="question-header" style={{ padding: '12px 20px 8px' }}>
        <div className="question-progress">
          <span>
            {t(lang, 'questionOf', state.questionNum, state.questionTotal)}
            {state.isWarmup && <span className="warmup-badge">{t(lang, 'warmup')}</span>}
          </span>
          <span
            className={pct < 0.25 ? 'timer-urgent' : ''}
            style={{ color: timerColor, fontWeight: 900 }}
          >{n}s</span>
        </div>
        <div className="timer-bar-wrap">
          <div className={`timer-bar${pct < 0.25 ? ' urgent' : ''}`} style={{ width: `${pct * 100}%`, background: timerColor }} />
        </div>
      </div>

      <div className="voting-sentence">
        {t(lang, 'whichCompletes', data.sentence)}
      </div>
      <div className="voting-sub">
        {t(lang, 'tapToVote')}
        {totalPlayers > 0 && ` · ${t(lang, 'voted', voted, totalPlayers)}`}
      </div>

      <div className="answers-grid">
        {(data.answers || []).map((ans, i) => {
          const color = CARD_COLORS[i % CARD_COLORS.length]
          const isVoted = vote === ans.id
          const isFunny = funny.has(ans.id)

          return (
            <div
              key={ans.id}
              className={`answer-card ${isVoted ? 'selected' : ''} ${submitted && !isVoted ? 'dimmed' : ''}`}
              style={{
                background: submitted
                  ? (isVoted ? `${color}cc` : 'var(--surface)')
                  : `${color}22`,
                borderColor: isVoted ? color : 'transparent',
                boxShadow: isVoted ? `0 0 20px ${color}66` : undefined,
              }}
              onClick={() => !submitted && setVote(ans.id)}
            >
              <div className="answer-card-icon" style={{ color: submitted ? '#fff' : color }}>
                {isVoted ? '✓' : ['●','▲','■','◆'][i % 4]}
              </div>
              <div className="answer-card-text">{ans.text}</div>
              {state.room?.settings?.funny_enabled && (
                <button
                  className={`funny-btn ${isFunny ? 'active' : ''}`}
                  onClick={e => !submitted && toggleFunny(e, ans.id)}
                  title="Funny!"
                  disabled={submitted}
                >
                  😂{funnyCounts[ans.id] > 0 && (
                    <span className="funny-count">{funnyCounts[ans.id]}</span>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="vote-submit-bar">
        {state.isDisplay ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 700, padding: '8px' }}>
            {t(lang, 'watchingDisplay')}
          </div>
        ) : submitted ? (
          <div className="voted-confirmation">
            {t(lang, 'voteLocked')}
            {funny.size > 0 && <span style={{ marginLeft: 8 }}>{t(lang, 'funnyVoteGiven')}</span>}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-full"
            disabled={!vote}
            onClick={submitVote}
          >
            {vote ? t(lang, 'lockVote') : t(lang, 'tapToVotePrompt')}
          </button>
        )}
      </div>
    </div>
  )
}
