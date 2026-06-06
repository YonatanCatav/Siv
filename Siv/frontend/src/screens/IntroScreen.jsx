import { useState, useEffect } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

function SentenceVisual() {
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 800)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="intro-visual">
      <div className="intro-sentence-demo">
        הדבר הכי טוב בסוף יום עבודה הוא{' '}
        <span className={`intro-blank-demo ${filled ? 'filled' : ''}`}>
          {filled ? 'לשכב על הספה' : '___'}
        </span>
      </div>
    </div>
  )
}

function CardsVisual() {
  const cards = [
    { color: '#E91E8C', text: 'לשכב על הספה' },
    { color: '#2196F3', text: 'לאכול משהו טעים' },
    { color: '#FF9800', text: 'לפתוח נטפליקס' },
  ]
  return (
    <div className="intro-visual intro-cards-demo">
      {cards.map((c, i) => (
        <div
          key={i}
          className="intro-card-item"
          style={{
            background: `${c.color}22`,
            borderColor: c.color,
            animationDelay: `${i * 0.18}s`,
          }}
        >
          <span className="intro-card-shape" style={{ color: c.color }}>
            {['●', '▲', '■'][i]}
          </span>
          {c.text}
        </div>
      ))}
    </div>
  )
}

function ScoreVisual() {
  const rows = [
    { pts: '+500', icon: '✅', label: 'תשובה נכונה', color: 'var(--green)' },
    { pts: '+150', icon: '🎭', label: 'הטעית מישהו', color: '#E91E8C' },
    { pts: '+100', icon: '😂', label: 'הצבעה מצחיקה', color: 'var(--yellow)' },
  ]
  return (
    <div className="intro-visual intro-score-demo">
      {rows.map((r, i) => (
        <div key={i} className="intro-score-row" style={{ animationDelay: `${i * 0.22}s` }}>
          <span className="intro-score-icon">{r.icon}</span>
          <span className="intro-score-label">{r.label}</span>
          <span className="intro-score-pts" style={{ color: r.color }}>{r.pts}</span>
        </div>
      ))}
    </div>
  )
}

function FunnyVisual() {
  const [voted, setVoted] = useState(false)
  return (
    <div className="intro-visual intro-funny-demo">
      <div className="intro-funny-card" style={{ background: 'rgba(233,30,140,0.12)', borderColor: '#E91E8C' }}>
        <span style={{ flex: 1, fontWeight: 700 }}>לאכול ארוחת בוקר לארוחת לילה</span>
        <button
          className={`intro-funny-btn ${voted ? 'voted' : ''}`}
          onClick={() => setVoted(v => !v)}
        >
          😂{voted ? ' ×1' : ''}
        </button>
      </div>
      {voted && (
        <div className="intro-funny-reward">+100 נקודות לכותב!</div>
      )}
    </div>
  )
}

const SLIDES = [
  { icon: '✏️', titleKey: 'introStep1Title', descKey: 'introStep1Desc', Visual: SentenceVisual },
  { icon: '🗳️', titleKey: 'introStep2Title', descKey: 'introStep2Desc', Visual: CardsVisual },
  { icon: '🏆', titleKey: 'introStep3Title', descKey: 'introStep3Desc', Visual: ScoreVisual },
  { icon: '😂', titleKey: 'introStep4Title', descKey: 'introStep4Desc', Visual: FunnyVisual },
]

export default function IntroScreen({ state }) {
  const [slideIdx, setSlideIdx] = useState(0)
  const lang = state.lang

  const slide = SLIDES[slideIdx]
  const { Visual } = slide
  const done = slideIdx >= SLIDES.length - 1

  return (
    <div className="screen intro-screen">
      <div className="intro-header">
        <div className="intro-game-name">SIV</div>
        <div className="intro-how-to">{t(lang, 'introHowToPlay')}</div>
      </div>

      <div className="intro-slide" key={slideIdx}>
        <div className="intro-slide-icon">{slide.icon}</div>
        <div className="intro-slide-title">{t(lang, slide.titleKey)}</div>
        <div className="intro-slide-desc">{t(lang, slide.descKey)}</div>
        <Visual lang={lang} />
      </div>

      <div className="intro-nav">
        <button
          className="intro-arrow"
          onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
          disabled={slideIdx === 0}
        >‹</button>
        <div className="intro-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`intro-dot ${i === slideIdx ? 'active' : ''} ${i < slideIdx ? 'past' : ''}`}
              onClick={() => setSlideIdx(i)}
            />
          ))}
        </div>
        <button
          className="intro-arrow"
          onClick={() => setSlideIdx(i => Math.min(SLIDES.length - 1, i + 1))}
          disabled={slideIdx === SLIDES.length - 1}
        >›</button>
      </div>

      <div className="intro-footer">
        {state.isHost ? (
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => send('host_advance', {})}
          >
            {done ? t(lang, 'introStartNow') : t(lang, 'introSkip')}
          </button>
        ) : (
          <div className="intro-waiting-msg">
            {t(lang, 'introWaiting')}
          </div>
        )}
      </div>
    </div>
  )
}
