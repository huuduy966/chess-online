import { useNavigate } from 'react-router-dom'

export default function BackButton({ to, label = 'Quay lại' }) {
  const navigate = useNavigate()
  const onClick = () => {
    if (to) navigate(to)
    else navigate(-1)
  }
  return (
    <button className="back-btn" onClick={onClick}>
      ← {label}
    </button>
  )
}
