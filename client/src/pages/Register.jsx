import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/auth.jsx'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const u = username.trim()
    if (!u || !password) return setError('Nhập đủ tên đăng nhập và mật khẩu')
    if (u.length < 3) return setError('Tên đăng nhập tối thiểu 3 ký tự')
    if (password.length < 4) return setError('Mật khẩu tối thiểu 4 ký tự')
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp')

    const users = JSON.parse(localStorage.getItem('chess-users') || '{}')
    const key = u.toLowerCase()
    if (users[key]) return setError('Tên đăng nhập đã tồn tại, vui lòng chọn tên khác')

    users[key] = { username: u, password, createdAt: Date.now() }
    localStorage.setItem('chess-users', JSON.stringify(users))
    login(u)
    navigate('/')
  }

  return (
    <div className="lobby">
      <form className="lobby-card auth-card" onSubmit={submit}>
        <h2>Đăng ký</h2>
        <label className="muted">Tên đăng nhập</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoFocus />
        <label className="muted">Mật khẩu</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <label className="muted">Xác nhận mật khẩu</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <div className="auth-actions">
          <button className="btn" type="submit">Đăng ký</button>
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--accent)' }}>Đăng nhập</Link>
        </p>
        {error && <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}
      </form>
    </div>
  )
}
