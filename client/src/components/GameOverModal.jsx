export default function GameOverModal({ game, onRestart, onHome, customMessage }) {
  if (!game.isGameOver() && !customMessage) return null
  let title = customMessage?.title || ''
  let subtitle = customMessage?.subtitle || ''
  if (!customMessage) {
    if (game.isCheckmate()) {
      title = 'Chiếu hết!'
      subtitle = `${game.turn() === 'w' ? 'Đen' : 'Trắng'} thắng`
    } else if (game.isDraw()) {
      title = 'Hòa cờ'
      if (game.isStalemate()) subtitle = 'Hết nước đi'
      else if (game.isThreefoldRepetition()) subtitle = 'Lặp lại 3 lần'
      else if (game.isInsufficientMaterial()) subtitle = 'Không đủ quân'
    }
  }
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
        <div className="row">
          {onRestart && <button className="btn" onClick={onRestart}>Chơi lại</button>}
          {onHome && <button className="btn secondary" onClick={onHome}>Về trang chủ</button>}
        </div>
      </div>
    </div>
  )
}
