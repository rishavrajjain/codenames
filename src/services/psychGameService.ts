import { doc, updateDoc, runTransaction } from 'firebase/firestore'
import { db } from '../config/firebase'
import { PsychGameState, PsychPlayer } from '../types/psych'
import { pickQuestions, shuffleAnswers, calculateRoundScores } from '../lib/psychLogic'

export async function updatePsychConfig(roomCode: string, numRounds: number): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, { 'config.numRounds': numRounds })
}

export async function kickPsychPlayer(roomCode: string, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState
    if (game.phase !== 'lobby') return

    const newPlayers = { ...game.players }
    delete newPlayers[playerId]
    tx.update(ref, { players: newPlayers })
  })
}

export async function startPsychGame(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState

    const playerCount = Object.keys(game.players).length
    if (playerCount < 3) throw new Error('Need at least 3 players')

    const questions = pickQuestions(game.config.numRounds)
    const firstQ = questions[0]

    // Initialize scores
    const scores: Record<string, number> = {}
    for (const id of Object.keys(game.players)) {
      scores[id] = 0
    }

    tx.update(ref, {
      phase: 'answering',
      currentRound: 1,
      questions,
      currentQuestion: firstQ.question,
      realAnswer: firstQ.realAnswer,
      answers: {},
      displayAnswers: [],
      votes: {},
      roundHistory: [],
      scores,
    })
  })
}

export async function submitAnswer(roomCode: string, playerId: string, answer: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    [`answers.${playerId}`]: answer.trim(),
  })
}

export async function startVoting(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState
    if (game.phase !== 'answering') return
    if (!game.realAnswer) return

    const display = shuffleAnswers(game.answers, game.realAnswer)

    tx.update(ref, {
      phase: 'voting',
      displayAnswers: display,
      votes: {},
    })
  })
}

export async function submitVote(roomCode: string, playerId: string, answerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    [`votes.${playerId}`]: answerId,
  })
}

export async function revealRound(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState
    if (game.phase !== 'voting') return

    const pointsEarned = calculateRoundScores(game.votes, game.displayAnswers)

    // Update cumulative scores
    const newScores = { ...game.scores }
    for (const [pid, pts] of Object.entries(pointsEarned)) {
      newScores[pid] = (newScores[pid] || 0) + pts
    }

    // Update player scores
    const newPlayers = { ...game.players }
    for (const [pid, player] of Object.entries(newPlayers)) {
      newPlayers[pid] = { ...player, score: newScores[pid] || 0 }
    }

    const roundResult = {
      round: game.currentRound,
      question: game.currentQuestion!,
      realAnswer: game.realAnswer!,
      answers: game.displayAnswers,
      votes: game.votes,
      pointsEarned,
    }

    tx.update(ref, {
      phase: 'round_result',
      scores: newScores,
      players: newPlayers,
      roundHistory: [...game.roundHistory, roundResult],
    })
  })
}

export async function nextRound(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState
    if (game.phase !== 'round_result') return

    const nextRoundNum = game.currentRound + 1

    if (nextRoundNum > game.config.numRounds) {
      // Game finished
      tx.update(ref, { phase: 'finished' })
      return
    }

    const nextQ = game.questions[nextRoundNum - 1]

    tx.update(ref, {
      phase: 'answering',
      currentRound: nextRoundNum,
      currentQuestion: nextQ.question,
      realAnswer: nextQ.realAnswer,
      answers: {},
      displayAnswers: [],
      votes: {},
    })
  })
}

export async function resetPsychGame(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState

    const resetPlayers: Record<string, PsychPlayer> = {}
    for (const [id, p] of Object.entries(game.players)) {
      resetPlayers[id] = { ...p, score: 0 }
    }

    tx.update(ref, {
      players: resetPlayers,
      phase: 'lobby',
      currentRound: 0,
      questions: [],
      currentQuestion: null,
      realAnswer: null,
      answers: {},
      displayAnswers: [],
      votes: {},
      roundHistory: [],
      scores: {},
    })
  })
}

export async function leavePsychGame(roomCode: string, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as PsychGameState

    const newPlayers = { ...game.players }
    delete newPlayers[playerId]

    if (Object.keys(newPlayers).length === 0) {
      tx.delete(ref)
      return
    }

    if (game.hostId === playerId) {
      const newHostId = Object.keys(newPlayers)[0]
      newPlayers[newHostId] = { ...newPlayers[newHostId], isHost: true }
      tx.update(ref, { players: newPlayers, hostId: newHostId })
    } else {
      tx.update(ref, { players: newPlayers })
    }
  })
}
