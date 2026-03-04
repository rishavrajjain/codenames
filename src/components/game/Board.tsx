import { Card } from '../../types/game'
import { GameCard } from './Card'

interface BoardProps {
  board: Card[]
  isSpymaster: boolean
  canGuess: boolean
  onGuess: (index: number) => void
}

export function Board({ board, isSpymaster, canGuess, onGuess }: BoardProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full max-w-2xl mx-auto">
      {board.map((card, i) => (
        <GameCard
          key={i}
          card={card}
          index={i}
          isSpymaster={isSpymaster}
          canGuess={canGuess}
          onGuess={onGuess}
        />
      ))}
    </div>
  )
}
