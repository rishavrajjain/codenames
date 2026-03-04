import { useState, useEffect } from 'react'
import { TimerConfig } from '../../types/game'

interface TurnTimerProps {
  timerConfig: TimerConfig
  turnStartedAt: number | null
  onTimeUp: () => void
}

export function TurnTimer({ timerConfig, turnStartedAt, onTimeUp }: TurnTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!timerConfig.enabled || !turnStartedAt) {
      setSecondsLeft(null)
      return
    }

    const totalSeconds = timerConfig.minutes * 60
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000)
      const remaining = totalSeconds - elapsed
      if (remaining <= 0) {
        setSecondsLeft(0)
        clearInterval(interval)
        onTimeUp()
      } else {
        setSecondsLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [timerConfig, turnStartedAt, onTimeUp])

  if (secondsLeft === null) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isLow = secondsLeft <= 30
  const color = isLow ? 'text-red-400' : 'text-white/60'

  return (
    <div className={`font-mono text-lg font-bold ${color} ${isLow ? 'animate-pulse' : ''}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}
