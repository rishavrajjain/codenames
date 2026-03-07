import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Container } from '../components/layout/Container'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { createRoom, joinRoom } from '../services/roomService'
import { Spinner } from '../components/ui/Spinner'

export function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Toggle: set to true to enable image crossfade on home screen
  const SHOW_HOME_IMAGE = true
  const [showImage, setShowImage] = useState(false)

  useEffect(() => {
    if (!SHOW_HOME_IMAGE) return
    const timer = setTimeout(() => setShowImage(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  async function handleCreate() {
    if (!user || !name.trim()) return
    setLoading(true)
    setError('')
    try {
      const code = await createRoom(user.uid, name.trim())
      navigate(`/game/${code}/lobby`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!user || !name.trim() || !roomCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const code = roomCode.trim().toUpperCase()
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
      {/* Background effects */}
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
          {/* Title (with optional image crossfade controlled by SHOW_HOME_IMAGE) */}
          <div className="relative mb-0">
            <motion.h1
              animate={SHOW_HOME_IMAGE ? { opacity: showImage ? 0 : 1, scale: showImage ? 0.8 : 1 } : {}}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className={`text-6xl sm:text-8xl font-black tracking-tight ${SHOW_HOME_IMAGE && showImage ? 'absolute inset-0 pointer-events-none' : ''}`}
            >
              <span className="bg-gradient-to-r from-red-team via-purple-400 to-blue-team bg-clip-text text-transparent">
                CODENAMES
              </span>
            </motion.h1>
            {SHOW_HOME_IMAGE && (
              <motion.img
                src="/images/homeimage.png"
                alt="Codenames"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: showImage ? 1 : 0, scale: showImage ? 1 : 0.85 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className={`w-48 sm:w-64 mx-auto -mb-4 ${!showImage ? 'absolute inset-0 m-auto pointer-events-none' : ''}`}
              />
            )}
          </div>

          {/* Cards */}
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm mx-auto"
          >
            {mode === 'home' && (
              <div className="glass p-8 space-y-4">
                <Button size="lg" className="w-full" onClick={() => setMode('create')}>
                  Create Game
                </Button>
                <Button size="lg" variant="secondary" className="w-full" onClick={() => setMode('join')}>
                  Join Game
                </Button>
              </div>
            )}

            {mode === 'create' && (
              <div className="glass p-8 space-y-5">
                <h2 className="text-xl font-bold">Create a Game</h2>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setMode('home'); setError('') }}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreate}
                    loading={loading}
                    disabled={!name.trim()}
                  >
                    Create Room
                  </Button>
                </div>
              </div>
            )}

            {mode === 'join' && (
              <div className="glass p-8 space-y-5">
                <h2 className="text-xl font-bold">Join a Game</h2>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                <Input
                  placeholder="Room code"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center tracking-[0.3em] uppercase text-lg"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setMode('home'); setError('') }}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleJoin}
                    loading={loading}
                    disabled={!name.trim() || roomCode.length < 6}
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </Container>
    </div>
  )
}
