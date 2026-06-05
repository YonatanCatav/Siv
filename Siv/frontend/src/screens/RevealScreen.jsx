import { useState, useEffect, useMemo, useRef } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

const COLORS = ['#E91E8C','#2196F3','#FF9800','#9C27B0','#00BCD4','#F44336','#FF5722','#827717']

function RevealCard({ ans, colorIdx, lang, isWarmup }) {
  const ref = useRef(null)
  const isReal = ans.is_real
  const isUnpicked = !isReal && ans.vote_count === 0
  const color = isReal ? 'var(--green)' : COLORS[colorIdx % COLORS.length]

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <div
      ref={ref}
      className={`rcv2 ${isReal ? 'rcv2-real' : ''} ${isUnpicked ? 'rcv2-unpicked' : ''}`}
      style={{ '--cc': color, borderColor: color }}
    >
      <div className="rcv2-top">
        <div className="rcv2-label" style={{ color }}>
          {isReal
            ? `✅ ${t(lang, 'correctAnswerLabel')}`
            : isUnpicked
              ? `👻 ${t(lang, 'nobodyPicked')}`
              : `🗳️ ${ans.vote_count}`}
        </div>
        {ans.funny_count > 0 && (
          <div className="rcv2-funny-badge">😂 ×{ans.funny_count}</div>
        )}
      </div>

      <div className="rcv2-text">{ans.text}</div>

      {ans.author && (
        <div className="rcv2-author">
          <span>{ans.author.avatar}</span>
          <span className="rcv2-author-name">{ans.author.name}</span>
          {!isWarmup && ans.vote_count > 0 && (
            <span className="rcv2-pts">+{ans.vote_count * 150}</span>
          )}
        </div>
      )}

      {(ans.voters || []).length > 0 && (
        <div className="rcv2-voters">
          {(ans.voters || []).map((v, i) => (
            <span key={i} className="rcv2-voter-chip">
              <span>{v.avatar}</span>
              <span className="rcv2-voter-name">{v.name}</span>
            </span>
          ))}
        </div>
      )}

      {(ans.funny_voters || []).length > 0 && (
        <div className="rcv2-voters rcv2-funny-voters">
          {(ans.funny_voters || []).map((v, i) => (
            <span key={i} className="rcv2-voter-chip rcv2-fv-chip">
              😂 <span>{v.avatar}</span>
              <span className="rcv2-voter-name">{v.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RevealScreen({ state }) {
  const data = state.revealData
  const lang = state.lang
  const [shownCount, setShownCount] = useState(0)
  const bottomRef = useRef(null)

  const sequence = useMemo(() => {
    if (!data?.answers) return []
    const unpicked = data.answers.filter(a => !a.is_real && a.vote_count === 0)
    const picked = data.answers
      .filter(a => !a.is_real && a.vote_count > 0)
      .sort((a, b) => a.vote_count - b.vote_count)
    const real = data.answers.find(a => a.is_real)
    return [...unpicked, ...picked, ...(real ? [real] : [])]
  }, [data])

  useEffect(() => {
    if (!data || shownCount >= sequence.length) return
    const prev = shownCount > 0 ? sequence[shownCount - 1] : null
    const next = sequence[shownCount]

    let delay
    if (shownCount === 0) {
      delay = 900
    } else if (prev && !prev.is_real && prev.vote_count === 0) {
      delay = 650
    } else if (next?.is_real) {
      delay = 3200
    } else {
      delay = 1900
    }

    const timer = setTimeout(() => setShownCount(n => n + 1), delay)
    return () => clearTimeout(timer)
  }, [shownCount, sequence, data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [shownCount])

  if (!data) return null

  const done = shownCount >= sequence.length && sequence.length > 0
  const myPts = (data.player_points || {})[state.playerId] || 0

  // Map non-real answers to stable color indices (skip is_real)
  let colorIdx = 0
  const colorMap = {}
  sequence.forEach(a => {
    if (!a.is_real) colorMap[a.id] = colorIdx++
  })

  return (
    <div className="screen reveal-single-screen">
      <div className="reveal-single-header">
        <div className="reveal-sentence">"{data.sentence}"</div>
        <div className="reveal-title">
          {t(lang, 'theVerdict')}
          {state.isWarmup && (
            <span className="warmup-badge" style={{ marginInlineStart: 8 }}>{t(lang, 'warmup')}</span>
          )}
        </div>
      </div>

      <div className="reveal-cards-list">
        {sequence.slice(0, shownCount).map((ans) => (
          <RevealCard
            key={ans.id}
            ans={ans}
            colorIdx={colorMap[ans.id] ?? 0}
            lang={lang}
            isWarmup={state.isWarmup}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {done && myPts > 0 && !state.isDisplay && !state.isWarmup && (
        <div className="reveal-my-pts">{t(lang, 'youEarned', myPts)}</div>
      )}

      {state.isHost && done && (
        <div className="reveal-advance-bar">
          <button
            className="btn btn-primary btn-full"
            onClick={() => send('host_advance', {})}
          >
            {t(lang, 'seeScoreboard')}
          </button>
        </div>
      )}
    </div>
  )
}
