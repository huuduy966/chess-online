import { useEffect, useState } from 'react'

const LEVEL_ICON = { info: '💡', warn: '⚠️', danger: '🚨' }
const LEVEL_LABEL = { info: 'Gợi ý', warn: 'Cảnh báo', danger: 'Nguy hiểm' }

export default function Coach({ tip, enabled = true }) {
  const [show, setShow] = useState(true)
  const [shake, setShake] = useState(0)

  useEffect(() => {
    if (tip) {
      setShow(true)
      setShake((s) => s + 1)
    }
  }, [tip])

  if (!enabled) return null

  return (
    <div className={`panel coach-panel ${tip ? `coach-${tip.level}` : ''}`}>
      <h3>🤖 Trợ lý AI</h3>
      {tip && show ? (
        <div key={shake} className={`coach-tip coach-tip-${tip.level} coach-shake`}>
          <div className="coach-tip-head">
            <span className="coach-tip-icon">{LEVEL_ICON[tip.level]}</span>
            <strong>{tip.title}</strong>
            <span className={`coach-level coach-level-${tip.level}`}>{LEVEL_LABEL[tip.level]}</span>
          </div>
          <p>{tip.message}</p>
          <button className="btn secondary coach-dismiss" onClick={() => setShow(false)}>Đã hiểu</button>
        </div>
      ) : (
        <p className="muted">Trợ lý sẽ nhắc bạn khi phát hiện sai lầm cơ bản. Không gợi ý nước đi cụ thể.</p>
      )}
    </div>
  )
}
