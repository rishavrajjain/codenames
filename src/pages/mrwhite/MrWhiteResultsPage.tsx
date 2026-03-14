import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Container } from '../../components/layout/Container'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { useMrWhiteGame } from '../../hooks/useMrWhiteGame'
import { useAuth } from '../../hooks/useAuth'
import { resetMrWhiteGame } from '../../services/mrwhiteGameService'

export function MrWhiteResultsPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading } = useMrWhiteGame(roomCode)
  const { user } = useAuth()

  useEffect(() => {
    if (game?.phase === 'lobby') {
      navigate(`/mrwhite/${roomCode}/lobby`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  useEffect(() => {
    if (game?.winner) {
      const colors = game.winner === 'civilians'
        ? ['#22C55E', '#86EFAC']
        : game.winner === 'mrwhite'
        ? ['#FFFFFF', '#C4B5FD']
        : ['#F59E0B', '#FCD34D']

      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors })
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.3 }, colors })
      }, 500)
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.7 }, colors })
      }, 1000)
    }
  }, [game?.winner])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 text-center space-y-4">
          <p className="text-red-400">Game not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  const isHost = user ? game.players[user.uid]?.isHost : false
  const players = Object.values(game.players)

  const winnerLabel = game.winner === 'civilians'
    ? 'Civilians Win!'
    : game.winner === 'mrwhite'
    ? 'Mr. White Wins!'
    : 'Infiltrators Win!'

  const winnerColor = game.winner === 'civilians'
    ? 'from-green-400 to-emerald-500'
    : game.winner === 'mrwhite'
    ? 'from-white to-violet-300'
    : 'from-amber-400 to-orange-500'

  const winnerGlow = game.winner === 'civilians'
    ? 'shadow-[0_0_20px_rgba(34,197,94,0.3),0_0_40px_rgba(34,197,94,0.1)]'
    : game.winner === 'mrwhite'
    ? 'shadow-[0_0_20px_rgba(255,255,255,0.3),0_0_40px_rgba(196,181,253,0.1)]'
    : 'shadow-[0_0_20px_rgba(245,158,11,0.3),0_0_40px_rgba(245,158,11,0.1)]'

  async function handlePlayAgain() {
    if (!roomCode) return
    await resetMrWhiteGame(roomCode)
  }

  const roleColor = (role: string | null) => {
    if (role === 'mrwhite') return 'text-white bg-white/10'
    if (role === 'undercover') return 'text-amber-400 bg-amber-500/10'
    return 'text-green-400 bg-green-500/10'
  }
  const roleLabel = (role: string | null) => {
    if (role === 'mrwhite') return 'Mr. White'
    if (role === 'undercover') return 'Undercover'
    return 'Civilian'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <Container className="py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          {/* Winner banner */}
          <div className={`glass ${winnerGlow} p-8 mb-8 max-w-lg mx-auto`}>
            <motion.h1
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className={`text-4xl sm:text-5xl font-black bg-gradient-to-r ${winnerColor} bg-clip-text text-transparent mb-2`}
            >
              {winnerLabel}
            </motion.h1>
            <p className="text-white/50">{game.winReason}</p>

            {game.mrWhiteGuess && (
              <div className="mt-4 text-sm">
                <span className="text-white/40">Mr. White guessed: </span>
                <span className={game.mrWhiteGuessCorrect ? 'text-green-400 font-bold' : 'text-red-400 line-through'}>
                  "{game.mrWhiteGuess}"
                </span>
              </div>
            )}
          </div>

          {/* Words reveal */}
          <div className="glass p-6 mb-8 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-white/60 mb-4">The Words</h2>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-xs text-green-400/60 uppercase tracking-wider mb-1">Civilian Word</div>
                <div className="text-2xl font-bold text-green-400">{game.civilianWord}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-400/60 uppercase tracking-wider mb-1">Undercover Word</div>
                <div className="text-2xl font-bold text-amber-400">{game.undercoverWord}</div>
              </div>
            </div>
          </div>

          {/* Player roles reveal */}
          <div className="glass p-6 mb-8 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-white/60 mb-4">All Roles Revealed</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {players.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.random() * 0.3 }}
                  className={`rounded-xl p-3 text-center ${roleColor(p.role)} ${!p.isAlive ? 'opacity-50' : ''}`}
                >
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs opacity-70 mt-0.5">{roleLabel(p.role)}</div>
                  {!p.isAlive && <div className="text-xs opacity-40 mt-0.5">eliminated</div>}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            {isHost && (
              <Button size="lg" onClick={handlePlayAgain}>
                Play Again
              </Button>
            )}
            <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
              Home
            </Button>
          </div>
          {!isHost && (
            <p className="text-white/30 text-sm mt-3">Waiting for host to start a new game...</p>
          )}
        </motion.div>
      </Container>
    </div>
  )
}
