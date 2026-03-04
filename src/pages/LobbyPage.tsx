import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Container } from '../components/layout/Container'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { useGame } from '../hooks/useGame'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'
import { updatePlayerTeam, updatePlayerRole, startGame, leaveGame } from '../services/gameService'
import { updateTimerConfig } from '../services/roomService'
import { Player, Team, Role } from '../types/game'
import { useEffect, useState } from 'react'

export function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { game, loading, error } = useGame(roomCode)
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (game?.phase === 'playing') {
      navigate(`/game/${roomCode}/play`, { replace: true })
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
  const redTeam = players.filter(p => p.team === 'red')
  const blueTeam = players.filter(p => p.team === 'blue')
  const unassigned = players.filter(p => !p.team)

  async function handleTeamJoin(team: Team) {
    if (!user || !roomCode) return
    await updatePlayerTeam(roomCode, user.uid, team)
  }

  async function handleRoleSelect(role: Role) {
    if (!user || !roomCode) return
    await updatePlayerRole(roomCode, user.uid, role)
  }

  async function handleStart() {
    if (!roomCode) return
    const hasRedSpy = redTeam.some(p => p.role === 'spymaster')
    const hasBlueSpy = blueTeam.some(p => p.role === 'spymaster')
    const hasRedOps = redTeam.some(p => p.role === 'operative')
    const hasBlueOps = blueTeam.some(p => p.role === 'operative')

    if (!hasRedSpy || !hasBlueSpy) {
      addToast('Each team needs a spymaster', 'error')
      return
    }
    if (!hasRedOps || !hasBlueOps) {
      addToast('Each team needs at least one operative', 'error')
      return
    }
    if (unassigned.length > 0) {
      addToast('All players must join a team', 'error')
      return
    }
    setStarting(true)
    try {
      await startGame(roomCode)
    } catch {
      addToast('Failed to start game', 'error')
      setStarting(false)
    }
  }

  async function handleLeave() {
    if (!user || !roomCode) return
    await leaveGame(roomCode, user.uid)
    navigate('/')
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomCode || '')
    addToast('Room code copied!', 'success')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Container className="py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Game Lobby</h1>
              <button
                onClick={copyRoomCode}
                className="mt-1 flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-mono text-lg tracking-widest">{roomCode}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLeave}>Leave</Button>
          </div>

          {/* Timer config (host only) */}
          {isHost && (
            <div className="glass p-4 mb-6 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={game.timerConfig.enabled}
                  onChange={e => updateTimerConfig(roomCode!, { ...game.timerConfig, enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-white/70">Turn Timer</span>
              </label>
              {game.timerConfig.enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={game.timerConfig.minutes}
                    onChange={e => updateTimerConfig(roomCode!, { ...game.timerConfig, minutes: Number(e.target.value) })}
                    className="w-24"
                  />
                  <span className="text-sm text-white/50">{game.timerConfig.minutes} min</span>
                </div>
              )}
            </div>
          )}

          {/* Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <TeamPanel
              team="red"
              players={redTeam}
              me={me}
              onJoin={() => handleTeamJoin('red')}
              onRoleSelect={handleRoleSelect}
            />
            <TeamPanel
              team="blue"
              players={blueTeam}
              me={me}
              onJoin={() => handleTeamJoin('blue')}
              onRoleSelect={handleRoleSelect}
            />
          </div>

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="glass p-4 mb-8">
              <h3 className="text-sm text-white/40 mb-3">Waiting to join a team</h3>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(p => (
                  <Badge key={p.id}>
                    {p.name} {p.isHost && '(Host)'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Start Button */}
          {isHost && (
            <div className="text-center">
              <Button size="lg" onClick={handleStart} loading={starting}>
                Start Game
              </Button>
            </div>
          )}
          {!isHost && (
            <p className="text-center text-white/40 text-sm">Waiting for host to start the game...</p>
          )}
        </motion.div>
      </Container>
    </div>
  )
}

function TeamPanel({
  team,
  players,
  me,
  onJoin,
  onRoleSelect,
}: {
  team: Team
  players: Player[]
  me: Player | null
  onJoin: () => void
  onRoleSelect: (role: Role) => void
}) {
  const isRed = team === 'red'
  const teamColor = isRed ? 'text-red-400' : 'text-blue-400'
  const borderColor = isRed ? 'border-red-500/20' : 'border-blue-500/20'
  const bgGlow = isRed ? 'bg-red-500/5' : 'bg-blue-500/5'
  const isOnTeam = me?.team === team
  const spymasters = players.filter(p => p.role === 'spymaster')
  const operatives = players.filter(p => p.role === 'operative')
  const noRole = players.filter(p => !p.role)

  return (
    <div className={`glass ${bgGlow} border ${borderColor} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold ${teamColor}`}>
          {isRed ? '🔴' : '🔵'} {team.toUpperCase()} TEAM
        </h2>
        <span className="text-white/40 text-sm">{players.length} players</span>
      </div>

      {/* Role sections */}
      <div className="space-y-3">
        <RoleSection label="Spymaster" players={spymasters} />
        <RoleSection label="Operatives" players={operatives} />
        {noRole.length > 0 && <RoleSection label="No role" players={noRole} />}
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {!isOnTeam && (
          <Button
            variant={isRed ? 'red' : 'blue'}
            size="sm"
            className="w-full"
            onClick={onJoin}
          >
            Join {team.toUpperCase()} Team
          </Button>
        )}
        {isOnTeam && (
          <div className="flex gap-2">
            <Button
              variant={me?.role === 'spymaster' ? (isRed ? 'red' : 'blue') : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={() => onRoleSelect('spymaster')}
            >
              Spymaster
            </Button>
            <Button
              variant={me?.role === 'operative' ? (isRed ? 'red' : 'blue') : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={() => onRoleSelect('operative')}
            >
              Operative
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function RoleSection({ label, players }: { label: string; players: Player[] }) {
  if (players.length === 0) return null
  return (
    <div>
      <p className="text-xs text-white/30 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {players.map(p => (
          <span
            key={p.id}
            className="bg-white/10 px-2.5 py-1 rounded-lg text-sm text-white/80"
          >
            {p.name} {p.isHost && '👑'}
          </span>
        ))}
      </div>
    </div>
  )
}
