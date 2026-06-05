import { useState, useEffect } from 'react'
import { t } from '../i18n.js'

export default function HomeScreen({ state, dispatch }) {
  const [showJoin, setShowJoin] = useState(false)
  const [code, setCode] = useState('')
  const [rooms, setRooms] = useState(null)
  const [deletingCode, setDeletingCode] = useState(null)
  const [deletePw, setDeletePw] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const lang = state.lang

  const base = import.meta.env.VITE_BACKEND_URL || ''

  useEffect(() => {
    if (!showJoin) return
    fetch(`${base}/rooms`)
      .then(r => r.json())
      .then(setRooms)
      .catch(() => setRooms([]))
  }, [showJoin])

  function handleJoin(e) {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (c.length < 2) return
    dispatch({ type: 'GO_JOIN', code: c })
  }

  function pickRoom(roomCode) {
    dispatch({ type: 'GO_JOIN', code: roomCode })
  }

  function startDelete(roomCode) {
    setDeletingCode(roomCode)
    setDeletePw('')
    setDeleteError('')
  }

  async function confirmDelete(roomCode, needsPassword) {
    try {
      const url = needsPassword
        ? `${base}/rooms/${roomCode}?password=${encodeURIComponent(deletePw)}`
        : `${base}/rooms/${roomCode}`
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        setDeleteError(data.error)
        return
      }
      setDeletingCode(null)
      setRooms(prev => prev ? prev.filter(r => r.code !== roomCode) : prev)
    } catch {
      setDeleteError('Error')
    }
  }

  return (
    <div className="screen home">
      <div className="home-bg">
        <div className="home-blob" />
        <div className="home-blob" />
        <div className="home-blob" />
      </div>

      <div className="home-content">
        <div className="home-logo">
          <div className="home-title">SIV</div>
          <div className="home-subtitle">{t(lang, 'subtitle')}</div>
        </div>

        {!showJoin ? (
          <div className="home-actions">
            <button
              className="btn btn-primary btn-lg btn-full home-btn-create"
              onClick={() => dispatch({ type: 'GO_CREATE' })}
            >
              {t(lang, 'createRoom')}
            </button>
            <button
              className="btn btn-secondary btn-lg btn-full home-btn-join"
              onClick={() => setShowJoin(true)}
            >
              {t(lang, 'joinRoom')}
            </button>
          </div>
        ) : (
          <div className="home-join-panel">
            {rooms === null ? (
              <div className="rooms-loading">{t(lang, 'loadingRooms')}</div>
            ) : rooms.length > 0 ? (
              <div className="rooms-list">
                <div className="rooms-list-title">{t(lang, 'availableRooms')}</div>
                {rooms.map(r => {
                  const phaseLabel = r.phase === 'LOBBY'
                    ? null
                    : r.phase === 'GAME_OVER'
                      ? t(lang, 'roomPhaseOver')
                      : t(lang, 'roomPhaseInGame')
                  const isDeleting = deletingCode === r.code
                  return (
                    <div key={r.code} className="room-entry-wrap">
                      <div className="room-entry-row">
                        <button
                          className="btn btn-secondary room-entry room-entry-join"
                          onClick={() => pickRoom(r.code)}
                        >
                          <span className="room-entry-left">
                            <span className="room-entry-code" dir="ltr">{r.code}</span>
                            {r.is_public && <span className="room-entry-public">🌐</span>}
                            {r.has_password && <span className="room-entry-lock">🔑</span>}
                          </span>
                          <span className="room-entry-right">
                            {phaseLabel && (
                              <span className="room-entry-phase">{phaseLabel}</span>
                            )}
                            <span className="room-entry-count">
                              {t(lang, 'playersJoined', r.player_count)}
                            </span>
                          </span>
                        </button>
                        {r.has_password && (
                          <button
                            className="room-entry-trash"
                            title={t(lang, 'deleteRoom')}
                            onClick={() => isDeleting ? setDeletingCode(null) : startDelete(r.code)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {isDeleting && (
                        <div className="room-delete-inline">
                          <input
                            className="input room-delete-pw-input"
                            type="password"
                            placeholder={t(lang, 'enterPasswordToDelete')}
                            value={deletePw}
                            onChange={e => { setDeletePw(e.target.value); setDeleteError('') }}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && confirmDelete(r.code, r.has_password)}
                          />
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => confirmDelete(r.code, r.has_password)}
                          >
                            {t(lang, 'confirmDelete')}
                          </button>
                          {deleteError && <span className="room-delete-error">{deleteError}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="rooms-divider">{t(lang, 'orEnterCode')}</div>
              </div>
            ) : null}

            <form className="home-join-form" onSubmit={handleJoin}>
              <input
                className="input"
                placeholder={t(lang, 'roomCodePlaceholder')}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 8))}
                autoFocus={rooms !== null && rooms.length === 0}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                dir="ltr"
                style={{ textAlign: 'center' }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={code.trim().length < 2}
              >
                {t(lang, 'letsGo')}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => { setShowJoin(false); setCode(''); setRooms(null) }}
              >
                {t(lang, 'back')}
              </button>
            </form>
          </div>
        )}

        <div style={{ color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center' }}>
          {t(lang, 'tagline')}
        </div>
      </div>
    </div>
  )
}
