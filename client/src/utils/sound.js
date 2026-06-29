// Tạo âm thanh procedurally bằng Web Audio API.
// Không cần file mp3/wav, không phụ thuộc asset external.

let ctx = null
let enabled = true
let volume = 0.5
let noiseBuffer = null

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function getNoiseBuffer() {
  const c = getCtx()
  if (!c) return null
  if (noiseBuffer) return noiseBuffer
  const len = c.sampleRate * 0.5
  noiseBuffer = c.createBuffer(1, len, c.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

// Tiếng "cạch" gỗ: noise burst + band-pass filter + envelope ngắn.
// freq: tần số trung tâm filter (Hz), thấp = trầm/lớn, cao = sắc/nhỏ
function woodClack({ freq = 1200, q = 8, duration = 0.06, vol = 1, thump = false }) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime

  // Noise source
  const src = c.createBufferSource()
  src.buffer = getNoiseBuffer()

  // Band-pass filter
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = q

  // High-pass để cắt bớt boomy
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 300

  // Envelope cực ngắn — đặc trưng âm thanh percussive
  const gain = c.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume * vol, now + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  src.connect(bp).connect(hp).connect(gain).connect(c.destination)
  src.start(now)
  src.stop(now + duration + 0.02)

  // Thêm "thump" tần số thấp cho capture (tiếng đập)
  if (thump) {
    const t = c.createOscillator()
    const tg = c.createGain()
    t.type = 'sine'
    t.frequency.setValueAtTime(120, now)
    t.frequency.exponentialRampToValueAtTime(50, now + 0.05)
    tg.gain.setValueAtTime(0, now)
    tg.gain.linearRampToValueAtTime(volume * vol * 0.7, now + 0.005)
    tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
    t.connect(tg).connect(c.destination)
    t.start(now)
    t.stop(now + 0.1)
  }
}

function tone({ freq, duration = 0.12, type = 'sine', vol = 1, attack = 0.005, release = 0.05, freqEnd = null }) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume * vol, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release)
  osc.connect(gain).connect(c.destination)
  osc.start(now)
  osc.stop(now + duration + release + 0.02)
}

function sequence(notes) {
  const c = getCtx()
  if (!c) return
  let t = 0
  for (const n of notes) {
    setTimeout(() => tone(n), t)
    t += n.gap ?? 60
  }
}

export const sfx = {
  setEnabled(v) { enabled = !!v; localStorage.setItem('chess-sfx-on', enabled ? '1' : '0') },
  isEnabled() { return enabled },
  setVolume(v) { volume = Math.max(0, Math.min(1, v)) },

  // Nước đi: tiếng "cạch" gỗ ngắn
  move() {
    if (!enabled) return
    woodClack({ freq: 1100, q: 7, duration: 0.06, vol: 0.9 })
  },

  // Bắt quân: tiếng "cộp" mạnh có thump trầm
  capture() {
    if (!enabled) return
    woodClack({ freq: 700, q: 5, duration: 0.09, vol: 1.1, thump: true })
  },

  // Nhập thành: 2 tiếng cạch liên tiếp (vua + xe)
  castle() {
    if (!enabled) return
    woodClack({ freq: 1100, q: 7, duration: 0.05, vol: 0.85 })
    setTimeout(() => woodClack({ freq: 950, q: 7, duration: 0.06, vol: 0.85 }), 90)
  },

  // Phong cấp: cạch + chime nhẹ
  promote() {
    if (!enabled) return
    woodClack({ freq: 1100, q: 7, duration: 0.06, vol: 0.9 })
    setTimeout(() => tone({ freq: 880, duration: 0.12, type: 'triangle', vol: 0.4 }), 50)
    setTimeout(() => tone({ freq: 1175, duration: 0.15, type: 'triangle', vol: 0.4 }), 130)
  },

  // Chiếu: cạch + 1 nốt cảnh báo
  check() {
    if (!enabled) return
    woodClack({ freq: 1100, q: 7, duration: 0.06, vol: 0.9 })
    setTimeout(() => tone({ freq: 988, duration: 0.18, type: 'square', vol: 0.35 }), 60)
  },

  // Chiếu hết: cạch mạnh + 3 nốt giáng
  checkmate() {
    if (!enabled) return
    woodClack({ freq: 700, q: 5, duration: 0.1, vol: 1.1, thump: true })
    setTimeout(() => sequence([
      { freq: 660, duration: 0.18, type: 'square', vol: 0.5, gap: 180 },
      { freq: 520, duration: 0.18, type: 'square', vol: 0.5, gap: 180 },
      { freq: 330, duration: 0.45, type: 'square', vol: 0.6, freqEnd: 220, gap: 0 },
    ]), 120)
  },

  // Coach warn: chime nhẹ
  coachWarn() {
    if (!enabled) return
    tone({ freq: 988, duration: 0.1, type: 'sine', vol: 0.4 })
    setTimeout(() => tone({ freq: 1318, duration: 0.14, type: 'sine', vol: 0.35 }), 90)
  },

  // Coach danger: 3 nốt cảnh báo dồn dập
  coachDanger() {
    if (!enabled) return
    sequence([
      { freq: 880, duration: 0.07, type: 'square', vol: 0.45, gap: 90 },
      { freq: 880, duration: 0.07, type: 'square', vol: 0.45, gap: 90 },
      { freq: 880, duration: 0.1, type: 'square', vol: 0.45, gap: 0 },
    ])
  },

  // Coach info: 1 nốt nhẹ
  coachInfo() {
    if (!enabled) return
    tone({ freq: 700, duration: 0.08, type: 'sine', vol: 0.25 })
  },

  // Hòa
  draw() {
    if (!enabled) return
    tone({ freq: 440, duration: 0.4, type: 'sine', vol: 0.5, freqEnd: 330 })
  },
}

// Khởi tạo từ localStorage
try {
  const saved = localStorage.getItem('chess-sfx-on')
  if (saved === '0') enabled = false
} catch {}

// Helper: chọn sfx phù hợp dựa trên verbose move của chess.js
export function playMoveSound(verboseMove, gameAfter) {
  if (!verboseMove) return
  if (gameAfter?.isCheckmate?.()) {
    sfx.checkmate()
    return
  }
  if (gameAfter?.inCheck?.()) {
    sfx.check()
    return
  }
  const flags = verboseMove.flags || ''
  if (flags.includes('p')) { sfx.promote(); return }
  if (flags.includes('k') || flags.includes('q')) { sfx.castle(); return }
  if (verboseMove.captured) { sfx.capture(); return }
  sfx.move()
}

export function playCoachSound(level) {
  if (level === 'danger') sfx.coachDanger()
  else if (level === 'warn') sfx.coachWarn()
  else if (level === 'info') sfx.coachInfo()
}
