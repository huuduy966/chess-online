import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

const modes = [
  { to: '/online', icon: '🌐', title: 'Chơi online',   desc: 'Tạo phòng hoặc tham gia phòng để đấu với người khác.' },
  { to: '/ai',     icon: '🤖', title: 'Chơi với máy',  desc: 'Đấu với AI ở 3 mức độ Dễ / Vừa / Khó.' },
  { to: '/local',  icon: '👥', title: 'Chơi tại chỗ',  desc: '2 người chơi trên cùng một máy. Cách cổ điển nhất.' },
]

function AutoPlayBoard() {
  const gameRef = useRef(new Chess())
  const [fen, setFen] = useState(gameRef.current.fen())
  const containerRef = useRef(null)
  const [width, setWidth] = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(Math.max(240, Math.floor(el.clientWidth)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const step = () => {
      const g = gameRef.current
      if (g.isGameOver() || g.history().length > 80) {
        g.reset()
      } else {
        const moves = g.moves()
        if (moves.length === 0) g.reset()
        else g.move(moves[Math.floor(Math.random() * moves.length)])
      }
      setFen(g.fen())
    }
    const id = setInterval(step, 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="autoplay-board" ref={containerRef}>
      <Chessboard
        position={fen}
        arePiecesDraggable={false}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        boardWidth={width}
      />
    </div>
  )
}

export default function Home() {
  return (
    <div className="home home-split">
      <div className="home-left">
        <h1>♞ Chess Online</h1>
        <p>Chọn chế độ chơi để bắt đầu</p>
        <div className="mode-list">
          {modes.map(m => (
            <Link to={m.to} key={m.to} className="mode-card mode-card-row">
              <div className="icon">{m.icon}</div>
              <div className="mode-text">
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="home-right">
        <AutoPlayBoard />
      </div>
    </div>
  )
}
