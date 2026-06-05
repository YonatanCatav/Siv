import { useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

function renderSentence(sentence) {
  const parts = sentence.split('___')
  if (parts.length === 1) return <span>{sentence}</span>
  return (
    <>
      {parts[0]}
      <span className="sentence-blank">___</span>
      {parts[1]}
    </>
  )
}

export default function AnswerScreen({ state, dispatch }) {
  const [text, setText] = useState('')
  const submitted = !!state.myAnswer
  const lang = state.lang

  const q = state.question
  const { n, total } = state.timer
  const { answered, total: totalPlayers } = state.answerProgress
  const pct = total > 0 ? n / total : 0

  const timerColor = pct > 0.5 ? 'var(--green)'
    : pct > 0.25 ? 'var(--yellow)'
    : 'var(--red)'

  function submitAnswer(e) {
    e.preventDefault()
    const tx = text.trim()
    if (!tx || submitted) return
    send('submit_answer', { text: tx })
    dispatch({ type: 'MY_ANSWER', text: tx })
  }

  if (!q) return null

  return (
    <div className="screen answer-screen">
      <div className="question-header">
        <div className="question-progress">
          <span>
            {t(lang, 'questionOf', state.questionNum, state.questionTotal)}
            {state.isWarmup && <span className="warmup-badge">{t(lang, 'warmup')}</span>}
          </span>
          <span
            className={pct < 0.25 ? 'timer-urgent' : ''}
            style={{ color: timerColor, fontWeight: 900, fontSize: '1rem' }}
          >{n}s</span>
        </div>
        <div className="timer-bar-wrap">
          <div
            className={`timer-bar${pct < 0.25 ? ' urgent' : ''}`}
            style={{ width: `${pct * 100}%`, background: timerColor }}
          />
        </div>
      </div>

      <div className="question-body">
        <div className="sentence-display">
          {renderSentence(q.sentence)}
        </div>

        <div className="answer-input-area">
          {state.isDisplay ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 700 }}>
              {t(lang, 'watchingDisplay')}
            </div>
          ) : !submitted ? (
            <form onSubmit={submitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input"
                style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                placeholder={t(lang, 'typeAnswer')}
                value={text}
                onChange={e => setText(e.target.value.slice(0, 100))}
                autoFocus
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={!text.trim()}
              >
                {t(lang, 'submitAnswer')}
              </button>
            </form>
          ) : (
            <div className="answered-badge">
              {t(lang, 'answerLocked', state.myAnswer)}
            </div>
          )}

          {totalPlayers > 0 && (
            <div className="answer-prog">
              <span>{t(lang, 'answered', answered, totalPlayers)}</span>
              <div className="prog-dots">
                {Array.from({ length: totalPlayers }, (_, i) => (
                  <div key={i} className={`prog-dot ${i < answered ? 'filled' : ''}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
