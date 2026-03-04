import { Clue, Team } from '../../types/game'

interface ClueDisplayProps {
  clue: Clue | null
  team: Team
  phase: 'giving_clue' | 'guessing'
  guessesRemaining: number
  guessesUsed: number
}

export function ClueDisplay({ clue, team, phase, guessesRemaining, guessesUsed }: ClueDisplayProps) {
  const teamColor = team === 'red' ? 'text-red-400' : 'text-blue-400'
  const glowClass = team === 'red' ? 'glow-red' : 'glow-blue'

  if (phase === 'giving_clue') {
    return (
      <div className={`glass px-6 py-3 text-center ${glowClass}`}>
        <p className={`text-sm font-medium ${teamColor} animate-pulse-glow`}>
          {team.toUpperCase()} Spymaster is thinking...
        </p>
      </div>
    )
  }

  if (!clue) return null

  return (
    <div className={`glass px-6 py-3 text-center ${glowClass}`}>
      <div className="flex items-center justify-center gap-4">
        <div>
          <span className="text-xs text-white/40 uppercase tracking-wider">Clue</span>
          <p className="text-2xl font-bold text-white uppercase tracking-wider">{clue.word}</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div>
          <span className="text-xs text-white/40 uppercase tracking-wider">Number</span>
          <p className="text-2xl font-bold text-white">{clue.number === 0 ? '∞' : clue.number}</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div>
          <span className="text-xs text-white/40 uppercase tracking-wider">Guesses</span>
          <p className="text-lg font-medium text-white/70">{guessesUsed} / {guessesRemaining === 99 ? '∞' : guessesRemaining + guessesUsed}</p>
        </div>
      </div>
    </div>
  )
}
