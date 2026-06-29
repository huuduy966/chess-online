// Minimax với alpha-beta pruning. Đánh giá vị trí bằng material + piece-square tables.

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }

// Piece-square tables (góc nhìn của bên trắng; bên đen được mirror)
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
}

function squareToIndex(sq) {
  const file = sq.charCodeAt(0) - 97 // a..h => 0..7
  const rank = parseInt(sq[1], 10) // 1..8
  return (8 - rank) * 8 + file
}

function evaluate(game) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000
  if (game.isDraw() || game.isStalemate()) return 0

  const board = game.board()
  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f]
      if (!p) continue
      const value = PIECE_VALUES[p.type]
      const file = String.fromCharCode(97 + f)
      const rank = 8 - r
      const idx = squareToIndex(file + rank)
      const pstIdx = p.color === 'w' ? idx : 63 - idx
      const positional = PST[p.type][pstIdx]
      const total = value + positional
      score += p.color === 'w' ? total : -total
    }
  }
  return score
}

function orderMoves(moves) {
  // Captures và promotions trước để alpha-beta cắt tỉa tốt hơn
  return moves.slice().sort((a, b) => {
    const aScore = (a.captured ? PIECE_VALUES[a.captured] : 0) + (a.promotion ? PIECE_VALUES[a.promotion] : 0)
    const bScore = (b.captured ? PIECE_VALUES[b.captured] : 0) + (b.promotion ? PIECE_VALUES[b.promotion] : 0)
    return bScore - aScore
  })
}

function minimax(game, depth, alpha, beta, maximizing) {
  if (depth === 0 || game.isGameOver()) return evaluate(game)

  const moves = orderMoves(game.moves({ verbose: true }))

  if (maximizing) {
    let best = -Infinity
    for (const m of moves) {
      game.move(m)
      const score = minimax(game, depth - 1, alpha, beta, false)
      game.undo()
      best = Math.max(best, score)
      alpha = Math.max(alpha, score)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      game.move(m)
      const score = minimax(game, depth - 1, alpha, beta, true)
      game.undo()
      best = Math.min(best, score)
      beta = Math.min(beta, score)
      if (beta <= alpha) break
    }
    return best
  }
}

const DIFFICULTY_DEPTH = { easy: 1, medium: 2, hard: 3 }

export function chooseBestMove(game, difficulty = 'medium') {
  const depth = DIFFICULTY_DEPTH[difficulty] ?? 2
  const moves = orderMoves(game.moves({ verbose: true }))
  if (moves.length === 0) return null

  // Easy: ngẫu nhiên 40% thời gian để chơi yếu hơn
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  const maximizing = game.turn() === 'w'
  let bestMove = moves[0]
  let bestScore = maximizing ? -Infinity : Infinity

  for (const m of moves) {
    game.move(m)
    const score = minimax(game, depth - 1, -Infinity, Infinity, !maximizing)
    game.undo()
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score
      bestMove = m
    }
  }
  return bestMove
}

// Chọn nước theo cấu hình bot: depth tự chọn, randomChance để mô phỏng sai sót
export function chooseMoveForBot(game, { depth = 2, randomChance = 0 } = {}) {
  const moves = orderMoves(game.moves({ verbose: true }))
  if (moves.length === 0) return null
  if (randomChance > 0 && Math.random() < randomChance) {
    return moves[Math.floor(Math.random() * moves.length)]
  }
  const maximizing = game.turn() === 'w'
  let bestMove = moves[0]
  let bestScore = maximizing ? -Infinity : Infinity
  for (const m of moves) {
    game.move(m)
    const score = minimax(game, depth - 1, -Infinity, Infinity, !maximizing)
    game.undo()
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score
      bestMove = m
    }
  }
  return bestMove
}

// Eval đồng bộ (góc nhìn trắng, đơn vị centipawn). Cho analyzer dùng.
export function evaluateSync(game) {
  return evaluate(game)
}

// Trả về { move: bestMove, score: bestScore, alternatives: [{move, score}] sorted theo lợi thế bên đang đi }
export function chooseBestMoveWithEval(game, depth = 2) {
  const moves = orderMoves(game.moves({ verbose: true }))
  if (moves.length === 0) return { move: null, score: evaluate(game), alternatives: [] }
  const maximizing = game.turn() === 'w'
  const results = []
  for (const m of moves) {
    game.move(m)
    const score = minimax(game, depth - 1, -Infinity, Infinity, !maximizing)
    game.undo()
    results.push({ move: m, score })
  }
  results.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score)
  return { move: results[0].move, score: results[0].score, alternatives: results }
}
