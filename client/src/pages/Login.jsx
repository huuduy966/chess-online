import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/auth.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) return setError('Nhập đủ tên đăng nhập và mật khẩu')

    const users = JSON.parse(localStorage.getItem('chess-users') || '{}')
    const u = users[username.trim().toLowerCase()]
    if (!u || u.password !== password) return setError('Sai tên đăng nhập hoặc mật khẩu')

    login(u.username)
    navigate('/')
  }

  return (
    <div className="lobby">
      <form className="lobby-card auth-card" onSubmit={submit}>
        <h2>Đăng nhập</h2>
        <label className="muted">Tên đăng nhập</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoFocus />
        <label className="muted">Mật khẩu</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <div className="auth-actions">
          <button className="btn" type="submit">Đăng nhập</button>
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--accent)' }}>Đăng ký</Link>
        </p>
        {error && <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}
      </form>
    </div>
  )
}
