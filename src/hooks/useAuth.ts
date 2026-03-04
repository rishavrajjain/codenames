import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { onAuthChange, signInAnon } from '../services/authService'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (u) => {
      if (u) {
        setUser(u)
      } else {
        try {
          const newUser = await signInAnon()
          setUser(newUser)
        } catch (err) {
          console.error('Auth error:', err)
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
