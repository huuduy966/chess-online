export default function ResultModal({
  open,
  title,            // 'Thắng' | 'Thua' | 'Hòa' | string
  subtitle,         // VD: 'Chiếu hết' | 'Đối thủ đầu hàng'
  playerName,
  prevElo,
  delta,            // số: cộng hoặc trừ
  onRematch,        // fn | null (null = ẩn nút)
  rematchDisabled,
  rematchLabel,
  onReview,         // fn | null
  onHome,
}) {
  if (!open) return null
  const newElo = prevElo != null && delta != null ? prevElo + delta : null
  const deltaSign = delta > 0 ? '+' : ''
  const deltaCls = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw'

  return (
    <div className="modal-overlay">
      <div className="modal result-modal">
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {playerName && (
          <div className="result-row">
            <div className="muted">Người chơi</div>
            <div className="result-name">{playerName}</div>
          </div>
        )}
        {newElo != null && (
          <div className="result-row">
            <div className="muted">Elo</div>
            <div className="result-elo">
              {prevElo} → <strong>{newElo}</strong>
              <span className={`elo-delta ${deltaCls}`}> {deltaSign}{delta}</span>
            </div>
          </div>
        )}
        <div className="result-actions">
          {onRematch && (
            <button className="btn" onClick={onRematch} disabled={rematchDisabled}>
              {rematchLabel || 'Tái đấu'}
            </button>
          )}
          {onReview && (
            <button className="btn secondary" onClick={onReview}>Xem lại trận</button>
          )}
          {onHome && (
            <button className="btn secondary" onClick={onHome}>Về sảnh</button>
          )}
        </div>
      </div>
    </div>
  )
}
