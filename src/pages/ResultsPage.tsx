import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Container } from '../components/layout/Container'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useGame } from '../hooks/useGame'
import { useAuth } from '../hooks/useAuth'
import { resetGame } from '../services/gameService'
import { Card as CardType, CardType as CType } from '../types/game'

const cardColors: Record<CType, string> = {
  red: 'bg-red-500/80 border-red-400',
  blue: 'bg-blue-500/80 border-blue-400',
  neutral: 'bg-amber-700/50 border-amber-600/40',
  assassin: 'bg-gray-900 border-gray-500',
}

export function ResultsPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading } = useGame(roomCode)
  const { user } = useAuth()

  useEffect(() => {
    if (game?.phase === 'lobby') {
      navigate(`/game/${roomCode}/lobby`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  useEffect(() => {
    if (game?.winner) {
      const colors = game.winner === 'red' ? ['#EF4444', '#FCA5A5'] : ['#3B82F6', '#93C5FD']
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors,
      })
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5, x: 0.3 },
          colors,
        })
      }, 500)
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5, x: 0.7 },
          colors,
        })
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
  const winnerColor = game.winner === 'red' ? 'from-red-500 to-red-400' : 'from-blue-500 to-blue-400'
  const winnerGlow = game.winner === 'red' ? 'glow-red' : 'glow-blue'

  async function handlePlayAgain() {
    if (!roomCode) return
    await resetGame(roomCode)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <Container className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Winner banner */}
          <div className={`glass ${winnerGlow} p-8 mb-8 max-w-lg mx-auto`}>
            <motion.h1
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className={`text-5xl sm:text-6xl font-black bg-gradient-to-r ${winnerColor} bg-clip-text text-transparent mb-2`}
            >
              {game.winner?.toUpperCase()} WINS!
            </motion.h1>
            <p className="text-white/50">{game.winReason}</p>
          </div>

          {/* Full board reveal */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white/60 mb-4">Full Board</h2>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-2xl mx-auto">
              {game.board.map((card: CardType, i: number) => (
                <div
                  key={i}
                  className={`rounded-xl border-2 ${cardColors[card.type]} flex items-center justify-center p-1 min-h-[3.5rem] sm:min-h-[4.5rem] relative ${card.revealed ? 'opacity-100' : 'opacity-60'}`}
                >
                  <span className="text-[0.6rem] sm:text-xs font-bold text-white/90 text-center leading-tight tracking-wide uppercase">
                    {card.word}
                  </span>
                  {card.type === 'assassin' && (
                    <span className="absolute top-0.5 right-1 text-[0.6rem]">💀</span>
                  )}
                  {!card.revealed && (
                    <span className="absolute bottom-0.5 right-1 text-[0.5rem] text-white/30">●</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 mt-2">● = unrevealed during game</p>
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
