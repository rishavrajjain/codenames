import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Container } from '../../components/layout/Container'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { usePsychGame } from '../../hooks/usePsychGame'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import {
  updatePsychConfig,
  startPsychGame,
  leavePsychGame,
  kickPsychPlayer,
} from '../../services/psychGameService'
import { useEffect, useState } from 'react'

export function PsychLobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading, error } = usePsychGame(roomCode)
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [starting, setStarting] = useState(false)
  const [kickTarget, setKickTarget] = useState<string | null>(null)

  useEffect(() => {
    if (game?.phase === 'answering' || game?.phase === 'voting' || game?.phase === 'round_result') {
      navigate(`/psych/${roomCode}/play`, { replace: true })
    }
    if (game?.phase === 'finished') {
      navigate(`/psych/${roomCode}/results`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (error || !game) {
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
  const isHost = me?.isHost ?? false
  const players = Object.values(game.players)
  const playerCount = players.length

  async function handleStart() {
    if (!roomCode) return
    if (playerCount < 3) {
      addToast('Need at least 3 players', 'error')
      return
    }
    setStarting(true)
    try {
      await startPsychGame(roomCode)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start game', 'error')
      setStarting(false)
    }
  }

  async function handleLeave() {
    if (!user || !roomCode) return
    await leavePsychGame(roomCode, user.uid)
    navigate('/')
  }

  async function handleKick(playerId: string) {
    if (!roomCode) return
    await kickPsychPlayer(roomCode, playerId)
    setKickTarget(null)
    addToast('Player removed', 'success')
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${roomCode}`
    navigator.clipboard.writeText(link)
    addToast('Invite link copied!', 'success')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Container className="py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                <span className="text-white/90">Psych!</span>
                <span className="text-white/30 text-lg ml-2">Lobby</span>
              </h1>
              <button
                onClick={copyInviteLink}
                className="mt-2 flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-sm text-white/70 font-mono truncate">{window.location.origin}/join/{roomCode}</span>
                <svg className="w-4 h-4 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLeave}>Leave</Button>
          </div>

          {/* Round Config (host only) */}
          {isHost && (
            <div className="glass p-5 mb-6 space-y-4">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Game Setup</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/50">Number of rounds</span>
                <div className="flex items-center gap-2">
                  {[5, 7, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => updatePsychConfig(roomCode!, n)}
                      className={`w-12 h-9 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                        game.config.numRounds === n
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/10 text-white/50 hover:bg-white/20'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Config summary (non-host) */}
          {!isHost && (
            <div className="glass p-4 mb-6 text-center text-sm text-white/40">
              {game.config.numRounds} rounds
            </div>
          )}

          {/* Player List */}
          <div className="glass p-6 mb-8">
            <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">
              Players ({playerCount})
            </h3>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <Badge color={p.isHost ? 'blue' : 'default'}>
                    {p.name} {p.isHost && '(Host)'}
                  </Badge>
                  {isHost && !p.isHost && (
                    <button
                      onClick={() => setKickTarget(p.id)}
                      className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove player"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* How to Play */}
          <div className="glass p-6 mb-8 space-y-3">
            <h3 className="text-sm text-white/40 uppercase tracking-wider">How to Play</h3>
            <div className="text-sm text-white/50 space-y-2">
              <p>A <span className="text-violet-400 font-semibold">trivia question</span> is shown to everyone. Make up a <span className="text-amber-400 font-semibold">fake but believable answer</span> to trick other players!</p>
              <p>All fake answers are mixed with the <span className="text-green-400 font-semibold">real answer</span>. Vote for the one you think is correct.</p>
              <p><span className="text-white font-semibold">+1000 points</span> for picking the real answer. <span className="text-white font-semibold">+500 points</span> for each player your fake answer fools!</p>
            </div>
          </div>

          {/* Start Button */}
          {isHost ? (
            <div className="text-center">
              <Button size="lg" onClick={handleStart} loading={starting} disabled={playerCount < 3}>
                {playerCount < 3 ? `Need ${3 - playerCount} more player${3 - playerCount > 1 ? 's' : ''}` : 'Start Game'}
              </Button>
            </div>
          ) : (
            <p className="text-center text-white/40 text-sm">Waiting for host to start the game...</p>
          )}

          {/* Kick Confirmation Modal */}
          <Modal open={!!kickTarget} onClose={() => setKickTarget(null)} title="Remove player?">
            <p className="text-white/60">
              Remove {kickTarget && game.players[kickTarget]?.name} from the game?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setKickTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => kickTarget && handleKick(kickTarget)}>
                Remove
              </Button>
            </div>
          </Modal>
        </motion.div>
      </Container>
    </div>
  )
}
