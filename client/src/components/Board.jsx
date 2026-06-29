import { Chessboard } from 'react-chessboard'
import { useState } from 'react'

export default function Board({ game, onMove, orientation = 'white', disabled = false }) {
  const [moveFrom, setMoveFrom] = useState('')
  const [optionSquares, setOptionSquares] = useState({})

  const getMoveOptions = (square) => {
    const moves = game.moves({ square, verbose: true })
    if (moves.length === 0) {
      setOptionSquares({})
      return false
    }
    const newSquares = {}
    moves.forEach((m) => {
      newSquares[m.to] = {
        background:
          game.get(m.to) && game.get(m.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(231,76,60,.55) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(243,156,18,.5) 25%, transparent 25%)',
        borderRadius: '50%',
      }
    })
    newSquares[square] = { background: 'rgba(243,156,18,0.35)' }
    setOptionSquares(newSquares)
    return true
  }

  const onSquareClick = (square) => {
    if (disabled) return
    if (!moveFrom) {
      if (getMoveOptions(square)) setMoveFrom(square)
      return
    }
    const move = { from: moveFrom, to: square, promotion: 'q' }
    const ok = onMove(move)
    if (!ok) {
      if (getMoveOptions(square)) setMoveFrom(square)
      else { setMoveFrom(''); setOptionSquares({}) }
      return
    }
    setMoveFrom('')
    setOptionSquares({})
  }

  const onPieceDrop = (from, to) => {
    if (disabled) return false
    const ok = onMove({ from, to, promotion: 'q' })
    if (ok) { setMoveFrom(''); setOptionSquares({}) }
    return ok
  }

  return (
    <div className="board-wrap">
      <div className="board-inner">
        <Chessboard
          position={game.fen()}
          onSquareClick={onSquareClick}
          onPieceDrop={onPieceDrop}
          boardOrientation={orientation}
          customSquareStyles={optionSquares}
          customDarkSquareStyle={{ backgroundColor: '#769656' }}
          customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          arePiecesDraggable={!disabled}
        />
      </div>
    </div>
  )
}
