import { useEffect, useState } from 'react'
import { formatClock } from '../utils/timeControl.js'

// Hiển thị đồng hồ cho 1 bên.
// running: bên này đang được trừ thời gian
// baseMs: thời gian server gửi (ms còn lại)
// since: Date.now() lúc nhận snapshot (client)
export default function Clock({ baseMs, running, since }) {
  const [ms, setMs] = useState(baseMs)

  useEffect(() => {
    if (!running) {
      setMs(baseMs)
      return
    }
    const start = since
    const initial = baseMs
    let raf
    const tick = () => {
      const now = Date.now()
      setMs(Math.max(0, initial - (now - start)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [baseMs, running, since])

  const low = ms < 10_000
  const critical = ms < 5_000
  return (
    <div className={`clock ${running ? 'clock-running' : ''} ${low ? 'clock-low' : ''} ${critical ? 'clock-critical' : ''}`}>
      {formatClock(ms)}
    </div>
  )
}
