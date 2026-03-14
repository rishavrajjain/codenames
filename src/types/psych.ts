export type PsychPhase =
  | 'lobby'
  | 'answering'
  | 'voting'
  | 'round_result'
  | 'finished'

export interface PsychPlayer {
  id: string
  name: string
  isHost: boolean
  score: number
}

export interface PsychQuestion {
  question: string
  realAnswer: string
}

export interface PsychAnswer {
  id: string
  text: string
  playerId: string | null // null = real answer
}

export interface PsychRoundResult {
  round: number
  question: string
  realAnswer: string
  answers: PsychAnswer[]
  votes: Record<string, string> // voterId -> answerId
  pointsEarned: Record<string, number> // playerId -> points this round
}

export interface PsychConfig {
  numRounds: number
}

export interface PsychGameState {
  roomCode: string
  gameType: 'psych'
  createdAt: number
  hostId: string
  players: Record<string, PsychPlayer>
  phase: PsychPhase
  config: PsychConfig

  currentRound: number
  questions: PsychQuestion[]
  currentQuestion: string | null
  realAnswer: string | null

  // playerId -> their fake answer text
  answers: Record<string, string>
  // Shuffled display answers (fakes + real)
  displayAnswers: PsychAnswer[]
  // playerId -> answerId they voted for
  votes: Record<string, string>

  roundHistory: PsychRoundResult[]
  scores: Record<string, number>
}
