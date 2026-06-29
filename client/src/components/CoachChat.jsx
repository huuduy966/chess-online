import { useState, useRef, useEffect } from 'react'
import { answer, SUGGESTED_QUESTIONS } from '../utils/coachAI.js'

export default function CoachChat({ fen, myColor = 'w' }) {
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Chào! Tôi là trợ lý AI. Hỏi tôi về thế cờ, chiến lược, hoặc nguyên tắc — tôi sẽ tư vấn (nhưng không nói nước đi cụ thể).' },
  ])
  const [input, setInput] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [messages])

  const send = (q) => {
    const text = (q ?? input).trim()
    if (!text) return
    const a = answer(text, fen, myColor) || 'Tôi không hiểu câu hỏi. Bạn có thể hỏi về thế cờ, an toàn vua, khai cuộc, hay phòng thủ.'
    setMessages((m) => [...m, { from: 'me', text }, { from: 'ai', text: a }])
    setInput('')
  }

  const submit = (e) => {
    e.preventDefault()
    send()
  }

  return (
    <div className="coach-chat-panel">
      <h3>🤖 Trợ lý AI</h3>
      <div className="coach-chat-box" ref={boxRef}>
        {messages.map((m, i) => (
          <div key={i} className={`coach-chat-msg coach-chat-${m.from}`}>
            <span className="coach-chat-bubble">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="coach-chat-suggestions">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button key={q} className="coach-suggest-btn" onClick={() => send(q)} type="button">
            {q}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="row coach-chat-input">
        <input
          className="select"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi AI về thế cờ..."
        />
        <button className="btn" type="submit" style={{ flex: 0 }}>Gửi</button>
      </form>
    </div>
  )
}
