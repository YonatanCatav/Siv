import { useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

const AVATARS = ['🦊','🐼','🦄','🐸','🦁','🐯','🦋','🐬','🦝','🐺',
                 '🦔','🐙','🦀','🦜','🐻','🦑','🐲','🦩','🦉','🐨']

export default function NameScreen({ state, dispatch }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)])
  const [customCode, setCustomCode] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [password, setPassword] = useState('')
  const lang = state.lang

  function submit(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (state.isCreating) {
      send('create_room', { name: n, avatar, code: customCode.trim().toUpperCase(), is_public: isPublic, password: password.trim() })
    } else {
      send('join_room', { code: state.pendingCode, name: n, avatar })
    }
  }

  const title = state.isCreating
    ? t(lang, 'createYourRoom')
    : t(lang, 'joinRoom2', state.pendingCode)

  return (
    <div className="screen name-screen">
      <div className="card name-card">
        <div className="name-title">{title}</div>
        <div className="name-sub">{t(lang, 'pickNameAvatar')}</div>

        <div className="avatar-grid">
          {AVATARS.map(a => (
            <button
              key={a}
              className={`avatar-btn ${avatar === a ? 'selected' : ''}`}
              onClick={() => setAvatar(a)}
              type="button"
            >
              {a}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="input"
            placeholder={t(lang, 'namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            autoFocus
            autoComplete="off"
          />
          {state.isCreating && (
            <>
              <input
                className="input"
                placeholder={t(lang, 'customCodePlaceholder')}
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                autoComplete="off"
                dir="ltr"
                style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.12em' }}
              />
              <input
                className="input"
                placeholder={t(lang, 'roomPasswordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value.slice(0, 30))}
                autoComplete="off"
                type="password"
              />
              <label className="public-room-toggle">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                />
                <span className="public-toggle-text">
                  🌐 {t(lang, 'publicRoom')}
                </span>
                {isPublic && <span className="public-badge">{t(lang, 'visibleToAll')}</span>}
              </label>
            </>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={!name.trim()}
          >
            {avatar} {state.isCreating ? t(lang, 'createRoomBtn') : t(lang, 'joinGameBtn')}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-full btn-sm"
            onClick={() => dispatch({ type: 'GO_HOME' })}
          >
            {t(lang, 'back')}
          </button>
        </form>
      </div>
    </div>
  )
}
