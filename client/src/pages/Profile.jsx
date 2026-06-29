import { useAuth } from '../utils/auth.jsx'
import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'

function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const MODE_LABEL = { ai: 'Đấu AI', online: 'Online' }

function computeStreak(history) {
  // history: nước mới nhất ở đầu
  if (!history || history.length === 0) return { type: null, count: 0 }
  const first = history[0]
  const type = first.score === 1 ? 'win' : first.score === 0 ? 'loss' : 'draw'
  let count = 0
  for (const h of history) {
    const t = h.score === 1 ? 'win' : h.score === 0 ? 'loss' : 'draw'
    if (t === type) count++
    else break
  }
  return { type, count }
}

function computeStats(history) {
  if (!history || history.length === 0) return { peakElo: null, vsAI: 0, vsOnline: 0 }
  let peak = 0
  let vsAI = 0, vsOnline = 0
  for (const h of history) {
    if (h.newElo > peak) peak = h.newElo
    if (h.mode === 'ai') vsAI++
    else if (h.mode === 'online') vsOnline++
  }
  return { peakElo: peak, vsAI, vsOnline }
}

export default function Profile() {
  const { user, profile } = useAuth()
  const [filter, setFilter] = useState('all') // all | ai | online | win | loss

  const history = profile?.history || []
  const filtered = useMemo(() => {
    if (filter === 'all') return history
    if (filter === 'ai' || filter === 'online') return history.filter(h => h.mode === filter)
    if (filter === 'win') return history.filter(h => h.score === 1)
    if (filter === 'loss') return history.filter(h => h.score === 0)
    return history
  }, [history, filter])

  const streak = useMemo(() => computeStreak(history), [history])
  const extras = useMemo(() => computeStats(history), [history])

  if (!user) {
    return (
      <div className="lobby">
        <div className="lobby-card auth-card">
          <h2>Chưa đăng nhập</h2>
          <p className="muted" style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--accent)' }}>Đăng nhập</Link> để xem Elo và lịch sử.
          </p>
        </div>
      </div>
    )
  }
  if (!profile) return <div className="lobby"><div className="lobby-card"><h2>Đang tải...</h2></div></div>

  const totalGames = (profile.wins || 0) + (profile.losses || 0) + (profile.draws || 0)
  const winRate = totalGames > 0 ? Math.round(((profile.wins || 0) / totalGames) * 100) : 0

  const streakLabel =
    streak.count === 0 ? '—'
    : streak.type === 'win' ? `🔥 Thắng ${streak.count}`
    : streak.type === 'loss' ? `💔 Thua ${streak.count}`
    : `🤝 Hòa ${streak.count}`

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-identity">
            <div className="avatar">{profile.username[0]?.toUpperCase()}</div>
            <div>
              <h2>{profile.username}</h2>
              <p className="muted">Tham gia từ {profile.createdAt ? fmtDate(profile.createdAt) : '—'}</p>
            </div>
          </div>
          <div className="profile-elo">
            <div className="elo-big">{profile.elo}</div>
            <div className="muted">Elo hiện tại</div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat"><div className="stat-num win">{profile.wins || 0}</div><div className="muted">Thắng</div></div>
          <div className="stat"><div className="stat-num draw">{profile.draws || 0}</div><div className="muted">Hòa</div></div>
          <div className="stat"><div className="stat-num loss">{profile.losses || 0}</div><div className="muted">Thua</div></div>
          <div className="stat"><div className="stat-num">{winRate}%</div><div className="muted">Tỉ lệ thắng</div></div>
        </div>

        <div className="profile-stats">
          <div className="stat"><div className="stat-num">{totalGames}</div><div className="muted">Tổng trận</div></div>
          <div className="stat"><div className="stat-num">{extras.peakElo ?? profile.elo}</div><div className="muted">Elo cao nhất</div></div>
          <div className="stat"><div className="stat-num">{extras.vsAI}</div><div className="muted">Vs AI</div></div>
          <div className="stat"><div className="stat-num">{extras.vsOnline}</div><div className="muted">Online</div></div>
        </div>

        <div className="profile-stats">
          <div className="stat" style={{ gridColumn: 'span 4' }}>
            <div className="stat-num">{streakLabel}</div>
            <div className="muted">Chuỗi hiện tại</div>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-header">
          <h3>Lịch sử trận đấu</h3>
          <div className="row" style={{ gap: '0.4rem', flex: '0 0 auto' }}>
            {['all', 'online', 'ai', 'win', 'loss'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Tất cả' : f === 'online' ? 'Online' : f === 'ai' ? 'AI' : f === 'win' ? 'Thắng' : 'Thua'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="muted">
            {history.length === 0
              ? 'Chưa có trận nào. Vào Chơi với máy hoặc Chơi online để bắt đầu.'
              : 'Không có trận nào khớp bộ lọc.'}
          </p>
        ) : (
          <div className="history-list">
            {filtered.map((h, i) => {
              const label = h.score === 1 ? 'Thắng' : h.score === 0 ? 'Thua' : 'Hòa'
              const cls = h.score === 1 ? 'win' : h.score === 0 ? 'loss' : 'draw'
              const sign = h.delta > 0 ? '+' : ''
              return (
                <div className="history-row" key={i}>
                  <div className={`history-result ${cls}`}>{label}</div>
                  <div>
                    <div>{MODE_LABEL[h.mode] || h.mode}{h.opponent ? ` · ${h.opponent}` : ''}</div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      Đối thủ Elo {h.oppElo} · {fmtTime(h.ts)}
                    </div>
                  </div>
                  <div className={`history-delta ${cls}`}>{sign}{h.delta}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
