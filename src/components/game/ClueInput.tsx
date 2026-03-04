import { useState } from 'react'
import { Button } from '../ui/Button'
import { Team, Clue } from '../../types/game'

interface ClueInputProps {
  team: Team
  onSubmit: (clue: Clue) => void
  disabled: boolean
}

export function ClueInput({ team, onSubmit, disabled }: ClueInputProps) {
  const [word, setWord] = useState('')
  const [number, setNumber] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!word.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        word: word.trim().toUpperCase(),
        number,
        team,
        timestamp: Date.now(),
      })
      setWord('')
      setNumber(1)
    } finally {
      setSubmitting(false)
    }
  }

  const teamColor = team === 'red' ? 'border-red-500/30 focus:ring-red-500/50' : 'border-blue-500/30 focus:ring-blue-500/50'

  return (
    <div className="glass p-4">
      <p className="text-sm text-white/50 mb-3">Give your team a clue</p>
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <input
            type="text"
            placeholder="Clue word"
            value={word}
            onChange={e => setWord(e.target.value.replace(/\s/g, ''))}
            className={`w-full bg-white/5 border ${teamColor} rounded-xl px-4 py-2.5 text-white uppercase tracking-wider placeholder-white/30 focus:outline-none focus:ring-2 transition-all text-sm`}
            maxLength={30}
            disabled={disabled}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="w-20">
          <select
            value={number}
            onChange={e => setNumber(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-sm appearance-none text-center"
            disabled={disabled}
          >
            <option value={0}>∞</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <Button
          variant={team === 'red' ? 'red' : 'blue'}
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || !word.trim()}
          loading={submitting}
        >
          Give Clue
        </Button>
      </div>
    </div>
  )
}
