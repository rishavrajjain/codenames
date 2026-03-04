import { Clue } from '../../types/game'

interface GameLogProps {
  clueHistory: Clue[]
}

export function GameLog({ clueHistory }: GameLogProps) {
  if (clueHistory.length === 0) return null

  return (
    <div className="glass p-4">
      <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Clue History</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {[...clueHistory].reverse().map((clue, i) => {
          const color = clue.team === 'red' ? 'text-red-400' : 'text-blue-400'
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`font-bold ${color} uppercase text-xs`}>{clue.team}</span>
              <span className="text-white/80 font-medium uppercase tracking-wider">{clue.word}</span>
              <span className="text-white/40">{clue.number === 0 ? '∞' : clue.number}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
