import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../config/firebase'

export async function signInAnon(): Promise<User> {
  const result = await signInAnonymously(auth)
  return result.user
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}
