import { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { socket } from '../utils/socket.js'
import { useAuth } from '../utils/auth.jsx'
import { DEFAULT_ELO } from '../utils/elo.js'
import { TIME_CONTROLS, DEFAULT_TC_ID, getTC } from '../utils/timeControl.js'

export default function OnlineLobby() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [tcId, setTcId] = useState(() => localStorage.getItem('chess-tc') || DEFAULT_TC_ID)
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(socket.connected)
  const [searching, setSearching] = useState(false)
  const [waited, setWaited] = useState(0)
  const tickRef = useRef(null)

  useEffect(() => {
    if (!socket.connected) socket.connect()
    const onConn = () => setConnected(true)
    const onDisc = () => { setConnected(false); setSearching(false) }
    const onMatch = ({ roomId }) => {
      setSearching(false)
      navigate(`/online/${roomId}`)
    }
    socket.on('connect', onConn)
    socket.on('disconnect', onDisc)
    socket.on('match-found', onMatch)
    return () => {
      socket.off('connect', onConn)
      socket.off('disconnect', onDisc)
      socket.off('match-found', onMatch)
    }
  }, [navigate])

  useEffect(() => {
    if (!searching) {
      clearInterval(tickRef.current)
      setWaited(0)
      return
    }
    const start = Date.now()
    tickRef.current = setInterval(() => setWaited(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(tickRef.current)
  }, [searching])

  const myElo = profile?.elo ?? DEFAULT_ELO
  const tc = useMemo(() => getTC(tcId), [tcId])
  const tcPayload = { initialMs: tc.initialMs, incrementMs: tc.incrementMs }

  useEffect(() => { localStorage.setItem('chess-tc', tcId) }, [tcId])

  // Chưa đăng nhập → khóa toàn bộ tính năng online
  if (!user) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <h2>Chơi online</h2>
          <p className="muted">Bạn cần đăng nhập để chơi online.</p>
          <Link to="/login" className="btn" style={{ textAlign: 'center', textDecoration: 'none' }}>Đăng nhập</Link>
          <Link to="/register" className="btn secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>Đăng ký</Link>
        </div>
      </div>
    )
  }

  const findMatch = () => {
    setError('')
    socket.emit('find-match', { name: user, elo: myElo, tc: tcPayload }, (res) => {
      if (!res?.ok) return setError(res?.error || 'Lỗi không xác định')
      setSearching(true)
    })
  }

  const cancelMatch = () => socket.emit('cancel-match', {}, () => setSearching(false))

  const create = () => {
    setError('')
    socket.emit('create-room', { name: user, elo: myElo, tc: tcPayload }, (res) => {
      if (!res?.ok) return setError(res?.error || 'Lỗi không xác định')
      navigate(`/online/${res.roomId}`)
    })
  }

  const join = () => {
    setError('')
    if (!roomId.trim()) return setError('Nhập mã phòng')
    socket.emit('join-room', { roomId: roomId.trim().toUpperCase(), name: user, elo: myElo }, (res) => {
      if (!res?.ok) return setError(res?.error || 'Lỗi không xác định')
      navigate(`/online/${res.roomId}`)
    })
  }

  const groups = useMemo(() => {
    const g = {}
    TIME_CONTROLS.forEach(t => { (g[t.group] ||= []).push(t) })
    return g
  }, [])

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h2>Chơi online</h2>
        <p className="muted">Server: {connected ? '🟢 đã kết nối' : '🔴 chưa kết nối'}</p>
        <p className="muted">Người chơi: <strong>{user}</strong> · Elo <strong>{myElo}</strong></p>

        <label className="muted">Thời gian</label>
        <div className="tc-picker">
          {Object.entries(groups).map(([group, items]) => (
            <div className="tc-group" key={group}>
              <div className="tc-group-label">{group}</div>
              <div className="tc-options">
                {items.map(t => (
                  <button
                    key={t.id}
                    className={`tc-option ${tcId === t.id ? 'active' : ''}`}
                    onClick={() => setTcId(t.id)}
                    disabled={searching}
                    type="button"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {searching ? (
          <div className="searching">
            <div className="spinner" />
            <div>Đang tìm đối thủ phù hợp...</div>
            <div className="muted">Thời gian chờ: {waited}s · {tc.label}</div>
            <button className="btn danger" onClick={cancelMatch}>Hủy tìm trận</button>
          </div>
        ) : (
          <button className="btn" onClick={findMatch} disabled={!connected}>
            🔍 Tìm trận tự động · {tc.label}
          </button>
        )}

        <div className="muted" style={{ textAlign: 'center' }}>— hoặc tạo phòng riêng —</div>

        <button className="btn secondary" onClick={create} disabled={!connected || searching}>
          Tạo phòng mới ({tc.label})
        </button>

        <label className="muted">Tham gia bằng mã phòng</label>
        <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="VD: AB12CD" disabled={searching} />
        <button className="btn secondary" onClick={join} disabled={!connected || !roomId.trim() || searching}>
          Vào phòng
        </button>

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  )
}
