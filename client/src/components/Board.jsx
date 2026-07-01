import { Chessboard } from 'react-chessboard'
import { useState, useEffect } from 'react'
import { Chess } from 'chess.js'

export default function Board({ game, onMove, orientation = 'white', disabled = false }) {
  const [moveFrom, setMoveFrom] = useState('')
  const [optionSquares, setOptionSquares] = useState({})
  const [premove, setPremove] = useState(null)

  const userColor = disabled ? (game.turn() === 'w' ? 'b' : 'w') : game.turn()

  useEffect(() => {
    if (!disabled && premove) {
      const ok = onMove(premove)
      setPremove(null)
      setMoveFrom('')
      setOptionSquares({})
      if (!ok) {
        // premove không hợp lệ sau khi đối thủ đi, bỏ qua
      }
    }
  }, [disabled, premove, onMove])

  useEffect(() => {
    if (game.history().length === 0) {
      setPremove(null)
      setMoveFrom('')
      setOptionSquares({})
    }
  }, [game])

  const highlightPremove = (from, to) => {
    setOptionSquares({
      [from]: { background: 'rgba(52,152,219,0.45)' },
      [to]: { background: 'rgba(52,152,219,0.45)' },
    })
  }

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

  const getPremoveOptions = (square) => {
    const piece = game.get(square)
    if (!piece || piece.color !== userColor) {
      setOptionSquares({})
      return false
    }
    const parts = game.fen().split(' ')
    parts[1] = userColor
    parts[3] = '-'
    const flipped = new Chess()
    try { flipped.load(parts.join(' ')) } catch { setOptionSquares({}); return false }
    const moves = flipped.moves({ square, verbose: true })
    if (moves.length === 0) { setOptionSquares({}); return false }
    const newSquares = {}
    moves.forEach((m) => {
      newSquares[m.to] = {
        background: 'radial-gradient(circle, rgba(52,152,219,0.5) 25%, transparent 25%)',
        borderRadius: '50%',
      }
    })
    newSquares[square] = { background: 'rgba(52,152,219,0.35)' }
    setOptionSquares(newSquares)
    return true
  }

  const onSquareClick = (square) => {
    if (disabled) {
      if (moveFrom) {
        setPremove({ from: moveFrom, to: square, promotion: 'q' })
        highlightPremove(moveFrom, square)
        setMoveFrom('')
        return
      }
      if (premove) {
        setPremove(null)
        setOptionSquares({})
      }
      if (getPremoveOptions(square)) setMoveFrom(square)
      return
    }
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

  const onSquareRightClick = () => {
    if (premove || moveFrom) {
      setPremove(null)
      setMoveFrom('')
      setOptionSquares({})
    }
  }

  const onPieceDrop = (from, to) => {
    if (disabled) {
      const piece = game.get(from)
      if (!piece || piece.color !== userColor || from === to) return false
      setPremove({ from, to, promotion: 'q' })
      highlightPremove(from, to)
      setMoveFrom('')
      return false
    }
    const ok = onMove({ from, to, promotion: 'q' })
    if (ok) { setMoveFrom(''); setOptionSquares({}) }
    return ok
  }

  const isDraggablePiece = ({ piece }) => piece[0] === userColor

  return (
    <div className="board-wrap">
      <div className="board-inner">
        <Chessboard
          position={game.fen()}
          onSquareClick={onSquareClick}
          onSquareRightClick={onSquareRightClick}
          onPieceDrop={onPieceDrop}
          isDraggablePiece={isDraggablePiece}
          boardOrientation={orientation}
          customSquareStyles={optionSquares}
          customDarkSquareStyle={{ backgroundColor: '#769656' }}
          customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          arePiecesDraggable={true}
        />
      </div>
    </div>
  )
}
