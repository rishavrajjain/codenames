import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Container } from '../../components/layout/Container'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { usePsychGame } from '../../hooks/usePsychGame'
import { useAuth } from '../../hooks/useAuth'
import { resetPsychGame } from '../../services/psychGameService'

export function PsychResultsPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading } = usePsychGame(roomCode)
  const { user } = useAuth()

  useEffect(() => {
    if (game?.phase === 'lobby') {
      navigate(`/psych/${roomCode}/lobby`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  useEffect(() => {
    if (game?.phase === 'finished') {
      const colors = ['#8B5CF6', '#C4B5FD', '#F59E0B', '#FCD34D']
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors })
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.3 }, colors })
      }, 500)
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5, x: 0.7 }, colors })
      }, 1000)
    }
  }, [game?.phase])

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
  const sorted = Object.values(game.players).sort((a, b) => b.score - a.score)
  const winner = sorted[0]

  async function handlePlayAgain() {
    if (!roomCode) return
    await resetPsychGame(roomCode)
  }

  const podiumColors = [
    'from-amber-400 to-yellow-500',  // 1st - gold
    'from-gray-300 to-gray-400',     // 2nd - silver
    'from-amber-600 to-amber-700',   // 3rd - bronze
  ]

  const podiumGlow = [
    'shadow-[0_0_20px_rgba(245,158,11,0.3),0_0_40px_rgba(245,158,11,0.1)]',
    'shadow-[0_0_20px_rgba(156,163,175,0.2)]',
    'shadow-[0_0_20px_rgba(217,119,6,0.2)]',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <Container className="py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          {/* Winner banner */}
          <div className={`glass ${podiumGlow[0]} p-8 mb-8 max-w-lg mx-auto`}>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Winner</div>
            <motion.h1
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className={`text-4xl sm:text-5xl font-black bg-gradient-to-r ${podiumColors[0]} bg-clip-text text-transparent mb-2`}
            >
              {winner?.name}
            </motion.h1>
            <p className="text-amber-400 text-2xl font-bold">{winner?.score} points</p>
          </div>

          {/* Podium - top 3 */}
          {sorted.length >= 2 && (
            <div className="flex justify-center items-end gap-4 mb-8 max-w-lg mx-auto">
              {/* 2nd place */}
              {sorted[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`glass ${podiumGlow[1]} p-4 flex-1 text-center`}
                >
                  <div className="text-2xl font-bold text-white/30 mb-1">2nd</div>
                  <div className="font-semibold text-white/80">{sorted[1].name}</div>
                  <div className="text-sm text-amber-400 font-bold mt-1">{sorted[1].score}</div>
                </motion.div>
              )}
              {/* 1st place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`glass ${podiumGlow[0]} p-4 flex-1 text-center -mt-4`}
              >
                <div className={`text-2xl font-bold bg-gradient-to-r ${podiumColors[0]} bg-clip-text text-transparent mb-1`}>1st</div>
                <div className="font-semibold text-white">{sorted[0].name}</div>
                <div className="text-sm text-amber-400 font-bold mt-1">{sorted[0].score}</div>
              </motion.div>
              {/* 3rd place */}
              {sorted[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`glass ${podiumGlow[2]} p-4 flex-1 text-center`}
                >
                  <div className="text-2xl font-bold text-amber-600/50 mb-1">3rd</div>
                  <div className="font-semibold text-white/70">{sorted[2].name}</div>
                  <div className="text-sm text-amber-400 font-bold mt-1">{sorted[2].score}</div>
                </motion.div>
              )}
            </div>
          )}

          {/* Full scoreboard */}
          <div className="glass p-6 mb-8 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold text-white/60 mb-4">Final Scores</h2>
            <div className="space-y-2">
              {sorted.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5"
                >
                  <span className="text-white/70">
                    <span className="text-xs text-white/20 mr-2">{idx + 1}.</span>
                    {p.name}
                  </span>
                  <span className="font-bold text-amber-400">{p.score}</span>
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
