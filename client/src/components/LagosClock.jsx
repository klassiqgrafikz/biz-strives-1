import { useState, useEffect } from 'react'

function getLagosTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos', hour12: true })
}

export default function LagosClock() {
  const [time, setTime] = useState(() => new Date(getLagosTime()))

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date(getLagosTime())), 1000)
    return () => clearInterval(interval)
  }, [])

  const hours = time.getHours() % 12 || 12
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="font-mono text-3xl font-medium tracking-wide text-brand-text">
        {hours}:{minutes}:{seconds} <span className="text-sm font-normal text-brand-muted">{ampm}</span>
      </div>
      <p className="text-xs text-brand-muted font-medium">Lagos Time</p>
    </div>
  )
}