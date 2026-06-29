// Trợ lý AI: phát hiện các sai lầm CƠ BẢN sau khi người chơi vừa đi.
// Quy tắc: KHÔNG được gợi ý nước đi cụ thể. Chỉ nói chung chung kiểu coach giảng đạo lý.
//
// Đầu vào:
//   fenBefore: FEN trước nước
//   san: nước vừa đi (SAN)
//   verboseMove: object {from, to, piece, captured, color, flags, ...} từ chess.js
//   fenAfter: FEN sau nước
//
// Trả về { level: 'info'|'warn'|'danger', title, message } hoặc null nếu không có gì đáng nói.

import { Chess } from 'chess.js'

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const PIECE_NAME = { p: 'Tốt', n: 'Mã', b: 'Tượng', r: 'Xe', q: 'Hậu', k: 'Vua' }

// Đếm số lần ô vuông `square` bị các quân đối phương tấn công sau khi đi
function countAttackers(game, square, byColor) {
  // chess.js có .attackers(square, color) (v1+). Nếu không, fallback: thử mọi nước của byColor
  if (typeof game.attackers === 'function') {
    return game.attackers(square, byColor).length
  }
  // Tạm thời chuyển lượt cho byColor để dùng .moves()
  const fen = game.fen()
  const parts = fen.split(' ')
  parts[1] = byColor
  const tmp = new Chess()
  try { tmp.load(parts.join(' ')) } catch { return 0 }
  return tmp.moves({ verbose: true }).filter(m => m.to === square).length
}

function countDefenders(game, square, color) {
  // Số quân cùng màu bảo vệ ô (attack chính ô đó)
  return countAttackers(game, square, color)
}

export function reviewMove({ fenBefore, san, verboseMove, fenAfter }) {
  if (!verboseMove) return null

  const gameAfter = new Chess(fenAfter)
  const gameBefore = new Chess(fenBefore)
  const myColor = verboseMove.color
  const oppColor = myColor === 'w' ? 'b' : 'w'
  const movedPiece = verboseMove.piece
  const toSquare = verboseMove.to

  // 1. Lỡ nước chiếu: bị chiếu trước khi đi mà không thoát chiếu — chess.js không cho phép nên bỏ qua
  // 2. Đang bị chiếu sau khi đi — cũng không khả thi (chess.js sẽ reject)
  // 3. Nước đi đẩy quân vào ô mà đối phương ăn được mà quân không được bảo vệ → cảnh báo treo quân
  if (movedPiece !== 'k') {
    const attackers = countAttackers(gameAfter, toSquare, oppColor)
    const defenders = countDefenders(gameAfter, toSquare, myColor)
    if (attackers > 0) {
      const myVal = PIECE_VALUE[movedPiece]
      if (defenders === 0) {
        return {
          level: 'danger',
          title: 'Quân vừa đi có thể bị bắt',
          message: `${PIECE_NAME[movedPiece]} của bạn đang đi vào ô bị tấn công và không có quân nào bảo vệ. Cẩn thận đừng bỏ quân.`,
        }
      }
      // Có bảo vệ nhưng quân tấn công rẻ hơn → mất chất
      // Tìm giá trị nhỏ nhất trong đám tấn công
      const attackersList = (typeof gameAfter.attackers === 'function')
        ? gameAfter.attackers(toSquare, oppColor).map(sq => gameAfter.get(sq)?.type).filter(Boolean)
        : []
      const minAttackerVal = attackersList.length > 0 ? Math.min(...attackersList.map(t => PIECE_VALUE[t])) : myVal
      if (minAttackerVal < myVal) {
        return {
          level: 'warn',
          title: 'Có thể mất chất',
          message: `Đối phương có quân nhỏ hơn đang tấn công ${PIECE_NAME[movedPiece]} của bạn. Đổi quân kiểu này thường bất lợi.`,
        }
      }
    }
  }

  // 4. Hậu ra quá sớm: chơi Hậu trong 10 nước đầu
  const moveNumber = gameAfter.history().length
  if (movedPiece === 'q' && moveNumber <= 8) {
    // Đếm xem trước đó Hậu đã đi chưa — nếu là nước đầu tiên của Hậu
    const queenMovesBefore = gameBefore.history({ verbose: true }).filter(m => m.color === myColor && m.piece === 'q').length
    if (queenMovesBefore === 0) {
      return {
        level: 'warn',
        title: 'Hậu ra sớm',
        message: 'Đưa Hậu ra sớm rất dễ bị các quân nhẹ của đối phương tấn công và đuổi đi. Hãy phát triển Mã và Tượng trước.',
      }
    }
  }

  // 5. Đi cùng một quân hai lần trong khai cuộc (10 nước đầu) khi còn quân chưa phát triển
  if (moveNumber <= 14 && (movedPiece === 'n' || movedPiece === 'b')) {
    const moves = gameBefore.history({ verbose: true })
    const sameSquareCount = moves.filter(m => m.color === myColor && m.to === verboseMove.from).length
    // Đếm quân nhẹ chưa phát triển
    let undeveloped = 0
    const board = gameBefore.board()
    const homeRank = myColor === 'w' ? 7 : 0
    for (const sq of board[homeRank]) {
      if (sq && sq.color === myColor && (sq.type === 'n' || sq.type === 'b')) undeveloped++
    }
    if (sameSquareCount >= 1 && undeveloped >= 2) {
      return {
        level: 'info',
        title: 'Phát triển đều các quân',
        message: 'Trong khai cuộc, mỗi quân nên đi đúng một nước rồi phát triển quân khác. Bạn còn Mã/Tượng chưa ra.',
      }
    }
  }

  // 6. Đẩy tốt trước vua (f, g, h cho vua trắng cánh vua) khi vua chưa nhập thành
  if (movedPiece === 'p' && moveNumber <= 20) {
    const file = toSquare[0]
    const isKingside = ['f', 'g', 'h'].includes(file)
    const isQueenside = ['a', 'b', 'c'].includes(file)
    // Tìm vị trí Vua
    const board = gameAfter.board()
    let kingFile = null
    let kingHasMoved = false
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f]
        if (p && p.type === 'k' && p.color === myColor) {
          kingFile = String.fromCharCode(97 + f)
        }
      }
    }
    const kingMoves = gameAfter.history({ verbose: true }).filter(m => m.color === myColor && m.piece === 'k')
    kingHasMoved = kingMoves.some(m => !m.flags.includes('k') && !m.flags.includes('q'))
    const hasCastled = kingMoves.some(m => m.flags.includes('k') || m.flags.includes('q'))
    if (!hasCastled && !kingHasMoved) {
      // Vua còn ở cánh vua (e) → đẩy tốt cùng cánh = nguy hiểm
      if ((kingFile === 'e' || kingFile === 'f' || kingFile === 'g') && isKingside && (file === 'f' || file === 'g' || file === 'h')) {
        return {
          level: 'warn',
          title: 'Đẩy tốt trước Vua',
          message: 'Vua chưa nhập thành mà bạn đã đẩy tốt cánh Vua. Lá chắn tốt yếu đi sẽ khó nhập thành an toàn.',
        }
      }
      if ((kingFile === 'b' || kingFile === 'c') && isQueenside) {
        return {
          level: 'warn',
          title: 'Đẩy tốt trước Vua',
          message: 'Vua đang ở cánh Hậu mà bạn lại đẩy tốt cùng cánh. Cấu trúc tốt che chắn Vua sẽ yếu đi.',
        }
      }
    }
  }

  // 7. Sau nhiều nước rồi mà vẫn chưa nhập thành
  if (moveNumber === 20) {
    const myKingMoves = gameAfter.history({ verbose: true }).filter(m => m.color === myColor && m.piece === 'k')
    const hasCastled = myKingMoves.some(m => m.flags.includes('k') || m.flags.includes('q'))
    if (!hasCastled) {
      return {
        level: 'info',
        title: 'Cân nhắc nhập thành',
        message: 'Đã 10 nước trôi qua mà Vua vẫn ở trung tâm. Nhập thành sớm giúp Vua an toàn và kết nối hai Xe.',
      }
    }
  }

  return null
}
