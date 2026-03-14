import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { MrWhiteGameState } from '../types/mrwhite'

export function useMrWhiteGame(roomCode: string | undefined) {
  const [game, setGame] = useState<MrWhiteGameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomCode) return

    const ref = doc(db, 'games', roomCode)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setGame(snap.data() as MrWhiteGameState)
          setError(null)
        } else {
          setGame(null)
          setError('Game not found')
        }
        setLoading(false)
      },
      (err) => {
        console.error('Mr. White game subscription error:', err)
        setError('Connection lost')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [roomCode])

  return { game, loading, error }
}
