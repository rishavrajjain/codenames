import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { GameState } from '../types/game'

export function useGame(roomCode: string | undefined) {
  const [game, setGame] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomCode) return

    const ref = doc(db, 'games', roomCode)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setGame(snap.data() as GameState)
          setError(null)
        } else {
          setGame(null)
          setError('Game not found')
        }
        setLoading(false)
      },
      (err) => {
        console.error('Game subscription error:', err)
        setError('Connection lost')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [roomCode])

  return { game, loading, error }
}
