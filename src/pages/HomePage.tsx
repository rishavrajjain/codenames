import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Container } from '../components/layout/Container'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { createRoom, joinRoom } from '../services/roomService'
import { createMrWhiteRoom, joinMrWhiteRoom } from '../services/mrwhiteRoomService'
import { createPsychRoom, joinPsychRoom } from '../services/psychRoomService'
import { Spinner } from '../components/ui/Spinner'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

type GameType = 'codenames' | 'mrwhite' | 'psych'

export function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [gameType, setGameType] = useState<GameType>('codenames')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Toggle: set to true to enable image crossfade on home screen
  const SHOW_HOME_IMAGE = false
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
      if (gameType === 'psych') {
        const code = await createPsychRoom(user.uid, name.trim())
        navigate(`/psych/${code}/lobby`)
      } else if (gameType === 'mrwhite') {
        const code = await createMrWhiteRoom(user.uid, name.trim())
        navigate(`/mrwhite/${code}/lobby`)
      } else {
        const code = await createRoom(user.uid, name.trim())
        navigate(`/game/${code}/lobby`)
      }
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

      // Detect game type from the room document
      const ref = doc(db, 'games', code)
      const snap = await getDoc(ref)
      if (!snap.exists()) throw new Error('Room not found')

      const data = snap.data()
      const detectedType = data.gameType === 'psych' ? 'psych' : data.gameType === 'mrwhite' ? 'mrwhite' : 'codenames'

      if (detectedType === 'psych') {
        await joinPsychRoom(code, user.uid, name.trim())
        navigate(`/psych/${code}/lobby`)
      } else if (detectedType === 'mrwhite') {
        await joinMrWhiteRoom(code, user.uid, name.trim())
        navigate(`/mrwhite/${code}/lobby`)
      } else {
        await joinRoom(code, user.uid, name.trim())
        navigate(`/game/${code}/lobby`)
      }
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
          <div className="relative mb-2">
            <motion.h1
              animate={SHOW_HOME_IMAGE ? { opacity: showImage ? 0 : 1, scale: showImage ? 0.8 : 1 } : {}}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className={`text-5xl sm:text-7xl font-black tracking-tight ${SHOW_HOME_IMAGE && showImage ? 'absolute inset-0 pointer-events-none' : ''}`}
            >
              <span className="bg-gradient-to-r from-red-team via-purple-400 to-blue-team bg-clip-text text-transparent">
                PARTY GAMES
              </span>
            </motion.h1>
            {SHOW_HOME_IMAGE && (
              <motion.img
                src="/images/homeimage.png"
                alt="Party Games"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: showImage ? 1 : 0, scale: showImage ? 1 : 0.85 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className={`w-48 sm:w-64 mx-auto -mb-4 ${!showImage ? 'absolute inset-0 m-auto pointer-events-none' : ''}`}
              />
            )}
          </div>
          <p className="text-white/30 text-sm mb-6">Play with friends online</p>

          {/* Cards */}
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto"
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

                {/* Game type selector */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'codenames' as GameType, label: 'Codenames', desc: 'Team words', icon: '🕵️' },
                    { key: 'mrwhite' as GameType, label: 'Mr. White', desc: 'Deduction', icon: '🎭' },
                    { key: 'psych' as GameType, label: 'Psych!', desc: 'Bluffing', icon: '🧠' },
                  ]).map(g => (
                    <button
                      key={g.key}
                      onClick={() => setGameType(g.key)}
                      className={`py-3 px-2 rounded-xl border-2 transition-all text-center overflow-hidden cursor-pointer ${
                        gameType === g.key
                          ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="text-2xl mb-1">{g.icon}</div>
                      <div className="font-bold text-[0.7rem] leading-tight">{g.label}</div>
                      <div className="text-[0.6rem] text-white/40 mt-0.5 leading-tight">{g.desc}</div>
                    </button>
                  ))}</div>

                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
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
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
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
