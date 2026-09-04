import { useState, useEffect } from 'react'

function getLagosTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
}

export default function LagosClock() {
  const [time, setTime] = useState(() => new Date(getLagosTime()))

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date(getLagosTime())), 1000)
    return () => clearInterval(interval)
  }, [])

  const h = time.getHours() % 12
  const m = time.getMinutes()
  const s = time.getSeconds()
  const hourAngle = h * 30 + m * 0.5
  const minAngle = m * 6 + s * 0.1
  const secAngle = s * 6

  const toRad = (deg) => (deg - 90) * (Math.PI / 180)
  const px = (angle, r) => 100 + r * Math.cos(toRad(angle))
  const py = (angle, r) => 100 + r * Math.sin(toRad(angle))

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 200 200" className="w-44 h-44">
          <circle cx="100" cy="100" r="95" fill="var(--brand-surface, #13131a)" stroke="var(--brand-pink, #ff2d78)" strokeWidth="2.5" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

          {[12,1,2,3,4,5,6,7,8,9,10,11].map((num, i) => (
            <text key={i} x={px(i * 30, 76)} y={py(i * 30, 76)} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="600" fill="var(--brand-muted, #6b7280)">{num}</text>
          ))}

          {[...Array(60)].map((_, i) => {
            if (i % 5 === 0) {
              const a = i * 6
              return <line key={i} x1={px(a, 82)} y1={py(a, 82)} x2={px(a, 90)} y2={py(a, 90)} stroke="var(--brand-pink, #ff2d78)" strokeWidth="1.5" />
            }
            const a = i * 6
            return <line key={i} x1={px(a, 86)} y1={py(a, 86)} x2={px(a, 90)} y2={py(a, 90)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          })}

          <line x1="100" y1="100" x2={px(hourAngle, 40)} y2={py(hourAngle, 40)} stroke="var(--brand-text, #e5e7eb)" strokeWidth="4" strokeLinecap="round" />
          <line x1="100" y1="100" x2={px(minAngle, 58)} y2={py(minAngle, 58)} stroke="var(--brand-text, #e5e7eb)" strokeWidth="3" strokeLinecap="round" />
          <line x1={px(secAngle + 180, 12)} y1={py(secAngle + 180, 12)} x2={px(secAngle, 64)} y2={py(secAngle, 64)} stroke="var(--brand-pink, #ff2d78)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="4" fill="var(--brand-pink, #ff2d78)" />
        </svg>
      </div>
      <p className="text-xs text-brand-muted font-medium">Lagos Time</p>
    </div>
  )
}
