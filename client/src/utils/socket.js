import { io } from 'socket.io-client'

// Mặc định: nếu chạy production (server serve client) → cùng origin
// Dev: VITE_SERVER_URL hoặc fallback localhost:3001
const URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001')

export const socket = io(URL, { autoConnect: false })
