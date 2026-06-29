import express from 'express'
import http from 'http'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'
import { Chess } from 'chess.js'
import { chooseBestMove } from './ai.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = path.resolve(__dirname, '../client/dist')

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

const PORT = process.env.PORT || 3001

// Time control: { initialMs, incrementMs }. initialMs=0 → không tính giờ.
function normalizeTC(tc) {
  const initialMs = Math.max(0, Math.min(7200000, Number(tc?.initialMs) || 0))
  const incrementMs = Math.max(0, Math.min(60000, Number(tc?.incrementMs) || 0))
  return { initialMs, incrementMs }
}
function tcKey(tc) { return `${tc.initialMs}_${tc.incrementMs}` }

// roomId -> { game, players, spectators, ended, tc, clocks: {w,b}, lastMoveAt, clockStarted }
const rooms = new Map()
let queue = [] // [{ id, name, elo, tc, joinedAt }]
const QUEUE_TIMEOUT_MS = 10000
const TICK_MS = 1000
const CLOCK_TICK_MS = 250

const BOT_NAMES = [
  'Oliver', 'Emma', 'Lucas', 'Sophia', 'Mateo',
  'Isabella', 'Ethan', 'Mia', 'Liam', 'Aria',
  'Noah', 'Chloe', 'Leon', 'Hana', 'Dimitri',
  'Yuki', 'Pablo', 'Elena', 'Felix', 'Nadia',
  'Magnus', 'Viktor', 'Kanade', 'Rafael', 'Ingrid',
]
const randomBotName = () => BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
const randomBotElo = (e) => Math.max(400, Math.min(2400, e + Math.floor(Math.random() * 101) - 50))
const difficultyFromElo = (e) => e < 1000 ? 'easy' : e < 1500 ? 'medium' : 'hard'
const newRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase()

function liveClocks(r) {
  // Tính thời gian còn lại realtime cho bên đang đi
  if (!r.clockStarted || r.ended || r.tc.initialMs === 0) return { ...r.clocks }
  const turn = r.game.turn()
  const elapsed = Date.now() - r.lastMoveAt
  return {
    w: turn === 'w' ? Math.max(0, r.clocks.w - elapsed) : r.clocks.w,
    b: turn === 'b' ? Math.max(0, r.clocks.b - elapsed) : r.clocks.b,
  }
}

function roomState(roomId) {
  const r = rooms.get(roomId)
  if (!r) return null
  return {
    roomId,
    fen: r.game.fen(),
    history: r.game.history(),
    turn: r.game.turn(),
    isGameOver: r.game.isGameOver(),
    isCheckmate: r.game.isCheckmate(),
    isDraw: r.game.isDraw(),
    players: {
      w: r.players.w ? { name: r.players.w.name, elo: r.players.w.elo } : null,
      b: r.players.b ? { name: r.players.b.name, elo: r.players.b.elo } : null,
    },
    spectatorCount: r.spectators.size,
    tc: r.tc,
    clocks: liveClocks(r),
    clockRunning: r.clockStarted && !r.ended,
    serverTime: Date.now(),
  }
}

function broadcast(roomId) {
  const s = roomState(roomId)
  if (s) io.to(roomId).emit('state', s)
}

function emitResult(roomId, outcome) {
  const r = rooms.get(roomId)
  if (!r || r.ended) return
  r.ended = true
  io.to(roomId).emit('game-result', {
    outcome,
    players: {
      w: r.players.w ? { name: r.players.w.name, elo: r.players.w.elo } : null,
      b: r.players.b ? { name: r.players.b.name, elo: r.players.b.elo } : null,
    },
    clocks: liveClocks(r),
  })
}

function maybeEmitNaturalResult(roomId) {
  const r = rooms.get(roomId)
  if (!r || r.ended) return
  const g = r.game
  if (!g.isGameOver()) return
  let outcome
  if (g.isCheckmate()) outcome = g.turn() === 'w' ? 'black_win' : 'white_win'
  else outcome = 'draw'
  emitResult(roomId, outcome)
}

// Tick clocks mỗi 250ms để bắt timeout
setInterval(() => {
  for (const [roomId, r] of rooms) {
    if (r.ended || !r.clockStarted || r.tc.initialMs === 0) continue
    const live = liveClocks(r)
    if (live.w <= 0) {
      r.clocks = { w: 0, b: live.b }
      emitResult(roomId, 'white_timeout')
    } else if (live.b <= 0) {
      r.clocks = { w: live.w, b: 0 }
      emitResult(roomId, 'black_timeout')
    }
  }
}, CLOCK_TICK_MS)

function maybeBotMove(roomId) {
  const r = rooms.get(roomId)
  if (!r || r.ended) return
  const turn = r.game.turn()
  const seat = r.players[turn]
  if (!seat?.isBot) return
  const difficulty = seat.difficulty || 'medium'
  const delay = 600 + Math.floor(Math.random() * 800)
  setTimeout(() => {
    const cur = rooms.get(roomId)
    if (!cur || cur.ended || cur.game.turn() !== turn || cur.game.isGameOver()) return
    const move = chooseBestMove(cur.game, difficulty)
    if (!move) return
    applyMove(cur, move)
    broadcast(roomId)
    maybeEmitNaturalResult(roomId)
    maybeBotMove(roomId)
  }, delay)
}

// Áp dụng nước đi + cập nhật clock
function applyMove(r, move) {
  const turnBefore = r.game.turn()
  const result = r.game.move(move)
  if (!result) return null
  if (r.tc.initialMs > 0) {
    if (r.clockStarted) {
      const elapsed = Date.now() - r.lastMoveAt
      r.clocks[turnBefore] = Math.max(0, r.clocks[turnBefore] - elapsed)
    }
    // Cộng increment kể cả nước đầu (chuẩn Fischer), trừ khi nước này kết thúc ván
    if (!r.game.isGameOver()) r.clocks[turnBefore] += r.tc.incrementMs
    r.clockStarted = true
    r.lastMoveAt = Date.now()
  }
  return result
}

function createMatchedRoom(p1, p2) {
  const roomId = newRoomId()
  const [w, b] = Math.random() < 0.5 ? [p1, p2] : [p2, p1]
  const tc = normalizeTC(p1.tc)
  rooms.set(roomId, {
    game: new Chess(),
    players: {
      w: { id: w.id, name: w.name, elo: w.elo, isBot: false },
      b: { id: b.id, name: b.name, elo: b.elo, isBot: false },
    },
    spectators: new Set(),
    ended: false,
    tc,
    clocks: { w: tc.initialMs, b: tc.initialMs },
    lastMoveAt: 0,
    clockStarted: false,
  })
  io.sockets.sockets.get(w.id)?.join(roomId)
  io.sockets.sockets.get(b.id)?.join(roomId)
  io.to(w.id).emit('match-found', { roomId, color: 'w', opponent: { name: b.name, elo: b.elo } })
  io.to(b.id).emit('match-found', { roomId, color: 'b', opponent: { name: w.name, elo: w.elo } })
  broadcast(roomId)
}

function createBotMatch(player) {
  const roomId = newRoomId()
  const botName = randomBotName()
  const botElo = randomBotElo(player.elo)
  const difficulty = difficultyFromElo(player.elo)
  const tc = normalizeTC(player.tc)
  const playerSeat = { id: player.id, name: player.name, elo: player.elo, isBot: false }
  const botSeat = { id: null, name: botName, elo: botElo, isBot: true, difficulty }
  const [w, b] = Math.random() < 0.5 ? [playerSeat, botSeat] : [botSeat, playerSeat]
  rooms.set(roomId, {
    game: new Chess(),
    players: { w, b },
    spectators: new Set(),
    ended: false,
    tc,
    clocks: { w: tc.initialMs, b: tc.initialMs },
    lastMoveAt: 0,
    clockStarted: false,
  })
  io.sockets.sockets.get(player.id)?.join(roomId)
  const myColor = w.id === player.id ? 'w' : 'b'
  const oppColor = myColor === 'w' ? 'b' : 'w'
  io.to(player.id).emit('match-found', {
    roomId, color: myColor,
    opponent: { name: rooms.get(roomId).players[oppColor].name, elo: rooms.get(roomId).players[oppColor].elo },
  })
  broadcast(roomId)
  maybeBotMove(roomId)
}

// Matchmaking tick: chỉ ghép cùng time control
setInterval(() => {
  const now = Date.now()
  outer: for (let i = 0; i < queue.length; i++) {
    const a = queue[i]
    if (!io.sockets.sockets.get(a.id)) { queue.splice(i, 1); i--; continue }
    const waited = now - a.joinedAt
    const range = Math.min(800, 100 + Math.floor(waited / 1000) * 50)
    for (let j = i + 1; j < queue.length; j++) {
      const b = queue[j]
      if (tcKey(a.tc) !== tcKey(b.tc)) continue
      if (Math.abs(a.elo - b.elo) <= range) {
        queue.splice(j, 1); queue.splice(i, 1)
        createMatchedRoom(a, b)
        i--; continue outer
      }
    }
    if (waited >= QUEUE_TIMEOUT_MS) {
      queue.splice(i, 1)
      createBotMatch(a)
      i--
    }
  }
}, TICK_MS)

io.on('connection', (socket) => {
  let joined = null

  socket.on('find-match', ({ name, elo, tc }, ack) => {
    queue = queue.filter(q => q.id !== socket.id)
    queue.push({
      id: socket.id,
      name: name || 'Player',
      elo: Number(elo) || 1200,
      tc: normalizeTC(tc),
      joinedAt: Date.now(),
    })
    ack?.({ ok: true, queueSize: queue.length })
  })

  socket.on('cancel-match', (_, ack) => {
    queue = queue.filter(q => q.id !== socket.id)
    ack?.({ ok: true })
  })

  socket.on('create-room', ({ name, elo, tc }, ack) => {
    const roomId = newRoomId()
    const ntc = normalizeTC(tc)
    rooms.set(roomId, {
      game: new Chess(),
      players: { w: { id: socket.id, name: name || 'Player 1', elo: Number(elo) || 1200, isBot: false }, b: null },
      spectators: new Set(),
      ended: false,
      tc: ntc,
      clocks: { w: ntc.initialMs, b: ntc.initialMs },
      lastMoveAt: 0,
      clockStarted: false,
    })
    socket.join(roomId)
    joined = { roomId, color: 'w' }
    ack?.({ ok: true, roomId, color: 'w' })
    broadcast(roomId)
  })

  socket.on('join-room', ({ roomId, name, elo }, ack) => {
    const r = rooms.get(roomId)
    if (!r) return ack?.({ ok: false, error: 'Phòng không tồn tại' })
    socket.join(roomId)
    let color = null
    const eloVal = Number(elo) || 1200
    if (r.players.w?.id === socket.id) color = 'w'
    else if (r.players.b?.id === socket.id) color = 'b'
    else if (!r.players.w) { r.players.w = { id: socket.id, name: name || 'Player 1', elo: eloVal, isBot: false }; color = 'w' }
    else if (!r.players.b) { r.players.b = { id: socket.id, name: name || 'Player 2', elo: eloVal, isBot: false }; color = 'b' }
    else { r.spectators.add(socket.id); color = 'spectator' }
    joined = { roomId, color }
    ack?.({ ok: true, roomId, color })
    broadcast(roomId)
    maybeBotMove(roomId)
  })

  socket.on('move', ({ roomId, move }, ack) => {
    const r = rooms.get(roomId)
    if (!r) return ack?.({ ok: false, error: 'Phòng không tồn tại' })
    if (r.ended) return ack?.({ ok: false, error: 'Ván đã kết thúc' })
    const seat = r.players.w?.id === socket.id ? 'w' : r.players.b?.id === socket.id ? 'b' : null
    if (!seat) return ack?.({ ok: false, error: 'Bạn là khán giả' })
    if (r.game.turn() !== seat) return ack?.({ ok: false, error: 'Chưa đến lượt' })
    // Check timeout trước khi cho đi
    if (r.tc.initialMs > 0 && r.clockStarted) {
      const live = liveClocks(r)
      if (live[seat] <= 0) {
        emitResult(roomId, seat === 'w' ? 'white_timeout' : 'black_timeout')
        return ack?.({ ok: false, error: 'Hết giờ' })
      }
    }
    try {
      const result = applyMove(r, move)
      if (!result) return ack?.({ ok: false, error: 'Nước đi không hợp lệ' })
      ack?.({ ok: true })
      broadcast(roomId)
      maybeEmitNaturalResult(roomId)
      maybeBotMove(roomId)
    } catch {
      ack?.({ ok: false, error: 'Nước đi không hợp lệ' })
    }
  })

  socket.on('resign', ({ roomId }) => {
    const r = rooms.get(roomId)
    if (!r) return
    const seat = r.players.w?.id === socket.id ? 'w' : r.players.b?.id === socket.id ? 'b' : null
    if (!seat) return
    io.to(roomId).emit('resigned', { color: seat })
    emitResult(roomId, seat === 'w' ? 'white_resign' : 'black_resign')
  })

  socket.on('rematch-request', ({ roomId }) => {
    const r = rooms.get(roomId)
    if (!r) return
    const seat = r.players.w?.id === socket.id ? 'w' : r.players.b?.id === socket.id ? 'b' : null
    if (!seat) return
    const oppSeat = seat === 'w' ? 'b' : 'w'
    const opp = r.players[oppSeat]
    if (!opp) return
    const from = { name: r.players[seat].name, elo: r.players[seat].elo }
    if (opp.isBot) {
      resetRoomForRematch(roomId)
      io.to(roomId).emit('rematch-accepted')
      broadcast(roomId)
      maybeBotMove(roomId)
      return
    }
    io.to(opp.id).emit('rematch-offer', { from })
  })

  socket.on('rematch-accept', ({ roomId }) => {
    const r = rooms.get(roomId)
    if (!r) return
    const seat = r.players.w?.id === socket.id ? 'w' : r.players.b?.id === socket.id ? 'b' : null
    if (!seat) return
    resetRoomForRematch(roomId)
    io.to(roomId).emit('rematch-accepted')
    broadcast(roomId)
    maybeBotMove(roomId)
  })

  socket.on('rematch-decline', ({ roomId }) => {
    const r = rooms.get(roomId)
    if (!r) return
    const seat = r.players.w?.id === socket.id ? 'w' : r.players.b?.id === socket.id ? 'b' : null
    if (!seat) return
    const oppSeat = seat === 'w' ? 'b' : 'w'
    const opp = r.players[oppSeat]
    if (opp && !opp.isBot) io.to(opp.id).emit('rematch-declined')
  })

  socket.on('chat', ({ roomId, message }) => {
    const r = rooms.get(roomId)
    if (!r) return
    const name =
      r.players.w?.id === socket.id ? r.players.w.name :
      r.players.b?.id === socket.id ? r.players.b.name : 'Khán giả'
    io.to(roomId).emit('chat', { name, message: String(message).slice(0, 200), ts: Date.now() })
  })

  socket.on('disconnect', () => {
    queue = queue.filter(q => q.id !== socket.id)
    if (!joined) return
    const r = rooms.get(joined.roomId)
    if (!r) return
    if (r.players.w?.id === socket.id) r.players.w = null
    else if (r.players.b?.id === socket.id) r.players.b = null
    else r.spectators.delete(socket.id)
    const remainingHuman = (r.players.w && !r.players.w.isBot) || (r.players.b && !r.players.b.isBot)
    if (!remainingHuman && r.spectators.size === 0) rooms.delete(joined.roomId)
    else broadcast(joined.roomId)
  })
})

function resetRoomForRematch(roomId) {
  const r = rooms.get(roomId)
  if (!r) return
  r.game = new Chess()
  r.ended = false
  const tmp = r.players.w
  r.players.w = r.players.b
  r.players.b = tmp
  r.clocks = { w: r.tc.initialMs, b: r.tc.initialMs }
  r.lastMoveAt = 0
  r.clockStarted = false
}

// Serve client build nếu tồn tại
import fs from 'fs'
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST))
  app.get(/^(?!\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => res.send('Chess server is running (no client build found)'))
}

server.listen(PORT, '0.0.0.0', () => console.log(`Chess server listening on :${PORT}`))
