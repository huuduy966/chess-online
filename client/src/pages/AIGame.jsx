import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import { useNavigate } from 'react-router-dom'
import Board from '../components/Board.jsx'
import StatusBar from '../components/StatusBar.jsx'
import MoveHistory from '../components/MoveHistory.jsx'
import ResultModal from '../components/ResultModal.jsx'
import { chooseMoveForBot } from '../utils/ai.js'
import { useAuth } from '../utils/auth.jsx'
import { scoresFor } from '../utils/elo.js'
import { BOTS, DEFAULT_BOT_ID, getBot } from '../utils/bots.js'
import { playMoveSound } from '../utils/sound.js'

export default function AIGame() {
  const navigate = useNavigate()
  const { user, recordGame } = useAuth()
  const [game, setGame] = useState(() => new Chess())
  const [playerColor, setPlayerColor] = useState('w')
  const [botId, setBotId] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [, setTick] = useState(0)
  const [eloResult, setEloResult] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [outcomeLabel, setOutcomeLabel] = useState('')
  const [savedMoves, setSavedMoves] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const recordedRef = useRef(false)
  const history = useMemo(() => game.history(), [game, game.fen()])
  const gameRef = useRef(game)
  gameRef.current = game

  const bot = useMemo(() => (botId ? getBot(botId) : null), [botId])
  const aiTurn = !!bot && game.turn() !== playerColor && !game.isGameOver()

  useEffect(() => { if (botId) localStorage.setItem('chess-bot', botId) }, [botId])

  // Delay engine theo depth: depth 1 ~250ms, depth 4 ~1200ms (giả "suy nghĩ")
  const thinkDelay = useMemo(() => (bot ? Math.min(1500, 200 + bot.depth * 250) : 0), [bot])

  useEffect(() => {
    if (!aiTurn || !bot) return
    setThinking(true)
    const id = setTimeout(() => {
      const move = chooseMoveForBot(gameRef.current, { depth: bot.depth, randomChance: bot.randomChance })
      if (move) {
        const verbose = gameRef.current.move(move)
        playMoveSound(verbose, gameRef.current)
        setTick((t) => t + 1)
      }
      setThinking(false)
    }, thinkDelay)
    return () => clearTimeout(id)
  }, [aiTurn, bot, thinkDelay, game.fen()])

  useEffect(() => {
    if (!bot || !game.isGameOver() || recordedRef.current) return
    recordedRef.current = true
    if (game.history().length === 0) return

    let resultOutcome
    let label
    if (game.isCheckmate()) {
      resultOutcome = game.turn() === 'w' ? 'black_win' : 'white_win'
      label = 'Chiếu hết'
    } else if (game.isStalemate()) {
      resultOutcome = 'draw'; label = 'Hết nước đi (Hòa)'
    } else if (game.isDraw()) {
      resultOutcome = 'draw'; label = 'Hòa cờ'
    } else return

    setSavedMoves(game.history().slice())
    const { w, b } = scoresFor(resultOutcome)
    const myScore = playerColor === 'w' ? w : b
    let myOut
    if (resultOutcome === 'draw') myOut = 'draw'
    else if ((resultOutcome === 'white_win' && playerColor === 'w') || (resultOutcome === 'black_win' && playerColor === 'b')) myOut = 'win'
    else myOut = 'loss'
    setOutcome(myOut)
    setOutcomeLabel(label)
    setShowResult(true)

    if (user) {
      const r = recordGame(myScore, bot.elo, 'ai', { opponent: bot.name })
      if (r) setEloResult(r)
    }
  }, [game, game.fen(), user, recordGame, playerColor, bot])

  const onMove = useCallback((move) => {
    if (game.turn() !== playerColor || thinking) return false
    try {
      const result = game.move(move)
      if (!result) return false
      playMoveSound(result, game)
      setTick((t) => t + 1)
      return true
    } catch {
      return false
    }
  }, [game, playerColor, thinking])

  const reset = () => {
    recordedRef.current = false
    setEloResult(null)
    setOutcome(null)
    setOutcomeLabel('')
    setSavedMoves(null)
    setShowResult(false)
    setGame(new Chess())
  }
  const swapColor = () => {
    setPlayerColor((c) => (c === 'w' ? 'b' : 'w'))
    reset()
  }
  const rematch = () => {
    setPlayerColor((c) => (c === 'w' ? 'b' : 'w'))
    reset()
  }

  const eloLine = eloResult
    ? `Elo: ${eloResult.prevElo} → ${eloResult.newElo} (${eloResult.delta > 0 ? '+' : ''}${eloResult.delta})`
    : null
  const resultTitle = outcome === 'win' ? 'Bạn thắng!' : outcome === 'loss' ? 'Bạn thua' : outcome === 'draw' ? 'Hòa cờ' : 'Kết thúc'

  if (!bot) {
    return (
      <div className="lobby">
        <div className="lobby-card" style={{ maxWidth: 640 }}>
          <h2>Chọn đối thủ</h2>
          <p className="muted">Chọn một bot để bắt đầu ván đấu</p>
          <div className="bot-list">
            {BOTS.map(b => (
              <button
                key={b.id}
                className="bot-option"
                onClick={() => setBotId(b.id)}
                type="button"
              >
                <span className="bot-name">{b.name}</span>
                <span className="bot-elo">{b.elo}</span>
              </button>
            ))}
          </div>
          <label className="muted" style={{ marginTop: '1rem' }}>Bạn cầm quân</label>
          <button className="btn secondary" onClick={() => setPlayerColor((c) => (c === 'w' ? 'b' : 'w'))}>
            {playerColor === 'w' ? 'Trắng' : 'Đen'} — Đổi
          </button>
          {!user && <p className="muted">Đăng nhập để được tính Elo</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="game-page">
      <div className="panel">
        <h3>Đấu với {bot.name}</h3>
        <p className="muted">Elo: {bot.elo}</p>
        <button className="btn secondary" onClick={() => { setBotId(null); reset() }}>Đổi đối thủ</button>
        <label className="muted">Bạn cầm quân</label>
        <button className="btn secondary" onClick={swapColor}>
          {playerColor === 'w' ? 'Trắng (đang chơi)' : 'Đen (đang chơi)'} — Đổi
        </button>
        <button className="btn danger" onClick={reset}>Bắt đầu lại</button>
        {!user && <p className="muted">Đăng nhập để được tính Elo</p>}
      </div>

      <Board
        game={game}
        onMove={onMove}
        orientation={playerColor === 'w' ? 'white' : 'black'}
        disabled={aiTurn || thinking}
      />

      <div className="panel">
        <h3>Trạng thái</h3>
        <StatusBar game={game} extraText={thinking ? `${bot.name} đang tính nước...` : eloLine} />
        <h3>Lịch sử nước đi</h3>
        <MoveHistory history={history} />
      </div>

      <ResultModal
        open={showResult}
        title={resultTitle}
        subtitle={outcomeLabel}
        playerName={user || 'Bạn'}
        prevElo={eloResult?.prevElo}
        delta={eloResult?.delta}
        onRematch={rematch}
        rematchLabel="Tái đấu (đổi màu)"
        onReview={savedMoves && savedMoves.length > 0 ? () => {
          navigate('/review', { state: {
            sanMoves: savedMoves,
            whiteName: playerColor === 'w' ? (user || 'Bạn') : bot.name,
            blackName: playerColor === 'b' ? (user || 'Bạn') : bot.name,
            myColor: playerColor,
          }})
        } : null}
        onHome={() => navigate('/')}
      />
    </div>
  )
}
