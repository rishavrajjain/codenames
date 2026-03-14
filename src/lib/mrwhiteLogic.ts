import { MrWhitePlayer, MrWhiteConfig, MrWhiteGameState, MrWhiteWinner } from '../types/mrwhite'
import { WORD_PAIRS } from '../constants/wordPairs'
import { shuffle } from './shuffle'

export function getDefaultConfig(playerCount: number): MrWhiteConfig {
  const numUndercover = Math.max(1, Math.floor(playerCount / 4))
  const numMrWhite = playerCount >= 5 ? 1 : 0
  return { numUndercover, numMrWhite, expectedPlayers: playerCount }
}

export function pickWordPair(): [string, string] {
  const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)]
  // Randomly swap which is civilian vs undercover
  return Math.random() < 0.5 ? pair : [pair[1], pair[0]]
}

export function assignRoles(
  players: Record<string, MrWhitePlayer>,
  config: MrWhiteConfig
): Record<string, MrWhitePlayer> {
  const ids = shuffle(Object.keys(players))
  const updated = { ...players }

  let idx = 0

  // Assign Mr. White
  for (let i = 0; i < config.numMrWhite && idx < ids.length; i++, idx++) {
    updated[ids[idx]] = { ...updated[ids[idx]], role: 'mrwhite', word: null }
  }

  // Assign Undercover
  for (let i = 0; i < config.numUndercover && idx < ids.length; i++, idx++) {
    updated[ids[idx]] = { ...updated[ids[idx]], role: 'undercover' }
  }

  // Rest are Civilians
  for (; idx < ids.length; idx++) {
    updated[ids[idx]] = { ...updated[ids[idx]], role: 'civilian' }
  }

  return updated
}

export function assignWords(
  players: Record<string, MrWhitePlayer>,
  civilianWord: string,
  undercoverWord: string
): Record<string, MrWhitePlayer> {
  const updated: Record<string, MrWhitePlayer> = {}
  for (const [id, p] of Object.entries(players)) {
    if (p.role === 'civilian') {
      updated[id] = { ...p, word: civilianWord }
    } else if (p.role === 'undercover') {
      updated[id] = { ...p, word: undercoverWord }
    } else {
      updated[id] = { ...p, word: null }
    }
  }
  return updated
}

export function createDescriberOrder(players: Record<string, MrWhitePlayer>): string[] {
  const aliveIds = Object.values(players)
    .filter(p => p.isAlive)
    .map(p => p.id)
  return shuffle(aliveIds)
}

export function tallyVotes(votes: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const votedFor of Object.values(votes)) {
    counts[votedFor] = (counts[votedFor] || 0) + 1
  }
  return counts
}

export function getEliminationResult(votes: Record<string, string>): {
  eliminated: string | null
  tied: string[]
} {
  const counts = tallyVotes(votes)
  const entries = Object.entries(counts)
  if (entries.length === 0) return { eliminated: null, tied: [] }

  const maxVotes = Math.max(...entries.map(([, c]) => c))
  const topPlayers = entries.filter(([, c]) => c === maxVotes).map(([id]) => id)

  if (topPlayers.length === 1) {
    return { eliminated: topPlayers[0], tied: [] }
  }
  return { eliminated: null, tied: topPlayers }
}

export function checkWinCondition(game: MrWhiteGameState): {
  winner: MrWhiteWinner | null
  winReason: string | null
} {
  const alive = Object.values(game.players).filter(p => p.isAlive)
  const aliveCivilians = alive.filter(p => p.role === 'civilian')
  const aliveInfiltrators = alive.filter(p => p.role === 'undercover' || p.role === 'mrwhite')

  // Civilians win if all infiltrators are eliminated
  if (aliveInfiltrators.length === 0) {
    return { winner: 'civilians', winReason: 'All infiltrators have been eliminated!' }
  }

  // Infiltrators win if civilians count <= 1
  if (aliveCivilians.length <= 1) {
    return { winner: 'infiltrators', winReason: 'The infiltrators have taken over!' }
  }

  return { winner: null, winReason: null }
}

export function checkMrWhiteGuess(guess: string, civilianWord: string): boolean {
  return guess.trim().toLowerCase() === civilianWord.trim().toLowerCase()
}
