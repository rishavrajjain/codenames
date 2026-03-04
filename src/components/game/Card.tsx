import { Card as CardType, CardType as CType } from '../../types/game'

interface CardProps {
  card: CardType
  index: number
  isSpymaster: boolean
  canGuess: boolean
  onGuess: (index: number) => void
}

const revealedColors: Record<CType, string> = {
  red: 'bg-red-500/90 border-red-400',
  blue: 'bg-blue-500/90 border-blue-400',
  neutral: 'bg-amber-700/60 border-amber-600/50',
  assassin: 'bg-gray-900 border-gray-600',
}

const spymasterBorders: Record<CType, string> = {
  red: 'border-red-500/60 shadow-[inset_0_0_20px_rgba(239,68,68,0.15)]',
  blue: 'border-blue-500/60 shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]',
  neutral: 'border-amber-500/30',
  assassin: 'border-gray-400/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]',
}

const spymasterDots: Record<CType, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  neutral: 'bg-amber-500',
  assassin: 'bg-gray-400',
}

export function GameCard({ card, index, isSpymaster, canGuess, onGuess }: CardProps) {
  const revealed = card.revealed

  if (revealed) {
    return (
      <div
        className={`relative rounded-xl border-2 ${revealedColors[card.type]} flex items-center justify-center p-1 transition-all duration-500 min-h-[3.5rem] sm:min-h-[4.5rem]`}
      >
        <span className="text-[0.65rem] sm:text-xs font-bold text-white/90 text-center leading-tight tracking-wide uppercase">
          {card.word}
        </span>
        {card.type === 'assassin' && (
          <span className="absolute top-1 right-1 text-xs">💀</span>
        )}
      </div>
    )
  }

  const spymasterStyle = isSpymaster ? spymasterBorders[card.type] : ''
  const clickable = canGuess && !isSpymaster

  return (
    <button
      onClick={() => clickable && onGuess(index)}
      disabled={!clickable}
      className={`relative rounded-xl border-2 bg-navy-700/80 hover:bg-navy-600/80 flex items-center justify-center p-1 transition-all duration-200 min-h-[3.5rem] sm:min-h-[4.5rem] cursor-pointer disabled:cursor-default
        ${clickable ? 'hover:scale-105 hover:-translate-y-0.5 hover:shadow-lg active:scale-95' : ''}
        ${spymasterStyle || 'border-white/10'}
      `}
    >
      <span className="text-[0.65rem] sm:text-xs font-bold text-white/80 text-center leading-tight tracking-wide uppercase">
        {card.word}
      </span>
      {isSpymaster && (
        <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${spymasterDots[card.type]}`} />
      )}
    </button>
  )
}
