import { send } from '../socket.js'
import { t } from '../i18n.js'

export default function RevealUnpickedScreen({ state }) {
  const data = state.revealUnpickedData
  const lang = state.lang
  if (!data) return null

  const answers = data.answers || []

  return (
    <div className="screen reveal-screen">
      <div className="reveal-header">
        <div className="reveal-sentence">"{data.sentence}"</div>
        <div className="reveal-title">
          {answers.length === 0
            ? t(lang, 'everyoneVoted')
            : t(lang, 'nonePickedTitle', answers.length)}
        </div>
        {answers.length > 0 && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 6 }}>
            {t(lang, 'nonePickedSub')}
          </div>
        )}
      </div>

      <div className="reveal-list">
        {answers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <div>{t(lang, 'noUnpicked')}</div>
          </div>
        ) : (
          answers.map((a, i) => (
            <div
              key={a.id}
              className="reveal-card unpicked"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="reveal-card-answer" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                {a.text}
              </div>
              {a.author && (
                <div className="reveal-card-author">{a.author}</div>
              )}
            </div>
          ))
        )}
      </div>

      {(state.isHost || state.isDisplay) && (
        <div className="reveal-footer">
          <button className="btn btn-primary btn-full" onClick={() => send('host_advance', {})}>
            {t(lang, 'nextSeeVoters')}
          </button>
        </div>
      )}
    </div>
  )
}
