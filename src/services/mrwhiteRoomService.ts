import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { MrWhiteGameState, MrWhitePlayer } from '../types/mrwhite'
import { generateRoomCode } from '../lib/roomCode'
import { getDefaultConfig } from '../lib/mrwhiteLogic'

function createInitialState(roomCode: string, hostId: string, hostName: string): MrWhiteGameState {
  return {
    roomCode,
    gameType: 'mrwhite',
    createdAt: Date.now(),
    hostId,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        role: null,
        word: null,
        isHost: true,
        isAlive: true,
        isReady: false,
      },
    },
    phase: 'lobby',
    config: getDefaultConfig(1),

    civilianWord: null,
    undercoverWord: null,

    round: 0,
    describerOrder: [],
    describerIndex: 0,
    currentDescriber: null,

    votes: {},
    tiedPlayers: [],
    lastEliminated: null,
    lastEliminatedRole: null,

    mrWhiteGuess: null,
    mrWhiteGuessCorrect: null,

    winner: null,
    winReason: null,
  }
}

export async function createMrWhiteRoom(hostId: string, hostName: string): Promise<string> {
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

export async function joinMrWhiteRoom(roomCode: string, playerId: string, playerName: string): Promise<void> {
  const ref = doc(db, 'games', roomCode.toUpperCase())
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as MrWhiteGameState
  if (data.phase !== 'lobby') {
    throw new Error('Game already in progress')
  }

  const playerCount = Object.keys(data.players).length
  if (playerCount >= 20) {
    throw new Error('Room is full (max 20 players)')
  }

  const player: MrWhitePlayer = {
    id: playerId,
    name: playerName,
    role: null,
    word: null,
    isHost: false,
    isAlive: true,
    isReady: false,
  }

  await updateDoc(ref, {
    [`players.${playerId}`]: player,
  })
}
