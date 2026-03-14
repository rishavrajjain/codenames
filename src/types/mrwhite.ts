export type MrWhiteRole = 'civilian' | 'undercover' | 'mrwhite'

export type MrWhitePhase =
  | 'lobby'
  | 'word_reveal'
  | 'describing'
  | 'voting'
  | 'vote_result'
  | 'mrwhite_guess'
  | 'finished'

export type MrWhiteWinner = 'civilians' | 'infiltrators' | 'mrwhite'

export interface MrWhitePlayer {
  id: string
  name: string
  role: MrWhiteRole | null
  word: string | null
  isHost: boolean
  isAlive: boolean
  isReady: boolean
}

export interface MrWhiteConfig {
  numUndercover: number
  numMrWhite: number
  expectedPlayers: number
}

export interface MrWhiteGameState {
  roomCode: string
  gameType: 'mrwhite'
  createdAt: number
  hostId: string
  players: Record<string, MrWhitePlayer>
  phase: MrWhitePhase
  config: MrWhiteConfig

  civilianWord: string | null
  undercoverWord: string | null

  round: number
  describerOrder: string[]
  describerIndex: number
  currentDescriber: string | null

  votes: Record<string, string>
  tiedPlayers: string[]
  lastEliminated: string | null
  lastEliminatedRole: MrWhiteRole | null

  mrWhiteGuess: string | null
  mrWhiteGuessCorrect: boolean | null

  winner: MrWhiteWinner | null
  winReason: string | null
}
