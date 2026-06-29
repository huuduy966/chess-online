import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import LocalGame from './pages/LocalGame.jsx'
import AIGame from './pages/AIGame.jsx'
import OnlineLobby from './pages/OnlineLobby.jsx'
import OnlineGame from './pages/OnlineGame.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import Review from './pages/Review.jsx'
import BackButton from './components/BackButton.jsx'
import SoundToggle from './components/SoundToggle.jsx'
import { useAuth } from './utils/auth.jsx'
import { useTheme } from './utils/theme.jsx'

export default function App() {
  const { user, profile, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const showBack = location.pathname !== '/'
  const backTo = location.pathname.startsWith('/online/') ? '/online' : null
  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="logo">♞ Chess Online</Link>
        <div className="auth-links">
          <SoundToggle />
          <button className="theme-toggle" onClick={toggle} title={theme === 'dark' ? 'Chuyển sáng' : 'Chuyển tối'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <Link to="/profile" className="auth-user">
                👤 {user} <span className="elo-badge">{profile?.elo ?? '—'}</span>
              </Link>
              <button className="auth-link auth-btn" onClick={logout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-link">Đăng nhập</Link>
              <Link to="/register" className="auth-link">Đăng ký</Link>
            </>
          )}
        </div>
      </nav>
      {showBack && (
        <div className="back-bar">
          <BackButton to={backTo} />
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/local" element={<LocalGame />} />
        <Route path="/ai" element={<AIGame />} />
        <Route path="/online" element={<OnlineLobby />} />
        <Route path="/online/:roomId" element={<OnlineGame />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </div>
  )
}
