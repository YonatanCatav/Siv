import { useEffect, useReducer, useCallback } from 'react'
import { connect, send } from './socket.js'

import HomeScreen from './screens/HomeScreen.jsx'
import NameScreen from './screens/NameScreen.jsx'
import LobbyScreen from './screens/LobbyScreen.jsx'
import SetupScreen from './screens/SetupScreen.jsx'
import AnswerScreen from './screens/AnswerScreen.jsx'
import VotingScreen from './screens/VotingScreen.jsx'
import RevealScreen from './screens/RevealScreen.jsx'
import ScoreboardScreen from './screens/ScoreboardScreen.jsx'
import GameOverScreen from './screens/GameOverScreen.jsx'

const INIT = {
  connected: false,
  lang: 'he',        // default Hebrew

  // local flow
  uiScreen: 'home',
  pendingCode: '',
  isCreating: false,

  // identity
  playerId: null,
  playerName: null,
  playerAvatar: null,
  isHost: false,
  isDisplay: false,

  // server state
  room: null,        // includes .phase which drives screen routing
  question: null,
  questionNum: 1,
  questionTotal: 1,
  timer: { n: 0, total: 0 },
  answerProgress: { answered: 0, total: 0 },
  voteProgress: { voted: 0, total: 0 },
  votingData: null,
  revealData: null,
  scoreboardData: null,
  gameOverData: null,

  myAnswer: null,
  myVote: null,
  myFunnyVote: null,
  funnyCounts: {},
  isWarmup: false,
  errorMsg: null,
}

function setPhase(state, phase) {
  if (!state.room) return state
  return { ...state, room: { ...state.room, phase } }
}

function reducer(state, action) {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true, playerId: action.id }
    case 'DISCONNECTED':
      return { ...state, connected: false }

    case 'SET_LANG':
      return { ...state, lang: action.lang }

    case 'GO_CREATE':
      return { ...state, uiScreen: 'name', isCreating: true, pendingCode: '' }
    case 'GO_JOIN':
      return { ...state, uiScreen: 'name', isCreating: false, pendingCode: action.code }
    case 'GO_HOME':
      return { ...INIT, connected: state.connected, playerId: state.playerId, lang: state.lang }

    case 'ROOM_CREATED':
    case 'JOINED':
    case 'RECONNECTED': {
      const p = action.player
      return {
        ...state,
        uiScreen: 'ingame',
        isHost: p.is_host,
        isDisplay: p.is_display,
        playerName: p.name,
        playerAvatar: p.avatar,
      }
    }

    case 'ROOM_STATE': {
      const me = action.data.players.find(p => p.id === state.playerId)
      // During active game, keep client-side phase unless server phase is more advanced
      // (prevents room_state from rolling back phase set by game messages)
      const serverPhase = action.data.phase
      const clientPhase = state.room?.phase
      const PHASE_ORDER = ['LOBBY','ANSWERING','VOTING','REVEAL','SCOREBOARD','GAME_OVER']
      const serverIdx = PHASE_ORDER.indexOf(serverPhase)
      const clientIdx = PHASE_ORDER.indexOf(clientPhase)
      const finalPhase = serverIdx >= clientIdx ? serverPhase : clientPhase
      return {
        ...state,
        room: { ...action.data, phase: finalPhase },
        isHost: me?.is_host || false,
        isDisplay: me?.is_display || false,
        playerName: me?.name || state.playerName,
        playerAvatar: me?.avatar || state.playerAvatar,
      }
    }

    case 'QUESTION_START':
      return {
        ...setPhase(state, 'ANSWERING'),
        question: action.question,
        questionNum: action.num,
        questionTotal: action.total,
        isWarmup: action.is_warmup || false,
        myAnswer: null,
        myVote: null,
        myFunnyVote: null,
        answerProgress: { answered: 0, total: 0 },
        voteProgress: { voted: 0, total: 0 },
      }

    case 'TIMER':
      return { ...state, timer: { n: action.n, total: action.total } }

    case 'ANSWER_PROGRESS':
      return { ...state, answerProgress: { answered: action.answered, total: action.total } }

    case 'VOTE_PROGRESS':
      return { ...state, voteProgress: { voted: action.voted, total: action.total } }

    case 'FUNNY_UPDATE':
      return { ...state, funnyCounts: action.counts }

    case 'GAME_RESTART':
      return {
        ...state,
        room: state.room ? { ...state.room, phase: 'LOBBY' } : state.room,
        votingData: null,
        revealData: null,
        scoreboardData: null,
        gameOverData: null,
        question: null,
        myAnswer: null,
        myVote: null,
        myFunnyVote: null,
        funnyCounts: {},
        timer: { n: 0, total: 0 },
        answerProgress: { answered: 0, total: 0 },
        voteProgress: { voted: 0, total: 0 },
      }

    case 'VOTING_START':
      return {
        ...setPhase(state, 'VOTING'),
        votingData: { sentence: action.sentence, answers: action.answers },
        isWarmup: action.is_warmup || false,
        funnyCounts: {},
        timer: { n: action.time, total: action.time },
      }

    case 'REVEAL_ALL':
      return {
        ...setPhase(state, 'REVEAL'),
        revealData: action.data,
        isWarmup: action.data.is_warmup || false,
      }

    case 'SCOREBOARD':
      return {
        ...setPhase(state, 'SCOREBOARD'),
        scoreboardData: { scores: action.scores, qLeft: action.q_left },
      }

    case 'GAME_OVER':
      return {
        ...setPhase(state, 'GAME_OVER'),
        gameOverData: { scores: action.scores },
      }

    case 'MY_ANSWER':
      return { ...state, myAnswer: action.text }

    case 'MY_VOTE':
      return { ...state, myVote: action.id }

    case 'MY_FUNNY':
      return { ...state, myFunnyVote: action.id }

    case 'ERROR':
      return { ...state, errorMsg: action.msg }

    case 'CLEAR_ERROR':
      return { ...state, errorMsg: null }

    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, INIT)

  const handleMsg = useCallback((msg) => {
    switch (msg.type) {
      case 'connected':
        dispatch({ type: 'CONNECTED', id: msg.id }); break
      case 'room_created':
        dispatch({ type: 'ROOM_CREATED', player: msg.player }); break
      case 'joined':
        dispatch({ type: 'JOINED', player: msg.player }); break
      case 'reconnected':
        dispatch({ type: 'RECONNECTED', player: msg.player }); break
      case 'room_state':
        dispatch({ type: 'ROOM_STATE', data: msg }); break
      case 'question_start':
        dispatch({ type: 'QUESTION_START', question: msg.question, num: msg.num, total: msg.total, is_warmup: msg.is_warmup }); break
      case 'timer':
        dispatch({ type: 'TIMER', n: msg.n, total: msg.total }); break
      case 'answer_progress':
        dispatch({ type: 'ANSWER_PROGRESS', answered: msg.answered, total: msg.total }); break
      case 'vote_progress':
        dispatch({ type: 'VOTE_PROGRESS', voted: msg.voted, total: msg.total }); break
      case 'funny_update':
        dispatch({ type: 'FUNNY_UPDATE', counts: msg.counts }); break
      case 'game_restart':
        dispatch({ type: 'GAME_RESTART' }); break
      case 'voting_start':
        dispatch({ type: 'VOTING_START', sentence: msg.sentence, answers: msg.answers, time: msg.time, is_warmup: msg.is_warmup }); break
      case 'reveal_all':
        dispatch({ type: 'REVEAL_ALL', data: msg }); break
      case 'scoreboard':
        dispatch({ type: 'SCOREBOARD', scores: msg.scores, q_left: msg.q_left }); break
      case 'game_over':
        dispatch({ type: 'GAME_OVER', scores: msg.scores }); break
      case 'kicked':
        dispatch({ type: 'GO_HOME' }); break
      case 'error':
        dispatch({ type: 'ERROR', msg: msg.msg })
        setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 3000); break
      default: break
    }
  }, [])

  useEffect(() => {
    connect(handleMsg, () => {}, () => dispatch({ type: 'DISCONNECTED' }))
  }, [handleMsg])

  // Apply RTL/LTR to document
  useEffect(() => {
    document.documentElement.dir = state.lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = state.lang
  }, [state.lang])

  const s = state
  const phase = s.room?.phase

  let screen = s.uiScreen
  if (screen === 'ingame' && phase) {
    if (phase === 'LOBBY') screen = s.isHost ? 'setup' : 'lobby'
    else if (phase === 'ANSWERING') screen = 'answering'
    else if (phase === 'VOTING') screen = 'voting'
    else if (phase === 'REVEAL') screen = 'reveal'
    else if (phase === 'SCOREBOARD') screen = 'scoreboard'
    else if (phase === 'GAME_OVER') screen = 'game_over'
  }

  const props = { state: s, send, dispatch }

  // Language toggle button — shown on all screens
  const langBtn = (
    <button
      className="lang-toggle"
      onClick={() => dispatch({ type: 'SET_LANG', lang: s.lang === 'he' ? 'en' : 'he' })}
      title="Change language / שנה שפה"
    >
      {s.lang === 'he' ? 'EN' : 'עב'}
    </button>
  )

  return (
    <div className="app">
      {langBtn}

      {!s.connected && s.uiScreen !== 'home' && (
        <div className="reconnecting-banner">
          {s.lang === 'he' ? '...מתחבר מחדש' : 'Reconnecting...'}
        </div>
      )}

      {s.errorMsg && (
        <div className="error-toast">{s.errorMsg}</div>
      )}

      {screen === 'home' && <HomeScreen {...props} />}
      {screen === 'name' && <NameScreen {...props} />}
      {screen === 'lobby' && <LobbyScreen {...props} />}
      {screen === 'setup' && <SetupScreen {...props} />}
      {screen === 'answering' && <AnswerScreen {...props} />}
      {screen === 'voting' && <VotingScreen {...props} />}
      {screen === 'reveal' && <RevealScreen {...props} />}
      {screen === 'scoreboard' && <ScoreboardScreen {...props} />}
      {screen === 'game_over' && <GameOverScreen {...props} />}
    </div>
  )
}
