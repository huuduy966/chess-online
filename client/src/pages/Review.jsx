import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { analyzeGame, CLASS_LABEL, CLASS_COLOR } from '../utils/analysis.js'

const ORDER = ['brilliant', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']

export default function Review() {
  const navigate = useNavigate()
  const { state } = useLocation()
  // state = { sanMoves: [], whiteName, blackName, myColor, depth? }
  const sanMoves = state?.sanMoves
  const [analysis, setAnalysis] = useState(null)
  const [ply, setPly] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sanMoves || sanMoves.length === 0) { setLoading(false); return }
    setLoading(true)
    // Cho UI thấy loading rồi mới chạy phân tích (block CPU)
    const id = setTimeout(() => {
      const result = analyzeGame(sanMoves, state?.depth ?? 2)
      setAnalysis(result)
      setLoading(false)
    }, 50)
    return () => clearTimeout(id)
  }, [sanMoves, state?.depth])

  // Vị trí hiện tại dựa trên ply
  const currentFen = useMemo(() => {
    if (!sanMoves) return new Chess().fen()
    const g = new Chess()
    for (let i = 0; i < ply; i++) {
      try { g.move(sanMoves[i]) } catch { break }
    }
    return g.fen()
  }, [sanMoves, ply])

  if (!sanMoves || sanMoves.length === 0) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Không có dữ liệu ván đấu</h2>
          <button className="btn" onClick={() => navigate('/')}>Về trang chủ</button>
        </div>
      </div>
    )
  }

  if (loading || !analysis) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Đang phân tích ván đấu...</h2>
          <div className="searching"><div className="spinner" /></div>
          <p className="muted">Engine đang đánh giá {sanMoves.length} nước đi</p>
        </div>
      </div>
    )
  }

  const currentMove = ply > 0 ? analysis.moves[ply - 1] : null
  const whiteName = state?.whiteName || 'Trắng'
  const blackName = state?.blackName || 'Đen'

  return (
    <div className="review-page">
      <div className="panel">
        <h3>Người chơi</h3>
        <div className="acc-row">
          <span>⚪ {whiteName}</span>
          <span className="acc-num">{analysis.accuracy.w}%</span>
        </div>
        <div className="acc-row">
          <span>⚫ {blackName}</span>
          <span className="acc-num">{analysis.accuracy.b}%</span>
        </div>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Độ chính xác (Accuracy)</p>

        <h3>Thống kê lỗi</h3>
        <div className="stats-table">
          <div className="stats-head">
            <span></span><span>⚪</span><span>⚫</span>
          </div>
          {ORDER.map(cls => (
            <div className="stats-row" key={cls}>
              <span><span className="dot" style={{ background: CLASS_COLOR[cls] }} /> {CLASS_LABEL[cls]}</span>
              <span>{analysis.stats.w[cls]}</span>
              <span>{analysis.stats.b[cls]}</span>
            </div>
          ))}
        </div>
        <button className="btn secondary" onClick={() => navigate(-1)}>← Quay lại</button>
        <button className="btn secondary" onClick={() => navigate('/')}>Trang chủ</button>
      </div>

      <div className="review-center">
        <div className="board-inner">
          <Chessboard
            position={currentFen}
            arePiecesDraggable={false}
            customDarkSquareStyle={{ backgroundColor: '#769656' }}
            customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          />
        </div>
        <div className="review-controls">
          <button className="btn secondary" onClick={() => setPly(0)} disabled={ply === 0}>⏮</button>
          <button className="btn secondary" onClick={() => setPly(p => Math.max(0, p - 1))} disabled={ply === 0}>◀</button>
          <span className="muted">{ply} / {sanMoves.length}</span>
          <button className="btn secondary" onClick={() => setPly(p => Math.min(sanMoves.length, p + 1))} disabled={ply === sanMoves.length}>▶</button>
          <button className="btn secondary" onClick={() => setPly(sanMoves.length)} disabled={ply === sanMoves.length}>⏭</button>
        </div>
        {currentMove && (
          <div className="current-move-card" style={{ borderColor: CLASS_COLOR[currentMove.classification] }}>
            <div className="cm-head">
              <strong>{Math.ceil((currentMove.ply + 1) / 2)}. {currentMove.turn === 'w' ? '' : '…'}{currentMove.san}</strong>
              <span className="cm-class" style={{ color: CLASS_COLOR[currentMove.classification] }}>
                {CLASS_LABEL[currentMove.classification]}
              </span>
            </div>
            <div className="muted" style={{ fontSize: '0.9rem' }}>
              {currentMove.cpLoss > 0
                ? `Mất ${Math.round(currentMove.cpLoss)} centipawn so với nước tốt nhất`
                : 'Nước đi của engine'}
              {currentMove.bestSAN && currentMove.bestSAN !== currentMove.san && (
                <> · Engine đề nghị <strong>{currentMove.bestSAN}</strong></>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Danh sách nước đi</h3>
        <div className="move-list">
          {analysis.moves.map((m, i) => (
            <button
              key={i}
              className={`move-list-item ${ply === i + 1 ? 'active' : ''}`}
              onClick={() => setPly(i + 1)}
            >
              <span className="muted" style={{ width: 28 }}>{Math.ceil((i + 1) / 2)}.{m.turn === 'b' ? '..' : ''}</span>
              <span style={{ flex: 1 }}>{m.san}</span>
              <span className="dot" style={{ background: CLASS_COLOR[m.classification] }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
