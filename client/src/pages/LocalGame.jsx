import { useState, useMemo, useCallback } from 'react'
import { Chess } from 'chess.js'
import { useNavigate } from 'react-router-dom'
import Board from '../components/Board.jsx'
import StatusBar from '../components/StatusBar.jsx'
import MoveHistory from '../components/MoveHistory.jsx'
import GameOverModal from '../components/GameOverModal.jsx'
import CoachChat from '../components/CoachChat.jsx'
import { playMoveSound } from '../utils/sound.js'

export default function LocalGame() {
  const navigate = useNavigate()
  const [game, setGame] = useState(() => new Chess())
  const [, setTick] = useState(0)
  const history = useMemo(() => game.history(), [game, game.fen()])

  const onMove = useCallback((move) => {
    try {
      const result = game.move(move)
      if (!result) return false
      playMoveSound(result, game)
      setTick((t) => t + 1)
      return true
    } catch {
      return false
    }
  }, [game])

  const undo = () => { game.undo(); setTick((t) => t + 1) }
  const reset = () => setGame(new Chess())

  return (
    <div className="game-page">
      <div className="panel">
        <h3>Chế độ Local</h3>
        <p className="muted">2 người chơi trên cùng một máy. Drag-drop hoặc click để di chuyển.</p>
        <button className="btn secondary" onClick={undo} disabled={game.history().length === 0}>↶ Hoàn tác</button>
        <button className="btn danger" onClick={reset}>Bắt đầu lại</button>
        <CoachChat fen={game.fen()} myColor={game.turn()} />
      </div>

      <Board game={game} onMove={onMove} />

      <div className="panel">
        <h3>Trạng thái</h3>
        <StatusBar game={game} />
        <h3>Lịch sử nước đi</h3>
        <MoveHistory history={history} />
      </div>

      <GameOverModal game={game} onRestart={reset} onHome={() => navigate('/')} />
    </div>
  )
}
