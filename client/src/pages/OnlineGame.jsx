import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import Board from '../components/Board.jsx'
import StatusBar from '../components/StatusBar.jsx'
import MoveHistory from '../components/MoveHistory.jsx'
import ResultModal from '../components/ResultModal.jsx'
import Clock from '../components/Clock.jsx'
import { playMoveSound, sfx } from '../utils/sound.js'
import { socket } from '../utils/socket.js'
import { useAuth } from '../utils/auth.jsx'
import { DEFAULT_ELO, scoresFor } from '../utils/elo.js'

export default function OnlineGame() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user, profile, recordGame } = useAuth()
  const [state, setState] = useState(null)
  const [color, setColor] = useState(null)
  const [error, setError] = useState('')
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [resignedBy, setResignedBy] = useState(null)
  const [eloResult, setEloResult] = useState(null)
  const [outcome, setOutcome] = useState(null)         // 'win' | 'loss' | 'draw'
  const [outcomeLabel, setOutcomeLabel] = useState('') // subtitle: 'Chiếu hết' / 'Đối thủ đầu hàng'
  const [rematchState, setRematchState] = useState('idle') // idle | sent | received | declined
  const [savedMoves, setSavedMoves] = useState(null)   // SAN list để xem lại
  const [showResult, setShowResult] = useState(false)
  const recordedRef = useRef(false)
  const chatEndRef = useRef(null)

  const game = useMemo(() => {
    if (!state) return new Chess()
    try { return new Chess(state.fen) } catch { return new Chess() }
  }, [state?.fen])

  useEffect(() => {
    if (!user) { setError('Bạn cần đăng nhập để chơi online'); return }
    if (!socket.connected) socket.connect()
    const elo = profile?.elo ?? DEFAULT_ELO

    socket.emit('join-room', { roomId, name: user, elo }, (res) => {
      if (!res?.ok) {
        setError(res?.error || 'Lỗi không xác định')
        return
      }
      setColor(res.color)
    })

    const onState = (s) => setState({ ...s, receivedAt: Date.now() })
    const onChat = (msg) => setChat((c) => [...c, msg])
    const onResigned = ({ color: resignColor }) => setResignedBy(resignColor)
    const onResult = (data) => {
      if (recordedRef.current) return
      recordedRef.current = true

      const outcomeMap = {
        white_win: 'white_win', black_win: 'black_win', draw: 'draw',
        white_resign: 'black_win', black_resign: 'white_win',
        white_timeout: 'black_win', black_timeout: 'white_win',
      }
      const o = outcomeMap[data.outcome] || 'draw'

      const isResign = data.outcome === 'white_resign' || data.outcome === 'black_resign'
      const isTimeout = data.outcome === 'white_timeout' || data.outcome === 'black_timeout'
      let label = ''
      if (data.outcome === 'draw') label = 'Hòa cờ'
      else if (isResign) label = 'Có người đầu hàng'
      else if (isTimeout) label = 'Hết giờ'
      else label = 'Chiếu hết'
      setOutcomeLabel(label)

      let myOut
      if (o === 'draw') myOut = 'draw'
      else if ((o === 'white_win' && color === 'w') || (o === 'black_win' && color === 'b')) myOut = 'win'
      else myOut = 'loss'
      setOutcome(myOut)
      setShowResult(true)

      if (!user || (color !== 'w' && color !== 'b')) return
      const { w, b } = scoresFor(o)
      const myScore = color === 'w' ? w : b
      const oppPlayer = color === 'w' ? data.players.b : data.players.w
      const oppElo = oppPlayer?.elo ?? DEFAULT_ELO
      const r = recordGame(myScore, oppElo, 'online', { opponent: oppPlayer?.name || 'Đối thủ' })
      if (r) setEloResult(r)
    }
    const onRematchOffer = () => setRematchState('received')
    const onRematchAccepted = () => {
      // Server đã reset + swap màu, gửi state mới qua 'state'
      setRematchState('idle')
      setShowResult(false)
      setResignedBy(null)
      setEloResult(null)
      setOutcome(null)
      setOutcomeLabel('')
      setSavedMoves(null)
      recordedRef.current = false
      // color sẽ đổi sau khi nhận state mới — dùng useEffect khác để re-detect
    }
    const onRematchDeclined = () => setRematchState('declined')
    socket.on('state', onState)
    socket.on('chat', onChat)
    socket.on('resigned', onResigned)
    socket.on('game-result', onResult)
    socket.on('rematch-offer', onRematchOffer)
    socket.on('rematch-accepted', onRematchAccepted)
    socket.on('rematch-declined', onRematchDeclined)
    return () => {
      socket.off('state', onState)
      socket.off('chat', onChat)
      socket.off('resigned', onResigned)
      socket.off('game-result', onResult)
      socket.off('rematch-offer', onRematchOffer)
      socket.off('rematch-accepted', onRematchAccepted)
      socket.off('rematch-declined', onRematchDeclined)
    }
  }, [roomId, user, profile?.elo, color, recordGame])

  // Khi nhận game-result, snapshot history hiện tại để dùng cho xem lại
  useEffect(() => {
    if (showResult && state?.history && !savedMoves) {
      setSavedMoves(state.history.slice())
    }
  }, [showResult, state?.history, savedMoves])

  // Sau rematch-accepted, server gửi state mới → cập nhật color theo seat mới
  useEffect(() => {
    if (!state) return
    // Tìm color theo socket.id trong state — server không gửi id, mình dùng cách khác:
    // Khi accept rematch, server swap nên color của mình cũng đổi sang ngược lại
    // Nhưng vì server không gửi color qua state, mình phải emit 'who-am-i'? — đơn giản: rely on join-room đã set color ban đầu.
    // Sau rematch, mình cầm màu ngược lại. Nhưng socket vẫn cùng id, server đã swap players.
    // → Mình refetch color bằng cách emit join-room lại, server check id và trả color hiện tại.
  }, [state?.players?.w?.name, state?.players?.b?.name])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const onMove = useCallback((move) => {
    if (color === 'spectator' || !state) return false
    if (state.turn !== color) return false
    let verbose
    try {
      const test = new Chess(state.fen)
      verbose = test.move(move)
      if (!verbose) return false
      playMoveSound(verbose, test)
    } catch { return false }
    socket.emit('move', { roomId, move }, (res) => {
      if (!res?.ok) setError(res?.error || 'Nước đi bị từ chối')
    })
    return true
  }, [color, state, roomId])

  const sendChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    socket.emit('chat', { roomId, message: chatInput })
    setChatInput('')
  }

  const resign = () => {
    if (color === 'w' || color === 'b') socket.emit('resign', { roomId })
  }

  const requestRematch = () => {
    socket.emit('rematch-request', { roomId })
    setRematchState('sent')
  }

  const acceptRematch = () => {
    socket.emit('rematch-accept', { roomId })
    // Sau khi accept, mình ngồi ghế ngược lại — refetch
    socket.emit('join-room', { roomId, name: user, elo: profile?.elo ?? DEFAULT_ELO }, (res) => {
      if (res?.ok) setColor(res.color)
    })
  }

  const declineRematch = () => {
    socket.emit('rematch-decline', { roomId })
    setRematchState('idle')
  }

  // Khi rematch-accepted (mình là người gửi), cũng refetch color
  useEffect(() => {
    if (rematchState !== 'idle') return
    // no-op
  }, [rematchState])

  // Sound khi đối thủ vừa đi (state mới đến và history dài hơn)
  const lastHistoryLenRef = useRef(0)
  useEffect(() => {
    if (!state) return
    const prev = lastHistoryLenRef.current
    const curr = state.history.length
    lastHistoryLenRef.current = curr
    if (curr <= prev) return
    if (curr === 0) return
    // Replay từ FEN trước nước cuối để biết verboseMove
    try {
      const replay = new Chess()
      for (let i = 0; i < curr - 1; i++) replay.move(state.history[i])
      const lastSan = state.history[curr - 1]
      const verbose = replay.move(lastSan)
      // Chỉ phát sound khi đó là nước của đối thủ — tránh double với onMove của mình
      // Nước cuối có color = lượt trước của state.turn hiện tại (đã đảo)
      const moverColor = state.turn === 'w' ? 'b' : 'w'
      if (moverColor !== color) {
        playMoveSound(verbose, replay)
      }
    } catch {}
  }, [state?.history, state?.turn, color])

  // Sound cho resign và game over
  useEffect(() => {
    if (resignedBy) sfx.checkmate()
  }, [resignedBy])
  useEffect(() => {
    if (state?.isGameOver && state.isDraw) sfx.draw()
  }, [state?.isGameOver, state?.isDraw])

  // Mình bên nào thì tên/info hiển thị ở dưới, đối thủ ở trên
  const mySeat = color === 'w' || color === 'b' ? color : 'w'
  const oppSeat = mySeat === 'w' ? 'b' : 'w'
  const hasClock = state && state.tc && state.tc.initialMs > 0
  const renderPlayerCard = (seat) => (
    <div key={seat} className={`player-card ${state.turn === seat ? 'active' : ''}`}>
      <span className="player-info">
        {seat === 'w' ? '⚪' : '⚫'} {state.players[seat]?.name || '(chờ người vào)'}
        {state.players[seat] ? ` · ${state.players[seat].elo}` : ''}
        {color !== 'spectator' && seat === color ? ' (Bạn)' : ''}
      </span>
      {hasClock && state.players[seat] && (
        <Clock
          baseMs={state.clocks[seat]}
          running={state.clockRunning && state.turn === seat}
          since={state.receivedAt}
        />
      )}
    </div>
  )

  if (error) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Lỗi</h2>
          <p>{error}</p>
          <button className="btn" onClick={() => navigate('/online')}>Về lobby</button>
        </div>
      </div>
    )
  }

  if (!state) {
    return <div className="lobby"><div className="lobby-card"><h2>Đang vào phòng...</h2></div></div>
  }

  const orientation = color === 'b' ? 'black' : 'white'
  const myTurn = state.turn === color && !state.isGameOver && !resignedBy
  const eloLine = eloResult
    ? `Elo: ${eloResult.prevElo} → ${eloResult.newElo} (${eloResult.delta > 0 ? '+' : ''}${eloResult.delta})`
    : null

  const myName = color !== 'spectator' ? state.players[color]?.name : (user || 'Bạn')
  const resultTitle = outcome === 'win' ? 'Bạn thắng!' : outcome === 'loss' ? 'Bạn thua' : outcome === 'draw' ? 'Hòa cờ' : 'Kết thúc ván'
  const movesForReview = savedMoves || state.history

  return (
    <div className="game-page">
      <div className="panel">
        <h3>Phòng {roomId}</h3>
        <p className="muted">
          Bạn:&nbsp;
          {color === 'w' ? 'Trắng' : color === 'b' ? 'Đen' : 'Khán giả'}
          {state.spectatorCount > 0 && ` · ${state.spectatorCount} khán giả`}
        </p>
        {renderPlayerCard(oppSeat)}
        {renderPlayerCard(mySeat)}
        {!state.players.w || !state.players.b ? (
          <p className="muted">Mã phòng: <strong>{roomId}</strong> — chia sẻ cho đối thủ</p>
        ) : null}
        <button className="btn danger" onClick={resign} disabled={color === 'spectator' || state.isGameOver || !!resignedBy}>
          Đầu hàng
        </button>
        <button className="btn secondary" onClick={() => navigate('/online')}>Rời phòng</button>
      </div>

      <Board
        game={game}
        onMove={onMove}
        orientation={orientation}
        disabled={!myTurn}
      />

      <div className="panel">
        <h3>Trạng thái</h3>
        <StatusBar
          game={game}
          extraText={
            eloLine ? eloLine
              : color === 'spectator' ? 'Bạn đang xem'
              : myTurn ? 'Đến lượt bạn'
              : resignedBy ? null
              : 'Chờ đối thủ...'
          }
        />
        <h3>Chat</h3>
        <div className="chat-box">
          {chat.length === 0 && <div className="muted">Chưa có tin nhắn</div>}
          {chat.map((c, i) => (
            <div key={i} className="chat-msg"><strong>{c.name}:</strong> {c.message}</div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendChat} className="row">
          <input
            className="select"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Nhập tin nhắn..."
          />
          <button className="btn" type="submit" style={{ flex: 0 }}>Gửi</button>
        </form>
        <h3>Lịch sử</h3>
        <MoveHistory history={state.history} />
      </div>

      {/* Lời mời tái đấu từ đối thủ */}
      {rematchState === 'received' && !showResult && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Lời mời tái đấu</h2>
            <p className="muted">Đối thủ muốn chơi lại với bạn</p>
            <div className="row">
              <button className="btn" onClick={acceptRematch}>Đồng ý</button>
              <button className="btn secondary" onClick={declineRematch}>Từ chối</button>
            </div>
          </div>
        </div>
      )}

      <ResultModal
        open={showResult}
        title={resultTitle}
        subtitle={outcomeLabel}
        playerName={myName}
        prevElo={eloResult?.prevElo}
        delta={eloResult?.delta}
        onRematch={color !== 'spectator' ? (rematchState === 'received' ? acceptRematch : requestRematch) : null}
        rematchDisabled={rematchState === 'sent' || rematchState === 'declined'}
        rematchLabel={
          rematchState === 'sent' ? 'Đã gửi lời mời...'
          : rematchState === 'received' ? 'Đồng ý tái đấu'
          : rematchState === 'declined' ? 'Đối thủ đã từ chối'
          : 'Tái đấu'
        }
        onReview={movesForReview && movesForReview.length > 0 ? () => {
          navigate('/review', { state: {
            sanMoves: movesForReview,
            whiteName: state.players.w?.name || 'Trắng',
            blackName: state.players.b?.name || 'Đen',
            myColor: color,
          }})
        } : null}
        onHome={() => navigate('/online')}
      />
    </div>
  )
}
