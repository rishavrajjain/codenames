import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Container } from '../components/layout/Container'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { joinRoom } from '../services/roomService'

export function JoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  async function handleJoin() {
    if (!user || !name.trim() || !roomCode) return
    setLoading(true)
    setError('')
    try {
      const code = roomCode.toUpperCase()
      await joinRoom(code, user.uid, name.trim())
      navigate(`/game/${code}/lobby`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-red-team via-purple-400 to-blue-team bg-clip-text text-transparent">
              CODENAMES
            </span>
          </h1>
          <p className="text-white/40 text-lg mb-8">
            You've been invited to room <span className="font-mono text-white/70 tracking-widest">{roomCode?.toUpperCase()}</span>
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="max-w-sm mx-auto glass p-8 space-y-5"
          >
            <h2 className="text-xl font-bold">Enter your name</h2>
            <Input
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
              className="w-full"
              onClick={handleJoin}
              loading={loading}
              disabled={!name.trim()}
              size="lg"
            >
              Join Game
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  )
}
