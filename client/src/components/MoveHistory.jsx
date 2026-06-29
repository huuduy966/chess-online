export default function MoveHistory({ history }) {
  const rows = []
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] })
  }
  return (
    <div className="move-history">
      {rows.length === 0 && <div className="muted">Chưa có nước đi nào</div>}
      {rows.map((r) => (
        <div className="move-row" key={r.n}>
          <span className="num">{r.n}.</span>
          <span>{r.w}</span>
          <span>{r.b || ''}</span>
        </div>
      ))}
    </div>
  )
}
