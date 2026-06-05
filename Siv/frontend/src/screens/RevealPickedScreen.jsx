import { send } from '../socket.js'
import { t } from '../i18n.js'

const CARD_COLORS = ['#E91E8C','#2196F3','#FF9800','#4CAF50','#9C27B0','#00BCD4','#F44336','#827717']

export default function RevealPickedScreen({ state }) {
  const data = state.revealPickedData
  const lang = state.lang
  if (!data) return null

  const answers = data.answers || []

  return (
    <div className="screen reveal-screen">
      <div className="reveal-header">
        <div className="reveal-sentence">"{data.sentence}"</div>
        <div className="reveal-title">
          {answers.length === 0 ? '🤔' : t(lang, 'peoplePicked')}
        </div>
        {answers.length > 0 && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 6 }}>
            {t(lang, 'leastToMost')}
          </div>
        )}
      </div>

      <div className="reveal-list">
        {answers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🤷</div>
            <div>{t(lang, 'noOnePicked')}</div>
          </div>
        ) : (
          answers.map((a, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length]
            const voters = a.voters || []
            const funnyVoters = a.funny_voters || []

            return (
              <div
                key={a.id}
                className="reveal-card"
                style={{ borderColor: color, background: `${color}18`, animationDelay: `${i * 0.15}s` }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div className="reveal-card-answer">{a.text}</div>
                    {a.author && (
                      <div className="reveal-card-author">{t(lang, 'bluffedBy')} {a.author}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color }}>{voters.length}</div>
                </div>

                {voters.length > 0 && (
                  <div className="reveal-card-voters">
                    {voters.map((v, vi) => (
                      <div key={vi} className="voter-chip">
                        <span>{v.avatar}</span>
                        <span>{v.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {funnyVoters.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--orange)', fontWeight: 700 }}>
                    {t(lang, 'funnyFrom', funnyVoters.map(v => v.name).join(', '))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {(state.isHost || state.isDisplay) && (
        <div className="reveal-footer">
          <button className="btn btn-primary btn-full" onClick={() => send('host_advance', {})}>
            {t(lang, 'nextVerdict')}
          </button>
        </div>
      )}
    </div>
  )
}
