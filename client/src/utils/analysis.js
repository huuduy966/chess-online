// Phân tích ván đấu. Mỗi nước:
//   evalBefore = eval vị trí trước nước đi (góc nhìn trắng)
//   evalAfter  = eval vị trí sau nước đi
//   bestEval   = eval vị trí sau nước đi tốt nhất
//   cpLoss     = |bestEval - evalAfter| (mất bao nhiêu centipawn so với nước tốt nhất, theo góc nhìn người vừa đi)
// Phân loại:
//   cpLoss < 10        → Best
//   cpLoss < 30        → Excellent
//   cpLoss < 80        → Good
//   cpLoss < 180       → Inaccuracy
//   cpLoss < 350       → Mistake
//   cpLoss >= 350      → Blunder
//   Brilliant: nước duy nhất tốt hơn các nước khác ≥ 200cp và là nước tốt nhất

import { Chess } from 'chess.js'
import { chooseBestMoveWithEval, evaluateSync } from './ai.js'

export const CLASSES = {
  BRILLIANT: 'brilliant',
  BEST: 'best',
  EXCELLENT: 'excellent',
  GOOD: 'good',
  INACCURACY: 'inaccuracy',
  MISTAKE: 'mistake',
  BLUNDER: 'blunder',
}

export const CLASS_LABEL = {
  brilliant: 'Thiên tài',
  best: 'Nước hay nhất',
  excellent: 'Xuất sắc',
  good: 'Tốt',
  inaccuracy: 'Thiếu chính xác',
  mistake: 'Sai lầm',
  blunder: 'Đại sai lầm',
}

export const CLASS_COLOR = {
  brilliant: '#00d4ff',
  best: '#27ae60',
  excellent: '#2ecc71',
  good: '#95a5a6',
  inaccuracy: '#f1c40f',
  mistake: '#e67e22',
  blunder: '#e74c3c',
}

function classify(cpLoss) {
  if (cpLoss < 10) return CLASSES.BEST
  if (cpLoss < 30) return CLASSES.EXCELLENT
  if (cpLoss < 80) return CLASSES.GOOD
  if (cpLoss < 180) return CLASSES.INACCURACY
  if (cpLoss < 350) return CLASSES.MISTAKE
  return CLASSES.BLUNDER
}

// Phân tích toàn ván từ mảng SAN moves
export function analyzeGame(sanMoves, depth = 2) {
  const game = new Chess()
  const moves = []
  for (let i = 0; i < sanMoves.length; i++) {
    const fenBefore = game.fen()
    const turn = game.turn()
    const evalBefore = evaluateSync(game)

    // Tìm nước tốt nhất theo engine
    const { move: bestMove, score: bestScore, alternatives } = chooseBestMoveWithEval(game, depth)

    // Thực hiện nước người chơi đã đi
    const actual = game.move(sanMoves[i])
    if (!actual) break
    const evalAfter = evaluateSync(game)

    // cpLoss tính theo góc nhìn bên vừa đi
    // Nếu bên vừa đi là trắng: cpLoss = bestScore - evalAfter (eval trắng cao hơn = tốt hơn)
    // Nếu bên đen: cpLoss = evalAfter - bestScore
    const cpLoss = Math.max(0, turn === 'w' ? bestScore - evalAfter : evalAfter - bestScore)
    let cls = classify(cpLoss)

    // Brilliant: nước người chơi đi == nước engine, và nước thứ 2 kém hơn ≥ 200cp
    if (cls === CLASSES.BEST && alternatives && alternatives.length >= 2) {
      const playedSAN = actual.san
      if (bestMove && bestMove.san === playedSAN) {
        const top = alternatives[0]
        const second = alternatives[1]
        const gap = turn === 'w' ? top.score - second.score : second.score - top.score
        if (gap >= 200) cls = CLASSES.BRILLIANT
      }
    }

    moves.push({
      ply: i,
      san: actual.san,
      turn,
      fenBefore,
      fenAfter: game.fen(),
      evalBefore, evalAfter,
      bestSAN: bestMove?.san || null,
      bestScore,
      cpLoss,
      classification: cls,
    })
  }

  // Accuracy: dùng công thức Lichess-style đơn giản dựa trên cpLoss trung bình
  // accuracy = 103.1668 * exp(-0.04354 * avgCpLoss) - 3.1669 (clamp 0..100)
  const byColor = { w: [], b: [] }
  moves.forEach(m => byColor[m.turn].push(m.cpLoss))
  const accFor = (arr) => {
    if (arr.length === 0) return 100
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    const acc = 103.1668 * Math.exp(-0.04354 * (avg / 1)) - 3.1669
    return Math.max(0, Math.min(100, Math.round(acc * 10) / 10))
  }
  const accuracy = { w: accFor(byColor.w), b: accFor(byColor.b) }

  const stats = { w: emptyStats(), b: emptyStats() }
  moves.forEach(m => stats[m.turn][m.classification]++)

  return { moves, accuracy, stats }
}

function emptyStats() {
  return { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
}
