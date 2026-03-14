import { doc, updateDoc, runTransaction } from 'firebase/firestore'
import { db } from '../config/firebase'
import { MrWhiteGameState, MrWhitePlayer } from '../types/mrwhite'
import {
  assignRoles,
  assignWords,
  pickWordPair,
  createDescriberOrder,
  getEliminationResult,
  checkWinCondition,
  checkMrWhiteGuess,
} from '../lib/mrwhiteLogic'

export async function updateMrWhiteConfig(roomCode: string, numUndercover: number, numMrWhite: number, expectedPlayers?: number): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  const update: Record<string, string | number> = {
    'config.numUndercover': numUndercover,
    'config.numMrWhite': numMrWhite,
  }
  if (expectedPlayers !== undefined) {
    update['config.expectedPlayers'] = expectedPlayers
  }
  await updateDoc(ref, update)
}

export async function kickPlayer(roomCode: string, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState
    if (game.phase !== 'lobby') return

    const newPlayers = { ...game.players }
    delete newPlayers[playerId]
    tx.update(ref, { players: newPlayers })
  })
}

export async function startMrWhiteGame(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState

    const playerCount = Object.keys(game.players).length
    if (playerCount < 3) throw new Error('Need at least 3 players')

    const totalInfiltrators = game.config.numUndercover + game.config.numMrWhite
    if (totalInfiltrators >= playerCount) throw new Error('Too many infiltrators for player count')

    // Assign roles
    let players = assignRoles(game.players, game.config)

    // Pick words and assign
    const [civilianWord, undercoverWord] = pickWordPair()
    players = assignWords(players, civilianWord, undercoverWord)

    // Reset ready state
    for (const id of Object.keys(players)) {
      players[id] = { ...players[id], isReady: false, isAlive: true }
    }

    const order = createDescriberOrder(players)

    tx.update(ref, {
      players,
      phase: 'word_reveal',
      civilianWord,
      undercoverWord,
      round: 1,
      describerOrder: order,
      describerIndex: 0,
      currentDescriber: order[0] || null,
      votes: {},
      tiedPlayers: [],
      lastEliminated: null,
      lastEliminatedRole: null,
      mrWhiteGuess: null,
      mrWhiteGuessCorrect: null,
      winner: null,
      winReason: null,
    })
  })
}

export async function markReady(roomCode: string, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    [`players.${playerId}.isReady`]: true,
  })
}

export async function forceStartDescribing(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, { phase: 'describing' })
}

export async function advanceDescriber(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState
    if (game.phase !== 'describing') return

    const nextIndex = game.describerIndex + 1
    if (nextIndex < game.describerOrder.length) {
      tx.update(ref, {
        describerIndex: nextIndex,
        currentDescriber: game.describerOrder[nextIndex],
      })
    }
    // If all described, stay in describing phase — host will advance to voting
  })
}

export async function startVoting(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    phase: 'voting',
    votes: {},
    tiedPlayers: [],
  })
}

export async function submitVote(roomCode: string, voterId: string, votedForId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    [`votes.${voterId}`]: votedForId,
  })
}

export async function revealVotes(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState
    if (game.phase !== 'voting') return

    const { eliminated, tied } = getEliminationResult(game.votes)

    if (tied.length > 0) {
      // Tie — host needs to break it
      tx.update(ref, { tiedPlayers: tied })
      return
    }

    if (!eliminated) return

    const eliminatedPlayer = game.players[eliminated]
    const newPlayers = { ...game.players }
    newPlayers[eliminated] = { ...newPlayers[eliminated], isAlive: false }

    tx.update(ref, {
      players: newPlayers,
      phase: 'vote_result',
      lastEliminated: eliminated,
      lastEliminatedRole: eliminatedPlayer.role,
      tiedPlayers: [],
    })
  })
}

export async function hostBreakTie(roomCode: string, eliminatedId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState
    if (game.phase !== 'voting') return
    if (!game.tiedPlayers.includes(eliminatedId)) return

    const eliminatedPlayer = game.players[eliminatedId]
    const newPlayers = { ...game.players }
    newPlayers[eliminatedId] = { ...newPlayers[eliminatedId], isAlive: false }

    tx.update(ref, {
      players: newPlayers,
      phase: 'vote_result',
      lastEliminated: eliminatedId,
      lastEliminatedRole: eliminatedPlayer.role,
      tiedPlayers: [],
    })
  })
}

export async function continueAfterVoteResult(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState
    if (game.phase !== 'vote_result') return

    // If Mr. White was eliminated, go to guess phase
    if (game.lastEliminatedRole === 'mrwhite') {
      tx.update(ref, { phase: 'mrwhite_guess', mrWhiteGuess: null, mrWhiteGuessCorrect: null })
      return
    }

    // Check win condition
    const { winner, winReason } = checkWinCondition(game)
    if (winner) {
      tx.update(ref, { phase: 'finished', winner, winReason })
      return
    }

    // Next round
    const order = createDescriberOrder(game.players)
    tx.update(ref, {
      phase: 'describing',
      round: game.round + 1,
      describerOrder: order,
      describerIndex: 0,
      currentDescriber: order[0] || null,
      votes: {},
      tiedPlayers: [],
      lastEliminated: null,
      lastEliminatedRole: null,
    })
  })
}

export async function submitMrWhiteGuess(roomCode: string, guess: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState
    if (game.phase !== 'mrwhite_guess') return
    if (!game.civilianWord) return

    const correct = checkMrWhiteGuess(guess, game.civilianWord)

    if (correct) {
      tx.update(ref, {
        mrWhiteGuess: guess,
        mrWhiteGuessCorrect: true,
        phase: 'finished',
        winner: 'mrwhite',
        winReason: `Mr. White correctly guessed "${game.civilianWord}"!`,
      })
    } else {
      // Wrong guess — check if civilians win now
      const { winner, winReason } = checkWinCondition(game)
      if (winner) {
        tx.update(ref, {
          mrWhiteGuess: guess,
          mrWhiteGuessCorrect: false,
          phase: 'finished',
          winner,
          winReason,
        })
      } else {
        // Game continues — next round
        const order = createDescriberOrder(game.players)
        tx.update(ref, {
          mrWhiteGuess: guess,
          mrWhiteGuessCorrect: false,
          phase: 'describing',
          round: game.round + 1,
          describerOrder: order,
          describerIndex: 0,
          currentDescriber: order[0] || null,
          votes: {},
          tiedPlayers: [],
          lastEliminated: null,
          lastEliminatedRole: null,
        })
      }
    }
  })
}

export async function resetMrWhiteGame(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState

    const resetPlayers: Record<string, MrWhitePlayer> = {}
    for (const [id, p] of Object.entries(game.players)) {
      resetPlayers[id] = {
        ...p,
        role: null,
        word: null,
        isAlive: true,
        isReady: false,
      }
    }

    tx.update(ref, {
      players: resetPlayers,
      phase: 'lobby',
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
    })
  })
}

export async function leaveMrWhiteGame(roomCode: string, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as MrWhiteGameState

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
