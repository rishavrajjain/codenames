import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Container } from '../../components/layout/Container'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { useMrWhiteGame } from '../../hooks/useMrWhiteGame'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import {
  updateMrWhiteConfig,
  startMrWhiteGame,
  leaveMrWhiteGame,
  kickPlayer,
} from '../../services/mrwhiteGameService'
import { getDefaultConfig } from '../../lib/mrwhiteLogic'
import { useEffect, useState } from 'react'

export function MrWhiteLobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading, error } = useMrWhiteGame(roomCode)
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [starting, setStarting] = useState(false)
  const [kickTarget, setKickTarget] = useState<string | null>(null)

  useEffect(() => {
    if (game?.phase === 'word_reveal' || game?.phase === 'describing' || game?.phase === 'voting' || game?.phase === 'vote_result' || game?.phase === 'mrwhite_guess') {
      navigate(`/mrwhite/${roomCode}/play`, { replace: true })
    }
    if (game?.phase === 'finished') {
      navigate(`/mrwhite/${roomCode}/results`, { replace: true })
    }
  }, [game?.phase, roomCode, navigate])

  // Auto-update config when player count changes
  useEffect(() => {
    if (!game || !roomCode) return
    const me = user ? game.players[user.uid] : null
    if (!me?.isHost) return
    const playerCount = Object.keys(game.players).length
    const def = getDefaultConfig(playerCount)
    // Only auto-update if the current config exceeds player count
    const totalInfiltrators = game.config.numUndercover + game.config.numMrWhite
    if (totalInfiltrators >= playerCount) {
      updateMrWhiteConfig(roomCode, def.numUndercover, def.numMrWhite)
    }
  }, [game && Object.keys(game.players).length])

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
    const total = game!.config.numUndercover + game!.config.numMrWhite
    if (total >= playerCount) {
      addToast('Too many infiltrators for player count', 'error')
      return
    }
    setStarting(true)
    try {
      await startMrWhiteGame(roomCode)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start game', 'error')
      setStarting(false)
    }
  }

  async function handleLeave() {
    if (!user || !roomCode) return
    await leaveMrWhiteGame(roomCode, user.uid)
    navigate('/')
  }

  async function handleKick(playerId: string) {
    if (!roomCode) return
    await kickPlayer(roomCode, playerId)
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
                <span className="text-white/90">Mr. White</span>
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

          {/* Role Config (host only) */}
          {isHost && (
            <RoleConfig
              playerCount={playerCount}
              config={game.config}
              roomCode={roomCode!}
            />
          )}

          {/* Role summary (non-host) */}
          {!isHost && (
            <div className="glass p-4 mb-6 text-center text-sm text-white/40">
              {(game.config.expectedPlayers ?? playerCount) - game.config.numUndercover - game.config.numMrWhite} civilians, {game.config.numUndercover} undercover, {game.config.numMrWhite} mr. white
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
              <p><span className="text-green-400 font-semibold">Civilians</span> get the same word. <span className="text-amber-400 font-semibold">Undercover</span> gets a similar but different word. <span className="text-white font-semibold">Mr. White</span> gets no word at all.</p>
              <p>Each round, describe your word without saying it. Then vote to eliminate who you think is the impostor.</p>
              <p>If <span className="text-white font-semibold">Mr. White</span> is voted out, they get one chance to guess the civilian word to win instantly!</p>
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

function RoleConfig({
  playerCount,
  config,
  roomCode,
}: {
  playerCount: number
  config: { numUndercover: number; numMrWhite: number; expectedPlayers?: number }
  roomCode: string
}) {
  const [expectedPlayers, setExpectedPlayers] = useState(config.expectedPlayers ?? Math.max(playerCount, 4))
  const numCivilians = expectedPlayers - config.numUndercover - config.numMrWhite
  const maxInfiltrators = Math.max(1, expectedPlayers - 2)

  // When expected players changes, auto-suggest config
  function handleExpectedChange(n: number) {
    const clamped = Math.max(3, Math.min(15, n))
    setExpectedPlayers(clamped)
    const s = getDefaultConfig(clamped)
    updateMrWhiteConfig(roomCode, s.numUndercover, s.numMrWhite, clamped)
  }

  return (
    <div className="glass p-5 mb-6 space-y-5">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Game Setup</h3>

      {/* Expected players */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-white/50">Expected players</span>
        <select
          value={expectedPlayers}
          onChange={e => handleExpectedChange(Number(e.target.value))}
          className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm font-bold cursor-pointer hover:bg-white/15 transition-all appearance-none pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 4).map(n => (
            <option key={n} value={n} className="bg-navy-800 text-white">{n}</option>
          ))}
        </select>
      </div>

      {/* Suggested breakdown — with +/- adjustments */}
      <div className="bg-white/5 rounded-xl p-4 space-y-3">
        <div className="text-xs text-white/30 uppercase tracking-wider">Role Breakdown</div>
        <div className="flex flex-wrap gap-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-400">Civilians</span>
            <span className="text-lg font-bold text-white/80 w-6 text-center">{numCivilians}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-400">Undercover</span>
            <button
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all cursor-pointer"
              onClick={() => updateMrWhiteConfig(roomCode, Math.max(1, config.numUndercover - 1), config.numMrWhite, expectedPlayers)}
            >-</button>
            <span className="text-lg font-bold text-white/80 w-6 text-center">{config.numUndercover}</span>
            <button
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all cursor-pointer"
              onClick={() => updateMrWhiteConfig(roomCode, Math.min(maxInfiltrators, config.numUndercover + 1), config.numMrWhite, expectedPlayers)}
            >+</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Mr. White</span>
            <button
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all cursor-pointer"
              onClick={() => updateMrWhiteConfig(roomCode, config.numUndercover, Math.max(0, config.numMrWhite - 1), expectedPlayers)}
            >-</button>
            <span className="text-lg font-bold text-white/80 w-6 text-center">{config.numMrWhite}</span>
            <button
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all cursor-pointer"
              onClick={() => updateMrWhiteConfig(roomCode, config.numUndercover, Math.min(maxInfiltrators, config.numMrWhite + 1), expectedPlayers)}
            >+</button>
          </div>
        </div>
        <div className="text-xs text-white/20">
          Configured for {expectedPlayers} players. {playerCount} joined so far.
        </div>
      </div>
    </div>
  )
}
