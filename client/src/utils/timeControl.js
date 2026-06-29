// Các preset thời gian. initialMs = 0 → không tính giờ.
export const TIME_CONTROLS = [
  { id: 'bullet-1-0',     group: 'Bullet',    label: '1 phút',       initialMs:  1 * 60_000, incrementMs: 0 },
  { id: 'bullet-2-1',     group: 'Bullet',    label: '2 + 1',        initialMs:  2 * 60_000, incrementMs: 1_000 },
  { id: 'blitz-3-0',      group: 'Blitz',     label: '3 phút',       initialMs:  3 * 60_000, incrementMs: 0 },
  { id: 'blitz-3-2',      group: 'Blitz',     label: '3 + 2',        initialMs:  3 * 60_000, incrementMs: 2_000 },
  { id: 'blitz-5-0',      group: 'Blitz',     label: '5 phút',       initialMs:  5 * 60_000, incrementMs: 0 },
  { id: 'blitz-5-3',      group: 'Blitz',     label: '5 + 3',        initialMs:  5 * 60_000, incrementMs: 3_000 },
  { id: 'rapid-10-0',     group: 'Rapid',     label: '10 phút',      initialMs: 10 * 60_000, incrementMs: 0 },
  { id: 'rapid-15-10',    group: 'Rapid',     label: '15 + 10',      initialMs: 15 * 60_000, incrementMs: 10_000 },
  { id: 'rapid-30-0',     group: 'Rapid',     label: '30 phút',      initialMs: 30 * 60_000, incrementMs: 0 },
  { id: 'classical-60-0', group: 'Classical', label: '1 giờ',        initialMs: 60 * 60_000, incrementMs: 0 },
  { id: 'unlimited',      group: 'Khác',      label: 'Không giờ',    initialMs: 0,           incrementMs: 0 },
]

export const DEFAULT_TC_ID = 'rapid-10-0'

export function getTC(id) {
  return TIME_CONTROLS.find(t => t.id === id) || TIME_CONTROLS.find(t => t.id === DEFAULT_TC_ID)
}

// Format ms → MM:SS hoặc M:SS.D (dưới 10s hiện 1 chữ số thập phân)
export function formatClock(ms) {
  if (ms == null || ms < 0) ms = 0
  const totalSec = ms / 1000
  if (totalSec < 10) return totalSec.toFixed(1)
  const m = Math.floor(totalSec / 60)
  const s = Math.floor(totalSec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
