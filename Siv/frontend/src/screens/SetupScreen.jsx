import { useState } from 'react'
import { send } from '../socket.js'
import { t } from '../i18n.js'

const SIV_BUNDLE = [
  'סיון נהגה לשמור על ___ כשהייתה בת 11',
  'לפני כמה שנים סיון ___ ושברה את היד',
  'סיון ___ כשלמדה בבאר שבע',
  'לסיון יש ___ בבית, ואין את זה כמעט באף בית בעולם',
  'כדי להתאמן על לקעקע, סיון הייתה צריכה ___',
  'אחת לשבוע יש לה אימון ___ שבו הם מתאמנים יחד',
  'סיון הכירה את תאם ___ ממש באופן ספונטני',
  'לסיון יש ___ למקרה והמדינה תלך לאבדון',
  'המאלף של קוקו ___ מה שהופך את ההתמדה באילוף לפשוטה',
  'המאכל שסיון הכי שונאת הוא ___',
  'הguilty pleasure של סיון הוא ___',
  'השיעור הכי חשוב שסיון למדה מתאם הוא ש___',
  'אם לסיון היה כח על זה היה בוודאי ___',
  'תאם אוהב שסיון ___, במיוחד בסופי שבוע',
]

function ShareLink({ room, lang }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/?room=${room.code}`

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="share-link-row">
      {room.room_name && <div className="share-room-name">{room.room_name}</div>}
      <div className="share-link-box">
        <span className="share-link-label">{t(lang, 'shareLink')}</span>
        <span className="share-link-url" dir="ltr">{link}</span>
        <button className={`share-link-copy ${copied ? 'copied' : ''}`} onClick={copy}>
          {copied ? t(lang, 'linkCopied') : t(lang, 'copyLink')}
        </button>
      </div>
    </div>
  )
}

export default function SetupScreen({ state }) {
  const [tab, setTab] = useState('questions')
  const [sentence, setSentence] = useState('')
  const [answer, setAnswer] = useState('')
  const [qTime, setQTime] = useState(60)
  const [qVoteTime, setQVoteTime] = useState(null)
  const [editId, setEditId] = useState(null)
  const [isWarmup, setIsWarmup] = useState(false)
  const [playerAnswerId, setPlayerAnswerId] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [showBundle, setShowBundle] = useState(false)
  const [bundleAnswers, setBundleAnswers] = useState(() => SIV_BUNDLE.map(() => ''))
  const lang = state.lang

  const room = state.room
  if (!room) return null

  const players = room.players || []
  const questions = room.questions || []
  const settings = room.settings || {}
  const canStart = questions.length > 0

  function addOrUpdate(e) {
    e.preventDefault()
    const s = sentence.trim()
    const a = answer.trim()
    if (!s || !a) return
    if (editId) {
      send('update_question', { id: editId, sentence: s, answer: a, time_limit: qTime, vote_time: qVoteTime, is_warmup: isWarmup, player_answer_id: playerAnswerId || null })
      setEditId(null)
    } else {
      send('add_question', { sentence: s, answer: a, time_limit: qTime, vote_time: qVoteTime, is_warmup: isWarmup, player_answer_id: playerAnswerId || null })
    }
    setSentence('')
    setAnswer('')
    setQTime(60)
    setQVoteTime(null)
    setIsWarmup(false)
    setPlayerAnswerId(null)
  }

  function startEdit(q) {
    setEditId(q.id)
    setSentence(q.sentence)
    setAnswer(q.answer)
    setQTime(q.time_limit)
    setQVoteTime(q.vote_time ?? null)
    setIsWarmup(!!q.is_warmup)
    setPlayerAnswerId(q.player_answer_id || null)
    setTab('questions')
    setShowBundle(false)
  }

  function cancelEdit() {
    setEditId(null)
    setSentence('')
    setAnswer('')
    setQTime(60)
    setQVoteTime(null)
    setIsWarmup(false)
    setPlayerAnswerId(null)
  }

  function toggleSetting(key) {
    send('update_settings', { settings: { [key]: !settings[key] } })
  }

  function setTimeSetting(key, delta) {
    const val = Math.max(10, Math.min(120, (settings[key] || 60) + delta))
    send('update_settings', { settings: { [key]: val } })
  }

  function importBundle() {
    const qs = SIV_BUNDLE.map((sentence, i) => ({ sentence, answer: bundleAnswers[i].trim() }))
      .filter(q => q.answer)
    if (!qs.length) return
    send('batch_questions', { questions: qs })
    setShowBundle(false)
    setBundleAnswers(SIV_BUNDLE.map(() => ''))
  }

  return (
    <div className="screen setup">
      <div className="topbar">
        <span className="topbar-logo">SIV</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {room.is_public && (
            <span className="public-indicator" title={t(lang, 'publicRoom')}>🌐</span>
          )}
          {room.has_password && (
            <span className="public-indicator" title={t(lang, 'roomPassword')}>🔑</span>
          )}
          <button
            className={`display-mode-btn ${state.isDisplay ? 'active' : ''}`}
            onClick={() => send('set_display', { display: !state.isDisplay })}
          >
            {t(lang, 'displayMode')} {state.isDisplay ? '✓' : '○'}
          </button>
          <span className="topbar-code" dir="ltr">{room.code}</span>
        </div>
      </div>

      {state.isDisplay && (
        <div style={{ padding: '6px 20px', background: 'rgba(255,193,7,0.1)', borderBottom: '1px solid rgba(255,193,7,0.2)', fontSize: '0.78rem', color: 'var(--yellow)', fontWeight: 700, textAlign: 'center' }}>
          {t(lang, 'hostSub')}
        </div>
      )}

      <ShareLink room={room} lang={lang} />

      <div className="setup-tabs">
        <button className={`setup-tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
          📝 {t(lang, 'questions')} ({questions.length})
        </button>
        <button className={`setup-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          ⚙️ {t(lang, 'settings')}
        </button>
        <button className={`setup-tab ${tab === 'players' ? 'active' : ''}`} onClick={() => setTab('players')}>
          👥 {t(lang, 'players')} ({players.length})
        </button>
      </div>

      <div className="setup-body">
        {tab === 'questions' && (
          <>
            {!showBundle ? (
              <>
                <div className="q-add-form">
                  <div>
                    <label>{editId ? t(lang, 'editQuestion') : t(lang, 'addQuestion')}</label>
                    <textarea
                      placeholder={t(lang, 'sentencePlaceholder')}
                      value={sentence}
                      onChange={e => setSentence(e.target.value)}
                    />
                    <div className="q-hint">{t(lang, 'useBlank')}</div>
                  </div>
                  <div>
                    <label>{t(lang, 'correctAnswer')}</label>
                    <input
                      className="input"
                      placeholder={t(lang, 'answerPlaceholder')}
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ margin: 0, flex: 1 }}>{t(lang, 'timeLabel', qTime)}</label>
                    <div className="time-picker">
                      <button className="time-btn" onClick={() => setQTime(t2 => Math.max(10, t2 - 10))} type="button">−</button>
                      <button className="time-btn" onClick={() => setQTime(t2 => Math.min(120, t2 + 10))} type="button">+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ margin: 0, flex: 1 }}>
                      {t(lang, 'voteTimeLabelQ', qVoteTime ?? settings.vote_time)}
                      {qVoteTime === null && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginInlineStart: 4 }}>
                          ({t(lang, 'globalDefault')})
                        </span>
                      )}
                    </label>
                    <div className="time-picker">
                      {qVoteTime !== null && (
                        <button
                          className="time-btn"
                          style={{ fontSize: '0.7rem', padding: '0 6px' }}
                          onClick={() => setQVoteTime(null)}
                          type="button"
                          title={t(lang, 'resetToGlobal')}
                        >↺</button>
                      )}
                      <button className="time-btn" onClick={() => setQVoteTime(v => Math.max(10, (v ?? settings.vote_time) - 5))} type="button">−</button>
                      <button className="time-btn" onClick={() => setQVoteTime(v => Math.min(120, (v ?? settings.vote_time) + 5))} type="button">+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label className="warmup-toggle-label">
                      <input
                        type="checkbox"
                        checked={isWarmup}
                        onChange={e => setIsWarmup(e.target.checked)}
                        style={{ marginInlineEnd: 6 }}
                      />
                      {t(lang, 'warmupQuestion')}
                    </label>
                    {isWarmup && (
                      <span className="warmup-badge">{t(lang, 'noPoints')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="warmup-toggle-label">
                      <input
                        type="checkbox"
                        checked={!!playerAnswerId}
                        onChange={e => setPlayerAnswerId(e.target.checked ? (players.find(p => !p.is_host)?.id || null) : null)}
                        style={{ marginInlineEnd: 6 }}
                      />
                      🎤 {t(lang, 'playerAnswerMode')}
                    </label>
                    {!!playerAnswerId && (
                      <select
                        className="input"
                        value={playerAnswerId || ''}
                        onChange={e => setPlayerAnswerId(e.target.value || null)}
                        style={{ fontSize: '0.9rem' }}
                      >
                        <option value="">{t(lang, 'selectPlayer')}</option>
                        {players.filter(p => !p.is_host).map(p => (
                          <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-full" onClick={addOrUpdate} disabled={!sentence.trim() || !answer.trim()}>
                      {editId ? t(lang, 'saveChanges') : t(lang, 'addQuestionBtn')}
                    </button>
                    {editId && (
                      <button className="btn btn-secondary" onClick={cancelEdit}>{t(lang, 'cancel')}</button>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary btn-full btn-sm"
                    style={{ marginTop: -4 }}
                    onClick={() => setShowBundle(true)}
                  >
                    📦 {t(lang, 'loadBundle')}
                  </button>
                </div>

                {questions.length > 0 ? (
                  <div className="q-list">
                    <div className="section-title">{t(lang, 'playersJoined', questions.length).replace('שחקנים', 'שאלות').replace('players', 'questions')}</div>
                    {questions.map((q, i) => (
                      <div key={q.id} className="q-item">
                        <div className="q-item-num">{i + 1}</div>
                        <div className="q-item-content">
                          <div className="q-item-sentence">{q.sentence}</div>
                          <div className="q-item-answer">
                            ✅ {q.answer} · ⏱️ {q.time_limit}s
                            {q.vote_time != null && <span>· 🗳️ {q.vote_time}s</span>}
                            {q.is_warmup && <span className="warmup-badge">{t(lang, 'warmup')}</span>}
                            {q.player_answer_id && (() => {
                              const p = players.find(pl => pl.id === q.player_answer_id)
                              return p ? <span className="warmup-badge" style={{ background: 'rgba(233,30,140,0.12)', color: '#E91E8C', borderColor: 'rgba(233,30,140,0.3)' }}>🎤 {p.name}</span> : null
                            })()}
                          </div>
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={() => startEdit(q)} style={{ padding: '6px 10px' }}>✏️</button>
                        <button className="q-item-del" onClick={() => send('remove_question', { id: q.id })}>✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <div style={{ whiteSpace: 'pre-line' }}>{t(lang, 'noQuestions')}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="bundle-import">
                <div className="bundle-import-header">
                  <span>📦 {t(lang, 'bundleImportTitle')}</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowBundle(false)}>{t(lang, 'cancel')}</button>
                </div>
                <div className="bundle-import-list">
                  {SIV_BUNDLE.map((sent, i) => (
                    <div key={i} className="bundle-row">
                      <div className="bundle-sentence" dir="rtl">{sent}</div>
                      <input
                        className="input bundle-answer-input"
                        placeholder="תשובה..."
                        value={bundleAnswers[i]}
                        onChange={e => setBundleAnswers(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        dir="rtl"
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary btn-full"
                  onClick={importBundle}
                  disabled={!bundleAnswers.some(a => a.trim())}
                >
                  {t(lang, 'bundleImportBtn')} ({bundleAnswers.filter(a => a.trim()).length}/{SIV_BUNDLE.length})
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'settings' && (
          <div className="settings-group">
            <div className="setting-row">
              <div>
                <div className="setting-label">{t(lang, 'answerTime')}</div>
                <div className="setting-sub">{t(lang, 'answerTimeDesc')}</div>
              </div>
              <div className="time-picker">
                <button className="time-btn" onClick={() => setTimeSetting('answer_time', -10)}>−</button>
                <span className="time-val">{settings.answer_time}s</span>
                <button className="time-btn" onClick={() => setTimeSetting('answer_time', 10)}>+</button>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">{t(lang, 'voteTime')}</div>
                <div className="setting-sub">{t(lang, 'voteTimeDesc')}</div>
              </div>
              <div className="time-picker">
                <button className="time-btn" onClick={() => setTimeSetting('vote_time', -5)}>−</button>
                <span className="time-val">{settings.vote_time}s</span>
                <button className="time-btn" onClick={() => setTimeSetting('vote_time', 5)}>+</button>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">{t(lang, 'funnyVotes')}</div>
                <div className="setting-sub">{t(lang, 'funnyVotesDesc')}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={!!settings.funny_enabled} onChange={() => toggleSetting('funny_enabled')} />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">{t(lang, 'streakBonus')}</div>
                <div className="setting-sub">{t(lang, 'streakBonusDesc')}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={!!settings.streak_bonus} onChange={() => toggleSetting('streak_bonus')} />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">{t(lang, 'showIntro')}</div>
                <div className="setting-sub">{t(lang, 'showIntroDesc')}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={settings.show_intro !== false} onChange={() => toggleSetting('show_intro')} />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div>
                <div className="setting-label">🌐 {t(lang, 'publicRoom')}</div>
                <div className="setting-sub">{t(lang, 'publicRoomDesc')}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={!!room.is_public} onChange={() => send('toggle_public', {})} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        )}

        {tab === 'players' && (
          <div>
            <div className="section-title">{t(lang, 'playersJoined', players.length)}</div>
            <div className="setup-players">
              {players.map(p => (
                <div key={p.id} className="mini-player">
                  <span>{p.avatar}</span>
                  <span>{p.name}</span>
                  {p.is_host && <span style={{ color: 'var(--yellow)', fontSize: '0.7rem' }}>👑</span>}
                  {p.id === state.playerId && <span style={{ color: 'var(--cyan)', fontSize: '0.65rem' }}>{t(lang, 'you')}</span>}
                  {!p.is_host && p.id !== state.playerId && (
                    <button
                      className="mini-player-kick"
                      onClick={() => send('kick_player', { player_id: p.id })}
                      title={t(lang, 'kickPlayer')}
                    >✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="setup-footer">
        <button
          className="btn btn-green btn-full btn-lg"
          disabled={!canStart}
          onClick={() => send('start_game', {})}
        >
          {canStart ? t(lang, 'startGame', questions.length) : t(lang, 'addQuestionsToStart')}
        </button>
        {!showDelete ? (
          <button className="btn btn-secondary btn-full" style={{ color: 'var(--red)', borderColor: 'rgba(244,67,54,0.3)' }} onClick={() => setShowDelete(true)}>
            {t(lang, 'deleteRoom')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {room.has_password && (
              <input
                className="input"
                style={{ flex: 1, fontSize: '0.9rem' }}
                placeholder={t(lang, 'enterPasswordToDelete')}
                type="password"
                value={deletePw}
                onChange={e => setDeletePw(e.target.value)}
                autoFocus
              />
            )}
            <button
              className="btn btn-full"
              style={{ background: 'var(--red)', color: '#fff', flex: room.has_password ? 0 : 1 }}
              onClick={() => { send('delete_room', { password: deletePw }); setShowDelete(false) }}
            >
              {t(lang, 'confirmDelete')}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowDelete(false); setDeletePw('') }}>
              {t(lang, 'cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
