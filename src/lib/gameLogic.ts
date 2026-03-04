import { Card, CardType, Team, GameState } from '../types/game'
import { WORDS } from '../constants/words'
import { shuffle } from './shuffle'

export function pickStartingTeam(): Team {
  return Math.random() < 0.5 ? 'red' : 'blue'
}

export function generateBoard(startingTeam: Team): Card[] {
  const words = shuffle(WORDS).slice(0, 25)

  const startingCount = 9
  const otherCount = 8
  const neutralCount = 7
  const assassinCount = 1

  const types: CardType[] = [
    ...Array(startingCount).fill(startingTeam),
    ...Array(otherCount).fill(startingTeam === 'red' ? 'blue' : 'red'),
    ...Array(neutralCount).fill('neutral' as CardType),
    ...Array(assassinCount).fill('assassin' as CardType),
  ]

  const shuffledTypes = shuffle(types)

  return words.map((word, i) => ({
    word,
    type: shuffledTypes[i],
    revealed: false,
    revealedBy: null,
  }))
}

export function countRemaining(board: Card[], team: Team): number {
  return board.filter(c => c.type === team && !c.revealed).length
}

export function checkWinCondition(game: GameState): {
  winner: Team | null
  winReason: string | null
  loser: Team | null
} {
  if (game.redRemaining === 0) {
    return { winner: 'red', winReason: 'All red cards found!', loser: 'blue' }
  }
  if (game.blueRemaining === 0) {
    return { winner: 'blue', winReason: 'All blue cards found!', loser: 'red' }
  }

  const assassinCard = game.board.find(c => c.type === 'assassin' && c.revealed)
  if (assassinCard && assassinCard.revealedBy) {
    const losingTeam = game.currentTurn?.team ?? 'red'
    const winningTeam: Team = losingTeam === 'red' ? 'blue' : 'red'
    return {
      winner: winningTeam,
      winReason: `${losingTeam.toUpperCase()} team hit the assassin!`,
      loser: losingTeam,
    }
  }

  return { winner: null, winReason: null, loser: null }
}
