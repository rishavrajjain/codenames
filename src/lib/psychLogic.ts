import { PsychQuestion, PsychAnswer } from '../types/psych'
import { PSYCH_QUESTIONS } from '../constants/psychQuestions'
import { shuffle } from './shuffle'

export function pickQuestions(count: number): PsychQuestion[] {
  return shuffle([...PSYCH_QUESTIONS]).slice(0, count)
}

export function shuffleAnswers(
  fakeAnswers: Record<string, string>,
  realAnswer: string
): PsychAnswer[] {
  const answers: PsychAnswer[] = []

  // Add fake answers
  for (const [playerId, text] of Object.entries(fakeAnswers)) {
    answers.push({
      id: `fake-${playerId}`,
      text,
      playerId,
    })
  }

  // Add real answer
  answers.push({
    id: 'real',
    text: realAnswer,
    playerId: null,
  })

  return shuffle(answers)
}

export function calculateRoundScores(
  votes: Record<string, string>,
  displayAnswers: PsychAnswer[],
): Record<string, number> {
  const points: Record<string, number> = {}

  for (const [voterId, answerId] of Object.entries(votes)) {
    const answer = displayAnswers.find(a => a.id === answerId)
    if (!answer) continue

    if (answer.playerId === null) {
      // Voted for the real answer: +1000
      points[voterId] = (points[voterId] || 0) + 1000
    } else {
      // Voted for someone's fake: +500 to the fake author
      points[answer.playerId] = (points[answer.playerId] || 0) + 500
    }
  }

  return points
}

export function getRankings(scores: Record<string, number>): { playerId: string; score: number }[] {
  return Object.entries(scores)
    .map(([playerId, score]) => ({ playerId, score }))
    .sort((a, b) => b.score - a.score)
}
