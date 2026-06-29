export default function StatusBar({ game, extraText }) {
  let className = 'status'
  let text = ''

  if (game.isGameOver()) {
    className += ' game-over'
    if (game.isCheckmate()) text = `Chiếu hết — ${game.turn() === 'w' ? 'Đen' : 'Trắng'} thắng!`
    else if (game.isStalemate()) text = 'Hết nước đi — Hòa cờ'
    else if (game.isThreefoldRepetition()) text = 'Lặp 3 lần — Hòa cờ'
    else if (game.isInsufficientMaterial()) text = 'Không đủ quân — Hòa cờ'
    else if (game.isDraw()) text = 'Hòa cờ'
  } else {
    className += game.turn() === 'w' ? ' turn-w' : ' turn-b'
    text = `Lượt: ${game.turn() === 'w' ? 'Trắng' : 'Đen'}${game.inCheck() ? ' (Bị chiếu!)' : ''}`
  }

  return (
    <div className={className}>
      {text}
      {extraText && <div className="muted" style={{ marginTop: '0.3rem' }}>{extraText}</div>}
    </div>
  )
}
