import { useState } from 'react'
import { sfx } from '../utils/sound.js'

export default function SoundToggle() {
  const [on, setOn] = useState(sfx.isEnabled())
  const click = () => {
    const next = !on
    sfx.setEnabled(next)
    setOn(next)
    if (next) sfx.move() // preview
  }
  return (
    <button className="theme-toggle" onClick={click} title={on ? 'Tắt âm thanh' : 'Bật âm thanh'}>
      {on ? '🔊' : '🔇'}
    </button>
  )
}
