import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { PsychGameState, PsychPlayer } from '../types/psych'
import { generateRoomCode } from '../lib/roomCode'

function createInitialState(roomCode: string, hostId: string, hostName: string): PsychGameState {
  return {
    roomCode,
    gameType: 'psych',
    createdAt: Date.now(),
    hostId,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        isHost: true,
        score: 0,
      },
    },
    phase: 'lobby',
    config: { numRounds: 7 },

    currentRound: 0,
    questions: [],
    currentQuestion: null,
    realAnswer: null,

    answers: {},
    displayAnswers: [],
    votes: {},

    roundHistory: [],
    scores: {},
  }
}

export async function createPsychRoom(hostId: string, hostName: string): Promise<string> {
  let roomCode = generateRoomCode()
  let attempts = 0

  while (attempts < 10) {
    const ref = doc(db, 'games', roomCode)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      const state = createInitialState(roomCode, hostId, hostName)
      await setDoc(ref, state)
      return roomCode
    }
    roomCode = generateRoomCode()
    attempts++
  }

  throw new Error('Failed to generate unique room code')
}

export async function joinPsychRoom(roomCode: string, playerId: string, playerName: string): Promise<void> {
  const ref = doc(db, 'games', roomCode.toUpperCase())
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as PsychGameState
  if (data.phase !== 'lobby') {
    throw new Error('Game already in progress')
  }

  const playerCount = Object.keys(data.players).length
  if (playerCount >= 20) {
    throw new Error('Room is full (max 20 players)')
  }

  const player: PsychPlayer = {
    id: playerId,
    name: playerName,
    isHost: false,
    score: 0,
  }

  await updateDoc(ref, {
    [`players.${playerId}`]: player,
  })
}
