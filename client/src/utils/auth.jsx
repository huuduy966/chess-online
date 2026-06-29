import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DEFAULT_ELO, eloDelta } from './elo.js'

const AuthContext = createContext(null)

function readUsers() {
  return JSON.parse(localStorage.getItem('chess-users') || '{}')
}
function writeUsers(users) {
  localStorage.setItem('chess-users', JSON.stringify(users))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => localStorage.getItem('chess-current-user') || null)
  const [profile, setProfile] = useState(null)

  const refreshProfile = useCallback((name) => {
    if (!name) { setProfile(null); return }
    const users = readUsers()
    const key = name.toLowerCase()
    const u = users[key]
    if (!u) { setProfile(null); return }
    if (u.elo == null) {
      u.elo = DEFAULT_ELO
      u.wins = u.wins ?? 0
      u.losses = u.losses ?? 0
      u.draws = u.draws ?? 0
      u.history = u.history ?? []
      users[key] = u
      writeUsers(users)
    }
    setProfile({ ...u })
  }, [])

  useEffect(() => { refreshProfile(user) }, [user, refreshProfile])

  useEffect(() => {
    const onStorage = () => {
      const cur = localStorage.getItem('chess-current-user') || null
      setUser(cur)
      refreshProfile(cur)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('chess-auth-changed', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('chess-auth-changed', onStorage)
    }
  }, [refreshProfile])

  const login = useCallback((username) => {
    localStorage.setItem('chess-current-user', username)
    localStorage.setItem('chess-name', username)
    setUser(username)
    window.dispatchEvent(new Event('chess-auth-changed'))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('chess-current-user')
    setUser(null)
    setProfile(null)
    window.dispatchEvent(new Event('chess-auth-changed'))
  }, [])

  // Ghi kết quả 1 trận: score 1/0.5/0, oppElo = Elo đối thủ, mode = 'ai'|'online', extra meta tùy ý
  const recordGame = useCallback((score, oppElo, mode, meta = {}) => {
    if (!user) return null
    const users = readUsers()
    const key = user.toLowerCase()
    const u = users[key]
    if (!u) return null
    const prevElo = u.elo ?? DEFAULT_ELO
    const delta = eloDelta(prevElo, oppElo, score)
    u.elo = prevElo + delta
    if (score === 1) u.wins = (u.wins || 0) + 1
    else if (score === 0) u.losses = (u.losses || 0) + 1
    else u.draws = (u.draws || 0) + 1
    u.history = u.history || []
    u.history.unshift({
      ts: Date.now(), mode, score, oppElo, delta, newElo: u.elo, ...meta,
    })
    if (u.history.length > 50) u.history.length = 50
    users[key] = u
    writeUsers(users)
    setProfile({ ...u })
    window.dispatchEvent(new Event('chess-auth-changed'))
    return { delta, newElo: u.elo, prevElo }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, recordGame, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
