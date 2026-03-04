import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { GameState, Player, TimerConfig } from '../types/game'
import { generateRoomCode } from '../lib/roomCode'

function createInitialState(roomCode: string, hostId: string, hostName: string): GameState {
  return {
    roomCode,
    createdAt: Date.now(),
    hostId,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        team: null,
        role: null,
        isHost: true,
      },
    },
    phase: 'lobby',
    board: [],
    startingTeam: null,
    currentTurn: null,
    clueHistory: [],
    redRemaining: 0,
    blueRemaining: 0,
    winner: null,
    winReason: null,
    loser: null,
    timerConfig: { enabled: false, minutes: 2 },
    turnStartedAt: null,
  }
}

export async function createRoom(hostId: string, hostName: string): Promise<string> {
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

export async function joinRoom(roomCode: string, playerId: string, playerName: string): Promise<void> {
  const ref = doc(db, 'games', roomCode.toUpperCase())
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as GameState
  if (data.phase !== 'lobby') {
    throw new Error('Game already in progress')
  }

  const playerCount = Object.keys(data.players).length
  if (playerCount >= 10) {
    throw new Error('Room is full (max 10 players)')
  }

  const player: Player = {
    id: playerId,
    name: playerName,
    team: null,
    role: null,
    isHost: false,
  }

  await updateDoc(ref, {
    [`players.${playerId}`]: player,
  })
}

export async function updateTimerConfig(roomCode: string, config: TimerConfig): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, { timerConfig: config })
}
