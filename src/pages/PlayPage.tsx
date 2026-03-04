import { useParams, useNavigate } from 'react-router-dom'
import { useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../hooks/useGame'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { Board } from '../components/game/Board'
import { ClueDisplay } from '../components/game/ClueDisplay'
import { ClueInput } from '../components/game/ClueInput'
import { TeamScoreboard } from '../components/game/TeamScoreboard'
import { TurnTimer } from '../components/game/TurnTimer'
import { GameLog } from '../components/game/GameLog'
import { guess, endGuessing, submitClue } from '../services/gameService'
import { Clue } from '../types/game'

export function PlayPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading, error } = useGame(roomCode)
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    if (game?.phase === 'finished') {
      navigate(`/game/${roomCode}/results`, { replace: true })
    }
    if (game?.phase === 'lobby') {
      navigate(`/game/${roomCode}/lobby`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  const handleTimeUp = useCallback(() => {
    if (!roomCode || !game?.currentTurn) return
    if (game.currentTurn.phase === 'guessing') {
      endGuessing(roomCode)
    }
  }, [roomCode, game?.currentTurn])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (error || !game || !game.currentTurn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 text-center space-y-4">
          <p className="text-red-400">{error || 'Game not found'}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  const me = user ? game.players[user.uid] : null
  const isSpymaster = me?.role === 'spymaster'
  const isMyTurn = me?.team === game.currentTurn.team
  const canGuess = isMyTurn && !isSpymaster && game.currentTurn.phase === 'guessing'
  const canGiveClue = isMyTurn && isSpymaster && game.currentTurn.phase === 'giving_clue'
  const canEndGuessing = isMyTurn && !isSpymaster && game.currentTurn.phase === 'guessing'

  const turnTeam = game.currentTurn.team
  const turnColor = turnTeam === 'red' ? 'text-red-400' : 'text-blue-400'

  async function handleGuess(cardIndex: number) {
    if (!roomCode || !user) return
    try {
      await guess(roomCode, cardIndex, user.uid)
    } catch {
      addToast('Failed to submit guess', 'error')
    }
  }

  async function handleSubmitClue(clue: Clue) {
    if (!roomCode) return
    try {
      await submitClue(roomCode, clue)
    } catch {
      addToast('Failed to submit clue', 'error')
    }
  }

  async function handleEndGuessing() {
    if (!roomCode) return
    try {
      await endGuessing(roomCode)
    } catch {
      addToast('Failed to end turn', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold">
              <span className={turnColor}>{turnTeam.toUpperCase()}</span>
              <span className="text-white/40"> — </span>
              <span className="text-white/60">
                {game.currentTurn.phase === 'giving_clue' ? 'Giving Clue' : 'Guessing'}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <TurnTimer
              timerConfig={game.timerConfig}
              turnStartedAt={game.turnStartedAt}
              onTimeUp={handleTimeUp}
            />
            {me && (
              <span className="text-xs text-white/30">
                {me.name} • {me.role} • {me.team}
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="mb-4">
          <TeamScoreboard
            redRemaining={game.redRemaining}
            blueRemaining={game.blueRemaining}
            currentTeam={game.currentTurn.team}
          />
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Board area */}
          <div className="flex-1 space-y-4">
            {/* Clue display */}
            <ClueDisplay
              clue={game.currentTurn.clue}
              team={game.currentTurn.team}
              phase={game.currentTurn.phase}
              guessesRemaining={game.currentTurn.guessesRemaining}
              guessesUsed={game.currentTurn.guessesUsed}
            />

            {/* Board */}
            <Board
              board={game.board}
              isSpymaster={isSpymaster}
              canGuess={canGuess}
              onGuess={handleGuess}
            />

            {/* Spymaster clue input */}
            {canGiveClue && (
              <ClueInput
                team={game.currentTurn.team}
                onSubmit={handleSubmitClue}
                disabled={false}
              />
            )}

            {/* End guessing button */}
            {canEndGuessing && (
              <div className="text-center">
                <Button variant="secondary" size="sm" onClick={handleEndGuessing}>
                  End Guessing
                </Button>
              </div>
            )}

            {/* Waiting messages */}
            {!isMyTurn && (
              <p className="text-center text-white/30 text-sm">
                Waiting for {turnTeam.toUpperCase()} team...
              </p>
            )}
            {isMyTurn && isSpymaster && game.currentTurn.phase === 'guessing' && (
              <p className="text-center text-white/30 text-sm">
                Your team is guessing...
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-64 space-y-4">
            <GameLog clueHistory={game.clueHistory} />

            {/* Player list */}
            <div className="glass p-4">
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Players</h3>
              <div className="space-y-1.5">
                {Object.values(game.players).map(p => {
                  const pColor = p.team === 'red' ? 'text-red-400' : p.team === 'blue' ? 'text-blue-400' : 'text-white/50'
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className={pColor}>{p.name}</span>
                      <span className="text-white/20 text-xs">{p.role}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
