export default function Timer({ n, total, size = 80 }) {
  const pct = total > 0 ? n / total : 0
  const r = (size - 10) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - pct)
  const color = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FFC107' : '#F44336'

  return (
    <div className="timer-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div className="timer-ring-num" style={{ color }}>
        {n}
      </div>
    </div>
  )
}
