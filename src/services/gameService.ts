import { doc, updateDoc, runTransaction } from 'firebase/firestore'
import { db } from '../config/firebase'
import { GameState, Team, Role, Clue, Card } from '../types/game'
import { generateBoard, pickStartingTeam, countRemaining, checkWinCondition } from '../lib/gameLogic'

export async function updatePlayerTeam(roomCode: string, playerId: string, team: Team | null): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    [`players.${playerId}.team`]: team,
    [`players.${playerId}.role`]: null,
  })
}

export async function updatePlayerRole(roomCode: string, playerId: string, role: Role): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  await updateDoc(ref, {
    [`players.${playerId}.role`]: role,
  })
}

export async function startGame(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)
  const startingTeam = pickStartingTeam()
  const board = generateBoard(startingTeam)

  await updateDoc(ref, {
    phase: 'playing',
    startingTeam,
    board,
    redRemaining: countRemaining(board, 'red'),
    blueRemaining: countRemaining(board, 'blue'),
    currentTurn: {
      team: startingTeam,
      phase: 'giving_clue',
      clue: null,
      guessesRemaining: 0,
      guessesUsed: 0,
    },
    clueHistory: [],
    winner: null,
    winReason: null,
    loser: null,
    turnStartedAt: Date.now(),
  })
}

export async function submitClue(roomCode: string, clue: Clue): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as GameState
    if (!game.currentTurn || game.currentTurn.phase !== 'giving_clue') return

    tx.update(ref, {
      'currentTurn.phase': 'guessing',
      'currentTurn.clue': clue,
      'currentTurn.guessesRemaining': clue.number === 0 ? 99 : clue.number + 1,
      'currentTurn.guessesUsed': 0,
      clueHistory: [...game.clueHistory, clue],
      turnStartedAt: Date.now(),
    })
  })
}

export async function guess(roomCode: string, cardIndex: number, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as GameState

    if (!game.currentTurn || game.currentTurn.phase !== 'guessing') return
    if (game.board[cardIndex].revealed) return

    const newBoard: Card[] = game.board.map((card, i) =>
      i === cardIndex ? { ...card, revealed: true, revealedBy: playerId } : card
    )

    const currentTeam = game.currentTurn.team
    const card = game.board[cardIndex]
    const newRedRemaining = countRemaining(newBoard, 'red')
    const newBlueRemaining = countRemaining(newBoard, 'blue')

    const updatedGame: GameState = {
      ...game,
      board: newBoard,
      redRemaining: newRedRemaining,
      blueRemaining: newBlueRemaining,
    }

    const { winner, winReason, loser } = checkWinCondition(updatedGame)

    if (winner) {
      tx.update(ref, {
        board: newBoard,
        redRemaining: newRedRemaining,
        blueRemaining: newBlueRemaining,
        phase: 'finished',
        winner,
        winReason,
        loser,
      })
      return
    }

    const isCorrectGuess = card.type === currentTeam
    const newGuessesUsed = game.currentTurn.guessesUsed + 1
    const newGuessesRemaining = game.currentTurn.guessesRemaining - 1
    const turnOver = !isCorrectGuess || newGuessesRemaining <= 0

    if (turnOver) {
      const nextTeam: Team = currentTeam === 'red' ? 'blue' : 'red'
      tx.update(ref, {
        board: newBoard,
        redRemaining: newRedRemaining,
        blueRemaining: newBlueRemaining,
        currentTurn: {
          team: nextTeam,
          phase: 'giving_clue',
          clue: null,
          guessesRemaining: 0,
          guessesUsed: 0,
        },
        turnStartedAt: Date.now(),
      })
    } else {
      tx.update(ref, {
        board: newBoard,
        redRemaining: newRedRemaining,
        blueRemaining: newBlueRemaining,
        'currentTurn.guessesUsed': newGuessesUsed,
        'currentTurn.guessesRemaining': newGuessesRemaining,
      })
    }
  })
}

export async function endGuessing(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as GameState
    if (!game.currentTurn || game.currentTurn.phase !== 'guessing') return

    const nextTeam: Team = game.currentTurn.team === 'red' ? 'blue' : 'red'
    tx.update(ref, {
      currentTurn: {
        team: nextTeam,
        phase: 'giving_clue',
        clue: null,
        guessesRemaining: 0,
        guessesUsed: 0,
      },
      turnStartedAt: Date.now(),
    })
  })
}

export async function resetGame(roomCode: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as GameState

    const resetPlayers = Object.fromEntries(
      Object.entries(game.players).map(([id, p]) => [
        id,
        { ...p, role: null },
      ])
    )

    tx.update(ref, {
      phase: 'lobby',
      players: resetPlayers,
      board: [],
      startingTeam: null,
      currentTurn: null,
      clueHistory: [],
      redRemaining: 0,
      blueRemaining: 0,
      winner: null,
      winReason: null,
      loser: null,
      turnStartedAt: null,
    })
  })
}

export async function leaveGame(roomCode: string, playerId: string): Promise<void> {
  const ref = doc(db, 'games', roomCode)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const game = snap.data() as GameState

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
