export type Team = 'red' | 'blue'
export type Role = 'spymaster' | 'operative'
export type CardType = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'lobby' | 'playing' | 'finished'
export type TurnPhase = 'giving_clue' | 'guessing'

export interface Player {
  id: string
  name: string
  team: Team | null
  role: Role | null
  isHost: boolean
}

export interface Card {
  word: string
  type: CardType
  revealed: boolean
  revealedBy: string | null
}

export interface Clue {
  word: string
  number: number
  team: Team
  timestamp: number
}

export interface Turn {
  team: Team
  phase: TurnPhase
  clue: Clue | null
  guessesRemaining: number
  guessesUsed: number
}

export interface TimerConfig {
  enabled: boolean
  minutes: number
}

export interface GameState {
  roomCode: string
  createdAt: number
  hostId: string
  players: Record<string, Player>
  phase: GamePhase
  board: Card[]
  startingTeam: Team | null
  currentTurn: Turn | null
  clueHistory: Clue[]
  redRemaining: number
  blueRemaining: number
  winner: Team | null
  winReason: string | null
  loser: Team | null
  timerConfig: TimerConfig
  turnStartedAt: number | null
}
