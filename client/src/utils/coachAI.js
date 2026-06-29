// Mini AI tư vấn cờ vua dựa trên thế cờ hiện tại.
// Quy tắc: KHÔNG đưa nước đi cụ thể (kiểu "đi Nf3"), chỉ tư vấn nguyên tắc, đánh giá thế.

import { Chess } from 'chess.js'

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const PIECE_NAME = { p: 'tốt', n: 'mã', b: 'tượng', r: 'xe', q: 'hậu', k: 'vua' }

// === Phân tích thế cờ ===
function analyzePosition(fen, color) {
  const game = new Chess(fen)
  const board = game.board()
  const myMat = { p: 0, n: 0, b: 0, r: 0, q: 0 }
  const oppMat = { p: 0, n: 0, b: 0, r: 0, q: 0 }
  let myKingSq = null, oppKingSq = null
  let developed = 0 // mã + tượng đã ra khỏi hàng cuối
  let undeveloped = 0
  let myKingMoved = false
  const myColor = color
  const oppColor = color === 'w' ? 'b' : 'w'
  const homeRank = myColor === 'w' ? 7 : 0

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f]
      if (!p) continue
      const sq = String.fromCharCode(97 + f) + (8 - r)
      if (p.color === myColor) {
        if (p.type === 'k') myKingSq = sq
        else myMat[p.type]++
        if ((p.type === 'n' || p.type === 'b') && r === homeRank) undeveloped++
        else if (p.type === 'n' || p.type === 'b') developed++
      } else {
        if (p.type === 'k') oppKingSq = sq
        else oppMat[p.type]++
      }
    }
  }

  // Lịch sử để check đã nhập thành chưa
  const history = game.history({ verbose: true })
  const myKingMoves = history.filter(m => m.color === myColor && m.piece === 'k')
  const hasCastled = myKingMoves.some(m => m.flags.includes('k') || m.flags.includes('q'))
  myKingMoved = myKingMoves.length > 0 && !hasCastled

  const materialMe = Object.entries(myMat).reduce((s, [t, n]) => s + n * PIECE_VALUE[t], 0)
  const materialOpp = Object.entries(oppMat).reduce((s, [t, n]) => s + n * PIECE_VALUE[t], 0)
  const materialDiff = materialMe - materialOpp

  // Phase: opening / middlegame / endgame dựa trên tổng material
  const totalMat = materialMe + materialOpp
  let phase = 'middlegame'
  if (history.length < 12 && undeveloped >= 1) phase = 'opening'
  else if (totalMat <= 20 || (!myMat.q && !oppMat.q && totalMat <= 28)) phase = 'endgame'

  return {
    turn: game.turn(),
    isMyTurn: game.turn() === myColor,
    inCheck: game.inCheck(),
    moveCount: history.length,
    phase,
    myMat, oppMat,
    materialMe, materialOpp, materialDiff,
    myKingSq, oppKingSq,
    hasCastled, myKingMoved,
    undeveloped, developed,
  }
}

// === Phân loại ý định câu hỏi ===
function classifyIntent(rawText) {
  const t = rawText.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const has = (...kws) => kws.some(k => t.includes(k))

  if (has('chao', 'hi ', 'hello', 'xin chao')) return 'greet'
  if (has('luat', 'di nhu the nao', 'di ra sao', 'di kieu gi')) return 'rules'
  if (has('khai cuoc', 'mo dau', 'opening', 'dau van')) return 'opening'
  if (has('tan cuoc', 'endgame', 'cuoi van')) return 'endgame'
  if (has('nhap thanh', 'castle', 'castling')) return 'castle'
  if (has('phong thu', 'phong ngu', 'thu', 'an toan', 'bao ve')) return 'defense'
  if (has('tan cong', 'cong', 'attack', 'mate', 'chieu het')) return 'attack'
  if (has('material', 'quan', 'doi quan', 'tro luc', 'so quan')) return 'material'
  if (has('vi tri', 'the co', 'danh gia', 'tinh hinh', 'sao roi', 'the nao', 'the nay')) return 'position'
  if (has('vua', 'king', 'an toan vua')) return 'king-safety'
  if (has('tot', 'pawn', 'cau truc')) return 'pawn'
  if (has('hau', 'queen')) return 'queen'
  if (has('phat trien', 'development')) return 'development'
  if (has('trung tam', 'center')) return 'center'
  if (has('lam gi', 'nen lam', 'tiep theo', 'next', 'goi y', 'di gi', 'di dau', 'nuoc nao')) return 'what-to-do'
  if (has('thang', 'thua', 'co thang khong', 'co thua khong')) return 'winning'
  if (has('sai', 'loi', 'blunder', 'co hop ly')) return 'mistake'
  return 'general'
}

// === Sinh câu trả lời theo intent + analysis ===
function describeMaterial(mat) {
  const order = ['q', 'r', 'b', 'n', 'p']
  const parts = order.map(t => mat[t] > 0 ? `${mat[t]} ${PIECE_NAME[t]}` : null).filter(Boolean)
  return parts.join(', ') || 'không còn quân nào'
}

export function answer(question, fen, myColor = 'w') {
  if (!question || !question.trim()) return null
  const intent = classifyIntent(question)
  const a = analyzePosition(fen, myColor)
  const diff = a.materialDiff
  const matLine =
    diff > 0 ? `bạn đang hơn ${diff} điểm quân` :
    diff < 0 ? `bạn đang kém ${-diff} điểm quân` :
    'hai bên cân bằng về quân'

  switch (intent) {
    case 'greet':
      return 'Chào bạn! Hãy hỏi tôi về thế cờ, khai cuộc, phòng thủ, hay nguyên tắc chung — tôi không gợi ý nước đi cụ thể nhưng sẽ giúp bạn suy luận.'

    case 'rules':
      return 'Mỗi quân có cách đi riêng: tốt đi thẳng ăn chéo, mã đi chữ L, tượng đi chéo, xe đi thẳng, hậu đi mọi hướng, vua đi 1 ô. Mục tiêu là chiếu hết vua đối phương.'

    case 'opening':
      if (a.phase !== 'opening') return 'Bạn đã qua giai đoạn khai cuộc rồi. Ba nguyên tắc khai cuộc: kiểm soát trung tâm, phát triển mã/tượng nhanh, nhập thành sớm để vua an toàn.'
      return `Đang giai đoạn khai cuộc (${a.moveCount} nước). ${a.undeveloped > 0 ? `Bạn còn ${a.undeveloped} quân nhẹ chưa phát triển. ` : ''}Ưu tiên: kiểm soát trung tâm, đưa mã ra trước tượng, đừng di chuyển cùng một quân hai lần khi còn quân chưa ra, và nhập thành sớm.`

    case 'endgame':
      if (a.phase !== 'endgame') return 'Bạn chưa vào tàn cuộc. Khi chuẩn bị tàn cuộc, hãy đổi quân khi đang hơn quân, giữ tốt thông, và đưa vua tham gia chiến đấu.'
      return `Đang giai đoạn tàn cuộc, ${matLine}. Nguyên tắc: vua trở thành quân chủ lực, tốt thông là tài sản lớn, đổi quân đơn giản hóa khi đang hơn.`

    case 'castle':
      if (a.hasCastled) return 'Bạn đã nhập thành rồi. Giờ tập trung phát huy hai xe trên cột mở.'
      if (a.myKingMoved) return 'Vua đã di chuyển nên bạn không thể nhập thành nữa. Cố gắng giữ vua sau hàng tốt và tránh đường chéo dài.'
      return 'Nhập thành đưa vua vào góc an toàn và kết nối hai xe. Quy tắc: vua chưa đi, xe chưa đi, không có quân giữa vua và xe, vua không qua ô bị tấn công.'

    case 'defense':
      if (a.inCheck) return 'Bạn đang bị chiếu! Ưu tiên thoát chiếu trước. Có 3 cách: di chuyển vua, chặn đường chiếu, hoặc bắt quân đang chiếu.'
      return `${matLine}. Để phòng thủ tốt: ${a.hasCastled ? 'giữ lá chắn tốt trước vua, không đẩy tốt cánh vua bừa bãi' : 'nhập thành sớm để đưa vua khỏi trung tâm'}, kiểm tra mọi quân của mình có được bảo vệ không.`

    case 'attack':
      if (a.materialDiff < -3) return 'Bạn đang kém quân khá nhiều, tấn công liều có thể tệ hơn. Cân nhắc phòng thủ chắc và chờ cơ hội phản công.'
      return 'Tấn công cần điều kiện: nhiều quân hướng về vua đối phương hơn quân phòng thủ, có cột mở, vua đối phương kém an toàn. Đừng tấn công khi bạn chưa phát triển xong.'

    case 'material':
      return `${matLine}. Quân của bạn: ${describeMaterial(a.myMat)}. Đối thủ: ${describeMaterial(a.oppMat)}.`

    case 'position':
      return `${a.phase === 'opening' ? 'Khai cuộc' : a.phase === 'endgame' ? 'Tàn cuộc' : 'Trung cuộc'} — ${matLine}. ${a.inCheck ? 'Bạn đang bị chiếu! ' : ''}${a.hasCastled ? 'Vua đã nhập thành. ' : (a.myKingMoved ? 'Vua đã mất quyền nhập thành. ' : 'Bạn chưa nhập thành. ')}${a.undeveloped > 0 ? `Còn ${a.undeveloped} quân nhẹ chưa phát triển.` : ''}`

    case 'king-safety':
      if (a.inCheck) return 'Vua đang bị chiếu — xử lý ngay!'
      if (!a.hasCastled && a.phase !== 'endgame') return 'Vua bạn chưa nhập thành. Trong trung cuộc, vua ở trung tâm rất dễ bị tấn công khi đường chéo và cột mở.'
      if (a.phase === 'endgame') return 'Tàn cuộc thì vua nên ra giữa bàn để tham gia chiến đấu — không cần giấu nữa.'
      return 'Vua đã an toàn. Giữ cấu trúc tốt phía trước, đừng đẩy tốt cánh vua trừ khi có lý do rõ ràng.'

    case 'pawn':
      return `Tốt là "linh hồn của cờ vua" (Philidor). Tránh tốt đôi, tốt cô lập. Tốt thông trong tàn cuộc thường thắng. ${a.myMat.p < a.oppMat.p ? `Bạn ít hơn ${a.oppMat.p - a.myMat.p} tốt — chú ý cấu trúc.` : ''}`

    case 'queen':
      if (a.phase === 'opening' && a.moveCount < 10) return 'Đừng đưa hậu ra sớm. Hậu mạnh nhưng dễ bị các quân nhẹ đối phương đuổi và bạn mất tempo.'
      return 'Hậu là quân mạnh nhất — kết hợp với xe hoặc tượng để tạo đe dọa kép. Đừng để hậu cô đơn lao vào lãnh thổ đối phương.'

    case 'development':
      if (a.undeveloped === 0) return 'Tất cả mã và tượng của bạn đã phát triển. Tốt!'
      return `Bạn còn ${a.undeveloped} mã/tượng chưa ra khỏi hàng cuối. Trong khai cuộc, ưu tiên phát triển trước khi tấn công.`

    case 'center':
      return 'Kiểm soát trung tâm (e4, e5, d4, d5) cho quân nhiều ô hoạt động hơn. Có thể chiếm trung tâm bằng tốt (cổ điển) hoặc bằng quân (siêu hiện đại).'

    case 'what-to-do':
      if (a.inCheck) return 'Bạn đang bị chiếu — thoát chiếu trước!'
      if (a.phase === 'opening' && a.undeveloped > 0) return `Đang khai cuộc, còn ${a.undeveloped} quân nhẹ chưa phát triển. Ưu tiên phát triển và ${a.hasCastled ? 'tìm cách kích hoạt xe' : 'nhập thành'}.`
      if (!a.hasCastled && !a.myKingMoved && a.phase !== 'endgame') return 'Cân nhắc nhập thành để vua an toàn.'
      if (a.phase === 'endgame') return 'Tàn cuộc — đưa vua tham gia, tạo tốt thông, đổi quân nếu đang hơn.'
      return `${matLine}. Tìm xem có quân nào của bạn không được bảo vệ không, và quân nào của đối phương đang treo. Đừng vội — kiểm tra mọi đe dọa của đối phương trước khi đi.`

    case 'winning':
      if (Math.abs(diff) <= 1) return `Thế cờ khá cân bằng (${matLine}). Kết quả phụ thuộc vào ai chơi chính xác hơn.`
      if (diff >= 3) return `Bạn đang hơn ${diff} điểm quân — về lý thuyết là ưu thế lớn. Cố gắng đổi quân, tránh sai lầm.`
      if (diff <= -3) return `Bạn đang kém ${-diff} điểm quân. Cần tìm phản đòn chiến thuật hoặc tạo phức tạp để đối thủ sai.`
      return matLine

    case 'mistake':
      return 'Sai lầm thường gặp: bỏ quân không bảo vệ, bỏ qua đe dọa của đối phương, đẩy tốt trước vua, đưa hậu ra sớm. Trước mỗi nước hãy hỏi: nếu mình đi vậy, đối thủ có thể bắt quân nào của mình không?'

    default:
      return `${matLine}, đang ${a.phase === 'opening' ? 'khai cuộc' : a.phase === 'endgame' ? 'tàn cuộc' : 'trung cuộc'}. Bạn có thể hỏi về: thế cờ, khai cuộc, nhập thành, an toàn vua, tốt, phát triển, hay "tôi nên làm gì".`
  }
}

export const SUGGESTED_QUESTIONS = [
  'Thế cờ thế nào?',
  'Tôi nên làm gì?',
  'An toàn vua ra sao?',
  'Có nên tấn công không?',
  'Cấu trúc tốt thế nào?',
]
